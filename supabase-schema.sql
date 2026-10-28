-- Run this in your Supabase SQL editor

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
  values (new.id, new.email, case when new.email = 'abdousentore@gmail.com' then 'admin' else 'user' end);
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
