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

    // 2. UPDATE / REVISI PRESENSI OLEH ADMIN IT (URGENT REVISION)
    if (action === 'updateAttendance') {
      var sheet = ss.getSheetByName('Presensi');
      if (!sheet) {
        return jsonResponse_({ success: false, message: 'Sheet Presensi tidak ditemukan' });
      }

      var idToUpdate = String(payload.id);
      var data = sheet.getDataRange().getValues();
      var foundRow = -1;

      for (var r = 1; r < data.length; r++) {
        if (String(data[r][0]) === idToUpdate) {
          foundRow = r + 1; // 1-indexed baris di Spreadsheet
          break;
        }
      }

      if (foundRow === -1) {
        return jsonResponse_({ success: false, message: 'ID Presensi tidak ditemukan: ' + idToUpdate });
      }

      // Update sel: Tanggal (kolom 2), Jam (kolom 3), Masuk/Pulang (kolom 9), Status (kolom 12), Catatan (kolom 13)
      if (payload.date) sheet.getRange(foundRow, 2).setValue(payload.date);
      if (payload.time) sheet.getRange(foundRow, 3).setValue("'" + payload.time);
      if (payload.inOut) sheet.getRange(foundRow, 9).setValue(payload.inOut);
      if (payload.status) sheet.getRange(foundRow, 12).setValue(payload.status);
      
      var notesVal = (payload.notes || '');
      if (payload.revisionReason) {
        notesVal += ' [REVISI ADMIN IT: ' + payload.revisionReason + ' oleh ' + (payload.revisedBy || 'Admin') + ']';
      }
      sheet.getRange(foundRow, 13).setValue(notesVal);

      return jsonResponse_({
        success: true,
        id: idToUpdate,
        message: 'Presensi berhasil direvisi oleh Admin IT di Google Sheets'
      });
    }

    // 3. DELETE ATTENDANCE: Hapus satu baris presensi tertentu
    if (action === 'deleteAttendance') {
      var sheet = ss.getSheetByName('Presensi');
      if (!sheet) {
        return jsonResponse_({ success: false, message: 'Sheet Presensi tidak ditemukan' });
      }

      var idToDelete = String(payload.id);
      var data = sheet.getDataRange().getValues();
      var deleted = false;

      for (var r = 1; r < data.length; r++) {
        if (String(data[r][0]) === idToDelete) {
          sheet.deleteRow(r + 1); // 1-indexed baris di Spreadsheet
          deleted = true;
          break;
        }
      }

      return jsonResponse_({
        success: deleted,
        message: deleted ? 'Presensi ' + idToDelete + ' berhasil dihapus dari Google Sheets' : 'ID presensi tidak ditemukan'
      });
    }

    // 4. RESET ATTENDANCE: Kosongkan seluruh riwayat presensi demo untuk persiapan demo klien
    if (action === 'resetAttendance') {
      var sheet = ss.getSheetByName('Presensi');
      if (sheet) {
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          sheet.deleteRows(2, lastRow - 1);
        }
      }
      return jsonResponse_({
        success: true,
        message: 'Seluruh riwayat presensi di Google Sheets berhasil direset bersih untuk persiapan demo klien'
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
