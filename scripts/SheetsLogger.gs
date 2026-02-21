// ─────────────────────────────────────────────────────────────────────────────
// VOLTA NYC — Google Apps Script (SheetsLogger)
// Deploy as a Web App (Execute as: Me, Access: Anyone).
// Handles three form types from the public site:
//   formType: "application" → writes to Applications sheet
//   formType: "contact"     → writes to BusinessInquiries sheet
//   formType: "inquiry"     → writes to GeneralInquiries sheet
// ─────────────────────────────────────────────────────────────────────────────

var SPREADSHEET_ID = '1fi6ziWGIEyDNdEpUxBdcXL8TXZaEaE2lmmuo4BUis74'; // ← your Google Sheet ID

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.formType === 'application') return handleApplication(data);
    if (data.formType === 'contact') return handleContact(data);
    if (data.formType === 'inquiry') return handleInquiry(data);
    return jsonResponse({ error: 'Unknown formType: ' + data.formType });
  } catch (err) {
    Logger.log('SheetsLogger error: ' + err.toString());
    return jsonResponse({ error: err.toString() });
  }
}

// ── Student Application ────────────────────────────────────────────────────
function handleApplication(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Applications') || ss.insertSheet('Applications');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Full Name', 'Email', 'City', 'Education', 'How They Heard', 'Tracks', 'Has Resume']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#C4F135');
  }
  sheet.appendRow([
    new Date().toISOString(),
    data['Full Name'] || '',
    data['Email'] || '',
    data['City'] || '',
    data['Education'] || '',
    data['How They Heard'] || '',
    data['Tracks Selected'] || '',
    data['Has Resume'] || '',
  ]);
  return jsonResponse({ success: true });
}

// ── Business Contact Form ─────────────────────────────────────────────────
function handleContact(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('BusinessInquiries') || ss.insertSheet('BusinessInquiries');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Business Name', 'Owner Name', 'Email', 'Neighborhood', 'Services', 'Message', 'Language']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#C4F135');
  }
  sheet.appendRow([
    new Date().toISOString(),
    data.businessName || '',
    data.name || '',
    data.email || '',
    data.neighborhood || '',
    data.services || '',
    data.message || '',
    data.language || 'English',
  ]);
  return jsonResponse({ success: true });
}

// ── General Inquiry ───────────────────────────────────────────────────────
function handleInquiry(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('GeneralInquiries') || ss.insertSheet('GeneralInquiries');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp', 'Name', 'Email', 'Inquiry']);
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#C4F135');
  }
  sheet.appendRow([
    new Date().toISOString(),
    data.name || '',
    data.email || '',
    data.inquiry || '',
  ]);
  return jsonResponse({ success: true });
}

// ── Helper ────────────────────────────────────────────────────────────────
function jsonResponse(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// Run once to verify connection
function setup() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  Logger.log('Connected to: ' + ss.getName());
}
