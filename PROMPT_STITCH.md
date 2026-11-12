# Prompt Stitch — MJA Sales Hub (Multi-Channel Sales, Live Analytics, Inventory & Financial ERP)

Create detailed colored wireframes (structured, layout-focused UI screens) for MJA Sales Hub.
Use a full-color design from the start — apply the color palette, typography, and component styles defined below. Keep the layout structure clear and organized like a wireframe, but render every screen in full color.

## Application Context
MJA Sales Hub is an integrated cloud-based ERP and sales monitoring web app tailored for multi-channel e-commerce operations (5 Shopee stores and TikTok Shop Live streaming). It unifies post-live revenue and net margin calculations, centralized batch airway bill (resi) printing, barcode-assisted returns with inventory synchronization, offline-first warehouse workflows, and executive financial dashboards with 1-click Google Sheets export.
Has 4 main functional areas: Executive & Financial Monitoring, Live Stream Operations, Warehouse & Logistics (Mobile-First), and IT User Access Management.

## Design Identity
- Style: Hybrid Clean Corporate Elegan (for desktop dashboard) + Mobile-First Tactical Utilitarian (for handheld smartphone operations).
- Aesthetic: Card-based architecture, generous whitespace, crisp slate borders, subtle elevation shadows, and high-contrast metric badges.
- Color Palette:
  Primary: Deep Navy #0F172A — authoritative, solid corporate anchor.
  Secondary: Pure White #FFFFFF — clean content containers and cards.
  Surface: Cool Slate #F8FAFC — soft contrast page background.
  Accent: Emerald Green #10B981 — positive cash flow, net profit margin, and online status indicator.
  Warning: Warm Amber #F59E0B — pending items, offline queue badge, and RTS package review.
  Danger: Crimson Red #EF4444 — platform fees, advertising expenses, damaged return loss, and alert states.
  Text Primary: Slate 900 #0F172A — high readability headings and primary metrics.
  Text Muted: Slate 500 #64748B — secondary labels, timestamps, and metadata.
  Border/Divider: Subtle Gray #E2E8F0 — clean 1px structural separation.
- Typography: Plus Jakarta Sans or Inter — modern, clean geometric sans-serif with high tabular numeric clarity.
- Icons: Lucide Icons or Material Symbols — crisp outline 1.5px stroke line icons.
- Visual Language: Inspired by Stripe Dashboard, Shopify Admin, and Linear.
- Corner Radius: 12px for desktop cards, 16px for mobile cards, 8px for buttons and form inputs, 9999px for status pill badges.
- Shadow: Subtle elevation shadows (box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.07), 0 1px 2px -1px rgb(0 0 0 / 0.05)), no harsh black drops.
- Spacing: 8px base grid system (padding 16px to 24px in desktop containers; 12px to 16px in mobile containers).
- Typography Scale: H1 (28px/Bold), H2 (20px/SemiBold), H3 (16px/Medium), Body (14px/Regular), Caption/Label (12px/Medium).
- Layout & Navigation: Dual pattern — Desktop: Left vertical collapsible sidebar (240px wide) in Deep Navy #0F172A + sticky top app bar; Mobile: Sticky top bar with offline status badge + bottom thumb-friendly navigation bar (5 icons).
- Component Shapes: Filled pill status badges, clean flat form inputs with 1px border #CBD5E1 and #10B981 focus ring, prominent action buttons.
- Micro-Interactions: 150ms smooth hover elevations, offline queue counter pulse, and subtle skeleton shimmer loading states.

## Wireframe Pages Required

--- Pages-01: LOGIN & AUTHENTICATION (RESPONSIVE) ---
Layout: Centered auth card on subtle gradient background (#0F172A to #1E293B) with company branding
- Top Header: MJA Sales Hub logo icon with Emerald accent (#10B981) + Title "Sign In to MJA Portal" + Subtitle "Multi-Store E-Commerce & Operations Management"
- Connection Status Pill: Top-right indicator showing "Online - Connected to Supabase Cloud" (Green pill) or "Offline Mode Available" (Amber pill)
- Form Fields:
  - Input: Email / Username with user outline icon and clear placeholder
  - Input: Password with toggle visibility eye icon and "Forgot Password?" link (#10B981)
- Role Preview Pills: Small subtle badges displaying role targets (IT Admin, Owner, Finance, Live Host, Warehouse)
- Action: Primary filled button "Sign In" (Deep Navy #0F172A with white text, full width, height 44px, radius 8px)
- Footer: Security disclaimer "Secured with Supabase RLS & Role-Based Access Control | IT Managed"

--- Pages-02: EXECUTIVE FINANCIAL & MULTI-STORE DASHBOARD (PC DESKTOP VIEW) ---
Layout: Left dark navy sidebar (240px) + White top navbar with store multi-select dropdown + 3-column scrollable metric canvas
- Sidebar: MJA Logo, Navigation links with outline icons: [Executive Dashboard - Active], [Live Sessions], [Order & Resi Print], [Smart Returns], [Inventory], [Financial P&L], [IT Settings], and Bottom User Profile card with Logout
- Top Bar: Page Title "Executive Overview", Date Range Picker [Today, Last 7 Days, This Month, Custom], Store Filter Pills [All Stores (5 Shopee + TikTok), Shopee Store 1, Shopee Store 2, TikTok Shop], and Quick Action Button "[Sync to Google Sheets]" (Emerald green #10B981 with Sheets icon)
- Row 1 - KPI Summary Cards (4 white cards with 12px radius and top accent line):
  - Card 1: Gross Revenue (Omset Kotor) — Large bold font Rp 142.850.000 (Emerald tint icon) + "+18.4% vs last week"
  - Card 2: Total Deductions (Admin Fee + Ads + Vouchers) — Rp 24.320.000 (Red tint icon) with breakdown bar
  - Card 3: Real Net Margin (Laba Bersih Riil) — Rp 48.710.000 (Bold Emerald green #10B981) + "34.1% Net Margin"
  - Card 4: Total Orders & Return Rate — 2.410 orders, Return Rate 2.8% (Amber pill badge "Healthy")
- Row 2 - Interactive Visualizations:
  - Left Panel (65% width): Dual-line trend chart "Daily Gross vs Net Margin" with legend for Shopee stores vs TikTok Live
  - Right Panel (35% width): Donut chart "Cost Breakdown" showing % HPP (COGS), % Marketplace Admin Fee, % Ads Spend, % Net Margin
- Row 3 - Store Performance Leaderboard Table:
  - Columns: Store Name | Platform | Gross Sales | Admin Cut | Ads Spent | Returns | Real Net Margin | Action
  - Status badges for top performing store and live session highlights

--- Pages-03: POST-LIVE SESSION RECAP & MARGIN CALCULATOR (MOBILE-FIRST VIEW) ---
Layout: Smartphone view (375px/390px width layout) with sticky header, quick step indicators, and thumb-friendly inputs
- Sticky Mobile Header: Back arrow, Title "Rekap Sesi Live", Store selector pill, and Live Status Badge "Selesai" (Green pill)
- Top Quick Summary Box: Card with deep navy background showing "Live Streaming Summary: TikTok Live Akun A - Host: Rina" + Date & Time
- Tab Switcher: Two pill tabs: [Upload File Laporan (Fast)] and [Form Input 60 Detik]
- Option A View (File Upload Area):
  - Dashed drag-and-drop / tap-to-upload container for TikTok/Shopee settlement file with cloud upload icon
  - Auto-extracted preview pills: "Omset: Rp 18.500.000" | "Potongan Fee: Rp 1.950.000" | "Item Terjual: 248 pcs"
- Manual Adjustment Field:
  - Input: Biaya Iklan Live / TikTok Ads (Rp) with calculator helper icon
- Instant Net Margin Preview Card (Emerald tint background #ECFDF5 with 1px border #10B981):
  - Formula visual breakdown: Omset Kotor - Fee Admin - Voucher - Ads Live - Estimasi HPP
  - Big bold highlight: "Estimasi Margin Bersih Sesi Ini: Rp 6.420.000 (34.7%)"
- Bottom Sticky Action:
  - Big primary green button "[Simpan & Sinkronkan Stok Gudang]" (height 50px, rounded 12px, thumb-friendly)

--- Pages-04: MULTI-STORE ORDER LIST & BATCH RESI PRINTING (PC & TABLET VIEW) ---
Layout: Full-width table layout with collapsible sidebar and dedicated sticky batch printing action bar
- Top Header: H2 "Order Management & Centralized Resi Printing" + Total Ready to Ship Counter (Badge: 485 Orders Ready)
- Filter Bar:
  - Multi-account filter tabs: [All Stores] [Shopee Toko 1 (120)] [Shopee Toko 2 (85)] [Shopee Toko 3 (94)] [Shopee Toko 4 (66)] [Shopee Toko 5 (70)] [TikTok (50)]
  - Search box: Scan/type Order ID, Customer Name, or Resi Number
  - Courier filter: [All Couriers (J&T, SPX, SiCepat, JNE)]
- Bulk Action Sticky Banner (appears when orders selected):
  - "142 Pesanan Terpilih" + Action Button "[Cetak Thermal Label Terpusat (PDF)]" (Navy #0F172A) + "[Tandai Siap Kirim]" (Emerald #10B981)
- Order Data Table:
  - Columns: [✓ Checkbox] | No. Pesanan | Akun Toko | Kurir & Resi | Produk & Qty | Total Belanja | Status Cetak | Aksi
  - Print Status badges: "Belum Cetak" (Amber pill #FEF9C3 / #854D0E), "Sudah Dicetak" (Slate pill #F1F5F9 / #475569)
  - Quick action: Individual print icon, detail popup eye icon

--- Pages-05: SMART PACKAGE RETURNS WITH BARCODE SCANNER (MOBILE-FIRST VIEW) ---
Layout: Mobile smartphone view optimized for warehouse floor operations with large buttons and live camera scanner
- Top Bar: App title "Penerimaan Retur Paket" + Offline/Online status badge + Flashlight toggle button
- Barcode Scanner Viewport:
  - Interactive camera scanning frame with animated laser guide line and subtitle "Arahkan kamera ke barcode no. resi paket"
  - Manual input fallback: Quick input box "[Masukkan No. Resi Manual]" with [Cari] button
- Detected Package Card (slides up upon scan match):
  - Order ID: #SPX-9821389021 | Toko: Shopee Toko 3 | Asal Sesi: Reguler
  - Product preview: 1x Kemeja Oxford Navy (Size L) | HPP: Rp 45.000 | Nilai Order: Rp 129.000
- 1-Click Condition Selector (Two large touch-friendly cards):
  - Card 1: "[Kondisi Bagus / Layak Jual]" (Border #10B981, icon checkmark, label "Otomatis +1 Restock Gudang")
  - Card 2: "[Rusak / Cacat / Reject]" (Border #EF4444, icon alert, label "Masuk Biaya Rugi & Klaim Ekspedisi")
- Optional Photo Evidence Box: Camera button "[Ambil Foto Bukti Paket Rusak]"
- Bottom Action Button: Full-width button "[Konfirmasi & Update Finansial]" (Height 52px, Emerald filled, white text)
- Offline Queue Toast: "Tersimpan di antrean offline lokal. Akan disinkronkan saat terhubung Wi-Fi."

--- Pages-06: WAREHOUSE INVENTORY MUTATION & STOCK BALANCE (RESPONSIVE VIEW) ---
Layout: Responsive dual-mode layout (Card list on mobile, comprehensive data grid on PC)
- Header: Title "Manajemen Stok & Mutasi Gudang" + Quick Buttons: "[+ Barang Masuk / Restock]" and "[- Pengeluaran Manual]"
- Stock Metric Row: Total SKUs (142), Total Units in Stock (18.450 pcs), Total Stock Asset Value / HPP (Rp 820.000.000), Low Stock Alerts (4 SKUs)
- Search & Filter: Search SKU/Name, Filter by Category, Filter by Stock Status [Semua, Menipis, Habis, Aman]
- Inventory Table:
  - Columns: SKU Code | Foto & Nama Produk | HPP (COGS) | Harga Jual | Stok Fisik | Estimasi Potensi Omset | Status Stok | Riwayat
  - Status Pills: "Stok Aman" (Green pill), "Menipis (<10)" (Amber pill), "Habis" (Red pill)
- Slide-over Drawer / Modal (Mutation History):
  - Timeline of stock in/out: "Order Out: 24 pcs via TikTok Live", "Restock Return: +1 pc Resi #SPX9821", "Inbound PO: +200 pcs"

--- Pages-07: FINANCIAL P&L BREAKDOWN & GOOGLE SHEETS EXPORT (PC DESKTOP VIEW) ---
Layout: Desktop corporate financial layout with high-density data summary, period comparison, and direct export modal
- Top Header: H2 "Laporan Laba Rugi & Rekapitulasi Finansial" + Subtitle "Analisis Riil Omset Bersih Multi-Platform"
- Top Export Toolbar:
  - Primary Green Button "[Ekspor ke Google Sheets]" (Google Sheets green icon #0F9D58, triggers instant sheet sync)
  - Secondary Button "[Unduh File Excel (.xlsx)]"
  - Filter Period: [Bulanan: Oktober 2026] [Pilih Platform: All]
- Profit & Loss Statement Table (Corporate Clean Accounting Layout):
  - Row Section A: Pendapatan Kotor (Gross Sales: Shopee Toko 1 s/d 5 + TikTok) = Rp 320.500.000
  - Row Section B: Pengurang Penjualan Langsung
    - Potongan Biaya Admin Shopee (Platform Commission) = (Rp 25.640.000)
    - Potongan Biaya Komisi TikTok Shop = (Rp 12.820.000)
    - Biaya Voucher Diskon Toko = (Rp 8.400.000)
    - Total Nilai Retur Pembeli = (Rp 8.970.000)
  - Row Section C: Pendapatan Bersih Setelah Marketplace = Rp 264.670.000
  - Row Section D: Harga Pokok Penjualan (Total HPP Produk Keluar) = (Rp 128.200.000)
  - Row Section E: Biaya Pemasaran & Iklan (Shopee Ads + TikTok Live Ads) = (Rp 31.500.000)
  - Row Section F: Net Operational Margin (Laba Bersih Akhir) = Rp 104.970.000 (Bold Emerald Green #10B981, 32.7%)
- Google Sheets Sync Modal Preview:
  - Target Spreadsheet: "MJA_Sales_Report_Master_2026.gsheet"
  - Sync options: [Sync Data Transaksi Harian] [Sync Ringkasan Laba Rugi Bulanan]
  - Progress bar + Confirmation toast "Berhasil disinkronkan ke Google Drive Direksi"

--- Pages-08: IT ADMIN USER MANAGEMENT & STORE CONFIGURATION (PC DESKTOP VIEW) ---
Layout: Dedicated IT administration dashboard with user access control table and marketplace store API configuration
- Top Header: H2 "IT System Settings & Access Control" + Badge "Super Admin Only" + Button "[+ Tambah Pengguna Baru]"
- Sub-Navigation Tabs: [Manajemen Pengguna & Password] | [Konfigurasi Toko Marketplace] | [Audit Log Keamanan & RLS]
- User Management Table:
  - Columns: Nama Lengkap | Email / Username | Peran (Role) | Status Akun | Sesi Terakhir | Hak Akses Fitur | Aksi
  - Role Badges: "IT Admin" (Purple pill #F3E8FF / #7E22CE), "Owner" (Navy pill #E2E8F0 / #0F172A), "Finance" (Blue pill #DBEAFE / #1D4ED8), "Live Host" (Amber pill #FEF9C3 / #854D0E), "Warehouse" (Teal pill #CCFBF1 / #0F766E)
  - Action buttons: [Reset Password], [Ubah Role], [Nonaktifkan User]
- Store API & Account Configuration Cards (5 Shopee Stores + TikTok Shop):
  - Card per store: Store Name, Platform Logo, Connection Status ("Terhubung via Batch / API"), Default Admin Fee (%), Last Order Sync Time

## Wireframe Style Notes
- FULL COLOR design — do NOT use grayscale or black-and-white wireframe style.
- Apply the defined color palette consistently across all pages.
- Text placeholders: Use actual representative Indonesian e-commerce labels and values (Rp, Shopee, TikTok, HPP, Resi), not "Lorem Ipsum".
- Buttons: Primary = filled Deep Navy #0F172A or Emerald Green #10B981 with white text; Secondary = outlined with subtle slate border #CBD5E1; Danger = filled red #EF4444.
- Status badges as colored pills:
  - Online / Aktif / Sukses: bg #DCFCE7, text #166534
  - Offline / Pending / Menunggu: bg #FEF9C3, text #854D0E
  - Retur / Rusak / Dibatalkan: bg #FEE2E2, text #991B1B
  - Selesai / Terkirim: bg #DBEAFE, text #1E40AF
- Charts: Render interactive styled frames using palette colors (#0F172A, #10B981, #F59E0B, #EF4444) with clear numeric legends.
- Mobile Viewports: Render Pages-03 (Live Recap) and Pages-05 (Returns Scanner) specifically in smartphone portrait frame format (375px–390px) with touch-friendly thumb sizing.
- Add flow indicators:
  - Pages-01 (Login) -> Pages-02 (Executive Dashboard) for Owner/Finance
  - Pages-01 (Login) -> Pages-03 (Live Recap) for Live Stream Host
  - Pages-01 (Login) -> Pages-05 (Returns Scanner) for Warehouse Staff
  - Pages-05 (Returns) -> Pages-06 (Inventory Stock Update)
  - Pages-02 & Pages-07 -> 1-Click Google Sheets Sync Modal

## Global Design Requirements
- Responsive architecture: Desktop primary for Admin/Owner/Finance; Mobile-first portrait for Warehouse & Live Stream operations.
- Offline support indicators: Visual badge switching between Green (Cloud Connected) and Amber (Offline Cached Queue) with local counter.
- Toast notifications: Success (Emerald Green #10B981), Error (Red #EF4444), Info (Blue #3B82F6), Warning (Amber #F59E0B).
- Empty states: Clean outline icon + friendly contextual message + prominent action CTA button.
- Form validation: Inline helper texts with red border and message on invalid entries.
- The overall feel: A high-trust, elite corporate management tool that simultaneously feels as snappy and effortless as a modern native mobile app for warehouse and live streaming crews.

