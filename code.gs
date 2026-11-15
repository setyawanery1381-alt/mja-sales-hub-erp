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

  // 3. DELETE ATTENDANCE via GET (Dukungan CORS penuh dari browser)
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

    return jsonResponse_({
      success: deleted,
      message: deleted ? 'Presensi ' + idToDelete + ' berhasil dihapus dari Google Sheets' : 'ID tidak ditemukan'
    });
  }

  // 4. RESET ATTENDANCE via GET (Dukungan CORS penuh dari browser)
  if (action === 'resetAttendance') {
    var sheet = ss.getSheetByName('Presensi');
    var scope = String(e.parameter.scope || 'all');
    var deletedCount = 0;

    if (sheet) {
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        if (scope === 'today') {
          var tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
          var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
          var data = sheet.getDataRange().getValues();
          for (var r = data.length - 1; r >= 1; r--) {
            var rowDate = String(data[r][1] || '').trim();
            if (rowDate === todayStr) {
              sheet.deleteRow(r + 1);
              deletedCount++;
            }
          }
        } else {
          deletedCount = lastRow - 1;
          sheet.deleteRows(2, lastRow - 1);
        }
      }
    }
    return jsonResponse_({
      success: true,
      deletedCount: deletedCount,
      scope: scope,
      message: 'Presensi di Google Sheets berhasil dibersihkan (' + scope + ', ' + deletedCount + ' baris dihapus)'
    });
  }

  // 5. GET LIVE SESSIONS
  if (action === 'getLiveSessions') {
    var sheet = ss.getSheetByName('Live_Sessions');
    var sessions = [];
    if (sheet && sheet.getLastRow() > 1) {
      var data = sheet.getDataRange().getValues();
      for (var r = 1; r < data.length; r++) {
        sessions.push({
          id: String(data[r][0] || ''),
          date: String(data[r][1] || ''),
          store: String(data[r][2] || ''),
          host: String(data[r][3] || ''),
          omset: Number(data[r][4] || 0),
          fee: Number(data[r][5] || 0),
          ads: Number(data[r][6] || 0),
          cogs: Number(data[r][7] || 0),
          margin: Number(data[r][8] || 0),
          items: Number(data[r][9] || 0),
          duration: String(data[r][10] || ''),
          viewers: Number(data[r][11] || 0),
          notes: String(data[r][12] || '')
        });
      }
    }
    return jsonResponse_({ success: true, sessions: sessions });
  }

  // 6. SAVE LIVE SESSION via GET (Dukungan CORS penuh dari browser)
  // 7. DELETE LIVE SESSION via GET
  if (action === 'deleteLiveSession') {
    var sheet = ss.getSheetByName('Live_Sessions');
    if (!sheet) return jsonResponse_({ success: false, message: 'Sheet Live_Sessions tidak ditemukan' });

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

    return jsonResponse_({
      success: deleted,
      message: deleted ? 'Sesi Live ' + idToDelete + ' berhasil dihapus dari Google Sheets' : 'ID tidak ditemukan'
    });
  }

  // 8. RESET ALL LIVE SESSIONS via GET
  if (action === 'resetLiveSessions') {
    var sheet = ss.getSheetByName('Live_Sessions');
    var deletedCount = 0;
    if (sheet && sheet.getLastRow() > 1) {
      deletedCount = sheet.getLastRow() - 1;
      sheet.deleteRows(2, deletedCount);
    }
    return jsonResponse_({
      success: true,
      message: 'Berhasil mengosongkan ' + deletedCount + ' data sesi live dari Google Sheets',
      deletedCount: deletedCount
    });
  }

  if (action === 'saveLiveSession') {
    var sheet = ss.getSheetByName('Live_Sessions');
    if (!sheet) {
      sheet = ss.insertSheet('Live_Sessions');
      sheet.appendRow(['Session ID', 'Tanggal', 'Channel Toko', 'Host Live', 'Omset Kotor', 'Biaya Admin', 'Biaya Iklan', 'HPP Barang', 'Margin Bersih', 'Item Terjual', 'Durasi', 'Puncak Viewers', 'Catatan']);
    } else if (sheet.getLastColumn() < 13) {
      sheet.getRange(1, 11).setValue('Durasi');
      sheet.getRange(1, 12).setValue('Puncak Viewers');
      sheet.getRange(1, 13).setValue('Catatan');
    }

    var id = String(e.parameter.id || ('LS-' + Date.now()));
    var date = String(e.parameter.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd'));
    var store = String(e.parameter.store || 'TikTok Shop Live Official');
    var host = String(e.parameter.host || 'Host Live');
    var omset = Number(e.parameter.omset || 0);
    var fee = Number(e.parameter.fee || 0);
    var ads = Number(e.parameter.ads || 0);
    var cogs = Number(e.parameter.cogs || 0);
    var margin = Number(e.parameter.margin || 0);
    var items = Number(e.parameter.items || 0);
    var duration = String(e.parameter.duration || '');
    var viewers = Number(e.parameter.viewers || 0);
    var notes = String(e.parameter.notes || '');

    sheet.appendRow([id, date, store, host, omset, fee, ads, cogs, margin, items, duration, viewers, notes]);

    return jsonResponse_({
      success: true,
      id: id,
      message: 'Rekap sesi live ' + id + ' (' + store + ') berhasil disimpan ke Google Sheets'
    });
  }

  // 7. PING / STATUS
  return jsonResponse_({
    status: 'ONLINE',
    service: 'MJA Sales Hub ERP — Google Sheets Live Gateway',
    version: '2.5-live-sessions-ready',
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
          sheet.deleteRow(r + 1);
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
      var scope = String(payload.scope || 'all');
      var deletedCount = 0;

      if (sheet) {
        var lastRow = sheet.getLastRow();
        if (lastRow > 1) {
          if (scope === 'today') {
            var tz = Session.getScriptTimeZone() || 'Asia/Jakarta';
            var todayStr = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
            var data = sheet.getDataRange().getValues();
            for (var r = data.length - 1; r >= 1; r--) {
              var rowDate = String(data[r][1] || '').trim();
              if (rowDate === todayStr) {
                sheet.deleteRow(r + 1);
                deletedCount++;
              }
            }
          } else {
            deletedCount = lastRow - 1;
            sheet.deleteRows(2, lastRow - 1);
          }
        }
      }
      return jsonResponse_({
        success: true,
        deletedCount: deletedCount,
        scope: scope,
        message: 'Seluruh riwayat presensi di Google Sheets berhasil direset bersih (' + scope + ')'
      });
    }

    // 5. SAVE LIVE SESSION: Simpan laporan rekap pasca-live dari Host Live
    if (action === 'deleteLiveSession') {
    var sheet = ss.getSheetByName('Live_Sessions');
    if (!sheet) return jsonResponse_({ success: false, message: 'Sheet Live_Sessions tidak ditemukan' });
    var idToDelete = String(payload.id || '');
    var data = sheet.getDataRange().getValues();
    var deleted = false;
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][0]) === idToDelete) {
        sheet.deleteRow(r + 1);
        deleted = true;
        break;
      }
    }
    return jsonResponse_({ success: deleted, message: deleted ? 'Sesi live terhapus' : 'ID tidak ditemukan' });
  }

  if (action === 'resetLiveSessions') {
    var sheet = ss.getSheetByName('Live_Sessions');
    var deletedCount = 0;
    if (sheet && sheet.getLastRow() > 1) {
      deletedCount = sheet.getLastRow() - 1;
      sheet.deleteRows(2, deletedCount);
    }
    return jsonResponse_({ success: true, message: 'Sesi live berhasil dikosongkan', deletedCount: deletedCount });
  }

  if (action === 'saveLiveSession') {
      var sheet = ss.getSheetByName('Live_Sessions');
      if (!sheet) {
        sheet = ss.insertSheet('Live_Sessions');
        sheet.appendRow(['Session ID', 'Tanggal', 'Channel Toko', 'Host Live', 'Omset Kotor', 'Biaya Admin', 'Biaya Iklan', 'HPP Barang', 'Margin Bersih', 'Item Terjual', 'Durasi', 'Puncak Viewers', 'Catatan']);
      } else if (sheet.getLastColumn() < 13) {
        sheet.getRange(1, 11).setValue('Durasi');
        sheet.getRange(1, 12).setValue('Puncak Viewers');
        sheet.getRange(1, 13).setValue('Catatan');
      }
      sheet.appendRow([
        payload.id || ('LS-' + Date.now()),
        payload.date || Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyy-MM-dd'),
        payload.store || 'TikTok Shop Live',
        payload.host || 'Host Live',
        Number(payload.omset || 0),
        Number(payload.fee || 0),
        Number(payload.ads || 0),
        Number(payload.cogs || 0),
        Number(payload.margin || 0),
        Number(payload.items || 0),
        String(payload.duration || ''),
        Number(payload.viewers || 0),
        String(payload.notes || '')
      ]);
      return jsonResponse_({
        success: true,
        message: 'Rekap sesi live berhasil disimpan ke Google Sheets'
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
