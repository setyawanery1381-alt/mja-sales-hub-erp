# PANDUAN LENGKAP INSTALASI & PENGGUNAAN (FIREBASE EDITION)
## MJA Sales Hub — Multi-Store ERP, Live Streaming Analytics & Warehouse Logistics
**Author:** DASarsitek / by @doople

---

### 1. Ringkasan Proyek & Tema Warna (Design Identity)
* **Kategori:** Web App SaaS ERP Operasional, Live Stream Analytics & Logistik Multi-Toko (Shopee & TikTok).
* **Access Mode:** **MODE B - PRIVATE PORTAL** (Seluruh fitur operasional terkunci rapat di balik autentikasi ketat).
* **Palet Warna Utama (HEX & Tailwind):**
  * `Primary Dark / Background`: `#0F172A` (`bg-slate-900`) — Nuansa korporat eksekutif.
  * `Surface Card`: `#FFFFFF` & `#F8FAFC` (`bg-slate-50`) — Bersih & kontras tinggi.
  * `Brand Accent (Profit)`: `#10B981` (`emerald-500`) — Indikator omset & margin laba bersih.
  * `Live Host Accent`: `#F59E0B` (`amber-500`) — Aksen sesi live shopping & performa host.
  * `Warning / Retur / Cancel`: `#EF4444` (`rose-500` / `ruby`) — Indikator resi dobel, paket cancel & retur rusak.
* **Tipografi:** Plus Jakarta Sans (`font-sans`) dengan bobot 500, 600, 700, dan 800.

---

### 2. Pengguna Target & Daftar Peran (Roles)
Sesuai rancangan PRD MJA Sales Hub, terdapat 5 role pengguna dengan pembatasan hak akses ketat:

| Peran (Role) | Ruang Lingkup Wewenang | Batasan Akses Data |
| :--- | :--- | :--- |
| **`admin`** (IT Administrator) | Akses 100% mutlak ke seluruh modul, manajemen user, reset password, dan pengaturan platform. | Tidak ada batasan. |
| **`owner`** (Direksi / Pemilik) | Pengawasan bisnis menyeluruh, grafik omset, analisis laba bersih riil P&L, dan ekspor data Google Sheets. | Mode **Read-Only** (tidak dapat mengedit stok atau data operasional langsung). |
| **`finance`** (Keuangan / Akunting) | Rekapitulasi penjualan, input voucher & biaya ads, analisis P&L, validasi fee marketplace, dan ekspor. | Akses penuh ke keuangan dan order; dapat melihat stok namun dibatasi mengedit inventori. |
| **`host`** (Tim Host Live) | Input cepat pasca siaran live (omset kotor, kupon, estimasi ads) dan absensi selfie GPS. | **Terkunci ketat**: Hanya melihat menu Rekap Sesi Live & Absensi; tidak bisa melihat dashboard atau menu lain. |
| **`warehouse`** (Gudang / Logistik) | Pengelolaan stok spion mobil/motor by group, scan validasi kirim QC, penerimaan retur, dan absensi GPS. | **Terkunci ketat**: Tidak diberi akses ke omset, laba, margin, dan kalkulator harga modal. |

---

### 3. Struktur Koleksi Database Cloud Firestore (Native Mode)

1. **`users/{uid}`**: Profil pengguna (ID dokumen = UID Firebase Auth).
   * *Field:* `uid` (string), `email` (string), `nama` (string), `role` (enum), `branch` (string), `aktif` (boolean), `createdAt`, `updatedAt`.
2. **`system/bootstrap`**: Penanda bootstrap sistem sekali pakai (one-time setup) untuk akun admin perdana.
3. **`meta/{id}`**: Dokumen seeded metadata dan pengaturan konfigurasi sistem.
4. **`counters/{name}`**: Nomor urut otomatis (misal: kode order, transaksi retur) dengan atomic transaction increment.
5. **`logs/{id}`**: Audit log append-only (aktivitas penting, waktu, UID pelaku).
6. **`stores/{id}`**: Master toko multi-channel (Shopee Akun 1 s/d 5, TikTok Shop Live).
   * *Field:* `name`, `platform`, `fee` (persentase komisi), `active`.
7. **`liveSessions/{id}`**: Rekapitulasi performa sesi live streaming.
   * *Field:* `store`, `host`, `date`, `omset`, `fee`, `ads`, `voucher`, `cogs`, `margin`, `items`.
8. **`orders/{id}`**: Data pesanan marketplace, resi, status pengiriman kurir.
   * *Field:* `orderNo`, `store`, `resi`, `courier`, `isInstant`, `printed`, `total`, `status`.
9. **`inventoryGroups/{id}`**: Kategori/kelompok produk spion (*Spion Mobil*, *Spion Motor*, *Aksesoris & Sparepart*).
10. **`inventory/{id}`**: Master produk spion, SKU, stok gudang, batas aman, HPP, dan harga jual normal.
11. **`returns/{id}`**: Pencatatan paket retur (barcode resi, kondisi bagus/restock vs rusak/reject, status klaim).
12. **`qcLogs/{id}`**: Log validasi scan kirim gudang (anti double-print & auto-cancel prevention).
13. **`attendance/{id}`**: Log presensi GPS (koordinat, radius 100m, dinas luar kurir) + foto selfie kamera langsung bertanda air.

---

### 4. Matriks Hak Akses Keamanan (Role x Koleksi Firestore)

| Koleksi Firestore | `admin` | `owner` | `finance` | `host` | `warehouse` |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`users`** | R / W / D | R | R (nama saja) | R (profil sendiri) | R (profil sendiri) |
| **`stores`** | R / W / D | R | R / W | R | R |
| **`liveSessions`** | R / W / D | R | R / W | R / W (milik sendiri) | ❌ **Ditolak** |
| **`orders`** | R / W / D | R | R / W | ❌ Ditolak | R / Update Packing |
| **`inventoryGroups`**| R / W / D | R | R | ❌ Ditolak | R / W |
| **`inventory`** | R / W / D | R | R | ❌ Ditolak | R / Update Stok |
| **`returns`** | R / W / D | R | R / W | ❌ Ditolak | R / W (Penerimaan) |
| **`qcLogs`** | R / W / D | R | R | ❌ Ditolak | R / W (Scan Outbound) |
| **`attendance`** | R / W / D | R | R | R / W (Selfie Sendiri) | R / W (Selfie Sendiri) |
| **`logs`** | R (Read Audit) | R | ❌ Ditolak | ❌ Ditolak | ❌ Ditolak |

---

### 5. Panduan Instalasi Langkah Demi Langkah (Step-by-Step)

#### Langkah 1: Persiapan Project di Firebase Console
1. Buka [Firebase Console](https://console.firebase.google.com/) dan buat project baru (misal: `mja-sales-hub-erp`).
2. Masuk ke menu **Build** > **Firestore Database**:
   * Klik **Create database**.
   * Pilih lokasi server terdekat (misal: `asia-southeast2` Jakarta atau `asia-southeast1` Singapura).
   * Pilih **Start in production mode**, lalu klik **Create**.
3. Masuk ke menu **Build** > **Authentication**:
   * Klik **Get started**, pada tab **Sign-in method**, aktifkan provider **Email/Password** (biarkan opsi *Email link* nonaktif).
   * Pada tab **Settings** > **User actions**, nonaktifkan centang *"Enable create (sign-up)"* agar pihak luar tidak bisa mendaftar akun sendiri.
4. Buat Akun Admin Pertama di Authentication:
   * Masuk ke tab **Users** > Klik tombol **Add user**.
   * Masukkan email: `admin@proyekanda.com` (atau email kantor Anda).
   * Masukkan password (minimal 6 karakter, misal: `das12345`).
   * *Catatan:* Akun pertama yang dibuat di console ini otomatis diangkat menjadi Super IT Admin pada saat login perdana via aplikasi.

#### Langkah 2: Daftarkan Web App & Dapatkan Kredensial
1. Di Firebase Console, klik icon gerigi di samping *Project Overview* > **Project settings**.
2. Gulir ke bawah pada bagian *Your apps*, klik icon Web (`</>`).
3. Beri nama aplikasi (misal: `MJA Web Client`), lalu klik **Register app**.
4. Salin objek `firebaseConfig` yang muncul di layar:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "mja-sales-hub-erp.firebaseapp.com",
     projectId: "mja-sales-hub-erp",
     storageBucket: "mja-sales-hub-erp.firebasestorage.app",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
5. Buka file **`index.html`** di workspace, cari blok `// ====== [ISI DI SINI] FIREBASE CONFIG` di bagian atas `<script>`, lalu tempelkan kredensial tersebut menggantikan placeholder.
6. Buka file **`code.gs`**, masukkan `FIREBASE_PROJECT_ID` dan `FIREBASE_API_KEY` pada baris konstanta di atas.

#### Langkah 3: Publish Aturan Keamanan (Firestore Security Rules)
1. Di Firebase Console, masuk ke **Firestore Database** > Tab **Rules**.
2. Buka file **`firestore.rules`** yang ada di workspace Anda, salin seluruh isinya.
3. Tempelkan ke editor Rules di Firebase Console.
4. Klik tombol **Publish**. Aturan keamanan kelas produksi kini aktif melindungi seluruh database.

#### Langkah 4: Setup & Deploy di Google Apps Script (GAS)
1. Buka [Google Apps Script](https://script.google.com/) dan buat project baru.
2. Salin isi file **`code.gs`** dari workspace ke file `Kode.gs` / `code.gs` di Apps Script.
3. Buat file HTML baru dengan nama **`index`** (Apps Script otomatis menambahkan `.html`), lalu salin seluruh isi file **`index.html`** dari workspace ke dalamnya.
4. Aktifkan Manifest:
   * Di Apps Script, klik menu **Project Settings** (ikon gerigi di kiri).
   * Centang opsi *"Show "appsscript.json" manifest file in editor"*.
   * Kembali ke tab Editor, buka file **`appsscript.json`**, dan ganti isinya dengan isi file `appsscript.json` dari workspace (berisi scopes OAuth Firestore, Sheets, dan Cloud Platform).
5. Uji Coba Koneksi:
   * Pilih fungsi **`testFirebaseConnection`** pada dropdown fungsi di toolbar atas editor Apps Script.
   * Klik tombol **Run**. Setujui jendela izin akses akun Google (*Review Permissions*).
   * Pastikan jendela *Execution Log* menampilkan status verifikasi koleksi berhasil.
6. Publikasikan Web App:
   * Klik tombol **Deploy** di pojok kanan atas > **New deployment**.
   * Pilih jenis deployment: **Web app**.
   * Atur konfigurasi:
     * *Execute as:* **Me (email Anda)**
     * *Who has access:* **Anyone (Siapa saja)**
   * Klik **Deploy**, lalu salin URL Web App yang dihasilkan.

---

### 6. Akun Pengujian & Uji Coba Demo (Mock vs Live)

#### A. Pengujian Offline / Demo (Tanpa Firebase):
Sebelum mengisi konfigurasi Firebase, aplikasi berjalan 100% lancar menggunakan **Mode Demo Lokal** (0ms latency). Anda bisa langsung mencoba login dengan tombol demo cepat:
* **IT Admin:** `admin@demo.com` / `das12345` (Akses semua menu)
* **Owner:** `owner@demo.com` / `das12345` (Akses pantauan omset & eksekutif)
* **Finance:** `finance@demo.com` / `das12345` (Akses sesi live, order & kalkulator modal)
* **Host Live:** `host@demo.com` / `das12345` (Terkunci hanya untuk rekap live & absensi)
* **Kepala Gudang:** `warehouse@demo.com` / `das12345` (Terkunci untuk stok spion, QC outbound, retur & absensi)

#### B. Pengujian Live Firebase:
Gunakan akun yang telah Anda daftarkan di Firebase Authentication (Langkah 1 poin 4). Saat login pertama kali, sistem menjalankan batch bootstrap otomatis untuk mendaftarkan akun Anda sebagai Admin IT.

---

### 7. Panduan Penggunaan Fitur Unggulan Terbaru

1. **Kamera Selfie Absensi Langsung (Anti-Fraud):**
   * Staf membuka menu **"Absensi & GPS"**.
   * Kamera depan/webcam aktif otomatis secara live di layar.
   * **Tidak ada tombol unggah galeri** untuk mencegah kecurangan titip absen atau foto lama.
   * Klik tombol **"Ambil Foto Selfie"**: sistem otomatis membubuhkan watermark permanen berupa Nama, Cabang, Jam:Menit:Detik WIB, dan Koordinat GPS.
   * Foto tersimpan dan dapat diklik di tabel riwayat untuk melihat pratinjau resolusi tinggi.
2. **Scan Validasi Kirim QC Outbound:**
   * Sebelum kurir pick-up, petugas gudang memindai barcode resi di menu **"Scan Validasi Kirim"**.
   * Audio beeper otomatis membunyikan nada:
     * *Nada Tinggi Singkat:* Paket Lolos QC & Siap Kirim.
     * *Dua Nada Peringatan:* Resi Dobel Cetak (Mencegah kirim ganda).
     * *Sirene Bahaya:* Paket Telah Dibatalkan Pembeli (Mencegah kerugian barang keluar).
3. **Pemisahan Cabang Operasional:**
   * Pengguna dapat memilih **Cabang 1 (Pusat & Gudang Utama)** atau **Cabang 2 (Gudang Hub Ekspedisi)** saat login atau melalui switcher di topbar.

---

Generated by Doople Apps Script | By @doople
