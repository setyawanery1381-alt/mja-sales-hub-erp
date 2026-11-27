-- ============================================================================
-- SUPABASE POSTGRESQL SCHEMA v2.0 (PRODUCTION REAL-TIME) — MJA SALES HUB ERP
-- Mencakup: Profiles/RBAC, App Settings (Geofence), 14 Stores, Multi-Branch Inventory,
-- Live Sessions, Orders/Quick POS Invoices, Double QC Scan (Anti-Dobel Resi),
-- Returns & Auto-Restock, Attendance GPS 10M, dan Supabase Realtime
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
-- B. TABEL PROFILES (PENGGUNA & 6 ROLE RBAC)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  nama text not null default '',
  nik text default '',
  branch text not null default 'Cabang 1 (Pusat & Gudang Utama)',
  role text not null default 'host' check (role in ('admin', 'owner', 'finance', 'host', 'warehouse', 'courier')),
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
-- C. FUNGSI HELPER RLS (SECURITY DEFINER — SERVER-SIDE ROLE GUARD)
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
  select coalesce(public.current_app_role() in ('admin', 'owner'), false);
$$;

create or replace function public.has_role(roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_app_role() in ('admin', 'owner') or public.current_app_role() = any(roles), false);
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
  v_role := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), nullif(new.raw_user_meta_data ->> 'role', ''), 'host');
  if v_role not in ('admin', 'owner', 'finance', 'host', 'warehouse', 'courier') then
    v_role := 'host';
  end if;

  insert into public.profiles (id, email, nama, branch, role, aktif)
  values (
    new.id,
    new.email,
    coalesce(nullif(new.raw_user_meta_data ->> 'nama', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data ->> 'branch', ''), 'Cabang 1 (Pusat & Gudang Utama)'),
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

insert into public.profiles (id, email, nama, role, aktif)
select u.id, u.email, split_part(u.email, '@', 1), 'admin', true
from auth.users u
on conflict (id) do nothing;

grant select, update on public.profiles to authenticated;
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
for select to authenticated using (id = (select auth.uid()) or public.is_admin());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
for update to authenticated using (id = (select auth.uid()) or public.is_admin())
with check (id = (select auth.uid()) or public.is_admin());

-- ----------------------------------------------------------------------------
-- E. PENGATURAN TERPUSAT (APP_SETTINGS — SINGLE SOURCE OF TRUTH LINTAS DEVICE)
-- ----------------------------------------------------------------------------
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid() references auth.users(id) on delete set null
);

drop trigger if exists set_updated_at_app_settings on public.app_settings;
create trigger set_updated_at_app_settings before update on public.app_settings
for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;
grant select, insert, update on public.app_settings to authenticated;

drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select" on public.app_settings
for select to authenticated using (public.is_active());

drop policy if exists "app_settings_write" on public.app_settings;
create policy "app_settings_write" on public.app_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

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
create index if not exists logs_created_at_idx on public.logs (created_at desc);

alter table public.logs enable row level security;
grant select, insert on public.logs to authenticated;

drop policy if exists "logs_select" on public.logs;
create policy "logs_select" on public.logs for select to authenticated using (public.is_admin());

drop policy if exists "logs_insert" on public.logs;
create policy "logs_insert" on public.logs for insert to authenticated with check (public.is_active());

-- ----------------------------------------------------------------------------
-- G. TABEL 14 TOKO MULTI-CABANG (STORES: SEMARANG & BEKASI)
-- ----------------------------------------------------------------------------
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null,
  branch text not null default 'Cabang A (Pusat)',
  platform text not null check (platform in ('shopee', 'tiktok', 'manual')),
  store_name text not null,
  fee_admin numeric(5,2) not null default 6.50,
  fee_ongkir numeric(5,2) not null default 4.00,
  fee_service numeric(5,2) not null default 1.00,
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_updated_at_stores on public.stores;
create trigger set_updated_at_stores before update on public.stores
for each row execute function public.set_updated_at();

alter table public.stores enable row level security;
grant select, insert, update, delete on public.stores to authenticated;

drop policy if exists "stores_select" on public.stores;
create policy "stores_select" on public.stores for select to authenticated using (public.is_active());

drop policy if exists "stores_admin_write" on public.stores;
create policy "stores_admin_write" on public.stores for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- H. MASTER PRODUK & INVENTORI MULTI-CABANG (INVENTORY_ITEMS)
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  kode text unique not null, -- SKU Produk
  group_name text not null default 'Spion Mobil',
  product_name text not null check (char_length(product_name) between 1 and 250),
  stock_a integer not null default 0 check (stock_a >= 0), -- Stok Cabang A (Semarang)
  stock_b integer not null default 0 check (stock_b >= 0), -- Stok Cabang B (Bekasi)
  cogs bigint not null default 0 check (cogs >= 0),
  selling_price bigint not null default 0 check (selling_price >= 0),
  safety_stock integer not null default 10 check (safety_stock >= 0),
  aktif boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists inventory_items_kode_idx on public.inventory_items (kode);
create index if not exists inventory_items_group_idx on public.inventory_items (group_name);

drop trigger if exists set_updated_at_inventory_items on public.inventory_items;
create trigger set_updated_at_inventory_items before update on public.inventory_items
for each row execute function public.set_updated_at();

alter table public.inventory_items enable row level security;
grant select, insert, update, delete on public.inventory_items to authenticated;

drop policy if exists "inventory_items_select" on public.inventory_items;
create policy "inventory_items_select" on public.inventory_items for select to authenticated using (public.is_active());

drop policy if exists "inventory_items_write" on public.inventory_items;
create policy "inventory_items_write" on public.inventory_items for insert to authenticated with check (public.has_role(array['warehouse','finance','host']));

drop policy if exists "inventory_items_update" on public.inventory_items;
create policy "inventory_items_update" on public.inventory_items for update to authenticated using (public.has_role(array['warehouse','finance','host']));

drop policy if exists "inventory_items_delete" on public.inventory_items;
create policy "inventory_items_delete" on public.inventory_items for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- I. RIWAYAT MUTASI STOK ANTAR-CABANG (INVENTORY_MUTATIONS)
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_mutations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.inventory_items(id) on delete set null,
  sku text not null,
  mutation_type text not null check (mutation_type in ('in', 'out', 'transfer_ab', 'transfer_ba', 'return_good', 'return_damage', 'invoice_sale', 'live_sale')),
  qty integer not null check (qty > 0),
  branch_from text default '',
  branch_to text default '',
  reference_no text default '',
  notes text default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists inventory_mutations_sku_idx on public.inventory_mutations (sku);
create index if not exists inventory_mutations_created_idx on public.inventory_mutations (created_at desc);

alter table public.inventory_mutations enable row level security;
grant select, insert on public.inventory_mutations to authenticated;

drop policy if exists "inventory_mutations_select" on public.inventory_mutations;
create policy "inventory_mutations_select" on public.inventory_mutations for select to authenticated using (public.is_active());

drop policy if exists "inventory_mutations_insert" on public.inventory_mutations;
create policy "inventory_mutations_insert" on public.inventory_mutations for insert to authenticated with check (public.is_active());

-- ----------------------------------------------------------------------------
-- J. REKAP SESI LIVE SHOPPING (LIVE_SESSIONS)
-- ----------------------------------------------------------------------------
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  session_code text unique not null,
  store_name text not null,
  host_name text not null,
  session_date date not null default current_date,
  start_time text default '09:00',
  end_time text default '12:00',
  duration_text text default '2 Jam 00 Menit',
  peak_viewers integer not null default 0,
  gross_revenue bigint not null default 0 check (gross_revenue >= 0),
  platform_fee bigint not null default 0 check (platform_fee >= 0),
  ads_cost bigint not null default 0 check (ads_cost >= 0),
  store_voucher bigint not null default 0 check (store_voucher >= 0),
  total_cogs bigint not null default 0 check (total_cogs >= 0),
  net_margin bigint not null default 0,
  total_items_sold integer not null default 0 check (total_items_sold >= 0),
  sold_products jsonb not null default '[]'::jsonb,
  proof_url text default '',
  notes text default '',
  status text not null default 'completed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists live_sessions_date_idx on public.live_sessions (session_date desc);
create index if not exists live_sessions_host_idx on public.live_sessions (host_name);

drop trigger if exists set_updated_at_live_sessions on public.live_sessions;
create trigger set_updated_at_live_sessions before update on public.live_sessions
for each row execute function public.set_updated_at();

alter table public.live_sessions enable row level security;
grant select, insert, update, delete on public.live_sessions to authenticated;

drop policy if exists "live_sessions_select" on public.live_sessions;
create policy "live_sessions_select" on public.live_sessions for select to authenticated using (public.is_active());

drop policy if exists "live_sessions_insert" on public.live_sessions;
create policy "live_sessions_insert" on public.live_sessions for insert to authenticated with check (public.has_role(array['host','finance','owner']));

drop policy if exists "live_sessions_update" on public.live_sessions;
create policy "live_sessions_update" on public.live_sessions for update to authenticated using (public.has_role(array['host','finance','owner']));

drop policy if exists "live_sessions_delete" on public.live_sessions;
create policy "live_sessions_delete" on public.live_sessions for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- K. TRANSAKSI PENJUALAN & QUICK POS INVOICE (SALES_ORDERS)
-- ----------------------------------------------------------------------------
create table if not exists public.sales_orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null,
  resi_no text unique not null,
  store_name text not null,
  branch text not null default 'Cabang 1 (Pusat)',
  platform text not null default 'Direct / Manual',
  courier text not null default 'Kurir Internal',
  is_instant boolean not null default false,
  customer_name text not null default 'Pelanggan',
  customer_phone text default '',
  payment_method text default 'Transfer Bank',
  sku text default '',
  qty integer not null default 1 check (qty > 0),
  subtotal bigint not null default 0,
  discount bigint not null default 0,
  shipping bigint not null default 0,
  total_amount bigint not null default 0,
  items_json jsonb not null default '[]'::jsonb,
  status_qc text not null default 'Belum Scan',
  order_status text not null default 'pending' check (order_status in ('pending', 'shipped', 'delivered', 'returned', 'cancelled')),
  print_status text not null default 'unprinted' check (print_status in ('unprinted', 'printed')),
  order_date date not null default current_date,
  notes text default '',
  cashier_name text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists sales_orders_resi_idx on public.sales_orders (resi_no);
create index if not exists sales_orders_date_idx on public.sales_orders (order_date desc);
create index if not exists sales_orders_store_idx on public.sales_orders (store_name);

drop trigger if exists set_updated_at_sales_orders on public.sales_orders;
create trigger set_updated_at_sales_orders before update on public.sales_orders
for each row execute function public.set_updated_at();

alter table public.sales_orders enable row level security;
grant select, insert, update on public.sales_orders to authenticated;

drop policy if exists "sales_orders_select" on public.sales_orders;
create policy "sales_orders_select" on public.sales_orders for select to authenticated using (public.is_active());

drop policy if exists "sales_orders_insert" on public.sales_orders;
create policy "sales_orders_insert" on public.sales_orders for insert to authenticated with check (public.is_active());

drop policy if exists "sales_orders_update" on public.sales_orders;
create policy "sales_orders_update" on public.sales_orders for update to authenticated using (public.has_role(array['warehouse','finance','host']));

-- ----------------------------------------------------------------------------
-- L. LOG SCAN VALIDASI QC PACKING (QC_LOGS — ANTI-DOBEL RESI MUTLAK)
-- ----------------------------------------------------------------------------
create table if not exists public.qc_logs (
  id uuid primary key default gen_random_uuid(),
  qc_code text unique not null,
  resi_no text unique not null, -- CONSTRAINT UNIQUE: Cegah dobel scan resi lintas device!
  order_no text default '',
  sku text default '',
  stage text not null default 'QC 2 (Packing Final)',
  status text not null default 'Lolos QC',
  checker_name text not null default 'Staff Gudang',
  notes text default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists qc_logs_resi_idx on public.qc_logs (resi_no);
create index if not exists qc_logs_created_idx on public.qc_logs (created_at desc);

alter table public.qc_logs enable row level security;
grant select, insert, delete on public.qc_logs to authenticated;

drop policy if exists "qc_logs_select" on public.qc_logs;
create policy "qc_logs_select" on public.qc_logs for select to authenticated using (public.is_active());

drop policy if exists "qc_logs_insert" on public.qc_logs;
create policy "qc_logs_insert" on public.qc_logs for insert to authenticated with check (public.has_role(array['warehouse','finance']));

drop policy if exists "qc_logs_delete" on public.qc_logs;
create policy "qc_logs_delete" on public.qc_logs for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- M. PENERIMAAN RETUR PAKET (RETURNS)
-- ----------------------------------------------------------------------------
create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  return_code text unique not null,
  resi_no text unique not null, -- Cegah retur resi yang sama diinput 2x
  store_name text default '',
  customer_name text default '',
  sku text default '',
  qty integer not null default 1,
  reason text default '',
  condition text not null default 'Bagus (Segel Utuh)',
  stock_action text not null default 'Restock ke Gudang (+1)',
  damage_notes text default '',
  photo_url text default '',
  return_date date not null default current_date,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists returns_resi_idx on public.returns (resi_no);
create index if not exists returns_date_idx on public.returns (return_date desc);

alter table public.returns enable row level security;
grant select, insert, update, delete on public.returns to authenticated;

drop policy if exists "returns_select" on public.returns;
create policy "returns_select" on public.returns for select to authenticated using (public.is_active());

drop policy if exists "returns_insert" on public.returns;
create policy "returns_insert" on public.returns for insert to authenticated with check (public.has_role(array['warehouse','finance']));

drop policy if exists "returns_delete" on public.returns;
create policy "returns_delete" on public.returns for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- N. PRESENSI KARYAWAN GPS 10M & KAMERA LIVE (ATTENDANCE_LOGS)
-- ----------------------------------------------------------------------------
create table if not exists public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  att_code text unique not null,
  att_date date not null default current_date,
  att_time text not null,
  staff_name text not null,
  email text default '',
  role text default 'warehouse',
  branch text not null default 'MJA Pusat (Semarang)',
  att_type text not null default 'office' check (att_type in ('office', 'courier')),
  in_out text not null check (in_out in ('Masuk', 'Pulang')),
  coords text not null,
  distance_meters numeric(10,2) not null default 0,
  status text not null default 'valid',
  notes text default '',
  photo_url text default '',
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id) on delete set null
);

create index if not exists attendance_date_idx on public.attendance_logs (att_date desc);
create index if not exists attendance_email_idx on public.attendance_logs (email);

alter table public.attendance_logs enable row level security;
grant select, insert, update, delete on public.attendance_logs to authenticated;

drop policy if exists "attendance_select" on public.attendance_logs;
create policy "attendance_select" on public.attendance_logs for select to authenticated using (
  public.is_admin() or email = (select auth.email()) or created_by = (select auth.uid())
);

drop policy if exists "attendance_insert" on public.attendance_logs;
create policy "attendance_insert" on public.attendance_logs for insert to authenticated with check (public.is_active());

drop policy if exists "attendance_update_admin" on public.attendance_logs;
create policy "attendance_update_admin" on public.attendance_logs for update to authenticated using (public.is_admin());

drop policy if exists "attendance_delete_admin" on public.attendance_logs;
create policy "attendance_delete_admin" on public.attendance_logs for delete to authenticated using (public.is_admin());

-- ----------------------------------------------------------------------------
-- O. FUNGSI ATOMIK RPC (TRANSAKSI AMAN & ANTI-DOBEL LINTAS PERANGKAT)
-- ----------------------------------------------------------------------------

-- 1. RPC: Scan Validasi Packing / Kirim (Anti-Dobel Resi + Update Order)
create or replace function public.rpc_scan_qc_kirim(
  p_resi_no text,
  p_order_no text,
  p_sku text,
  p_stage text,
  p_checker_name text,
  p_notes text default ''
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_qc_code text;
begin
  if not public.is_active() then
    raise exception 'Akses ditolak: akun belum aktif';
  end if;

  if exists (select 1 from public.qc_logs where resi_no = p_resi_no) then
    return jsonb_build_object('success', false, 'duplicate', true, 'message', 'DITOLAK: Nomor resi ' || p_resi_no || ' sudah pernah lolos scan QC sebelumnya!');
  end if;

  v_qc_code := 'QC-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDDHH24MISS') || '-' || substr(md5(random()::text), 1, 4);

  insert into public.qc_logs (qc_code, resi_no, order_no, sku, stage, status, checker_name, notes, created_by)
  values (v_qc_code, p_resi_no, coalesce(p_order_no, ''), coalesce(p_sku, ''), coalesce(p_stage, 'QC Packing'), 'Lolos QC', coalesce(p_checker_name, 'Gudang'), coalesce(p_notes, ''), (select auth.uid()));

  update public.sales_orders
  set status_qc = 'Lolos QC (' || coalesce(p_stage, 'Packing') || ')', order_status = 'shipped', updated_at = now()
  where resi_no = p_resi_no;

  return jsonb_build_object('success', true, 'qc_code', v_qc_code, 'message', 'Resi ' || p_resi_no || ' lolos QC dan tersinkron real-time!');
end;
$$;
grant execute on function public.rpc_scan_qc_kirim(text, text, text, text, text, text) to authenticated;

-- 2. RPC: Proses Retur Paket + Restock Otomatis
create or replace function public.rpc_process_return(
  p_resi_no text,
  p_store_name text,
  p_customer_name text,
  p_sku text,
  p_qty integer,
  p_reason text,
  p_condition text,
  p_stock_action text,
  p_notes text default '',
  p_photo_url text default ''
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_ret_code text;
begin
  if not public.is_active() then
    raise exception 'Akses ditolak: akun belum aktif';
  end if;

  if exists (select 1 from public.returns where resi_no = p_resi_no) then
    return jsonb_build_object('success', false, 'duplicate', true, 'message', 'DITOLAK: Retur untuk resi ' || p_resi_no || ' sudah tercatat sebelumnya!');
  end if;

  v_ret_code := 'RET-' || to_char(now() at time zone 'Asia/Jakarta', 'YYYYMMDDHH24MISS');

  insert into public.returns (return_code, resi_no, store_name, customer_name, sku, qty, reason, condition, stock_action, damage_notes, photo_url, created_by)
  values (v_ret_code, p_resi_no, coalesce(p_store_name,''), coalesce(p_customer_name,''), coalesce(p_sku,''), greatest(1, coalesce(p_qty, 1)), coalesce(p_reason,''), coalesce(p_condition,'Bagus (Segel Utuh)'), coalesce(p_stock_action,'Restock ke Gudang (+1)'), coalesce(p_notes,''), coalesce(p_photo_url,''), (select auth.uid()));

  update public.sales_orders set order_status = 'returned', updated_at = now() where resi_no = p_resi_no;

  -- Jika kondisi bagus, restock ke Cabang A (Semarang)
  if p_sku is not null and p_sku <> '' and (p_condition ilike '%Bagus%' or p_condition = 'restock_good') then
    update public.inventory_items
    set stock_a = stock_a + greatest(1, coalesce(p_qty, 1)), updated_at = now()
    where kode = p_sku;

    insert into public.inventory_mutations (sku, mutation_type, qty, branch_to, reference_no, notes, created_by)
    values (p_sku, 'return_good', greatest(1, coalesce(p_qty, 1)), 'Cabang A (Semarang)', p_resi_no, 'Restock otomatis dari retur ' || p_resi_no, (select auth.uid()));
  end if;

  return jsonb_build_object('success', true, 'return_code', v_ret_code, 'message', 'Retur ' || p_resi_no || ' berhasil diproses!');
end;
$$;
grant execute on function public.rpc_process_return(text, text, text, text, integer, text, text, text, text, text) to authenticated;

-- ----------------------------------------------------------------------------
-- P. AKTIVASI SUPABASE REALTIME PUBLICATION (UPDATE SEKETIKA TANPA REFRESH)
-- ----------------------------------------------------------------------------
do $$ begin alter publication supabase_realtime add table public.app_settings; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.stores; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.inventory_items; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.inventory_mutations; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.live_sessions; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.sales_orders; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.qc_logs; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.returns; exception when duplicate_object then null; end $$;
do $$ begin alter publication supabase_realtime add table public.attendance_logs; exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Q. SEED DATA AWAL (NON-DESTRUKTIF — ON CONFLICT DO NOTHING)
-- ----------------------------------------------------------------------------
insert into public.app_settings (key, value) values
('office_geofence', '{"name":"MJA Pusat (Semarang)","address":"Maju Jaya Autopart GENUIN PART, Blok E2 No.5, Jl. Kw. Industri Candi Tahap V, Ngaliyan, Kota Semarang 50181","lat":-7.006970,"lng":110.340500,"radius":10,"maxCheckInTime":"08:30","minCheckOutTime":"17:00"}'::jsonb),
('sales_targets', '{"monthlyTarget":150000000,"branch1Target":90000000,"branch2Target":60000000}'::jsonb)
on conflict (key) do nothing;

-- 14 Toko (7 Semarang + 7 Bekasi)
insert into public.stores (kode, branch, platform, store_name, fee_admin, fee_ongkir, fee_service) values
('SHP-A1', 'Cabang A (Pusat)', 'shopee', 'Shopee Official Store A1 (Pusat)', 6.5, 4.0, 1.0),
('SHP-A2', 'Cabang A (Pusat)', 'shopee', 'Shopee Mall Store A2 (Pusat)', 7.0, 4.0, 1.0),
('SHP-A3', 'Cabang A (Pusat)', 'shopee', 'Shopee Grosir Store A3 (Pusat)', 6.0, 3.5, 1.0),
('SHP-A4', 'Cabang A (Pusat)', 'shopee', 'Shopee Retail Store A4 (Pusat)', 6.5, 4.0, 1.0),
('TTK-A1', 'Cabang A (Pusat)', 'tiktok', 'TikTok Shop Live A1 (Pusat)', 7.5, 3.0, 1.0),
('TTK-A2', 'Cabang A (Pusat)', 'tiktok', 'TikTok Shop Auto A2 (Pusat)', 7.5, 3.0, 1.0),
('TTK-A3', 'Cabang A (Pusat)', 'tiktok', 'TikTok Clearance A3 (Pusat)', 7.0, 3.0, 1.0),
('SHP-B1', 'Cabang B (Bekasi)', 'shopee', 'Shopee Official Store B1 (Bekasi)', 6.5, 4.0, 1.0),
('SHP-B2', 'Cabang B (Bekasi)', 'shopee', 'Shopee Grosir Store B2 (Bekasi)', 6.0, 3.5, 1.0),
('SHP-B3', 'Cabang B (Bekasi)', 'shopee', 'Shopee Spion Express B3 (Bekasi)', 6.5, 4.0, 1.0),
('SHP-B4', 'Cabang B (Bekasi)', 'shopee', 'Shopee Sparepart B4 (Bekasi)', 6.5, 4.0, 1.0),
('TTK-B1', 'Cabang B (Bekasi)', 'tiktok', 'TikTok Shop Live B1 (Bekasi)', 7.5, 3.0, 1.0),
('TTK-B2', 'Cabang B (Bekasi)', 'tiktok', 'TikTok Modifikasi B2 (Bekasi)', 7.5, 3.0, 1.0),
('TTK-B3', 'Cabang B (Bekasi)', 'tiktok', 'TikTok Flash Sale B3 (Bekasi)', 7.0, 3.0, 1.0)
on conflict (kode) do nothing;

-- Reload schema PostgREST
notify pgrst, 'reload schema';
