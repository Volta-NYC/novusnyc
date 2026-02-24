// ─────────────────────────────────────────────────────────────────────────────
// VOLTA NYC — Google Apps Script (SheetsLogger)
// Deploy as a Web App (Execute as: Me, Access: Anyone).
// All form types route to one spreadsheet, each on its own named tab.
//
//   formType: "application" → "Applications" tab
//   formType: "contact"     → "Business Inquiries" tab
//   formType: "inquiry"     → "General Inquiries" tab
//
// Tabs are created automatically on first submission if they don't exist.
// ─────────────────────────────────────────────────────────────────────────────

var SHEET_ID = '1UGcUy6pP7ND0BXrnKnd9GNh_d2Q_xph71b_dRNp19w4';

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.formType === 'application') return handleApplication(data);
    if (data.formType === 'contact')     return handleContact(data);
    if (data.formType === 'inquiry')     return handleInquiry(data);
    if (data.formType === 'upload')      return handleFileUpload(data);
    return jsonResponse({ error: 'Unknown formType: ' + data.formType });
  } catch (err) {
    Logger.log('SheetsLogger error: ' + err.toString());
    return jsonResponse({ error: err.toString() });
  }
}

// ── Student Application ────────────────────────────────────────────────────────

function handleApplication(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Applications') || ss.insertSheet('Applications');
  ensureHeaders(sheet, [
    'Timestamp', 'Full Name', 'Email', 'School Name', 'City, State',
    'How They Heard', 'Tracks', 'Has Resume', 'Resume URL', 'Tools/Software', 'Accomplishment',
  ]);
  sheet.appendRow([
    new Date().toISOString(),
    data['Full Name']       || '',
    data['Email']           || '',
    data['School Name']     || data['Education'] || '',
    data['City, State']     || data['City'] || '',
    data['How They Heard']  || '',
    data['Tracks Selected'] || '',
    data['Has Resume']      || '',
    data['Resume URL']      || '',
    data['Tools/Software']  || '',
    data['Accomplishment']  || '',
  ]);
  return jsonResponse({ success: true });
}

// ── Business Contact Form ─────────────────────────────────────────────────────
// Services and language are always sent in English by the client.

function handleContact(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Business Inquiries') || ss.insertSheet('Business Inquiries');
  ensureHeaders(sheet, [
    'Timestamp', 'Business Name', 'Owner Name', 'Email',
    'Neighborhood', 'Services Requested', 'Message', 'Language',
  ]);
  sheet.appendRow([
    new Date().toISOString(),
    data['businessName'] || '',
    data['name']         || '',
    data['email']        || '',
    data['neighborhood'] || '',
    data['services']     || '',
    data['message']      || '',
    data['language']     || 'English',
  ]);
  return jsonResponse({ success: true });
}

// ── General Inquiry ───────────────────────────────────────────────────────────

function handleInquiry(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('General Inquiries') || ss.insertSheet('General Inquiries');
  ensureHeaders(sheet, ['Timestamp', 'Name', 'Email', 'Inquiry']);
  sheet.appendRow([
    new Date().toISOString(),
    data['name']    || '',
    data['email']   || '',
    data['inquiry'] || '',
  ]);
  return jsonResponse({ success: true });
}

// ── Resume Upload to Google Drive ─────────────────────────────────────────────

function handleFileUpload(data) {
  var folders = DriveApp.getFoldersByName('Volta Resumes');
  var folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder('Volta Resumes');
  var bytes   = Utilities.base64Decode(data.fileData);
  var blob    = Utilities.newBlob(bytes, data.mimeType, data.fileName);
  var file    = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return jsonResponse({ url: file.getUrl() });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#C4F135');
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Run once manually to verify the spreadsheet is accessible.
function setup() {
  Logger.log('Sheet: ' + SpreadsheetApp.openById(SHEET_ID).getName());
}

// ── ONE-TIME AUTHORIZATION ────────────────────────────────────────────────────
// DriveApp requires explicit authorization that cannot be granted via a web
// request — it must be triggered by running a function manually in the editor.
// Run authorizeDrive() once from the editor (▶ Run button), approve the
// permission prompt, then you can delete this function if you like.
function authorizeDrive() {
  var folders = DriveApp.getFoldersByName('Volta Resumes');
  var folder  = folders.hasNext() ? folders.next() : DriveApp.createFolder('Volta Resumes');
  Logger.log('Drive authorized. Folder: ' + folder.getName() + ' (' + folder.getId() + ')');
}
