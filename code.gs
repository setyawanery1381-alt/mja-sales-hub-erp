/**
 * ============================================================================
 * GOOGLE APPS SCRIPT GATEWAY — MJA SALES HUB (FIREBASE EDITION)
 * Host & Admin Gateway untuk Cloud Firestore, Firebase Auth & Google Sheets
 * Author: DASarsitek / by @doople
 * ============================================================================
 */

// ====== [ISI DI SINI] harus sama dengan firebaseConfig di index.html ======
const FIREBASE_PROJECT_ID = 'YOUR_PROJECT_ID';
const FIREBASE_API_KEY = 'YOUR_API_KEY';
// ====== AKHIR KONFIGURASI FIREBASE ======

const ROLES = ['admin', 'owner', 'finance', 'host', 'warehouse'];
const COLLECTIONS = [
  'users',
  'stores',
  'liveSessions',
  'orders',
  'inventory',
  'inventoryGroups',
  'returns',
  'qcLogs',
  'attendance',
  'logs'
];

/**
 * 1. Web App Server Entry Point
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('MJA Sales Hub — Multi-Store ERP & Live Streaming Analytics')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 2. Helper Internal REST Firestore & Identity Toolkit
 */
function fbHeaders_() {
  return {
    'Authorization': 'Bearer ' + ScriptApp.getOAuthToken(),
    'x-goog-user-project': FIREBASE_PROJECT_ID,
    'Content-Type': 'application/json'
  };
}

function firestoreUrl_(path) {
  return 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + path;
}

function toFsValue_(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) {
    return { arrayValue: { values: v.map(toFsValue_) } };
  }
  if (typeof v === 'object') {
    var fields = {};
    for (var k in v) {
      if (Object.prototype.hasOwnProperty.call(v, k)) {
        fields[k] = toFsValue_(v[k]);
      }
    }
    return { mapValue: { fields: fields } };
  }
  return { stringValue: String(v) };
}

function fromFsValue_(fv) {
  if (!fv) return null;
  if ('stringValue' in fv) return fv.stringValue;
  if ('integerValue' in fv) return parseInt(fv.integerValue, 10);
  if ('doubleValue' in fv) return parseFloat(fv.doubleValue);
  if ('booleanValue' in fv) return fv.booleanValue;
  if ('timestampValue' in fv) return fv.timestampValue;
  if ('nullValue' in fv) return null;
  if ('arrayValue' in fv) {
    return (fv.arrayValue.values || []).map(fromFsValue_);
  }
  if ('mapValue' in fv) {
    var res = {};
    var fields = fv.mapValue.fields || {};
    for (var k in fields) {
      res[k] = fromFsValue_(fields[k]);
    }
    return res;
  }
  return null;
}

function toFsFields_(obj) {
  var fields = {};
  for (var k in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, k) && obj[k] !== undefined) {
      fields[k] = toFsValue_(obj[k]);
    }
  }
  return { fields: fields };
}

function fromFsDocument_(doc) {
  if (!doc || !doc.fields) return null;
  var out = {};
  for (var k in doc.fields) {
    out[k] = fromFsValue_(doc.fields[k]);
  }
  var parts = (doc.name || '').split('/');
  out.id = parts[parts.length - 1];
  return out;
}

/**
 * Verifikasi Firebase ID Token (JWT) dari browser client
 */
function verifyIdToken_(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('ID Token tidak valid atau kosong.');
  }
  var url = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + FIREBASE_API_KEY;
  var resp = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ idToken: idToken }),
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  var body = JSON.parse(resp.getContentText() || '{}');
  if (code !== 200 || !body.users || !body.users[0]) {
    throw new Error('Verifikasi sesi pengguna gagal: ' + (body.error ? body.error.message : 'Token kedaluwarsa'));
  }
  return body.users[0].localId; // UID
}

/**
 * Strict Guard: Pastikan request berasal dari user dengan role 'admin'
 */
function requireAdmin_(idToken) {
  var uid = verifyIdToken_(idToken);
  var url = firestoreUrl_('users/' + uid);
  var resp = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: fbHeaders_(),
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) {
    throw new Error('Akses ditolak: Profil pengguna tidak ditemukan di database.');
  }
  var profile = fromFsDocument_(JSON.parse(resp.getContentText()));
  if (!profile || profile.role !== 'admin' || profile.aktif === false) {
    throw new Error('Akses ditolak: Operasi ini hanya diizinkan untuk IT Admin yang aktif.');
  }
  return uid;
}

/**
 * 3. Public Admin Gateways (dipanggil via google.script.run)
 */

/**
 * Membuat User Baru di Firebase Authentication + Firestore users/{uid}
 */
function adminCreateUser(idToken, payload) {
  try {
    var adminUid = requireAdmin_(idToken);

    if (!payload.email || !payload.password || !payload.nama || !payload.role) {
      return { success: false, message: 'Data pengguna tidak lengkap.' };
    }
    if (ROLES.indexOf(payload.role) === -1) {
      return { success: false, message: 'Role ' + payload.role + ' tidak valid.' };
    }
    if (payload.password.length < 6) {
      return { success: false, message: 'Password minimal 6 karakter.' };
    }

    // Buat akun di Firebase Auth via REST Identity Toolkit
    var authUrl = 'https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/accounts';
    var authResp = UrlFetchApp.fetch(authUrl, {
      method: 'post',
      headers: fbHeaders_(),
      payload: JSON.stringify({
        email: payload.email,
        password: payload.password,
        displayName: payload.nama,
        returnSecureToken: false
      }),
      muteHttpExceptions: true
    });

    var authData = JSON.parse(authResp.getContentText() || '{}');
    if (authResp.getResponseCode() !== 200 || !authData.localId) {
      return { success: false, message: 'Gagal membuat akun Auth: ' + (authData.error ? authData.error.message : 'Error tidak diketahui') };
    }

    var newUid = authData.localId;
    var nowIso = new Date().toISOString();

    // Buat dokumen profil di Firestore
    var userDoc = {
      uid: newUid,
      email: payload.email,
      nama: payload.nama,
      role: payload.role,
      branch: payload.branch || 'Cabang 1 (Pusat)',
      aktif: true,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    var fsUrl = firestoreUrl_('users/' + newUid);
    var fsResp = UrlFetchApp.fetch(fsUrl, {
      method: 'patch',
      headers: fbHeaders_(),
      payload: JSON.stringify(toFsFields_(userDoc)),
      muteHttpExceptions: true
    });

    if (fsResp.getResponseCode() !== 200) {
      return { success: false, message: 'Akun Auth terbuat tetapi gagal menyimpan profil Firestore.' };
    }

    // Catat audit log
    logAction_(adminUid, 'CREATE_USER', 'Membuat user ' + payload.email + ' (' + payload.role + ')');

    return { success: true, uid: newUid, message: 'Pengguna baru berhasil dibuat.' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Daftarkan profil user yang sudah dibuat manual di Firebase Console
 */
function adminRegisterExistingUser(idToken, payload) {
  try {
    var adminUid = requireAdmin_(idToken);
    if (!payload.email || !payload.role) {
      return { success: false, message: 'Email dan role wajib diisi.' };
    }

    var lookupUrl = 'https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/accounts:lookup';
    var lookupResp = UrlFetchApp.fetch(lookupUrl, {
      method: 'post',
      headers: fbHeaders_(),
      payload: JSON.stringify({ email: [payload.email] }),
      muteHttpExceptions: true
    });

    var lookupData = JSON.parse(lookupResp.getContentText() || '{}');
    if (lookupResp.getResponseCode() !== 200 || !lookupData.users || !lookupData.users[0]) {
      return { success: false, message: 'Email ' + payload.email + ' tidak ditemukan di Firebase Authentication.' };
    }

    var user = lookupData.users[0];
    var nowIso = new Date().toISOString();
    var userDoc = {
      uid: user.localId,
      email: user.email,
      nama: payload.nama || user.displayName || user.email.split('@')[0],
      role: payload.role,
      branch: payload.branch || 'Cabang 1 (Pusat)',
      aktif: true,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    var fsUrl = firestoreUrl_('users/' + user.localId);
    UrlFetchApp.fetch(fsUrl, {
      method: 'patch',
      headers: fbHeaders_(),
      payload: JSON.stringify(toFsFields_(userDoc)),
      muteHttpExceptions: true
    });

    logAction_(adminUid, 'REGISTER_EXISTING_USER', 'Mendaftarkan profil user ' + payload.email);
    return { success: true, uid: user.localId, message: 'Profil user berhasil didaftarkan ke Firestore.' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Set Status Aktif / Nonaktif Pengguna
 */
function adminSetUserActive(idToken, targetUid, aktif) {
  try {
    var adminUid = requireAdmin_(idToken);
    
    // Update profil Firestore
    var fsUrl = firestoreUrl_('users/' + targetUid) + '?updateMask.fieldPaths=aktif&updateMask.fieldPaths=updatedAt';
    UrlFetchApp.fetch(fsUrl, {
      method: 'patch',
      headers: fbHeaders_(),
      payload: JSON.stringify(toFsFields_({
        aktif: Boolean(aktif),
        updatedAt: new Date().toISOString()
      })),
      muteHttpExceptions: true
    });

    // Update disabled status di Firebase Auth
    var authUrl = 'https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/accounts:update';
    UrlFetchApp.fetch(authUrl, {
      method: 'post',
      headers: fbHeaders_(),
      payload: JSON.stringify({
        localId: targetUid,
        disableUser: !aktif
      }),
      muteHttpExceptions: true
    });

    logAction_(adminUid, 'TOGGLE_USER_ACTIVE', 'Mengubah status user ' + targetUid + ' menjadi: ' + (aktif ? 'Aktif' : 'Nonaktif'));
    return { success: true, message: 'Status pengguna berhasil diperbarui.' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Hapus Pengguna dari Auth dan Firestore
 */
function adminDeleteUser(idToken, targetUid) {
  try {
    var adminUid = requireAdmin_(idToken);
    if (adminUid === targetUid) {
      return { success: false, message: 'Tidak dapat menghapus akun admin Anda sendiri.' };
    }

    // Hapus dari Auth
    var authUrl = 'https://identitytoolkit.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/accounts:delete';
    UrlFetchApp.fetch(authUrl, {
      method: 'post',
      headers: fbHeaders_(),
      payload: JSON.stringify({ localId: targetUid }),
      muteHttpExceptions: true
    });

    // Hapus dari Firestore
    var fsUrl = firestoreUrl_('users/' + targetUid);
    UrlFetchApp.fetch(fsUrl, {
      method: 'delete',
      headers: fbHeaders_(),
      muteHttpExceptions: true
    });

    logAction_(adminUid, 'DELETE_USER', 'Menghapus akun ' + targetUid);
    return { success: true, message: 'Pengguna berhasil dihapus secara permanen.' };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Ekspor Data ke Google Sheets
 */
function exportToGoogleSheets(idToken, reportTitle, rows) {
  try {
    verifyIdToken_(idToken);
    
    var title = reportTitle || 'MJA_Sales_Report_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd_HHmmss');
    var ss = SpreadsheetApp.create(title);
    var sheet = ss.getActiveSheet();
    sheet.setName('Ringkasan Eksekutif');

    if (rows && rows.length > 0) {
      sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
      
      // Styling Header
      var headerRange = sheet.getRange(1, 1, 1, rows[0].length);
      headerRange.setBackground('#0F172A').setFontColor('#FFFFFF').setFontWeight('bold');
      sheet.autoResizeColumns(1, rows[0].length);
    }

    return {
      success: true,
      url: ss.getUrl(),
      spreadsheetId: ss.getId(),
      message: 'Laporan berhasil diekspor ke Google Sheets!'
    };
  } catch (err) {
    return { success: false, message: err.toString() };
  }
}

/**
 * Audit Logger Internal
 */
function logAction_(uid, action, details) {
  try {
    var logDoc = {
      createdBy: uid,
      action: action,
      details: details,
      timestamp: new Date().toISOString()
    };
    var url = firestoreUrl_('logs');
    UrlFetchApp.fetch(url, {
      method: 'post',
      headers: fbHeaders_(),
      payload: JSON.stringify(toFsFields_(logDoc)),
      muteHttpExceptions: true
    });
  } catch (e) {
    Logger.log('Gagal menulis log: ' + e);
  }
}

/**
 * 4. Self-Test Diagnostik Koneksi Firebase
 * Jalankan fungsi ini dari Apps Script Editor untuk memverifikasi kesiapan backend.
 */
function testFirebaseConnection() {
  Logger.log('=== MEMULAI TEST KONEKSI FIREBASE (DASARSITEK) ===');
  Logger.log('Project ID: ' + FIREBASE_PROJECT_ID);

  if (FIREBASE_PROJECT_ID === 'YOUR_PROJECT_ID') {
    Logger.log('PERINGATAN: FIREBASE_PROJECT_ID masih bernilai default (YOUR_PROJECT_ID). Silakan isi project ID asli Anda.');
    return;
  }

  // 1. Verifikasi Koleksi Firestore
  COLLECTIONS.forEach(function(collectionName) {
    try {
      var url = firestoreUrl_(collectionName) + '?pageSize=1';
      var resp = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: fbHeaders_(),
        muteHttpExceptions: true
      });
      var code = resp.getResponseCode();
      if (code === 200) {
        Logger.log('Koleksi ' + collectionName + ' berhasil diverifikasi (HTTP 200)');
      } else {
        Logger.log('Koleksi ' + collectionName + ' mengembalikan respons HTTP ' + code);
      }
    } catch (e) {
      Logger.log('Gagal memverifikasi koleksi ' + collectionName + ': ' + e);
    }
  });

  Logger.log('=== TEST KONEKSI FIREBASE SELESAI ===');
}


/**
 * TAHAP 1: Simpan Foto Bukti Packing Produk ke Folder Google Drive Harian
 * @param {string} resi - Nomor resi paket
 * @param {string} store - Nama toko pengirim
 * @param {string} base64Data - Data URL foto produk
 * @param {string} operator - Nama staf gudang
 */
function uploadPackingProofToDrive(resi, store, base64Data, operator) {
  try {
    var folderName = 'MJA_BUKTI_PACKING_QC';
    var folders = DriveApp.getFoldersByName(folderName);
    var mainFolder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
    
    // Subfolder per tanggal hari ini
    var todayStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd');
    var subFolders = mainFolder.getFoldersByName(todayStr);
    var targetFolder = subFolders.hasNext() ? subFolders.next() : mainFolder.createFolder(todayStr);
    
    var contentType = 'image/jpeg';
    var rawBase64 = base64Data;
    if (base64Data.indexOf('data:') === 0) {
      var parts = base64Data.split(',');
      contentType = parts[0].split(':')[1].split(';')[0];
      rawBase64 = parts[1];
    }
    
    var decoded = Utilities.base64Decode(rawBase64);
    var fileName = resi + '_' + (store || 'Toko').replace(/[^a-zA-Z0-9]/g, '_') + '_' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'HHmmss') + '.jpg';
    var blob = Utilities.newBlob(decoded, contentType, fileName);
    var file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return {
      success: true,
      resi: resi,
      fileUrl: file.getUrl(),
      fileName: fileName,
      message: 'Foto bukti packing berhasil diunggah ke Google Drive!'
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal upload ke Drive: ' + err.toString()
    };
  }
}
