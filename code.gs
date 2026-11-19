/**
 * ============================================================================
 * GOOGLE APPS SCRIPT WEB API — MJA SALES HUB ERP (SPREADSHEET DATABASE)
 * Endpoint REST API Lengkap untuk Multi-Perangkat (PC, Android, iOS)
 * Mendukung Presensi Selfie, Rekap Sesi Live, QC Scan, Retur, & Inventori Stok
 * Versi: 3.5-complete-multi-device-erp
 * ============================================================================
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. GET ATTENDANCE (Presensi)
  if (action === 'getAttendance') {
    var sheet = ss.getSheetByName('Presensi');
    if (!sheet) return jsonResponse_({ success: true, logs: [] });
    
    var range = sheet.getDataRange();
    var data = range.getValues();
    var displayData = range.getDisplayValues();
    var logs = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var disp = displayData[i];
      if (row[0]) {
        var dateFormatted = (disp && disp[1]) ? String(disp[1]).trim() : (row[1] instanceof Date ? Utilities.formatDate(row[1], 'GMT+7', 'yyyy-MM-dd') : String(row[1]));
        var timeFormatted = (disp && disp[2]) ? String(disp[2]).trim() : (row[2] instanceof Date ? Utilities.formatDate(row[2], 'GMT+7', 'HH:mm:ss') : String(row[2]));
        if (timeFormatted.charAt(0) === "'") timeFormatted = timeFormatted.substring(1);

        logs.push({
          id: String(row[0]),
          date: dateFormatted,
          time: timeFormatted,
          name: String(row[3] || ''),
          email: String(row[4] || ''),
          role: String(row[5] || ''),
          branch: String(row[6] || ''),
          type: String(row[7] || ''),
          inOut: String(row[8] || 'Masuk'),
          coords: String(row[9] || ''),
          distance: Number(row[10]) || 0,
          status: String(row[11] || 'valid'),
          notes: String(row[12] || ''),
          photo: String(row[13] || '')
        });
      }
    }
    return jsonResponse_({ success: true, logs: logs.reverse() });
  }

  // 2. SAVE ATTENDANCE via GET (Dukungan Multi-Device & Mobile Tanpa CORS Issue)
  if (action === 'saveAttendance') {
    return handleSaveAttendance_(ss, e.parameter);
  }

  // 3. DELETE ATTENDANCE via GET
  if (action === 'deleteAttendance') {
    var sheet = ss.getSheetByName('Presensi');
    if (!sheet) return jsonResponse_({ success: false, message: 'Sheet Presensi tidak ditemukan' });
    var idToDelete = String(e.parameter.id || '');
    var data = sheet.getDataRange().getValues();
    var deleted = false;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]) === idToDelete) {
        sheet.deleteRow(r + 1);
        deleted = true;
        break;
      }
    }
    return jsonResponse_({ success: deleted, message: deleted ? 'Presensi ' + idToDelete + ' terhapus' : 'ID tidak ditemukan' });
  }

  // 4. RESET ATTENDANCE via GET
  if (action === 'resetAttendance') {
    var sheet = ss.getSheetByName('Presensi');
    if (!sheet) return jsonResponse_({ success: false, message: 'Sheet Presensi tidak ditemukan' });
    var lr = sheet.getLastRow();
    if (lr > 1) {
      sheet.deleteRows(2, lr - 1);
    }
    return jsonResponse_({ success: true, message: 'Seluruh riwayat presensi berhasil direset' });
  }

  // 5. GET USERS (Daftar Pengguna / Karyawan)
  if (action === 'getUsers') {
    var uSheet = ss.getSheetByName('Users');
    var uData = uSheet ? uSheet.getDataRange().getValues() : [];
    var users = [];
    for (var u = 1; u < uData.length; u++) {
      if (uData[u][0]) {
        users.push({
          uid: uData[u][0],
          email: uData[u][1],
          name: uData[u][2],
          role: uData[u][3],
          branch: uData[u][4],
          status: uData[u][5]
        });
      }
    }
    return jsonResponse_({ success: true, users: users });
  }

  // 6. GET LIVE SESSIONS (Rekap Sesi Live Host)
  if (action === 'getLiveSessions') {
    var sheet = ss.getSheetByName('Live_Sessions');
    if (!sheet) return jsonResponse_({ success: true, sessions: [] });
    
    var range = sheet.getDataRange();
    var data = range.getValues();
    var displayData = range.getDisplayValues();
    var sessions = [];

    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var disp = displayData[i];
      if (row[0]) {
        var dateFormatted = (disp && disp[1]) ? String(disp[1]).trim() : (row[1] instanceof Date ? Utilities.formatDate(row[1], 'GMT+7', 'yyyy-MM-dd') : String(row[1]));
        sessions.push({
          id: String(row[0]),
          date: dateFormatted,
          store: String(row[2] || ''),
          host: String(row[3] || ''),
          omset: Number(row[4]) || 0,
          fee: Number(row[5]) || 0,
          ads: Number(row[6]) || 0,
          cogs: Number(row[7]) || 0,
          margin: Number(row[8]) || 0,
          items: Number(row[9]) || 0,
          duration: String(row[10] || ''),
          viewers: Number(row[11]) || 0,
          notes: String(row[12] || ''),
          liveTime: String(row[13] || '')
        });
      }
    }
    return jsonResponse_({ success: true, sessions: sessions.reverse() });
  }

  // 7. SAVE LIVE SESSION via GET
  if (action === 'saveLiveSession') {
    return handleSaveLiveSession_(ss, e.parameter);
  }

  // 8. DELETE LIVE SESSION via GET
  if (action === 'deleteLiveSession') {
    var sheet = ss.getSheetByName('Live_Sessions');
    if (!sheet) return jsonResponse_({ success: false, message: 'Sheet Live_Sessions tidak ditemukan' });
    var idToDel = String(e.parameter.id || '');
    var data = sheet.getDataRange().getValues();
    var deleted = false;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]) === idToDel) {
        sheet.deleteRow(r + 1);
        deleted = true;
        break;
      }
    }
    return jsonResponse_({ success: deleted, message: deleted ? 'Sesi live ' + idToDel + ' terhapus' : 'ID tidak ditemukan' });
  }

  // 9. RESET LIVE SESSIONS via GET
  if (action === 'resetLiveSessions') {
    var sheet = ss.getSheetByName('Live_Sessions');
    if (!sheet) return jsonResponse_({ success: false, message: 'Sheet Live_Sessions tidak ditemukan' });
    var lr = sheet.getLastRow();
    if (lr > 1) {
      sheet.deleteRows(2, lr - 1);
    }
    return jsonResponse_({ success: true, message: 'Seluruh riwayat sesi live berhasil direset' });
  }

  // 10. GET QC LOGS (Scan Validasi Kirim)
  if (action === 'getQCLogs') {
    var sheet = ss.getSheetByName('QC_Logs');
    if (!sheet) return jsonResponse_({ success: true, logs: [] });
    var data = sheet.getDataRange().getValues();
    var qcLogs = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0]) {
        qcLogs.push({
          id: String(row[0]),
          time: String(row[1] || ''),
          resi: String(row[2] || ''),
          store: String(row[3] || ''),
          status: String(row[4] || 'valid'),
          action: String(row[5] || ''),
          product: String(row[6] || '')
        });
      }
    }
    return jsonResponse_({ success: true, logs: qcLogs.reverse() });
  }

  // 11. SAVE QC LOG via GET
  if (action === 'saveQCLog') {
    return handleSaveQCLog_(ss, e.parameter);
  }

  // 11.1 RESET QC LOGS via GET
  if (action === 'resetQCLogs') {
    var sheet = ss.getSheetByName('QC_Logs');
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    return jsonResponse_({ success: true, message: 'Seluruh riwayat QC Logs berhasil direset' });
  }

  // 12. GET RETURNS (Penerimaan Retur)
  if (action === 'getReturns') {
    var sheet = ss.getSheetByName('Returns');
    if (!sheet) return jsonResponse_({ success: true, returns: [] });
    var data = sheet.getDataRange().getValues();
    var returnsList = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0]) {
        returnsList.push({
          id: String(row[0]),
          date: String(row[1] || ''),
          resi: String(row[2] || ''),
          store: String(row[3] || ''),
          buyer: String(row[4] || ''),
          reason: String(row[5] || ''),
          condition: String(row[6] || 'Bagus'),
          effect: String(row[7] || '')
        });
      }
    }
    return jsonResponse_({ success: true, returns: returnsList.reverse() });
  }

  // 13. SAVE RETURN via GET
  if (action === 'saveReturn') {
    return handleSaveReturn_(ss, e.parameter);
  }

  // 13.1 RESET RETURNS via GET
  if (action === 'resetReturns') {
    var sheet = ss.getSheetByName('Returns');
    if (sheet && sheet.getLastRow() > 1) {
      sheet.deleteRows(2, sheet.getLastRow() - 1);
    }
    return jsonResponse_({ success: true, message: 'Seluruh riwayat Retur berhasil direset' });
  }

  // 13.2 RESET ALL OPERATIONAL DATA (Go-Live Bersih)
  if (action === 'resetAllData') {
    var sheetsToReset = ['Live_Sessions', 'QC_Logs', 'Returns'];
    sheetsToReset.forEach(function (sName) {
      var s = ss.getSheetByName(sName);
      if (s && s.getLastRow() > 1) {
        s.deleteRows(2, s.getLastRow() - 1);
      }
    });
    return jsonResponse_({ success: true, message: 'Seluruh data operasional berhasil direset (Go-Live Bersih)' });
  }

  // 14. GET INVENTORY (Inventori Stok Spion Gudang)
  if (action === 'getInventory') {
    var sheet = ss.getSheetByName('Inventory');
    if (!sheet) return jsonResponse_({ success: true, inventory: [] });
    var data = sheet.getDataRange().getValues();
    var invList = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0]) {
        var stockA = Number(row[3]) || 0;
        var stockB = Number(row[4]) || 0;
        invList.push({
          id: 'INV-' + i,
          sku: String(row[0]),
          name: String(row[1] || ''),
          group: String(row[2] || 'Spion Mobil'),
          stockA: stockA,
          stockB: stockB,
          stock: stockA + stockB,
          physicalStock: stockA + stockB,
          allocatedStock: 0,
          cogs: Number(row[5]) || 0,
          price: Number(row[6]) || 0
        });
      }
    }
    return jsonResponse_({ success: true, inventory: invList });
  }

  // 15. SAVE / REPLACE INVENTORY via GET (atau POST)
  if (action === 'saveInventory') {
    return handleSaveInventory_(ss, e.parameter);
  }

  // 16. GET ORDERS (Pesanan & Cetak Resi)
  if (action === 'getOrders') {
    var sheet = ss.getSheetByName('Orders');
    if (!sheet) return jsonResponse_({ success: true, orders: [] });
    var data = sheet.getDataRange().getValues();
    var ordList = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (row[0]) {
        ordList.push({
          id: String(row[0]),
          orderNo: String(row[1] || ''),
          resi: String(row[2] || ''),
          store: String(row[3] || ''),
          branch: String(row[4] || ''),
          platform: String(row[5] || ''),
          courier: String(row[6] || ''),
          buyer: String(row[7] || ''),
          sku: String(row[8] || ''),
          qty: Number(row[9]) || 1,
          total: Number(row[10]) || 0,
          statusQC: String(row[11] || 'Belum Scan')
        });
      }
    }
    return jsonResponse_({ success: true, orders: ordList.reverse() });
  }

  // DEFAULT PING / STATUS
  return jsonResponse_({
    status: 'ONLINE',
    service: 'MJA Sales Hub ERP — Google Sheets Live Gateway',
    version: '3.5-complete-multi-device-erp',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var payload = {};
    
    // Smart payload resolver: JSON atau x-www-form-urlencoded
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (errJson) {
        payload = (e && e.parameter) ? e.parameter : {};
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    }

    var action = payload.action || 'ping';

    if (action === 'saveAttendance' || payload.coords) {
      return handleSaveAttendance_(ss, payload);
    }
    if (action === 'saveLiveSession') {
      return handleSaveLiveSession_(ss, payload);
    }
    if (action === 'saveQCLog') {
      return handleSaveQCLog_(ss, payload);
    }
    if (action === 'saveReturn') {
      return handleSaveReturn_(ss, payload);
    }
    if (action === 'saveInventory') {
      return handleSaveInventory_(ss, payload);
    }
    if (action === 'deleteAttendance') {
      return doGet({ parameter: payload });
    }
    if (action === 'resetAttendance') {
      return doGet({ parameter: payload });
    }
    if (action === 'deleteLiveSession') {
      return doGet({ parameter: payload });
    }
    if (action === 'resetLiveSessions' || action === 'resetQCLogs' || action === 'resetReturns' || action === 'resetAllData') {
      return doGet({ parameter: payload });
    }

    return jsonResponse_({ success: true, action: action, message: 'POST action berhasil diterima' });
  } catch (err) {
    return jsonResponse_({
      success: false,
      error: err.toString(),
      message: 'Gagal memproses data: ' + err.message
    });
  }
}

// ============================================================================
// HELPER FUNCTIONS (MENULIS KE SHEET SESUAI URUTAN KOLOM RESMI)
// ============================================================================

function handleSaveAttendance_(ss, payload) {
  var sheet = ss.getSheetByName('Presensi');
  if (!sheet) {
    sheet = ss.insertSheet('Presensi');
    sheet.appendRow([
      'ID Presensi', 'Tanggal', 'Jam (WIB)', 'Nama Karyawan', 'Email', 
      'Role / Divisi', 'Cabang', 'Tipe Kehadiran', 'Masuk/Pulang', 
      'Koordinat GPS', 'Jarak (Meter)', 'Status Verifikasi', 'Catatan / Ekspedisi', 'Foto Selfie'
    ]);
  }

  var newId = payload.id || ('ATT-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss'));
  var dateVal = payload.date || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
  var timeVal = payload.time || Utilities.formatDate(new Date(), 'GMT+7', 'HH:mm:ss');

  sheet.appendRow([
    newId,
    dateVal,
    "'" + timeVal,
    payload.name || 'Karyawan',
    payload.email || '',
    payload.role || 'warehouse',
    payload.branch || 'Cabang 1 (Pusat & Gudang Utama)',
    payload.type || 'office',
    payload.inOut || 'Masuk',
    payload.coords || '',
    payload.distance || 0,
    payload.status || 'valid',
    payload.notes || '',
    payload.photo || ''
  ]);

  return jsonResponse_({
    success: true,
    id: newId,
    message: 'Presensi ' + (payload.name || '') + ' (' + (payload.inOut || 'Masuk') + ') berhasil disimpan ke Google Sheets'
  });
}

function handleSaveLiveSession_(ss, payload) {
  var sheet = ss.getSheetByName('Live_Sessions');
  if (!sheet) {
    sheet = ss.insertSheet('Live_Sessions');
    sheet.appendRow(['Session ID', 'Tanggal', 'Channel Toko', 'Host Live', 'Omset Kotor', 'Biaya Admin', 'Biaya Iklan', 'HPP Barang', 'Margin Bersih', 'Item Terjual', 'Durasi', 'Puncak Viewers', 'Catatan']);
  }

  var id = String(payload.id || ('LS-' + Date.now()));
  var date = String(payload.date || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'));
  var store = String(payload.store || 'TikTok Shop Live Official');
  var host = String(payload.host || 'Host Live');
  var omset = Number(payload.omset || 0);
  var fee = Number(payload.fee || 0);
  var ads = Number(payload.ads || 0);
  var cogs = Number(payload.cogs || 0);
  var margin = Number(payload.margin || 0);
  var items = Number(payload.items || 0);
  var duration = String(payload.duration || '');
  var viewers = Number(payload.viewers || 0);
  var notes = String(payload.notes || '');

  sheet.appendRow([id, date, store, host, omset, fee, ads, cogs, margin, items, duration, viewers, notes]);

  return jsonResponse_({
    success: true,
    id: id,
    message: 'Rekap sesi live ' + id + ' (' + store + ') berhasil disimpan ke Google Sheets'
  });
}

function handleSaveQCLog_(ss, payload) {
  var sheet = ss.getSheetByName('QC_Logs');
  if (!sheet) {
    sheet = ss.insertSheet('QC_Logs');
    sheet.appendRow(['Log ID', 'Waktu', 'No. Resi', 'Toko Marketplace', 'Status QC', 'Aksi Logistik', 'Nama Produk']);
  }
  var id = String(payload.id || ('QC-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss')));
  var time = String(payload.time || (Utilities.formatDate(new Date(), 'GMT+7', 'HH:mm') + ' WIB'));
  var resi = String(payload.resi || '');
  var store = String(payload.store || 'Shopee Official 1');
  var status = String(payload.status || 'valid');
  var actionDesc = String(payload.actionDesc || payload.action || 'Lolos QC (Siap Kirim)');
  var product = String(payload.product || 'Spion');

  sheet.appendRow([id, "'" + time, resi, store, status, actionDesc, product]);
  return jsonResponse_({ success: true, id: id, message: 'Log QC ' + resi + ' berhasil disimpan ke Google Sheets' });
}

function handleSaveReturn_(ss, payload) {
  var sheet = ss.getSheetByName('Returns');
  if (!sheet) {
    sheet = ss.insertSheet('Returns');
    sheet.appendRow(['Retur ID', 'Tanggal', 'No. Resi', 'Toko', 'Nama Pembeli', 'Alasan Retur', 'Kondisi Barang', 'Tindakan Stok']);
  }
  var id = String(payload.id || ('RET-' + Utilities.formatDate(new Date(), 'GMT+7', 'yyyyMMdd-HHmmss')));
  var date = String(payload.date || payload.time || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'));
  var resi = String(payload.resi || '');
  var store = String(payload.store || 'Shopee Official 1');
  var buyer = String(payload.buyer || 'Pembeli Marketplace');
  var reason = String(payload.reason || 'Salah Pesan Tipe');
  var condition = String(payload.condition || 'Bagus (Segel Utuh)');
  var effect = String(payload.effect || 'Restock ke Gudang (+1)');

  sheet.appendRow([id, date, resi, store, buyer, reason, condition, effect]);
  return jsonResponse_({ success: true, id: id, message: 'Data retur ' + resi + ' berhasil disimpan ke Google Sheets' });
}

function handleSaveInventory_(ss, payload) {
  var sheet = ss.getSheetByName('Inventory');
  if (!sheet) {
    sheet = ss.insertSheet('Inventory');
    sheet.appendRow(['SKU Produk', 'Nama Produk Spion', 'Kelompok / Kategori', 'Stok Cabang A (Pusat)', 'Stok Cabang B (Solo)', 'HPP Modal', 'Harga Jual Rekomendasi']);
  }

  // Jika payload membawa items (array) dari upload Excel:
  var items = [];
  if (Array.isArray(payload.items)) {
    items = payload.items;
  } else if (payload.itemsJson) {
    try { items = JSON.parse(payload.itemsJson); } catch (e) { }
  } else if (payload.sku) {
    items = [payload];
  }

  if (items.length > 0) {
    // Mode overwrite / update inventory
    if (payload.mode === 'replace') {
      var lr = sheet.getLastRow();
      if (lr > 1) sheet.deleteRows(2, lr - 1);
    }
    
    items.forEach(function (it) {
      sheet.appendRow([
        String(it.sku || ''),
        String(it.name || ''),
        String(it.group || 'Spion Mobil'),
        Number(it.stockA || it.physicalStock || it.stock || 0),
        Number(it.stockB || 0),
        Number(it.cogs || it.hpp || 0),
        Number(it.price || it.recPrice || 0)
      ]);
    });
  }

  return jsonResponse_({ success: true, count: items.length, message: items.length + ' produk inventori berhasil disimpan ke Google Sheets' });
}

function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
