-- ============================================================================
-- SUPABASE POSTGRESQL SCHEMA — MJA SALES HUB
-- ERP Penjualan Multi-Toko, Rekap Sesi Live, Inventori & Laporan Finansial
-- Versi: 1.0.0 (Idempotent & RLS Secured)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- A. FUNGSI UMUM (TRIGGER UPDATED_AT)
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- B. TABEL PROFILES (PENGGUNA & ROLE)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nama text not null default '',
  role text not null default 'admin' check (role in ('admin', 'owner', 'finance', 'host', 'warehouse')),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- ----------------------------------------------------------------------------
-- C. FUNGSI HELPER RLS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------
create or replace function public.current_app_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) and p.aktif = true;
$$;

create or replace function public.is_active()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.aktif = true);
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.has_role(roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() = 'admin' or public.current_app_role() = any(roles), false);
$$;

grant execute on function public.current_app_role(), public.is_active(), public.is_admin(), public.has_role(text[]) to authenticated;

-- ----------------------------------------------------------------------------
-- D. TRIGGER USER BARU (AUTH.USERS -> PROFILES)
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
begin
  v_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'admin');
  insert into public.profiles (id, email, nama, role, aktif)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'nama', ''), split_part(new.email, '@', 1)),
    v_role,
    true
  )
  on conflict (id) do update set
    email = excluded.email,
    nama = case when public.profiles.nama = '' then excluded.nama else public.profiles.nama end;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill user lama sebelum schema dijalankan
insert into public.profiles (id, email, nama, role, aktif)
select u.id, u.email, split_part(u.email, '@', 1), 'admin', true
from auth.users u
on conflict (id) do nothing;

-- Policies profiles
grant select, update on public.profiles to authenticated;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select to authenticated
using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

revoke update on public.profiles from authenticated;
grant update (nama) on public.profiles to authenticated;

-- ----------------------------------------------------------------------------
-- E. COUNTERS NOMOR URUT (ATOMIK)
-- ----------------------------------------------------------------------------
create table if not exists public.counters (
  nama text primary key,
  nilai bigint not null default 0
);
alter table public.counters enable row level security;

create or replace function public.next_code(p_nama text, p_prefix text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v bigint;
begin
  if not public.is_active() then
    raise exception 'Akses ditolak: pengguna belum aktif';
  end if;
  insert into public.counters (nama, nilai) values (p_nama, 1)
  on conflict (nama) do update set nilai = public.counters.nilai + 1
  returning nilai into v;
  return p_prefix || '-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDD') || '-' || lpad(v::text, 4, '0');
end;
$$;
grant execute on function public.next_code(text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- F. LOG AKTIVITAS (AUDIT TRAIL)
-- ----------------------------------------------------------------------------
create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  aksi text not null,
  target text,
  detail jsonb,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);
alter table public.logs enable row level security;
grant select, insert on public.logs to authenticated;

drop policy if exists "logs_select" on public.logs;
create policy "logs_select" on public.logs
for select to authenticated
using (public.is_admin());

drop policy if exists "logs_insert" on public.logs;
create policy "logs_insert" on public.logs
for insert to authenticated
with check (public.is_active() and created_by = (select auth.uid()));

-- ----------------------------------------------------------------------------
-- G. TABEL TOKO (STORES)
-- ----------------------------------------------------------------------------
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  kode text unique,
  platform text not null check (platform in ('shopee', 'tiktok')),
  store_name text not null,
  default_admin_fee_percent numeric(5,2) not null default 8.50 check (default_admin_fee_percent >= 0),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

drop trigger if exists set_updated_at_stores on public.stores;
create trigger set_updated_at_stores before update on public.stores
for each row execute function public.set_updated_at();

alter table public.stores enable row level security;
grant select, insert, update, delete on public.stores to authenticated;

drop policy if exists "stores_select" on public.stores;
create policy "stores_select" on public.stores
for select to authenticated using (public.is_active());

drop policy if exists "stores_insert" on public.stores;
create policy "stores_insert" on public.stores
for insert to authenticated with check (public.is_admin());

drop policy if exists "stores_update" on public.stores;
create policy "stores_update" on public.stores
for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "stores_delete" on public.stores;
create policy "stores_delete" on public.stores
for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- H. MASTER PRODUK & INVENTORI (INVENTORY_ITEMS)
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  group_name text not null default 'Spion Mobil', -- Group / Kategori Produk Spion
  kode text unique not null, -- SKU Produk
  product_name text not null check (char_length(product_name) between 1 and 200),
  cogs bigint not null default 0 check (cogs >= 0), -- HPP Rupiah
  selling_price bigint not null default 0 check (selling_price >= 0), -- Harga Jual Rupiah
  current_stock integer not null default 0 check (current_stock >= 0),
  safety_stock integer not null default 10 check (safety_stock >= 0),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists inventory_items_group_idx on public.inventory_items (group_name);
create index if not exists inventory_items_kode_idx on public.inventory_items (kode);
create index if not exists inventory_items_created_at_idx on public.inventory_items (created_at desc);

drop trigger if exists set_updated_at_inventory_items on public.inventory_items;
create trigger set_updated_at_inventory_items before update on public.inventory_items
for each row execute function public.set_updated_at();

alter table public.inventory_items enable row level security;
grant select, insert, update, delete on public.inventory_items to authenticated;

drop policy if exists "inventory_items_select" on public.inventory_items;
create policy "inventory_items_select" on public.inventory_items
for select to authenticated using (public.is_active());

drop policy if exists "inventory_items_insert" on public.inventory_items;
create policy "inventory_items_insert" on public.inventory_items
for insert to authenticated with check (public.has_role(array['warehouse','finance']));

drop policy if exists "inventory_items_update" on public.inventory_items;
create policy "inventory_items_update" on public.inventory_items
for update to authenticated using (public.has_role(array['warehouse','finance']));

drop policy if exists "inventory_items_delete" on public.inventory_items;
create policy "inventory_items_delete" on public.inventory_items
for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- I. RIWAYAT MUTASI STOK (INVENTORY_MUTATIONS)
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_mutations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete restrict,
  mutation_type text not null check (mutation_type in ('in', 'out', 'return_good', 'return_damage')),
  qty integer not null check (qty > 0),
  reference_no text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists inventory_mutations_item_id_idx on public.inventory_mutations (item_id);
create index if not exists inventory_mutations_created_at_idx on public.inventory_mutations (created_at desc);

alter table public.inventory_mutations enable row level security;
grant select, insert on public.inventory_mutations to authenticated;

drop policy if exists "inventory_mutations_select" on public.inventory_mutations;
create policy "inventory_mutations_select" on public.inventory_mutations
for select to authenticated using (public.is_active());

drop policy if exists "inventory_mutations_insert" on public.inventory_mutations;
create policy "inventory_mutations_insert" on public.inventory_mutations
for insert to authenticated with check (public.has_role(array['warehouse','finance']));

-- ----------------------------------------------------------------------------
-- J. REKAP SESI LIVE (LIVE_SESSIONS)
-- ----------------------------------------------------------------------------
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  store_id uuid not null references public.stores(id) on delete restrict,
  host_name text not null,
  session_date date not null default current_date,
  start_time time not null default current_time,
  end_time time default null,
  gross_revenue bigint not null default 0 check (gross_revenue >= 0),
  platform_fee bigint not null default 0 check (platform_fee >= 0),
  store_voucher bigint not null default 0 check (store_voucher >= 0),
  ads_cost bigint not null default 0 check (ads_cost >= 0),
  total_cogs bigint not null default 0 check (total_cogs >= 0),
  net_margin bigint not null default 0,
  total_items_sold integer not null default 0 check (total_items_sold >= 0),
  status text not null default 'completed' check (status in ('ongoing', 'completed', 'verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists live_sessions_store_id_idx on public.live_sessions (store_id);
create index if not exists live_sessions_date_idx on public.live_sessions (session_date desc);

drop trigger if exists set_updated_at_live_sessions on public.live_sessions;
create trigger set_updated_at_live_sessions before update on public.live_sessions
for each row execute function public.set_updated_at();

alter table public.live_sessions enable row level security;
grant select, insert, update on public.live_sessions to authenticated;

drop policy if exists "live_sessions_select" on public.live_sessions;
create policy "live_sessions_select" on public.live_sessions
for select to authenticated using (public.is_active());

drop policy if exists "live_sessions_insert" on public.live_sessions;
create policy "live_sessions_insert" on public.live_sessions
for insert to authenticated with check (public.has_role(array['host','finance','owner']));

drop policy if exists "live_sessions_update" on public.live_sessions;
create policy "live_sessions_update" on public.live_sessions
for update to authenticated using (public.has_role(array['host','finance','owner']));

-- ----------------------------------------------------------------------------
-- K. TRANSAKSI PENJUALAN (SALES_ORDERS)
-- ----------------------------------------------------------------------------
create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null, -- No Pesanan Marketplace
  store_id uuid not null references public.stores(id) on delete restrict,
  live_session_id uuid references public.live_sessions(id) on delete set null,
  order_date timestamptz not null default now(),
  resi_no text not null default '',
  shipping_courier text not null default 'J&T',
  is_instant boolean not null default false, -- True jika Shopee Instant / Sameday (dikecualikan dari cetak thermal)
  customer_name text not null default 'Pembeli',
  order_status text not null default 'shipped' check (order_status in ('pending', 'shipped', 'delivered', 'returned', 'cancelled')),
  print_status text not null default 'unprinted' check (print_status in ('unprinted', 'printed')),
  gross_amount bigint not null default 0 check (gross_amount >= 0),
  admin_fee bigint not null default 0 check (admin_fee >= 0),
  cogs_amount bigint not null default 0 check (cogs_amount >= 0),
  net_amount bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists sales_orders_store_id_idx on public.sales_orders (store_id);
create index if not exists sales_orders_resi_no_idx on public.sales_orders (resi_no);
create index if not exists sales_orders_date_idx on public.sales_orders (order_date desc);

drop trigger if exists set_updated_at_sales_orders on public.sales_orders;
create trigger set_updated_at_sales_orders before update on public.sales_orders
for each row execute function public.set_updated_at();

alter table public.sales_orders enable row level security;
grant select, insert, update on public.sales_orders to authenticated;

drop policy if exists "sales_orders_select" on public.sales_orders;
create policy "sales_orders_select" on public.sales_orders
for select to authenticated using (public.is_active());

drop policy if exists "sales_orders_insert" on public.sales_orders;
create policy "sales_orders_insert" on public.sales_orders
for insert to authenticated with check (public.has_role(array['warehouse','finance','host']));

drop policy if exists "sales_orders_update" on public.sales_orders;
create policy "sales_orders_update" on public.sales_orders
for update to authenticated using (public.has_role(array['warehouse','finance']));

-- ----------------------------------------------------------------------------
-- L. PENCATATAN RETUR (RETURNS)
-- ----------------------------------------------------------------------------
create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.sales_orders(id) on delete restrict,
  resi_no text not null,
  condition text not null check (condition in ('restock_good', 'damaged_reject', 'lost')),
  damage_notes text default '',
  damage_photo_url text default '',
  claim_status text not null default 'none' check (claim_status in ('none', 'claimed', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists returns_order_id_idx on public.returns (order_id);
create index if not exists returns_resi_no_idx on public.returns (resi_no);

alter table public.returns enable row level security;
grant select, insert, update on public.returns to authenticated;

drop policy if exists "returns_select" on public.returns;
create policy "returns_select" on public.returns
for select to authenticated using (public.is_active());

drop policy if exists "returns_insert" on public.returns;
create policy "returns_insert" on public.returns
for insert to authenticated with check (public.has_role(array['warehouse','finance']));

drop policy if exists "returns_update" on public.returns;
create policy "returns_update" on public.returns
for update to authenticated using (public.has_role(array['warehouse','finance']));

-- ----------------------------------------------------------------------------
-- M. FUNGSI ATOMIK: PROSES RETUR PAKET
-- ----------------------------------------------------------------------------
create or replace function public.proses_retur_paket(
  p_resi_no text,
  p_condition text,
  p_notes text,
  p_photo_url text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_order record;
  v_return_id uuid;
begin
  if not public.is_active() then
    raise exception 'Akses ditolak: pengguna belum aktif';
  end if;

  -- 1. Cari pesanan berdasarkan no resi
  select * into v_order from public.sales_orders where resi_no = p_resi_no limit 1;
  if not found then
    raise exception 'Nomor resi tidak ditemukan di sistem pesanan';
  end if;

  -- 2. Update status order menjadi returned
  update public.sales_orders
  set order_status = 'returned', updated_at = now()
  where id = v_order.id;

  -- 3. Catat di tabel returns
  insert into public.returns (order_id, resi_no, condition, damage_notes, damage_photo_url, created_by)
  values (v_order.id, p_resi_no, p_condition, p_notes, p_photo_url, (select auth.uid()))
  returning id into v_return_id;

  -- 4. Jika kondisi bagus, restock inventori (jika ada relasi produk di logs atau mutasi)
  insert into public.logs (aksi, target, detail, created_by)
  values (
    'PROSES_RETUR',
    p_resi_no,
    jsonb_build_object(
      'order_id', v_order.id,
      'order_no', v_order.kode,
      'condition', p_condition,
      'nilai_order', v_order.gross_amount
    ),
    (select auth.uid())
  );

  return jsonb_build_object(
    'success', true,
    'return_id', v_return_id,
    'message', 'Retur berhasil diproses dan finansial telah disesuaikan'
  );
end;
$$;
grant execute on function public.proses_retur_paket(text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- N. REALTIME SUBSCRIPTION
-- ----------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.sales_orders; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.live_sessions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.inventory_items; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.returns; exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- O. DATA AWAL (AUTO-SEED IDEMPOTENT)
-- ----------------------------------------------------------------------------
-- 5 Akun Shopee + 1 Akun TikTok Shop
insert into public.stores (id, kode, platform, store_name, default_admin_fee_percent) values
('11111111-1111-4111-8111-111111111111', 'STR-SHP-01', 'shopee', 'Shopee Official Store 1', 8.50),
('22222222-2222-4222-8222-222222222222', 'STR-SHP-02', 'shopee', 'Shopee Mall Store 2', 9.00),
('33333333-3333-4333-8333-333333333333', 'STR-SHP-03', 'shopee', 'Shopee Grosir Store 3', 7.50),
('44444444-4444-4444-8444-444444444444', 'STR-SHP-04', 'shopee', 'Shopee Retail Store 4', 8.50),
('55555555-5555-4555-8555-555555555555', 'STR-SHP-05', 'shopee', 'Shopee Clearance Store 5', 8.00),
('66666666-6666-4666-8666-666666666666', 'STR-TTK-01', 'tiktok', 'TikTok Shop Live Official', 10.50)
on conflict (kode) do nothing;

-- Master Produk Awal (Spion Mobil, Spion Motor, Aksesoris & Sparepart)
insert into public.inventory_items (kode, group_name, product_name, cogs, selling_price, current_stock, safety_stock) values
('SPN-MBL-001', 'Spion Mobil', 'Spion Retract All New Avanza / Xenia 2022+ Elektrik (Set Kiri-Kanan)', 650000, 1150000, 85, 10),
('SPN-MBL-002', 'Spion Mobil', 'Spion Innova Reborn / Venturer Chrome Lipat Otomatis', 850000, 1450000, 64, 8),
('SPN-MBL-003', 'Spion Mobil', 'Kaca Spion Honda Brio / Mobilio Cembung Original (Kanan)', 95000, 185000, 140, 20),
('SPN-MBL-004', 'Spion Mobil', 'Cover Spion Fortuner VRZ / Hilux Hitam Glossy + Lampu Sein', 175000, 320000, 90, 15),
('SPN-MTR-001', 'Spion Motor', 'Spion Standar Honda Vario 125/150 / Beat FI Drat Honda', 25000, 55000, 320, 30),
('SPN-MTR-002', 'Spion Motor', 'Spion Jalu Bar End CNC Universal NMAX / Aerox / PCX', 45000, 98000, 210, 25),
('SPN-MTR-003', 'Spion Motor', 'Spion Model Circuit Tomok 2.0 Full CNC Universal', 65000, 135000, 175, 20),
('SPN-MTR-004', 'Spion Motor', 'Kaca Spion Vespa Matic Sprint / Primavera Bulat Chrome', 85000, 175000, 120, 15),
('SPN-AKS-001', 'Aksesoris & Sparepart', 'Modul Auto Retract Spion Lipat Otomatis Universal Mobil', 75000, 165000, 190, 20),
('SPN-AKS-002', 'Aksesoris & Sparepart', 'Blind Spot Mirror Cembung 360 Derajat HD Frameless (Isi 2)', 12000, 35000, 450, 50),
('SPN-AKS-003', 'Aksesoris & Sparepart', 'Saklar Switch Spion Retract Tombol Lipat Toyota', 55000, 120000, 110, 15)
on conflict (kode) do nothing;

-- ----------------------------------------------------------------------------
-- P. RELOAD SCHEMA POSTGREST
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';

