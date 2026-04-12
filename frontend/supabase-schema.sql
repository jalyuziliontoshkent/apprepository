-- Supabase starter schema for CurtainOrder
-- Run this in Supabase Dashboard -> SQL Editor

-- Extensions
create extension if not exists "pgcrypto";

-- Roles enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type app_role as enum ('admin', 'dealer', 'worker');
  end if;
end$$;

-- Order status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type order_status as enum ('kutilmoqda', 'tayyorlanmoqda', 'tayyor', 'yetkazildi');
  end if;
end$$;
x1  
-- Worker item status enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'worker_item_status') then
    create type worker_item_status as enum ('pending', 'completed');
  end if;
end$$;

-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text unique not null,
  role app_role not null default 'dealer',
  phone text,
  address text,
  credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  debt numeric(14,2) not null default 0 check (debt >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Materials table
create table if not exists public.materials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_per_sqm numeric(14,2) not null check (price_per_sqm >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique not null,
  dealer_id uuid not null references public.profiles(id) on delete restrict,
  worker_id uuid references public.profiles(id) on delete set null,
  status order_status not null default 'kutilmoqda',
  total_sqm numeric(14,2) not null default 0 check (total_sqm >= 0),
  total_price numeric(14,2) not null default 0 check (total_price >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  material_id uuid references public.materials(id) on delete set null,
  material_name text not null,
  width numeric(8,2) not null check (width > 0),
  height numeric(8,2) not null check (height > 0),
  sqm numeric(12,2) not null check (sqm > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total_price numeric(14,2) not null check (total_price >= 0),
  notes text,
  worker_status worker_item_status not null default 'pending',
  item_index int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_dealer_id on public.orders(dealer_id);
create index if not exists idx_orders_worker_id on public.orders(worker_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_order_items_worker_status on public.order_items(worker_status);

-- Trigger: updated_at auto-update
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_materials_updated_at on public.materials;
create trigger trg_materials_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists trg_order_items_updated_at on public.order_items;
create trigger trg_order_items_updated_at
before update on public.order_items
for each row execute function public.set_updated_at();

-- Auto-create profile for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'User'),
    new.email,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'dealer'::app_role)
  )
  on conflict (id) do nothing;
  return new;
exception
  when others then
    -- Keep signup flow healthy even if profile insert fails.
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.materials enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Profiles policies
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
on public.profiles for select
using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "profiles_update_own_or_admin" on public.profiles;
create policy "profiles_update_own_or_admin"
on public.profiles for update
using (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  auth.uid() = id
  or exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Materials policies
drop policy if exists "materials_select_authenticated" on public.materials;
create policy "materials_select_authenticated"
on public.materials for select
using (auth.role() = 'authenticated');

drop policy if exists "materials_write_admin" on public.materials;
create policy "materials_write_admin"
on public.materials for all
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
);

-- Orders policies
drop policy if exists "orders_select_role_based" on public.orders;
create policy "orders_select_role_based"
on public.orders for select
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or dealer_id = auth.uid()
  or worker_id = auth.uid()
);

drop policy if exists "orders_insert_dealer_or_admin" on public.orders;
create policy "orders_insert_dealer_or_admin"
on public.orders for insert
with check (
  dealer_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists "orders_update_admin_or_worker" on public.orders;
create policy "orders_update_admin_or_worker"
on public.orders for update
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or worker_id = auth.uid()
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or worker_id = auth.uid()
);

-- Order items policies
drop policy if exists "order_items_select_role_based" on public.order_items;
create policy "order_items_select_role_based"
on public.order_items for select
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (
    select 1 from public.orders o
    where o.id = order_id and (o.dealer_id = auth.uid() or o.worker_id = auth.uid())
  )
);

drop policy if exists "order_items_insert_dealer_or_admin" on public.order_items;
create policy "order_items_insert_dealer_or_admin"
on public.order_items for insert
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (
    select 1 from public.orders o
    where o.id = order_id and o.dealer_id = auth.uid()
  )
);

drop policy if exists "order_items_update_admin_or_worker" on public.order_items;
create policy "order_items_update_admin_or_worker"
on public.order_items for update
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (
    select 1 from public.orders o
    where o.id = order_id and o.worker_id = auth.uid()
  )
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (
    select 1 from public.orders o
    where o.id = order_id and o.worker_id = auth.uid()
  )
);

-- Helper view used by worker screens
create or replace view public.worker_tasks as
select
  o.id as order_id,
  o.order_code,
  o.worker_id,
  p.name as dealer_name,
  oi.item_index,
  oi.material_name,
  oi.width,
  oi.height,
  oi.sqm,
  oi.notes,
  oi.worker_status
from public.order_items oi
join public.orders o on o.id = oi.order_id
join public.profiles p on p.id = o.dealer_id;

