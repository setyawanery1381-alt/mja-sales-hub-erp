# Product Requirements Document (PRD)
## Multi-Channel Sales, Live Analytics, Inventory & Financial Monitoring System (ERP MJA)

### 1. Judul & Ringkasan Eksekutif

- **Nama Produk:** Sistem Monitoring Penjualan Multi-Toko, Rekap Sesi Live & Manajemen Inventori Terpadu (MJA Sales Hub).
- **Kategori:** Aplikasi Web ERP Operasional & Monitoring Keuangan Berbasis Cloud (*Progressive Web App*).
- **Database & Backend:** Supabase (PostgreSQL, Supabase Auth, Row Level Security, Supabase Storage) dengan integrasi Google Workspace (Ekspor Google Sheets Otomatis).
- **Ringkasan:** 
  Aplikasi ini dirancang untuk menggantikan 100% proses rekap manual penjualan e-commerce multi-toko (5 akun Shopee dan akun TikTok Shop). Sistem mengintegrasikan pencatatan penjualan reguler, analisis pasca-sesi live shopping, kalkulasi margin bersih otomatis, pemantauan stok barang keluar/masuk, penanganan retur real-time, pencetakan resi terpusat, serta manajemen akses pengguna oleh tim IT.

---

### 2. Tujuan Produk & Nilai Bisnis

1. **Eliminasi Rekap Manual:** Mengubah proses rekap penjualan yang memakan waktu berjam-jam menjadi hitungan menit dengan fitur impor data atau quick-entry.
2. **Visibilitas Margin Bersih Riil:** Menghitung laba bersih transparan secara real-time:
   $$\text{Margin Bersih} = \text{Omset Kotor} - (\text{Admin Platform} + \text{Biaya Iklan/Ads} + \text{Voucher Toko} + \text{HPP Produk} + \text{Retur})$$
3. **Sinkronisasi Stok & Finansial Tanpa Selisih:** Setiap barang keluar dari gudang terhubung langsung dengan potensi pendapatan, dan setiap paket retur langsung mengoreksi stok serta pembukuan keuangan.
4. **Sentralisasi Operasional Multi-Akun:** Mengelola pemantauan order dan pencetakan resi dari 5 toko Shopee dalam satu pintu aplikasi.
5. **Keamanan & Standar Enterprise:** Memisahkan wewenang pengguna secara ketat lewat kontrol tim IT menggunakan *Row Level Security (RLS)*.
6. **Akses Fleksibel (Hybrid):** Tampilan adaptif (ringkas & responsif di smartphone untuk tim operasional, elegan & komprehensif di PC untuk Owner).

---

### 3. Pengguna Target & Matriks Hak Akses (Role-Based Access Control)

| Peran (Role) | Perangkat Utama | Ruang Lingkup Wewenang | Hak Akses Fitur Utama |
| :--- | :--- | :--- | :--- |
| **IT Admin** | PC / Laptop | Pengelolaan infrastruktur & pengguna | Manajemen Akun & Password, Setting Toko/Platform, Audit Log, RLS Rules. |
| **Owner / Direksi** | PC & Smartphone | Pengawasan bisnis menyeluruh | Dashboard Eksekutif, Laporan Omset, Grafik Margin Bersih, Arus Kas, Ekspor Google Sheets (Read-Only). |
| **Finance / Akunting** | PC / Laptop | Keuangan & rekonsiliasi | Rekap Penjualan, Input Biaya Iklan/Operasional, Validasi Settlement, Ekspor Google Sheets/Excel. |
| **Tim Live / Host** | Smartphone | Pencatatan sesi live stream | Quick Form Sesi Live, Upload File Laporan Pasca-Live, Riwayat Performa Live Sendiri. |
| **Gudang / Logistik** | Smartphone & PC | Inventori, Resi & Retur | Scan Barcode Resi, Penerimaan Retur Barang, Input Barang Masuk/Keluar, Cetak Label Resi Massal. |

---

### 4. Arsitektur Data & Integrasi (Supabase & Google Workspace)

#### A. Skema Database Supabase (PostgreSQL)

1. **`users_profile`**
   - `id` (UUID, Primary Key, linked to `auth.users`)
   - `full_name` (Text), `role` (Enum: `admin_it`, `owner`, `finance`, `host`, `warehouse`)
   - `status` (Boolean: Active/Inactive), `created_at` (Timestamp)

2. **`stores` (Daftar Akun Toko)**
   - `id` (UUID, Primary Key)
   - `platform` (Enum: `shopee`, `tiktok`)
   - `store_name` (Text, misal: *Shopee Akun 1*, *Shopee Akun 2*, dll.)
   - `default_admin_fee_percent` (Numeric)

3. **`live_sessions` (Rekap Sesi Live)**
   - `id` (UUID, Primary Key)
   - `store_id` (UUID, FK -> `stores.id`)
   - `host_name` (Text), `session_date` (Date), `start_time` (Time), `end_time` (Time)
   - `gross_revenue` (Numeric) — Omset Kotor
   - `platform_fee` (Numeric) — Potongan Biaya Admin
   - `store_voucher` (Numeric) — Diskon/Voucher Toko
   - `ads_cost` (Numeric) — Biaya Iklan Live
   - `total_cogs` (Numeric) — Total HPP Barang Terjual
   - `net_margin` (Numeric) — Margin Bersih
   - `total_items_sold` (Integer)

4. **`sales_orders` (Data Transaksi Penjualan)**
   - `id` (UUID, Primary Key)
   - `order_no` (Text, Unique — ID Pesanan Marketplace)
   - `store_id` (UUID, FK -> `stores.id`)
   - `live_session_id` (UUID, Nullable, FK -> `live_sessions.id`)
   - `order_date` (Timestamp), `resi_no` (Text), `shipping_courier` (Text)
   - `order_status` (Enum: `pending`, `shipped`, `delivered`, `returned`, `cancelled`)
   - `gross_amount` (Numeric), `admin_fee` (Numeric), `cogs_amount` (Numeric), `net_amount` (Numeric)

5. **`inventory_items` (Master Produk & HPP)**
   - `id` (UUID, Primary Key)
   - `sku` (Text, Unique), `product_name` (Text)
   - `cogs` (Numeric) — Harga Pokok Penjualan (HPP)
   - `selling_price` (Numeric) — Harga Jual Dasar
   - `current_stock` (Integer)
   - `safety_stock` (Integer)

6. **`inventory_mutations` (Riwayat Stok Masuk/Keluar)**
   - `id` (UUID, Primary Key)
   - `item_id` (UUID, FK -> `inventory_items.id`)
   - `mutation_type` (Enum: `in`, `out`, `return_good`, `return_damage`)
   - `qty` (Integer), `reference_no` (Text), `notes` (Text), `created_at` (Timestamp)

7. **`returns` (Pencatatan Retur Paket)**
   - `id` (UUID, Primary Key)
   - `order_id` (UUID, FK -> `sales_orders.id`)
   - `resi_no` (Text), `condition` (Enum: `restock_good`, `damaged_reject`, `lost`)
   - `damage_photo_url` (Text — Supabase Storage Bucket)
   - `claim_status` (Enum: `none`, `claimed`, `approved`, `rejected`)
   - `created_at` (Timestamp)

#### B. Integrasi File & Google Workspace
- **Supabase Storage:** Bucket `receipt-labels` (file PDF resi cetak) dan bucket `return-evidence` (foto bukti fisik paket retur rusak).
- **Google Sheets Exporter:** Endpoint Web App / Webhook yang mengekspor data transaksi, rekap bulanan, dan margin bersih ke Google Spreadsheet tertentu dalam 1 klik untuk kebutuhan arsip dan rapat direksi.

---

### 5. Kebutuhan Fungsional (Fitur Utama)

#### A. Modul Penjualan & Rekap Sesi Live (Shopee & TikTok)
- **Import File Rekap (Fast & Bulk):** Pengguna mengunggah berkas ekspor laporan pesanan dari TikTok Seller Center atau Shopee Seller Center. Sistem otomatis memetakan kolom omset, fee admin, dan produk.
- **Form Pasca-Live Cepat (Mobile):** Host live dapat memasukkan ringkasan performa langsung via ponsel dalam 60 detik setelah siaran berakhir.
- **Kalkulator Margin Instan:** Otomatis menghitung laba bersih setelah dikurangi HPP produk, komisi admin, voucher, dan iklan live.

#### B. Modul Cetak Resi Multi-Akun (5 Toko Shopee) & Pengecualian Kurir Kilat
- Tampilan satu layar untuk filter daftar pesanan siap kirim berdasarkan toko tertentu atau gabungan seluruh toko.
- **Pengecualian Kurir Kilat (Instant / Sameday):** Filter kurir default `Exclude Instant / Sameday` untuk secara otomatis menyaring pesanan kurir kilat (Grab/Gojek/SPX Instant) yang tidak diproses gudang dari antrean cetak massal.
- Fitur *Generate & Batch Print*: Memilih ratusan order reguler dan mencetak thermal shipping label secara serentak tanpa perlu login-logout di banyak akun Shopee.

#### C. Modul Gudang, Manajemen Stok Spion Mobil & Motor (By Group) & Kalkulator Harga Modal Online
- **Pengelompokan Produk Berdasarkan Group (By Group):**
  - Stok dikelompokkan secara terstruktur (misal: *Spion Mobil*, *Spion Motor*, *Aksesoris & Sparepart Spion*).
  - Dilengkapi tab filter cepat (*quick pills*) per group beserta jumlah stok aktif di masing-masing kategori.
  - Pencarian fleksibel (*search bar*) berdasarkan kode SKU, nama varian produk spion, atau nama kendaraan/tipe.
- **Fleksibilitas Tambah Group & Produk Manual:**
  - Fitur **+ Tambah Group Baru**: Pengguna dapat menambahkan kelompok produk baru secara manual kapan saja tanpa perlu menyentuh database.
  - Fitur **+ Tambah Produk Spion**: Pengguna dapat menambahkan SKU produk spion baru lengkap dengan group, HPP, harga jual normal, dan stok awal.
  - Fitur **Edit Stok & Harga**: Mengubah stok fisik (saat opname/restock) serta mengganti group produk langsung dari antarmuka.
- Pelacakan stok otomatis berkurang ketika status pesanan diproses kirim.
- Proyeksi pendapatan otomatis dari seluruh barang yang keluar gudang.
- **Kalkulator Harga Modal & Rekomendasi Jual Online:** Simulator penetapan harga jual marketplace yang memperhitungkan Modal Dasar HPP, fee komisi Shopee (7.5% - 9.0%) / TikTok (10.5%), alokasi iklan live (ads), dan voucher diskon toko sehingga target profit bersih riil tercapai 100% tanpa tekor. Mendukung mode hitung rekomendasi otomatis maupun input harga manual.

#### D. Modul Retur Paket Pintar (Smart Returns)
- Dukungan **Barcode Scanner / Kamera HP** untuk membaca nomor resi paket retur.
- Klasifikasi 1-Klik & Logika Stok:
  - *Kondisi Bagus / Layak Jual:* Stok fisik gudang otomatis **BERTAMBAH KEMBALI (+1)** ke inventori aktif (Restock) agar siap dijual lagi tanpa selisih stok.
  - *Kondisi Rusak / Cacat / Hilang:* Stok aktif **TIDAK bertambah (+0)**, otomatis tercatat di pos Barang Reject / Rugi untuk klaim ganti rugi ekspedisi/marketplace.
- Koreksi pembukuan instan: Pembatalan omset pesanan retur secara transparan pada pembukuan margin bersih P&L.

#### E. Fitur Ekspor ke Google Sheets & Excel
- Tombol **"Ekspor ke Google Sheet"** di setiap halaman laporan dan ringkasan eksekutif.
- Opsi unduh file Excel (.xlsx) atau sinkronisasi langsung ke Google Spreadsheet drive kantor.

#### F. Modul Manajemen Pengguna Khusus IT & Kontrol Mode Sistem
- Pembuatan akun baru, penentuan role pengguna, dan reset password dilakukan mandiri oleh IT Admin.
- Pembatasan level data via Supabase RLS (tim live hanya bisa melihat sesinya sendiri, staf gudang hanya melihat mutasi barang, atasan melihat semua).
- **Kontrol Mode Sistem (Trial Kantor vs Offline):** Switch kontrol mode operasional. Selama masa trial, sistem difokuskan 100% Cloud Online agar data real-time langsung masuk ke kantor, sementara kapabilitas offline lokal disimpan sebagai cadangan.

---

### 6. Arsitektur Teknis, Mode Sistem & Keamanan

1. **Fokus Operasional Trial: 100% Cloud Online (Supabase Real-time):**
   - Seluruh transaksi live, mutasi stok gudang, dan rekonsiliasi keuangan langsung tersinkronisasi detik per detik ke database cloud PostgreSQL Supabase.
   - Mode offline lokal (PWA & IndexedDB Queue) tetap tertanam di arsitektur aplikasi namun dapat dinonaktifkan/diaktifkan melalui toggle di panel IT Admin.
2. **Performa Tinggi:** Waktu pemuatan dashboard < 1 detik dengan *indexed queries* di PostgreSQL, mampu menangani jutaan transaksi multi-tahun.
3. **Keamanan:** Komunikasi terenkripsi penuh via HTTPS/WSS, otentikasi JWT Supabase, dan data dilindungi oleh aturan RLS (*Row Level Security*).

---

### 7. Rancangan Desain Antarmuka (UI/UX)

#### A. Mode Smartphone (Mobile-First Praktis)
- **Pengguna:** Tim Live, Petugas Gudang, Kurir.
- **Ciri Khas Tampilan:**
  - Tombol aksi berukuran besar (*thumb-friendly*), ramah sentuhan satu tangan.
  - Form input ringkas satu halaman tanpa scrolling rumit.
  - Antarmuka scanner kamera cepat untuk pemindaian resi dan unggah foto retur.
  - Indikator status jaringan yang jelas: *Badge Hijau (Online)* / *Badge Kuning (Offline - X data tersimpan di perangkat)*.

#### B. Mode Desktop / PC (Dashboard Corporate Elegan)
- **Pengguna:** Owner/Direksi, Finance, IT Admin.
- **Ciri Khas Tampilan:**
  - Palet warna profesional: *Deep Navy / Slate Blue* dipadu dengan aksen *Emerald Green* (penanda laba positif) dan *Ruby Red* (penanda biaya/retur).
  - Layout *Multi-Pane / Sidebar Navigasi* yang rapi.
  - Kartu Metrik Utama (*KPI Cards*): Total Omset Kotor, Total Fee Admin, Biaya Ads, Nilai Retur, dan Margin Bersih Riil.
  - Grafik Interaktif: Tren omset harian, perbandingan profit antar 5 toko Shopee vs TikTok, dan rasio retur per kategori produk.
  - Toolbar Ekspor yang menonjol: Tombol **[Sync to Google Sheets]** dan **[Export Excel]**.

---

### 8. Rencana Deployment & Tahapan Pengujian

1. **Fase 1: Setup Database & Autentikasi Supabase**
   - Pembuatan skema tabel PostgreSQL, RLS policies, storage bucket, dan akun perdana IT Admin.
2. **Fase 2: Pengembangan Modul Utama (Gudang & Retur Mobile-First)**
   - Pembuatan fitur scan barcode resi retur, mutasi stok, dan mode offline (PWA).
3. **Fase 3: Pengembangan Modul Rekap Live & Penjualan**
   - Pembuatan form kalkulator margin pasca-live dan parser upload file Shopee/TikTok.
4. **Fase 4: Pengembangan Dashboard Eksekutif PC & Integrasi Google Sheets**
   - Penyusunan grafik performa multi-toko, rekap laba rugi, dan tombol ekspor Google Sheets.
5. **Fase 5: User Acceptance Testing (UAT) & Pelatihan Tim**
   - Pengujian input serentak multi-peran, simulasi transaksi retur, dan uji coba kondisi jaringan mati.

---

🎨 **Langkah Berikutnya: Menentukan Tampilan**
1. Sudah punya referensi? Unggah tangkapan layar, warna, dan gaya antarmuka yang Anda inginkan.
2. Belum punya referensi?
   - Salin seluruh teks PRD Final di atas.
   - Buka Google Stitch dan tempel teksnya.
   - Unduh pratinjau desain yang dihasilkan.
   - Unggah gambarnya ke percakapan ini supaya bisa diterapkan ke kode HTML dan CSS.

