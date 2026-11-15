/**
 * ============================================================================
 * GOOGLE APPS SCRIPT WEB API — MJA SALES HUB ERP (SPREADSHEET DATABASE)
 * Endpoint REST API untuk Sinkronisasi Presensi Selfie, QC Scan, & Multi-Perangkat
 * Author: DASarsitek / by @doople
 * ============================================================================
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. GET ATTENDANCE: Ambil seluruh riwayat presensi & foto selfie
  if (action === 'getAttendance') {
    var sheet = ss.getSheetByName('Presensi');
    if (!sheet) {
      return jsonResponse_({ success: false, message: 'Sheet Presensi belum dibuat. Jalankan setupDatabase() di setup.gs' });
    }
    
    var range = sheet.getDataRange();
    var data = range.getValues();
    var displayData = range.getDisplayValues();
    var logs = [];

    // Baris 1 adalah Header (index 0)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      var disp = displayData[i];
      if (row[0]) {
        // Ambil display value langsung dari sel untuk menghindari konversi timezone 1899 Batavia (+17 menit)
        var dateFormatted = (disp && disp[1]) ? String(disp[1]).trim() : (row[1] instanceof Date ? Utilities.formatDate(row[1], 'GMT+7', 'yyyy-MM-dd') : String(row[1]));
        var timeFormatted = (disp && disp[2]) ? String(disp[2]).trim() : (row[2] instanceof Date ? Utilities.formatDate(row[2], 'GMT+7', 'HH:mm:ss') : String(row[2]));
        
        // Bersihkan tanda petik awal jika ada
        if (timeFormatted.charAt(0) === "'") {
          timeFormatted = timeFormatted.substring(1);
        }

        logs.push({
          id: String(row[0]),
          date: dateFormatted,
          time: timeFormatted,
          name: String(row[3]),
          email: String(row[4]),
          role: String(row[5]),
          branch: String(row[6]),
          type: String(row[7]),
          inOut: String(row[8]),
          coords: String(row[9]),
          distance: Number(row[10]) || 0,
          status: String(row[11]),
          notes: String(row[12] || ''),
          photo: String(row[13] || '')
        });
      }
    }
    return jsonResponse_({ success: true, logs: logs.reverse() }); // Terbaru di atas
  }

  // 2. GET USERS: Ambil daftar karyawan
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

  // 3. PING / STATUS
  return jsonResponse_({
    status: 'ONLINE',
    service: 'MJA Sales Hub ERP — Google Sheets Live Gateway',
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var contents = e.postData.contents;
    var payload = JSON.parse(contents);
    var action = payload.action || 'saveAttendance';

    // 1. SAVE ATTENDANCE: Simpan absensi selfie dari HP
    if (action === 'saveAttendance' || payload.coords) {
      var sheet = ss.getSheetByName('Presensi');
      if (!sheet) {
        // Auto-create jika belum ada
        setupDatabase();
        sheet = ss.getSheetByName('Presensi');
      }

      var newId = payload.id || ('ATT-' + Date.now());
      var dateVal = payload.date || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd');
      var timeVal = payload.time || Utilities.formatDate(new Date(), 'GMT+7', 'HH:mm:ss');

      // Simpan waktu dengan tanda petik tunggal "'" agar Spreadsheet menyimpannya sebagai teks murni lengkap dengan detik (HH:mm:ss) tanpa konversi tanggal 1899
      sheet.appendRow([
        newId,
        dateVal,
        "'" + timeVal,
        payload.name || 'Karyawan',
        payload.email || '',
        payload.role || 'warehouse',
        payload.branch || 'Cabang 1 (Pusat)',
        payload.type || 'office',
        payload.inOut || 'Masuk',
        payload.coords || '',
        payload.distance || 0,
        payload.status || 'valid',
        payload.notes || '',
        payload.photo || '' // Data URL / Base64 foto selfie bertanda air
      ]);

      return jsonResponse_({
        success: true,
        id: newId,
        message: 'Presensi selfie berhasil disimpan ke Google Sheets'
      });
    }

    return jsonResponse_({ success: false, message: 'Action tidak dikenali: ' + action });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.toString() });
  }
}

/**
 * Helper pembungkus response JSON + Header CORS
 */
function jsonResponse_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
