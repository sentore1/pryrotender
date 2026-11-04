-- Run this in your Supabase SQL editor

-- New columns for proposal AI context (run if upgrading)
-- alter table profiles add column if not exists company_bio text;
-- alter table profiles add column if not exists required_documents text[] default '{}';
-- alter table profiles add column if not exists former_clients jsonb default '[]';
-- alter table profiles add column if not exists sidebar_categories text[] default '{}';

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  company_name text,
  role text default 'user', -- 'user' | 'admin'
  subscription_status text default 'inactive', -- 'active' | 'inactive' | 'cancelled'
  subscription_plan text, -- 'monthly' | 'annual'
  subscription_end date,
  logo_url text,
  signature_url text,
  company_address text,
  company_phone text,
  company_website text,
  company_ref_prefix text,
  created_at timestamptz default now()
);

create table subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  plan text not null, -- 'monthly' | 'annual'
  amount numeric not null,
  currency text default 'USD',
  status text default 'pending', -- 'pending' | 'paid' | 'failed'
  pesapal_order_id text,
  pesapal_tracking_id text,
  period_start date,
  period_end date,
  created_at timestamptz default now()
);

create table notification_preferences (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique,
  enabled boolean default false,
  frequency text default 'daily', -- 'instant' | 'daily'
  keywords text[] default '{}',
  categories text[] default '{}',
  notification_email text,
  extra_emails text[] default '{}',
  updated_at timestamptz default now()
);

-- Settings table (caches server-side config like Pesapal IPN ID)
create table settings (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, role)
  values (new.id, new.email, case when new.email in ('abdousentore@gmail.com', 'sent00re@gmail.com') then 'admin' else 'user' end);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- RLS
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table notification_preferences enable row level security;
alter table settings enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on profiles for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update all profiles" on profiles for update using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Users can view own subscriptions" on subscriptions for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on subscriptions for insert with check (auth.uid() = user_id);
create policy "Admins can view all subscriptions" on subscriptions for select using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

create policy "Users can manage own notifications" on notification_preferences for all using (auth.uid() = user_id);

-- Storage: company-assets bucket (create manually in Supabase dashboard as public bucket)
-- Then run these policies:
-- insert into storage.buckets (id, name, public) values ('company-assets', 'company-assets', true);

create policy "Users can upload own assets"
on storage.objects for insert
with check (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own assets"
on storage.objects for update
using (
  bucket_id = 'company-assets' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Public read company assets"
on storage.objects for select
using (bucket_id = 'company-assets');

-- Proposals table (run in Supabase SQL editor)
create table if not exists proposals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  tender_name text not null,
  analysis text,
  content text not null,
  created_at timestamptz default now()
);

alter table proposals enable row level security;
create policy "Users can manage own proposals" on proposals for all using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- Email / Sender settings (per-user SMTP or Gmail config for sending tender emails)
-- Run this block in your Supabase SQL editor.
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists email_settings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique,
  provider text default 'gmail',          -- 'gmail' | 'smtp'
  smtp_host text,                          -- e.g. smtp.gmail.com (ignored when provider = 'gmail')
  smtp_port int default 465,
  smtp_user text,                          -- sender / login email
  smtp_password text,                     -- app password or SMTP password (stored as-is)
  smtp_secure boolean default true,        -- true = implicit TLS (port 465), false = STARTTLS (587)
  sender_name text,                         -- friendly From display name
  updated_at timestamptz default now()
);

alter table email_settings enable row level security;

-- Owner-only access: a user can read, insert, update, and delete only their own row.
create policy "Users can manage own email settings" on email_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════
-- Pricing Items, Suppliers, Supplier Quote Requests
-- (see supabase/migrations/003_pricing_suppliers.sql)
-- ═══════════════════════════════════════════════════════════════════

create table if not exists pricing_items (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references profiles(id) on delete cascade not null,
  name         text not null,
  description  text,
  unit         text,
  unit_price   numeric(18,2) not null default 0,
  currency     text not null default 'RWF',
  category     text not null default 'goods',
  margin_pct   numeric(5,2) not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table pricing_items enable row level security;
create policy "Users can manage own pricing items"
  on pricing_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Unique constraint so re-importing the same item name updates instead of duplicating
alter table pricing_items
  add constraint pricing_items_user_name_unique unique (user_id, name);

create table if not exists suppliers (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references profiles(id) on delete cascade not null,
  name          text not null,
  label         text,
  contact_email text,
  whatsapp      text,
  notes         text,
  created_at    timestamptz default now()
);

alter table suppliers enable row level security;
create policy "Users can manage own suppliers"
  on suppliers for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists supplier_quote_requests (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references profiles(id) on delete cascade not null,
  supplier_id  uuid references suppliers(id) on delete set null,
  token        text unique not null,
  title        text,
  items        jsonb not null default '[]',
  status       text not null default 'pending',
  response     jsonb,
  response_notes text,
  created_at   timestamptz default now(),
  responded_at timestamptz
);

alter table supplier_quote_requests enable row level security;
create policy "Users can manage own quote requests"
  on supplier_quote_requests for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);
