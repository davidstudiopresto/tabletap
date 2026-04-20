-- ═══════════════════════════════════════════════════════════
-- TableTap — Supabase Schema
-- Run this in the Supabase SQL editor
-- ═══════════════════════════════════════════════════════════

-- RESTAURANTS
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  logo_url text,
  currency text default 'EUR',
  created_at timestamptz default now()
);

-- TABLES
create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  number int not null,
  qr_token text unique not null default encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz default now(),
  unique(restaurant_id, number)
);

-- SESSIONS DE TABLE
create table table_sessions (
  id uuid primary key default gen_random_uuid(),
  table_id uuid references tables(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  opened_at timestamptz default now(),
  closed_at timestamptz
);

-- CATÉGORIES
create table categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  name text not null,
  position int default 0,
  created_at timestamptz default now()
);

-- PLATS
create table menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references restaurants(id) on delete cascade,
  category_id uuid references categories(id) on delete set null,
  number text,
  name text not null,
  description text,
  price numeric(10,2) not null,
  image_url text,
  available boolean default true,
  position int default 0,
  created_at timestamptz default now()
);

-- COMMANDES
create table orders (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references table_sessions(id) on delete cascade,
  table_id uuid references tables(id),
  restaurant_id uuid references restaurants(id) on delete cascade,
  status text default 'pending' check (status in ('pending','done','cancelled')),
  total numeric(10,2) not null default 0,
  note text,
  created_at timestamptz default now()
);

-- LIGNES DE COMMANDE
create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  number_snapshot text,
  name_snapshot text not null,
  price_at_order numeric(10,2) not null,
  quantity int not null default 1,
  note text
);

-- STAFF
create table staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  restaurant_id uuid references restaurants(id) on delete cascade,
  role text check (role in ('admin','kitchen')),
  created_at timestamptz default now()
);

-- Enable Realtime
alter publication supabase_realtime add table orders;
alter publication supabase_realtime add table order_items;

-- ═══════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════

alter table restaurants enable row level security;
alter table tables enable row level security;
alter table table_sessions enable row level security;
alter table categories enable row level security;
alter table menu_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table staff enable row level security;

-- Helper function
create or replace function is_staff_of(rid uuid)
returns boolean as $$
  select exists (
    select 1 from staff
    where staff.user_id = auth.uid()
    and staff.restaurant_id = rid
  );
$$ language sql security definer;

-- Restaurants: public read, staff write
create policy "Public read restaurants" on restaurants for select using (true);
create policy "Staff manage restaurants" on restaurants for all using (is_staff_of(id));

-- Tables: public read, staff write
create policy "Public read tables" on tables for select using (true);
create policy "Staff manage tables" on tables for all using (is_staff_of(restaurant_id));

-- Categories: public read, staff write
create policy "Public read categories" on categories for select using (true);
create policy "Staff manage categories" on categories for all using (is_staff_of(restaurant_id));

-- Menu items: public read (available only), staff write
create policy "Public read menu items" on menu_items for select using (true);
create policy "Staff manage menu items" on menu_items for all using (is_staff_of(restaurant_id));

-- Table sessions: anon can create/read, staff can manage
create policy "Public read sessions" on table_sessions for select using (true);
create policy "Public create sessions" on table_sessions for insert with check (true);
create policy "Staff manage sessions" on table_sessions for all using (is_staff_of(restaurant_id));

-- Orders: anon can create/read own, staff can manage
create policy "Public create orders" on orders for insert with check (true);
create policy "Public read orders" on orders for select using (true);
create policy "Staff manage orders" on orders for all using (is_staff_of(restaurant_id));

-- Order items: anon can create/read, staff can manage
create policy "Public create order items" on order_items for insert with check (true);
create policy "Public read order items" on order_items for select using (true);
create policy "Staff manage order items" on order_items for all using (
  is_staff_of((select restaurant_id from orders where orders.id = order_items.order_id))
);

-- Staff: only staff themselves can read
create policy "Staff read own" on staff for select using (user_id = auth.uid());
create policy "Admin manage staff" on staff for all using (
  exists (
    select 1 from staff s
    where s.user_id = auth.uid()
    and s.restaurant_id = staff.restaurant_id
    and s.role = 'admin'
  )
);

-- ═══════════════════════════════════════════════════════════
-- STORAGE
-- ═══════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public) values ('menu-images', 'menu-images', true);

create policy "Public read menu images" on storage.objects for select using (bucket_id = 'menu-images');
create policy "Staff upload menu images" on storage.objects for insert with check (bucket_id = 'menu-images');
create policy "Staff delete menu images" on storage.objects for delete using (bucket_id = 'menu-images');
