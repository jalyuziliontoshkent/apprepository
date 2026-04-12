  -- Seed data for local testing
  -- IMPORTANT:
  -- 1) First create users in Supabase Auth with these emails:
  --    admin@curtain.uz, dealer@curtain.uz, worker@curtain.uz
  -- 2) Then run this script.

  -- Update roles and profile fields for known users
  update public.profiles
  set role = 'admin', name = 'Admin User'
  where email = 'admin@curtain.uz';

  update public.profiles
  set role = 'dealer', name = 'Dealer User', credit_limit = 5000000, debt = 350000
  where email = 'dealer@curtain.uz';

  update public.profiles
  set role = 'worker', name = 'Worker User'
  where email = 'worker@curtain.uz';

  -- Materials
  insert into public.materials (name, price_per_sqm, active)
  values
    ('Blackout Premium', 120000, true),
    ('Satin Classic', 98000, true),
    ('Linen Soft', 85000, true)
  on conflict do nothing;

  -- Create one sample order for dealer and assign to worker
  with dealer_user as (
    select id from public.profiles where email = 'dealer@curtain.uz' limit 1
  ),
  worker_user as (
    select id from public.profiles where email = 'worker@curtain.uz' limit 1
  ),
  new_order as (
    insert into public.orders (
      order_code, dealer_id, worker_id, status, total_sqm, total_price, notes
    )
    select
      'ORD-1001', d.id, w.id, 'tayyorlanmoqda', 6.00, 660000, 'Test order'
    from dealer_user d
    cross join worker_user w
    where not exists (select 1 from public.orders where order_code = 'ORD-1001')
    returning id
  )
  insert into public.order_items (
    order_id, material_id, material_name, width, height, sqm, unit_price, total_price, notes, worker_status, item_index
  )
  select
    o.id,
    m.id,
    m.name,
    2.0,
    3.0,
    6.0,
    m.price_per_sqm,
    m.price_per_sqm * 6.0,
    'Living room',
    'pending',
    0
  from new_order o
  join public.materials m on m.name = 'Blackout Premium'
  where not exists (
    select 1 from public.order_items oi
    join public.orders ord on ord.id = oi.order_id
    where ord.order_code = 'ORD-1001' and oi.item_index = 0
  );
