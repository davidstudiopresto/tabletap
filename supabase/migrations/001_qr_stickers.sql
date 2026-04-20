-- ═══════════════════════════════════════════════════════════
-- Migration: QR Stickers (découplés des tables)
-- ═══════════════════════════════════════════════════════════

-- QR Stickers
create table qr_stickers (
  id uuid primary key default gen_random_uuid(),
  public_id text unique not null,
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  status text not null default 'unassigned'
    check (status in ('unassigned', 'assigned', 'disabled')),
  assigned_table_id uuid references tables(id) on delete set null,
  label text,
  scan_count int not null default 0,
  last_scanned_at timestamptz,
  created_at timestamptz default now()
);

-- Index
create index idx_qr_stickers_public_id on qr_stickers(public_id);
create index idx_qr_stickers_restaurant_id on qr_stickers(restaurant_id);
create index idx_qr_stickers_assigned_table_id on qr_stickers(assigned_table_id);

-- RLS
alter table qr_stickers enable row level security;

create policy "Public read qr_stickers" on qr_stickers
  for select using (true);

create policy "Staff manage qr_stickers" on qr_stickers
  for all using (is_staff_of(restaurant_id));

-- Migrate existing tables: create a sticker for each existing table
insert into qr_stickers (public_id, restaurant_id, status, assigned_table_id)
select
  encode(gen_random_bytes(4), 'hex'),
  restaurant_id,
  'assigned',
  id
from tables;

-- Function to increment scan count (callable as RPC, bypasses RLS)
create or replace function increment_scan(sticker_public_id text)
returns void as $$
  update qr_stickers
  set scan_count = scan_count + 1,
      last_scanned_at = now()
  where public_id = sticker_public_id;
$$ language sql security definer;
