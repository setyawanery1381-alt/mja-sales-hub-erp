# Design System Blueprint — MJA Sales Hub
## Sistem ERP Penjualan Multi-Toko, Rekap Sesi Live, Inventori & Pemantauan Finansial

---

### 1. Karakter & Gaya Desain (UI Style)
- **Kategori Visual:** Hybrid Clean Corporate Elegan (Desktop) + Mobile-First Tactical Utilitarian (Smartphone).
- **Kesan Umum:** Presisi, terpercaya, modern, dengan keterbacaan data numerik tinggi (tanpa visual clutter).
- **Target Pengguna:** Direksi/Owner, Finance, Tim Live Streaming, Staf Gudang/Logistik, dan Tim IT.

---

### 2. Palet Warna & Token (HEX & Tailwind)
- **Background / Surface:**
  - Primary BG Canvas: `#F8FAFC` (`bg-slate-50`)
  - Container / Card Surface: `#FFFFFF` (`bg-white`)
  - Elevated / Dark Header & Sidebar: `#0F172A` (`bg-slate-900`)
- **Brand & Accent:**
  - Primary Accent: `#0F172A` (`text-slate-900` / `bg-slate-900`) — Deep Corporate Navy
  - Secondary Accent (Profit/Success): `#10B981` (`text-emerald-500` / `bg-emerald-500`) — Laba Bersih & Status Online
  - Warning / Queue Accent: `#F59E0B` (`text-amber-500` / `bg-amber-500`) — Status Offline & Pending Resi
  - Danger / Expense Accent: `#EF4444` (`text-red-500` / `bg-red-500`) — Biaya Admin, Iklan, & Retur Rusak
- **Text & Border:**
  - Text Primary: `#0F172A` (`text-slate-900`)
  - Text Muted: `#64748B` (`text-slate-500`)
  - Border / Divider: `#E2E8F0` (`border-slate-200`)

---

### 3. Tipografi & Hierarki
- **Font Family:** `Plus Jakarta Sans`, `Inter`, sans-serif.
- **Hierarki:**
  - H1 / Metrik Utama: 24–28px, Bold (Font Numeric Tabular).
  - H2 / Judul Halaman: 18–20px, SemiBold.
  - Subheading / Card Title: 14–16px, Medium.
  - Body Text: 13–14px, Regular.
  - Caption / Status Pill: 11–12px, SemiBold / Medium.

---

### 4. Struktur Layout & Navigasi
- **Mode PC Desktop (Owner, Finance, IT Admin):** Fixed Left Sidebar (240px wide) berlatar `#0F172A` + Sticky Topbar putih dengan pemilih toko dan tanggal + Area konten ber-grid responsif.
- **Mode Mobile Smartphone (Tim Gudang & Host Live):** Sticky Top Header dengan indikator status cloud/offline + Area form input *thumb-friendly* + Bottom Navigation Bar (5 menu cepat).

---

### 5. Bedah Komponen Detail
- **KPI Summary Cards:** Card putih beradius 12px dengan border tipis `#E2E8F0`, bayangan halus (`shadow-sm`), dan indikator tren persentase.
- **Status Pills:** Radius 9999px (full rounded) dengan warna latar lembut dan teks kontras (Online: `#DCFCE7`/`#166534`, Offline/Pending: `#FEF9C3`/`#854D0E`, Retur: `#FEE2E2`/`#991B1B`).
- **Data Table:** Header kolom berwarna `#F8FAFC`, hover state `#F1F5F9`, baris bergaris tipis, aksi langsung di baris (Cetak, Detail, Hapus).
- **Scanner Viewport:** Bingkai pemindai kamera responsif dengan garis pandu laser aktif untuk nomor resi paket retur.

---

### 6. Detail Visual & Interaksi
- **Transisi:** 150ms ease-in-out pada tombol dan hover card.
- **Offline Cache:** Queue badge kuning di sudut atas yang menampilkan jumlah data antrean lokal.
- **Ikon:** SVG inline terstruktur dengan ukuran seragam (20x20px untuk tombol, 16x16px untuk badge).

---

### 7. Design System Blueprint (Siap Pakai)
- **Access Mode:** Mode B - PRIVATE PORTAL (Seluruh aplikasi terproteksi Supabase Auth).
- **Roles:** `admin` (IT Admin), `owner` (Owner / Direksi), `finance` (Finance & Akunting), `host` (Host Sesi Live), `warehouse` (Gudang & Logistik).
- **Daftar Tabel Supabase:**
  1. `profiles` — Profil pengguna dan hak akses peran (`role`).
  2. `stores` — 5 Akun Toko Shopee dan Akun TikTok Shop.
  3. `inventory_items` — Master SKU produk, stok fisik, HPP (COGS), dan harga jual.
  4. `inventory_mutations` — Riwayat stok masuk, stok keluar, dan restock paket retur.
  5. `live_sessions` — Rekap performa sesi live shopping dan kalkulasi margin bersih.
  6. `sales_orders` — Transaksi order per akun toko, nomor resi, dan status cetak label.
  7. `returns` — Pencatatan fisik paket retur, kondisi barang, dan koreksi finansial.
  8. `logs` — Audit trail aktivitas sistem dan aksi administratif IT.
  9. `counters` — Generator kode transaksi atomik (`next_code`).

