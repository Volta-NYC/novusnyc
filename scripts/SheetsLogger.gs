// ─────────────────────────────────────────────────────────────────────────────
// VOLTA NYC — Google Apps Script (SheetsLogger)
// Deploy as a Web App (Execute as: Me, Access: Anyone).
// Routes submissions to the correct spreadsheet and tab based on formType.
//
//   formType: "application" → Applications spreadsheet
//   formType: "contact"     → Contacts spreadsheet, Business Inquiries tab (gid 0)
//   formType: "inquiry"     → Contacts spreadsheet, General Inquiries tab (gid 541419052)
// ─────────────────────────────────────────────────────────────────────────────

var APPLICATIONS_SHEET_ID  = '1fi6ziWGIEyDNdEpUxBdcXL8TXZaEaE2lmmuo4BUis74';
var CONTACTS_SHEET_ID      = '14Fqhvhqmb6FDXq-TTKG3_5PxpbNHVIPOZXgKpYoqTms';
var BUSINESS_INQUIRIES_GID = 0;
var GENERAL_INQUIRIES_GID  = 541419052;

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.formType === 'application') return handleApplication(data);
    if (data.formType === 'contact')     return handleContact(data);
    if (data.formType === 'inquiry')     return handleInquiry(data);
    return jsonResponse({ error: 'Unknown formType: ' + data.formType });
  } catch (err) {
    Logger.log('SheetsLogger error: ' + err.toString());
    return jsonResponse({ error: err.toString() });
  }
}

// ── Student Application ────────────────────────────────────────────────────────

function handleApplication(data) {
  var ss    = SpreadsheetApp.openById(APPLICATIONS_SHEET_ID);
  var sheet = ss.getSheetByName('Applications') || ss.insertSheet('Applications');
  ensureHeaders(sheet, [
    'Timestamp', 'Full Name', 'Email', 'City', 'Education',
    'How They Heard', 'Tracks', 'Has Resume', 'Tools/Software', 'Accomplishment',
  ]);
  sheet.appendRow([
    new Date().toISOString(),
    data['Full Name']       || '',
    data['Email']           || '',
    data['City']            || '',
    data['Education']       || '',
    data['How They Heard']  || '',
    data['Tracks Selected'] || '',
    data['Has Resume']      || '',
    data['Tools/Software']  || '',
    data['Accomplishment']  || '',
  ]);
  return jsonResponse({ success: true });
}

// ── Business Contact Form ─────────────────────────────────────────────────────
// Services and language are always sent in English by the client.

function handleContact(data) {
  var ss    = SpreadsheetApp.openById(CONTACTS_SHEET_ID);
  var sheet = getSheetByGid(ss, BUSINESS_INQUIRIES_GID) || ss.getSheets()[0];
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
  var ss    = SpreadsheetApp.openById(CONTACTS_SHEET_ID);
  var sheet = getSheetByGid(ss, GENERAL_INQUIRIES_GID) || ss.insertSheet('General Inquiries');
  ensureHeaders(sheet, ['Timestamp', 'Name', 'Email', 'Inquiry']);
  sheet.appendRow([
    new Date().toISOString(),
    data['name']    || '',
    data['email']   || '',
    data['inquiry'] || '',
  ]);
  return jsonResponse({ success: true });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSheetByGid(spreadsheet, gid) {
  var sheets = spreadsheet.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getSheetId() === gid) return sheets[i];
  }
  return null;
}

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

// Run once manually to verify both spreadsheets are accessible.
function setup() {
  Logger.log('Applications: ' + SpreadsheetApp.openById(APPLICATIONS_SHEET_ID).getName());
  Logger.log('Contacts: ' + SpreadsheetApp.openById(CONTACTS_SHEET_ID).getName());
}
