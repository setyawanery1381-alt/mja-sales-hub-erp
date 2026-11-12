# Ringkasan Desain UI/UX — MJA Sales Hub

Dokumen ini merupakan panduan dan ringkasan arsitektur visual untuk pembuatan antarmuka (*wireframe / mockup*) aplikasi **MJA Sales Hub** di Google Stitch AI atau tools prototyping lainnya.

---

## 1. Palet Warna & Desain Token (Corporate Elegan + Mobile-First)

| Peran Warna | Nama Warna | Kode HEX | Padanan Tailwind | Fungsi & Makna |
| :--- | :--- | :--- | :--- | :--- |
| **Primary** | Deep Navy | `#0F172A` | `bg-slate-900` | Warna utama navbar, sidebar, header korporat, dan tombol utama desktop. |
| **Secondary** | Pure White | `#FFFFFF` | `bg-white` | Latar card container, tabel data, modal popup, dan bidang form. |
| **Surface** | Cool Slate | `#F8FAFC` | `bg-slate-50` | Latar belakang kanvas aplikasi, memberikan kontras lembut pada mata. |
| **Accent / Profit** | Emerald Green | `#10B981` | `bg-emerald-500` | Penanda laba bersih positif, badge status online, dan tombol ekspor Google Sheets. |
| **Warning / Queue** | Warm Amber | `#F59E0B` | `bg-amber-500` | Penanda order belum cetak, status antrean offline, dan paket dalam investigasi. |
| **Danger / Cost** | Crimson Red | `#EF4444` | `bg-red-500` | Penanda potongan biaya admin, anggaran iklan, nilai retur rugi, dan tombol bahaya. |
| **Border / Divider** | Subtle Slate | `#E2E8F0` | `border-slate-200`| Garis pemisah antar kolom, border card, dan outline tombol sekunder. |
| **Text Primary** | Dark Slate | `#0F172A` | `text-slate-900` | Teks judul, angka metrik utama, dan label penting. |
| **Text Muted** | Slate Gray | `#64748B` | `text-slate-500` | Teks keterangan bantuan, timestamp, subtitle, dan header tabel. |

---

## 2. Struktur Halaman Wireframe (Pages-01 s/d Pages-08)

| Kode Halaman | Nama Halaman | Target Pengguna | Mode Tampilan (Viewport) | Fokus Komponen Kunci |
| :--- | :--- | :--- | :--- | :--- |
| **Pages-01** | Login & Autentikasi | Semua Role Pengguna | Responsif (Desktop & Mobile) | Form login terproteksi IT, indikator status online/offline, role badge. |
| **Pages-02** | Executive Financial Dashboard | Owner & Finance | PC Desktop (Corporate View) | 4 KPI cards (Omset, Potongan, Margin Bersih), grafik tren harian, leaderboard toko. |
| **Pages-03** | Rekap Pasca-Live & Kalkulator Margin | Host Live / Tim Live | Mobile-First (Smartphone) | Tab upload file pesanan Shopee/TikTok, input biaya iklan live, kalkulator margin instan. |
| **Pages-04** | Order Multi-Toko & Cetak Resi Massal | Gudang & Admin Sales | PC Desktop & Tablet | Filter 5 toko Shopee + TikTok, status belum/sudah cetak, tombol cetak resi thermal serentak. |
| **Pages-05** | Penerimaan Retur Barang Pintar | Tim Gudang & Logistik | Mobile-First (Smartphone) | Kamera barcode scanner no. resi, selektor 1-klik (Bagus/Restock vs Rusak/Reject), offline queue badge. |
| **Pages-06** | Manajemen Stok & Mutasi Gudang | Gudang & Finance | Responsif (Desktop & Mobile) | Tabel mutasi stok masuk/keluar, alert stok menipis, valuasi total HPP aset. |
| **Pages-07** | Laporan Laba Rugi & Ekspor Sheets | Owner & Finance | PC Desktop (Corporate View) | Format pembukuan akuntansi laba rugi riil, tombol 1-klik ekspor Google Sheets & Excel. |
| **Pages-08** | IT User & Store API Management | Tim IT / Super Admin | PC Desktop (Corporate View) | Tabel hak akses per role, reset password, konfigurasi API 5 toko Shopee & TikTok. |

---

## 3. Tips Penggunaan di Google Stitch

1. **Buka Berkas Prompt:** Buka file [PROMPT_STITCH.md](file:///c:/Users/Saka%20Farma/.gemini/antigravity-ide/scratch/Aplikasi-report-sales_MJA/PROMPT_STITCH.md) di editor tengah.
2. **Salin Seluruh Teks:** Lakukan `Ctrl + A` (Select All) lalu `Ctrl + C` (Copy).
3. **Tempel di Google Stitch:** Buka Google Stitch AI, tempel (*Paste*) teks tersebut ke kolom prompt pembuatan prototipe.
4. **Hasil Berwarna Penuh:** Prompt sudah dirancang *full color* dengan kode HEX terukur, sehingga Stitch akan langsung membuat wireframe berwarna tanpa mode hitam-putih.
5. **Simpan Pratinjau Desain:** Unduh gambar atau salin URL hasil desain dari Google Stitch, lalu lampirkan di percakapan ini untuk langsung kita terapkan ke kode web aplikasinya!

