/**
 * ============================================================================
 * SETUP DATABASE SPREADSHEET — MJA SALES HUB ERP
 * Otomatis membuat seluruh Tab Sheet, Header Berwarna, Format Kolom, & Data Awal
 * Author: DASarsitek / by @doople
 * ============================================================================
 * 
 * CARA PAKAI:
 * 1. Buka Google Sheets baru di browser (sheets.new)
 * 2. Klik Ekstensi > Apps Script
 * 3. Buat file baru bernama "setup.gs" dan tempel seluruh kode ini
 * 4. Di dropdown fungsi bagian atas, pilih "setupDatabase", lalu klik "Jalankan" (Run ▶️)
 * 5. Berikan izin akses Google (Authorize)
 * 6. Selesai! Seluruh struktur database otomatis terbangun di Spreadsheet Anda.
 */

function setupDatabase() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Palet Warna Header MJA Sales Hub
  var PRIMARY_COLOR = '#1F1A17'; // Deep Charcoal / Hitam Elegan
  var ACCENT_COLOR = '#2F5D50';  // Forest Emerald
  var TEXT_COLOR = '#FFFFFF';
  
  var schemas = [
    {
      name: 'Presensi',
      headers: [
        'ID Presensi', 'Tanggal', 'Jam (WIB)', 'Nama Karyawan', 'Email', 
        'Role / Divisi', 'Cabang', 'Tipe Kehadiran', 'Masuk/Pulang', 
        'Koordinat GPS', 'Jarak (Meter)', 'Status Verifikasi', 'Catatan / Ekspedisi', 'Foto Selfie'
      ],
      sampleRows: [
        [
          'ATT-20261106-001', '2026-11-06', '08:02', 'Ahmad Fauzi', 'warehouse@demo.com',
          'warehouse', 'Cabang 1 (Pusat & Gudang Utama)', 'office', 'Masuk',
          '-6.9827, 110.4209', 14, 'valid', 'Hadir tepat waktu di gudang', ''
        ],
        [
          'ATT-20261106-002', '2026-11-06', '08:15', 'Sarah Amanda', 'host@demo.com',
          'host', 'Cabang 1 (Pusat & Gudang Utama)', 'office', 'Masuk',
          '-6.9825, 110.4206', 21, 'valid', 'Persiapan live shopping pagi', ''
        ],
        [
          'ATT-20261106-003', '2026-11-06', '09:30', 'Budi Santoso', 'warehouse@demo.com',
          'warehouse', 'Cabang 1 (Pusat & Gudang Utama)', 'courier', 'Masuk',
          '-6.9950, 110.4310', 1420, 'courier', 'Tugas Kirim: J&T Cargo', ''
        ]
      ]
    },
    {
      name: 'Users',
      headers: ['UID', 'Email', 'Nama Lengkap', 'Role', 'Cabang Operasional', 'Status Akun'],
      sampleRows: [
        ['USR-001', 'admin@mja.com', 'IT Super Admin', 'admin', 'Cabang 1 (Pusat)', 'Aktif'],
        ['USR-002', 'owner@mja.com', 'Direksi / Owner', 'owner', 'Cabang 1 (Pusat)', 'Aktif'],
        ['USR-003', 'finance@mja.com', 'Tim Keuangan & Pajak', 'finance', 'Cabang 1 (Pusat)', 'Aktif'],
        ['USR-004', 'host@mja.com', 'Sarah Amanda', 'host', 'Cabang 1 (Pusat)', 'Aktif'],
        ['USR-005', 'warehouse@mja.com', 'Ahmad Fauzi (Gudang)', 'warehouse', 'Cabang 1 (Pusat)', 'Aktif']
      ]
    },
    {
      name: 'QC_Logs',
      headers: ['Log ID', 'Waktu', 'No. Resi', 'Toko Marketplace', 'Status QC', 'Aksi Logistik', 'Nama Produk'],
      sampleRows: [
        ['QC-001', '14:15 WIB', 'SPXID029182390', 'Shopee Official 1', 'valid', 'Lolos QC (Siap Kirim)', 'Spion Retract Avanza Set Kanan-Kiri'],
        ['QC-002', '13:50 WIB', 'JT9812491209', 'Shopee Mall 2', 'double', 'Dicegah (Resi Dobel Cetak)', 'Spion Innova Reborn Chrome'],
        ['QC-003', '11:20 WIB', 'CANCEL-TK-990', 'TikTok Shop Live', 'cancelled', 'Dicegah (Batal Pembeli)', 'Kaca Spion Vespa Matic Bulat']
      ]
    },
    {
      name: 'Live_Sessions',
      headers: ['Session ID', 'Tanggal', 'Channel Toko', 'Host Live', 'Omset Kotor', 'Biaya Admin', 'Biaya Iklan', 'HPP Barang', 'Margin Bersih', 'Item Terjual'],
      sampleRows: [
        ['LS-01', '2026-11-05', 'TikTok Shop Live Official', 'Rina', 18500000, 1942500, 1500000, 6400000, 8657500, 210],
        ['LS-02', '2026-11-04', 'Shopee Live Toko 1 (Official)', 'Sarah', 24200000, 2057000, 2200000, 8200000, 11743000, 340],
        ['LS-03', '2026-11-04', 'Shopee Live Toko 2 (Mall)', 'Maya', 16800000, 1512000, 1200000, 5900000, 8188000, 195]
      ]
    },
    {
      name: 'Inventory',
      headers: ['SKU Produk', 'Nama Produk Spion', 'Kelompok / Kategori', 'Stok Cabang A (Pusat)', 'Stok Cabang B (Solo)', 'HPP Modal', 'Harga Jual Rekomendasi'],
      sampleRows: [
        ['SPN-MBL-001', 'Spion Retract Avanza / Xenia 2022+ (Set)', 'Spion Mobil', 85, 30, 650000, 950000],
        ['SPN-MBL-002', 'Spion Innova Reborn Chrome Electric', 'Spion Mobil', 45, 15, 850000, 1250000],
        ['SPN-MTR-001', 'Spion Standar Honda Vario 125/160 (Sepasang)', 'Spion Motor', 150, 60, 45000, 75000],
        ['SPN-MTR-002', 'Spion Bulat Retro Vespa Sprint / Primavera', 'Spion Motor', 90, 40, 75000, 125000]
      ]
    },
    {
      name: 'Orders',
      headers: ['Order ID', 'No. Pesanan', 'No. Resi', 'Toko', 'Cabang', 'Platform', 'Kurir', 'Nama Pembeli', 'SKU', 'Qty', 'Total Nilai', 'Status QC'],
      sampleRows: [
        ['ORD-001', '261110VRD4AUAR', 'CM75705456362', 'Shopee Official 1', 'Cabang A (Pusat)', 'shopee', 'JNE Reguler', 'Wiryo (Tangerang)', 'SPN-MBL-001', 1, 950000, 'Lolos QC 1'],
        ['ORD-002', '261112TK8899AA', 'TK9812491209', 'TikTok Shop Live', 'Cabang A (Pusat)', 'tiktok', 'J&T Express', 'Hendra (Surabaya)', 'SPN-MTR-001', 2, 150000, 'Siap Kirim']
      ]
    },
    {
      name: 'Returns',
      headers: ['Retur ID', 'Tanggal', 'No. Resi', 'Toko', 'Nama Pembeli', 'Alasan Retur', 'Kondisi Barang', 'Tindakan Stok'],
      sampleRows: [
        ['RET-001', '2026-11-06', 'SPXID029182390', 'Shopee Official 1', 'Doni (Semarang)', 'Salah Pesan Tipe', 'Bagus (Segel Utuh)', 'Restock ke Gudang (+1)'],
        ['RET-002', '2026-11-05', 'JT9812491209', 'Shopee Mall 2', 'Bambang (Solo)', 'Pecah saat Pengiriman Kurir', 'Pecah / Rusak Fisik', 'Klaim Asuransi Ekspedisi']
      ]
    }
  ];

  // Loop pembuat tab
  schemas.forEach(function (schema) {
    var sheet = ss.getSheetByName(schema.name);
    if (!sheet) {
      sheet = ss.insertSheet(schema.name);
    } else {
      sheet.clear(); // Bersihkan isi lama jika sudah ada
    }

    // Tulis Header
    sheet.appendRow(schema.headers);

    // Styling Header: Background gelap, font putih, tebal, tengah
    var headerRange = sheet.getRange(1, 1, 1, schema.headers.length);
    headerRange.setBackground(PRIMARY_COLOR);
    headerRange.setFontColor(TEXT_COLOR);
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
    headerRange.setFontFamily('Google Sans');
    headerRange.setFontSize(10);
    sheet.setRowHeight(1, 35);

    // Bekukan Baris 1 (Freeze Header)
    sheet.setFrozenRows(1);

    // Tulis Data Contoh
    if (schema.sampleRows && schema.sampleRows.length > 0) {
      schema.sampleRows.forEach(function (row) {
        sheet.appendRow(row);
      });
      var dataRange = sheet.getRange(2, 1, schema.sampleRows.length, schema.headers.length);
      dataRange.setFontFamily('Google Sans');
      dataRange.setFontSize(9);
      dataRange.setVerticalAlignment('middle');
    }

    // Auto-fit lebar kolom
    for (var col = 1; col <= schema.headers.length; col++) {
      sheet.autoResizeColumn(col);
    }
  });

  // Hapus Sheet1 default jika kosong dan tab lain sudah ada
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }

  Logger.log('SUKSES: Seluruh Database MJA Sales Hub ERP berhasil dibuat otomatis!');
}

