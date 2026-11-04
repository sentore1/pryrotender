-- ============================================================
-- Migration 003: Pricing Items, Suppliers, Supplier Quotes
-- Run in your Supabase SQL editor
-- ============================================================

-- ── Pricing Items ──────────────────────────────────────────
-- Stores a user's catalogue of goods/services with unit prices
create table if not exists pricing_items (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references profiles(id) on delete cascade not null,
  name         text not null,
  description  text,
  unit         text,                           -- e.g. "piece", "kg", "month", "lot"
  unit_price   numeric(18,2) not null default 0,
  currency     text not null default 'RWF',
  category     text not null default 'goods',  -- 'goods' | 'service'
  margin_pct   numeric(5,2) not null default 0, -- margin added on top, in %
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

alter table pricing_items enable row level security;

create policy "Users can manage own pricing items"
  on pricing_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Suppliers ──────────────────────────────────────────────
-- Stores a user's supplier contacts
create table if not exists suppliers (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references profiles(id) on delete cascade not null,
  name          text not null,
  label         text,                -- free tag / label to differentiate
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

-- ── Supplier Quote Requests ────────────────────────────────
-- A shareable form sent to a supplier asking for item prices
create table if not exists supplier_quote_requests (
  id           uuid default gen_random_uuid() primary key,
  user_id      uuid references profiles(id) on delete cascade not null,
  supplier_id  uuid references suppliers(id) on delete set null,
  token        text unique not null,   -- random slug used in the public URL
  title        text,
  items        jsonb not null default '[]', -- [{name, description, unit, qty}]
  status       text not null default 'pending',   -- 'pending' | 'submitted' | 'accepted'
  response     jsonb,                  -- [{name, unit, unit_price, qty, total}]
  response_notes text,
  created_at   timestamptz default now(),
  responded_at timestamptz
);

alter table supplier_quote_requests enable row level security;

-- Owner can do anything with their own requests
create policy "Users can manage own quote requests"
  on supplier_quote_requests for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Suppliers (unauthenticated public) can read + submit via token — handled in API route
-- with service role key, so no permissive browser policy needed.
