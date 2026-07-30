// NOVUS NYC - Google Apps Script (SheetsLogger)
// Deploy as a Web App (Execute as: Me, Access: Anyone).

var SHEET_ID = '1UGcUy6pP7ND0BXrnKnd9GNh_d2Q_xph71b_dRNp19w4';
var RESUME_FOLDER_ID = '';
var RESUME_FOLDER_NAME = 'Novus Resumes';
var BOOKING_LINK = 'https://novusnyc.org/book';
var SIGNUP_LINK = 'https://novusnyc.org/members/signup?code=NOVUS-8J3UMP';
var FROM_EMAIL = 'ethan@novusnyc.org';
var FROM_NAME = 'Ethan Zhang';
var CC_EMAIL = 'andrewchin530@gmail.com';

var APPLICATION_HEADERS = [
  'Timestamp',
  'Full Name',
  'Email',
  'School Name',
  'Grade',
  'City, State',
  'How They Heard',
  'Tracks',
  'Has Resume',
  'Resume URL',
  'Tools/Software',
  'Accomplishment',
];

var CONTACT_HEADERS = [
  'Timestamp',
  'Business Name',
  'Owner Name',
  'Email',
  'Phone',
  'Neighborhood',
  'Services Requested',
  'Referred By',
  'Message',
  'Language',
];

function doPost(e) {
  try {
    var data = JSON.parse((e.postData && e.postData.contents) || '{}');
    if (data.formType === 'application') return handleApplication(data);
    if (data.formType === 'contact')     return handleContact(data);
    if (data.formType === 'inquiry')     return handleInquiry(data);
    if (data.formType === 'upload')      return handleFileUpload(data);
    return jsonResponse({ ok: false, error: 'Unknown formType: ' + data.formType });
  } catch (err) {
    Logger.log('SheetsLogger error: ' + err.toString());
    return jsonResponse({ ok: false, error: err.toString() });
  }
}

function handleApplication(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Applications') || ss.insertSheet('Applications');
  ensureOrderedHeaders(sheet, APPLICATION_HEADERS);
  appendByHeaders(sheet, APPLICATION_HEADERS, {
    'Timestamp':       data.Timestamp || new Date().toISOString(),
    'Full Name':       data['Full Name'] || '',
    'Email':           data.Email || data['Email'] || '',
    'School Name':     data['School Name'] || data.Education || '',
    'Grade':           data.Grade || '',
    'City, State':     data['City, State'] || data.City || '',
    'How They Heard':  data['How They Heard'] || '',
    'Tracks':          data['Tracks Selected'] || data.Tracks || '',
    'Has Resume':      data['Has Resume'] || '',
    'Resume URL':      data['Resume URL'] || '',
    'Tools/Software':  data['Tools/Software'] || '',
    'Accomplishment':  data.Accomplishment || '',
  });
  return jsonResponse({ ok: true, type: 'application' });
}

function handleContact(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('Business Inquiries') || ss.insertSheet('Business Inquiries');
  ensureOrderedHeaders(sheet, CONTACT_HEADERS);
  appendByHeaders(sheet, CONTACT_HEADERS, {
    'Timestamp':          data.Timestamp || new Date().toISOString(),
    'Business Name':      data.businessName || '',
    'Owner Name':         data.name || '',
    'Email':              data.email || '',
    'Phone':              data.phone || '',
    'Neighborhood':       data.neighborhood || '',
    'Services Requested': data.services || '',
    'Referred By':        data.referredBy || '',
    'Message':            data.message || '',
    'Language':           data.language || 'English',
  });
  return jsonResponse({ ok: true, type: 'contact' });
}

function handleInquiry(data) {
  var ss    = SpreadsheetApp.openById(SHEET_ID);
  var sheet = ss.getSheetByName('General Inquiries') || ss.insertSheet('General Inquiries');
  var headers = ['Timestamp', 'Name', 'Email', 'Inquiry'];
  ensureOrderedHeaders(sheet, headers);
  appendByHeaders(sheet, headers, {
    'Timestamp': new Date().toISOString(),
    'Name':      data.name || '',
    'Email':     data.email || '',
    'Inquiry':   data.inquiry || '',
  });
  return jsonResponse({ ok: true, type: 'inquiry' });
}

function handleFileUpload(data) {
  if (!data.fileData || !data.fileName) throw new Error('Missing upload data');
  var folder = getResumeFolder();
  var bytes  = Utilities.base64Decode(data.fileData);
  var blob   = Utilities.newBlob(bytes, data.mimeType || 'application/octet-stream', data.fileName);
  var file   = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return jsonResponse({ ok: true, type: 'upload', url: file.getUrl() });
}

function getResumeFolder() {
  if (RESUME_FOLDER_ID) return DriveApp.getFolderById(RESUME_FOLDER_ID);
  var folders = DriveApp.getFoldersByName(RESUME_FOLDER_NAME);
  return folders.hasNext() ? folders.next() : DriveApp.createFolder(RESUME_FOLDER_NAME);
}

function ensureOrderedHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    styleHeaders(sheet, headers.length);
    return;
  }

  var existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(toHeader);

  for (var i = 0; i < headers.length; i++) {
    var desired = headers[i];
    if (existing[i] === desired) continue;

    var found = existing.indexOf(desired, i + 1);
    if (found !== -1) {
      sheet.moveColumns(sheet.getRange(1, found + 1, sheet.getMaxRows(), 1), i + 1);
      existing.splice(i, 0, existing.splice(found, 1)[0]);
    } else {
      sheet.insertColumnBefore(i + 1);
      existing.splice(i, 0, desired);
    }
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  styleHeaders(sheet, headers.length);
}

function appendByHeaders(sheet, headers, valuesByHeader) {
  sheet.appendRow(headers.map(function(header) {
    return valuesByHeader[header] || '';
  }));
}

function styleHeaders(sheet, width) {
  sheet.getRange(1, 1, 1, width).setFontWeight('bold').setBackground('#F3E28D');
}

function toHeader(value) {
  return String(value || '').trim();
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function setup() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  ensureOrderedHeaders(ss.getSheetByName('Applications') || ss.insertSheet('Applications'), APPLICATION_HEADERS);
  ensureOrderedHeaders(ss.getSheetByName('Business Inquiries') || ss.insertSheet('Business Inquiries'), CONTACT_HEADERS);
  Logger.log('Sheet: ' + ss.getName());
}

function authorizeDrive() {
  var folder = getResumeFolder();
  Logger.log('Drive authorized. Folder: ' + folder.getName() + ' (' + folder.getId() + ')');
}

function onEdit(e) {
  var sheet = e.source.getActiveSheet();
  var range = e.range;
  var col = range.getColumn();
  var row = range.getRow();

  if (sheet.getName() !== 'Application Tracker') return;
  if (col < 9 || col > 14) return;
  if (range.getValue() !== true) return;
  if (row === 1) return;

  var headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(toHeader);
  var name = String(sheet.getRange(row, headerColumn(headers, ['Full Name', 'Name'], 2)).getValue() || '').trim();
  var email = String(sheet.getRange(row, headerColumn(headers, ['Email'], 3)).getValue() || '').trim();
  var tracks = String(sheet.getRange(row, headerColumn(headers, ['Tracks', 'Tracks Selected'], 7)).getValue() || '').trim();

  if (!email) return;

  var subject, body;

  if (col === 9) {
    subject = 'Next Steps: Novus Interview Invitation';
    body = interviewInviteEmail(name);
  } else if (col === 10) {
    subject = 'Novus NYC - Analyst Acceptance';
    body = analystEmail(name, tracks);
  } else if (col === 11) {
    subject = 'Novus NYC - Senior Analyst Acceptance';
    body = seniorAnalystEmail(name, tracks);
  } else if (col === 12) {
    subject = 'Novus NYC - Associate Acceptance';
    body = associateEmail(name, tracks);
  } else if (col === 13) {
    subject = 'Novus NYC - Senior Associate Acceptance';
    body = seniorAssociateEmail(name, tracks);
  } else if (col === 14) {
    subject = 'Novus NYC - Project Lead Acceptance';
    body = projectLeadEmail(name, tracks);
  }

  GmailApp.sendEmail(email, subject, '', {
    from: FROM_EMAIL,
    name: FROM_NAME,
    cc: CC_EMAIL,
    htmlBody: body
  });

  range.setValue(false);
}

function headerColumn(headers, names, fallback) {
  for (var i = 0; i < names.length; i++) {
    var found = headers.indexOf(names[i]);
    if (found !== -1) return found + 1;
  }
  return fallback;
}

function wrapper(content) {
  return "<div style=\"font-family: Garamond, 'EB Garamond', serif; font-size: 15px; line-height: 1.7; color: #111111; color-scheme: light;\">" + content + '</div>';
}

function formatTrack(track) {
  return track.indexOf(',') !== -1 ? 'across <strong>' + track + '</strong>' : 'on <strong>' + track + '</strong>';
}

function bookingButton() {
  return "<p><a href=\"" + BOOKING_LINK + "\" style=\"display:inline-block; background-color:#F6B78D; color:#231F24 !important; -webkit-text-fill-color:#231F24; padding:4px 12px; border-radius:3px; text-decoration:none; font-size:12px; font-family:Garamond,'EB Garamond',serif;\"><span style=\"color:#231F24 !important; -webkit-text-fill-color:#231F24;\">Book Your Interview Slot</span></a></p>";
}

function signupButton() {
  return "<p><a href=\"" + SIGNUP_LINK + "\" style=\"display:inline-block; background-color:#F6B78D; color:#231F24 !important; -webkit-text-fill-color:#231F24; padding:4px 12px; border-radius:3px; text-decoration:none; font-size:12px; font-family:Garamond,'EB Garamond',serif;\"><span style=\"color:#231F24 !important; -webkit-text-fill-color:#231F24;\">Create Your Member Account</span></a></p>";
}

function interviewInviteEmail(name) {
  return wrapper(`<p>Dear ${name},</p><p>Congratulations! You have been invited to the next stage of the selection process.</p><p>While we received many strong applications, your background and potential stood out to our team. We believe your skills are a strong fit for Novus and the work we're doing with our current business partners.</p><p><strong>Next Steps:</strong> We'd like to schedule a formal interview to discuss your placement within the team and your specific interests.</p><p>Your interview will take place <strong>next week</strong>. Please secure your time slot within the next 48 hours:</p>${bookingButton()}<p>We look forward to learning more about you.</p><p>Sincerely,<br>Ethan Zhang<br>Novus NYC</p>`);
}

function analystEmail(name, track) {
  return wrapper(`<p>Hi ${name},</p><p>Congratulations! You've been accepted to Novus NYC as an <strong>Analyst</strong> ${formatTrack(track)}.</p><p>You'll be assigned to a project within the next week. In the meantime, please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>${signupButton()}<p>Best,<br>Ethan Zhang<br>Novus NYC</p>`);
}

function seniorAnalystEmail(name, track) {
  return wrapper(`<p>Hi ${name},</p><p>Congratulations! You've been accepted to Novus NYC as a <strong>Senior Analyst</strong> ${formatTrack(track)}.</p><p>You'll be assigned to a project within the next week. In the meantime, please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>${signupButton()}<p>Best,<br>Ethan Zhang<br>Novus NYC</p>`);
}

function associateEmail(name, track) {
  return wrapper(`<p>Hi ${name},</p><p>Congratulations! You've been accepted to Novus NYC as an <strong>Associate</strong> ${formatTrack(track)}.</p><p>You'll be assigned to a project within the next week. Based on your application, you're on a clear path for early leadership consideration as projects progress. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>${signupButton()}<p>Best,<br>Ethan Zhang<br>Novus NYC</p>`);
}

function seniorAssociateEmail(name, track) {
  return wrapper(`<p>Hi ${name},</p><p>Congratulations! You've been accepted to Novus NYC as a <strong>Senior Associate</strong> ${formatTrack(track)}.</p><p>You'll be assigned to a project within the next week. We're bringing you in as a Senior Associate because we trust your ability to lead and see your potential to take on more responsibility as projects progress. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>${signupButton()}<p>Best,<br>Ethan Zhang<br>Novus NYC</p>`);
}

function projectLeadEmail(name, track) {
  return wrapper(`<p>Hi ${name},</p><p>Congratulations! We're excited to offer you a <strong>Project Lead</strong> role at Novus NYC.</p><p>You'll be assigned to lead one of our upcoming projects within the next week. Project Leads are accountable for delivery, quality, and communication. If you have peers you'd like to bring on, feel free to let us know. Please create your member portal account as soon as possible: that's where your team, tasks, and project details will be organized.</p>${signupButton()}<p>Best,<br>Ethan Zhang<br>Novus NYC</p>`);
}
