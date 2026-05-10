#!/usr/bin/env node
/**
 * importSupabaseData.mjs
 * ----------------------
 * Reads scripts/firebase-export/<collection>.json and upserts rows
 * into the matching Supabase table.
 *
 * Idempotent – uses upsert (ON CONFLICT DO UPDATE) so re-running is safe.
 * Never deletes rows or touches Firebase.
 *
 * Business images (base64 data URLs) are uploaded to Supabase Storage and
 * the businesses row is updated with showcase_image_path / showcase_image_url.
 *
 * Usage:
 *   node scripts/importSupabaseData.mjs [--dry-run] [--collections businesses,team,...]
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EXPORT_DIR = join(__dirname, 'firebase-export');

// ---------------------------------------------------------------------------
// Load env
// ---------------------------------------------------------------------------
const env = Object.fromEntries(
  readFileSync(join(ROOT, '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')]; })
);

const DRY_RUN = process.argv.includes('--dry-run');
const args = process.argv.slice(2);
const flagIdx = args.indexOf('--collections');

// ---------------------------------------------------------------------------
// Supabase client (service role)
// ---------------------------------------------------------------------------
const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ---------------------------------------------------------------------------
// Field-name mapping: Firebase camelCase → Postgres snake_case
// ---------------------------------------------------------------------------
function toSnake(key) {
  return key.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function transformKeys(obj) {
  if (Array.isArray(obj)) return obj;   // keep arrays as-is
  if (obj === null || typeof obj !== 'object') return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Per-collection row transformers
// Fields that need special handling (arrays stored as objects in Firebase,
// JSONB columns, timestamp coercion, etc.)
// ---------------------------------------------------------------------------

function toTs(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function toBool(val) {
  if (val === '' || val === null || val === undefined) return null;
  if (typeof val === 'boolean') return val;
  return val === 'true' || val === true || val === 1;
}

function objToArray(val) {
  if (!val) return null;
  if (Array.isArray(val)) return val;
  return Object.values(val);
}

// businesses
function transformBusiness([id, r]) {
  return {
    id,
    name:                      r.name ?? null,
    owner_name:                r.ownerName ?? null,
    owner_email:               r.ownerEmail ?? null,
    owner_alternate_email:     r.ownerAlternateEmail ?? null,
    phone:                     r.phone ?? null,
    alternate_phone:           r.alternatePhone ?? null,
    address:                   r.address ?? null,
    website:                   r.website ?? null,
    bid_id:                    r.bidId ?? null,
    neighborhood:              r.neighborhood ?? null,
    lat:                       r.lat ?? null,
    lng:                       r.lng ?? null,
    division:                  r.division ?? null,
    team_members:              objToArray(r.teamMembers) ?? [],
    project_status:            r.projectStatus ?? null,
    team_lead:                 r.teamLead ?? null,
    first_contact_date:        r.firstContactDate ?? null,
    notes:                     r.notes ?? null,
    showcase_enabled:          r.showcaseEnabled ?? false,
    showcase_featured_on_home: r.showcaseFeaturedOnHome ?? false,
    showcase_name:             r.showcaseName ?? null,
    showcase_type:             r.showcaseType ?? null,
    showcase_neighborhood:     r.showcaseNeighborhood ?? null,
    showcase_services:         objToArray(r.showcaseServices) ?? [],
    showcase_status:           r.showcaseStatus ?? null,
    showcase_description:      r.showcaseDescription ?? null,
    showcase_url:              r.showcaseUrl ?? null,
    showcase_image_url:        r.showcaseImageUrl ?? null,
    showcase_image_path:       null,   // filled during image migration step
    showcase_image_set:        r.showcaseImageSet ?? false,
    showcase_color:            r.showcaseColor ?? null,
    project_tracks:            objToArray(r.projectTracks) ?? [],
    track_projects:            r.trackProjects ?? null,
    intake_source:             r.intakeSource ?? null,
    sort_index:                r.sortIndex ?? null,
    github_url:                r.githubUrl ?? null,
    drive_folder_url:          r.driveFolderUrl ?? null,
    client_notes:              r.clientNotes ?? null,
    active_services:           objToArray(r.activeServices) ?? [],
    languages:                 objToArray(r.languages) ?? [],
    created_at:                toTs(r.createdAt),
    updated_at:                toTs(r.updatedAt),
  };
}

// bids
function transformBid([id, r]) {
  return {
    id,
    name:          r.name ?? null,
    contact_name:  r.contactName ?? null,
    contact_email: r.contactEmail ?? null,
    phone:         r.phone ?? null,
    status:        r.status ?? null,
    priority:      r.priority ?? null,
    borough:       r.borough ?? null,
    address:       r.address ?? null,
    zip_code:      r.zipCode ?? null,
    lat:           r.lat ?? null,
    lng:           r.lng ?? null,
    next_action:   r.nextAction ?? null,
    notes:         r.notes ?? null,
    sort_index:    r.sortIndex ?? null,
    timeline:      r.timeline ?? null,
    created_at:    toTs(r.createdAt),
    updated_at:    toTs(r.updatedAt),
  };
}

// team
function transformTeamMember([id, r]) {
  return {
    id,
    name:                           r.name ?? null,
    email:                          r.email ?? null,
    alternate_email:                r.alternateEmail ?? null,
    school:                         r.school ?? null,
    grade:                          r.grade ?? null,
    status:                         r.status ?? null,
    role:                           r.role ?? null,
    pod:                            r.pod ?? null,
    slack_handle:                   r.slackHandle ?? null,
    divisions:                      objToArray(r.divisions) ?? [],
    accepted_date:                  r.acceptedDate ?? null,
    join_date:                      r.joinDate ?? null,
    skills:                         objToArray(r.skills) ?? [],
    notes:                          r.notes ?? null,
    last_warning_cycle_id:          r.lastWarningCycleId ?? null,
    last_auto_strike_cycle_id:      r.lastAutoStrikeCycleId ?? null,
    last_biweekly_checkin_mark:     r.lastBiweeklyCheckinMark ?? null,
    last_biweekly_checkin_cycle_id: r.lastBiweeklyCheckinCycleId ?? null,
    created_at:                     toTs(r.createdAt),
    updated_at:                     toTs(r.updatedAt),
  };
}

// applications
function transformApplication([id, r]) {
  return {
    id,
    full_name:                  r.fullName ?? null,
    email:                      r.email ?? null,
    school_name:                r.schoolName ?? null,
    grade:                      r.grade ?? null,
    city_state:                 r.cityState ?? null,
    referral:                   r.referral ?? null,
    tracks_selected:            objToArray(r.tracksSelected) ?? [],
    has_resume:                 toBool(r.hasResume),
    resume_url:                 r.resumeUrl ?? null,
    tools_software:             r.toolsSoftware ?? null,
    accomplishment:             r.accomplishment ?? null,
    status:                     r.status ?? null,
    interview_invite_token:     r.interviewInviteToken ?? null,
    interview_invite_sent_at:   r.interviewInviteSentAt ?? null,
    interview_reminder_sent_at: r.interviewReminderSentAt ?? null,
    interview_slot_id:          r.interviewSlotId ?? null,
    interview_scheduled_at:     r.interviewScheduledAt ?? null,
    interview_evaluations:      r.interviewEvaluations ?? null,
    final_decision_role:        r.finalDecisionRole ?? null,
    notes:                      r.notes ?? null,
    source:                     r.source ?? null,
    source_timestamp_raw:       r.sourceTimestampRaw ?? null,
    created_at:                 toTs(r.createdAt),
    updated_at:                 toTs(r.updatedAt),
  };
}

// projects
function transformProject([id, r]) {
  return {
    id,
    name:              r.name ?? null,
    business_id:       r.businessId ?? null,
    division:          r.division ?? null,
    status:            r.status ?? null,
    team_lead:         r.teamLead ?? null,
    team_members:      objToArray(r.teamMembers) ?? [],
    start_date:        r.startDate ?? null,
    target_end_date:   r.targetEndDate ?? null,
    actual_end_date:   r.actualEndDate ?? null,
    week1_deliverable: r.week1Deliverable ?? null,
    final_deliverable: r.finalDeliverable ?? null,
    progress:          r.progress ?? null,
    slack_channel:     r.slackChannel ?? null,
    drive_folder_url:  r.driveFolderUrl ?? null,
    client_notes:      r.clientNotes ?? null,
    created_at:        toTs(r.createdAt),
    updated_at:        toTs(r.updatedAt),
  };
}

// financeAssignments
function transformFinanceAssignment([id, r]) {
  return {
    id,
    title:                 r.title ?? null,
    topic:                 r.topic ?? null,
    type:                  r.type ?? null,
    status:                r.status ?? null,
    seed_key:              r.seedKey ?? null,
    team_label:            r.teamLabel ?? null,
    region:                r.region ?? null,
    assigned_member_names: objToArray(r.assignedMemberNames) ?? [],
    assigned_member_ids:   objToArray(r.assignedMemberIds) ?? [],
    deadline:              r.deadline ?? null,
    interview_due_date:    r.interviewDueDate ?? null,
    first_draft_due_date:  r.firstDraftDueDate ?? null,
    final_due_date:        r.finalDueDate ?? null,
    deadlines:             r.deadlines ?? null,
    deliverable_url:       r.deliverableUrl ?? null,
    notes:                 r.notes ?? null,
    created_at:            toTs(r.createdAt),
    updated_at:            toTs(r.updatedAt),
  };
}

// cycles
function transformCycle([id, r]) {
  return {
    id,
    name:                        r.name ?? null,
    start_date:                  r.startDate ?? null,
    end_date:                    r.endDate ?? null,
    active:                      r.active ?? false,
    credit_targets:              r.creditTargets ?? null,
    strike_thresholds:           r.strikeThresholds ?? null,
    pacing_percent_per_checkin:  r.pacingPercentPerCheckin ?? null,
    created_at:                  toTs(r.createdAt),
    updated_at:                  toTs(r.updatedAt),
  };
}

// infractions
function transformInfraction([id, r]) {
  return {
    id,
    name:        r.name ?? null,
    description: r.description ?? null,
    points:      r.points ?? null,
    created_at:  toTs(r.createdAt),
    updated_at:  toTs(r.updatedAt),
  };
}

// memberStrikes
function transformMemberStrike([id, r]) {
  return {
    id,
    member_id:       r.memberId ?? null,
    member_name:     r.memberName ?? null,
    cycle_id:        r.cycleId ?? null,
    infraction_id:   r.infractionId ?? null,
    infraction_name: r.infractionName ?? null,
    points:          r.points ?? null,
    source:          r.source ?? null,
    issued_at:       r.issuedAt ?? null,
    issued_by:       r.issuedBy ?? null,
    note:            r.note ?? null,
  };
}

// memberCreditAdjustments
function transformCreditAdjustment([id, r]) {
  return {
    id,
    member_id:   r.memberId ?? null,
    member_name: r.memberName ?? null,
    cycle_id:    r.cycleId ?? null,
    points:      r.points ?? null,
    reason:      r.reason ?? null,
    created_at:  toTs(r.createdAt),
    created_by:  r.createdBy ?? null,
  };
}

// emailTemplates
function transformEmailTemplate([id, r]) {
  return {
    id,
    key:                 r.key ?? null,
    label:               r.label ?? null,
    description:         r.description ?? null,
    subject:             r.subject ?? null,
    body:                r.body ?? null,
    available_variables: objToArray(r.availableVariables) ?? [],
    active:              r.active ?? true,
    updated_at:          toTs(r.updatedAt),
    updated_by:          r.updatedBy ?? null,
  };
}

// assignmentCatalog
function transformAssignmentCatalog([id, r]) {
  return {
    id,
    title:           r.title ?? null,
    description:     r.description ?? null,
    status:          r.status ?? null,
    primary_track:   r.primaryTrack ?? null,
    visible_tracks:  objToArray(r.visibleTracks) ?? [],
    credits:         r.credits ?? null,
    difficulty:      r.difficulty ?? null,
    estimated_hours: r.estimatedHours ?? null,
    min_role:        r.minRole ?? null,
    capacity:        r.capacity ?? null,
    deadline:        r.deadline ?? null,
    business_id:     r.businessId ?? null,
    cycle_id:        r.cycleId ?? null,
    notes:           r.notes ?? null,
    created_at:      toTs(r.createdAt),
    updated_at:      toTs(r.updatedAt),
    created_by:      r.createdBy ?? null,
  };
}

// assignmentClaims
function transformAssignmentClaim([id, r]) {
  return {
    id,
    assignment_id:    r.assignmentId ?? null,
    member_id:        r.memberId ?? null,
    member_name:      r.memberName ?? null,
    cycle_id:         r.cycleId ?? null,
    status:           r.status ?? null,
    deliverable_url:  r.deliverableUrl ?? null,
    submission_notes: r.submissionNotes ?? null,
    claimed_at:       toTs(r.claimedAt),
    submitted_at:     toTs(r.submittedAt),
    approved_at:      toTs(r.approvedAt),
    rejected_at:      toTs(r.rejectedAt),
    reject_reason:    r.rejectReason ?? null,
    credits_awarded:  r.creditsAwarded ?? null,
    approved_by:      r.approvedBy ?? null,
  };
}

// userProfiles
function transformUserProfile([id, r]) {
  if (typeof r !== 'object' || r === null) return { id, auth_role: r };
  return {
    id,
    email:      r.email ?? null,
    auth_role:  r.authRole ?? null,
    name:       r.name ?? null,
    school:     r.school ?? null,
    grade:      r.grade ?? null,
    active:     r.active ?? true,
    created_at: toTs(r.createdAt),
  };
}

// auditLogs
function transformAuditLog([id, r]) {
  return {
    id,
    timestamp:   toTs(r.timestamp),
    action:      r.action ?? null,
    collection:  r.collection ?? null,
    record_id:   r.recordId ?? null,
    actor_uid:   r.actorUid ?? null,
    actor_email: r.actorEmail ?? null,
    actor_name:  r.actorName ?? null,
    details:     r.details ?? null,
  };
}

// inviteCodes
function transformInviteCode([id, r]) {
  return {
    id,
    code:         r.code ?? id,
    role:         r.role ?? null,
    expires_at:   r.expiresAt ?? null,
    active:       r.active ?? true,
    used:         r.used ?? false,
    multi_use:    r.multiUse ?? false,
    used_by:      r.usedBy ?? null,
    used_at:      r.usedAt ?? null,
    last_used_by: r.lastUsedBy ?? null,
    last_used_at: r.lastUsedAt ?? null,
    signup_count: r.signupCount ?? 0,
    source:       r.source ?? null,
    created_by:   r.createdBy ?? null,
    created_at:   toTs(r.createdAt),
  };
}

// calendarEvents
function transformCalendarEvent([id, r]) {
  return {
    id,
    title:       r.title ?? null,
    description: r.description ?? null,
    start:       toTs(r.start),
    end:         toTs(r.end),
    all_day:     r.allDay ?? false,
    i_cal_uid:   r.iCalUID ?? null,
    color:       r.color ?? null,
    created_by:  r.createdBy ?? null,
    created_at:  toTs(r.createdAt),
  };
}

// interviewInvites
function transformInterviewInvite([id, r]) {
  return {
    id,
    applicant_name:  r.applicantName ?? null,
    applicant_email: r.applicantEmail ?? null,
    role:            r.role ?? null,
    expires_at:      typeof r.expiresAt === 'number' ? r.expiresAt : null,
    status:          r.status ?? null,
    booked_slot_id:  r.bookedSlotId ?? null,
    multi_use:       r.multiUse ?? false,
    created_by:      r.createdBy ?? null,
    created_at:      toTs(r.createdAt),
    note:            r.note ?? null,
  };
}

// interviewSlots
function transformInterviewSlot([id, r]) {
  return {
    id,
    datetime:               toTs(r.datetime),
    duration_minutes:       r.durationMinutes ?? null,
    location:               r.location ?? null,
    available:              r.available ?? true,
    booked_by:              r.bookedBy ?? null,
    booker_name:            r.bookerName ?? null,
    booker_email:           r.bookerEmail ?? null,
    interviewer_member_ids: objToArray(r.interviewerMemberIds) ?? [],
    evaluation_by_uid:      r.evaluationByUid ?? null,
    recurring_weekly:       r.recurringWeekly ?? false,
    recurring_series_id:    r.recurringSeriesId ?? null,
    no_show:                r.noShow ?? false,
    reminder_sent_at:       toTs(r.reminderSentAt),
    created_by:             r.createdBy ?? null,
    created_at:             toTs(r.createdAt),
  };
}

// inquiries
function transformInquiry([id, r]) {
  return {
    id,
    name:       r.name ?? null,
    email:      r.email ?? null,
    inquiry:    r.inquiry ?? null,
    source:     r.source ?? null,
    created_at: toTs(r.createdAt),
    updated_at: toTs(r.updatedAt),
  };
}

// abuseGuards — nested bucket/key structure
function transformAbuseGuards(data) {
  const rows = [];
  for (const [bucket, keys] of Object.entries(data)) {
    if (typeof keys !== 'object') continue;
    for (const [key, r] of Object.entries(keys)) {
      rows.push({
        bucket,
        key,
        count:        r.count ?? 0,
        reset_at:     r.resetAt ?? null,
        blocked:      r.blocked ?? false,
        last_seen_at: r.lastSeenAt ?? null,
      });
    }
  }
  return rows;
}

// interviewSettings — singleton
function transformInterviewSettings(r) {
  return [{
    id:           'singleton',
    zoom_link:    r.zoomLink ?? null,
    zoom_enabled: r.zoomEnabled ?? false,
    updated_at:   toTs(r.updatedAt),
    updated_by:   r.updatedBy ?? null,
  }];
}

// ---------------------------------------------------------------------------
// Collection → table + transformer config
// ---------------------------------------------------------------------------
const COLLECTION_MAP = [
  { firebase: 'businesses',             table: 'businesses',               transform: transformBusiness },
  { firebase: 'bids',                   table: 'bids',                     transform: transformBid },
  { firebase: 'team',                   table: 'team',                     transform: transformTeamMember },
  { firebase: 'applications',           table: 'applications',             transform: transformApplication },
  { firebase: 'projects',               table: 'projects',                 transform: transformProject },
  { firebase: 'financeAssignments',     table: 'finance_assignments',      transform: transformFinanceAssignment },
  { firebase: 'assignmentCatalog',      table: 'assignment_catalog',       transform: transformAssignmentCatalog },
  { firebase: 'assignmentClaims',       table: 'assignment_claims',        transform: transformAssignmentClaim },
  { firebase: 'cycles',                 table: 'cycles',                   transform: transformCycle },
  { firebase: 'infractions',            table: 'infractions',              transform: transformInfraction },
  { firebase: 'memberStrikes',          table: 'member_strikes',           transform: transformMemberStrike },
  { firebase: 'memberCreditAdjustments',table: 'member_credit_adjustments',transform: transformCreditAdjustment },
  { firebase: 'emailTemplates',         table: 'email_templates',          transform: transformEmailTemplate },
  { firebase: 'userProfiles',           table: 'user_profiles',            transform: transformUserProfile },
  { firebase: 'auditLogs',              table: 'audit_logs',               transform: transformAuditLog },
  { firebase: 'inviteCodes',            table: 'invite_codes',             transform: transformInviteCode },
  { firebase: 'calendarEvents',         table: 'calendar_events',          transform: transformCalendarEvent },
  { firebase: 'interviewInvites',       table: 'interview_invites',        transform: transformInterviewInvite },
  { firebase: 'interviewSlots',         table: 'interview_slots',          transform: transformInterviewSlot },
  { firebase: 'inquiries',              table: 'inquiries',                transform: transformInquiry },
];

const SPECIAL = ['abuseGuards', 'interviewSettings', 'businessImages'];

// ---------------------------------------------------------------------------
// Upsert helper (batched in chunks of 500)
// ---------------------------------------------------------------------------
const BATCH = 500;

async function upsertRows(table, rows) {
  if (rows.length === 0) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    if (!DRY_RUN) {
      const { error } = await supabase.from(table).upsert(chunk, { onConflict: 'id' });
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    inserted += chunk.length;
  }
  return inserted;
}

// ---------------------------------------------------------------------------
// Business image upload
// ---------------------------------------------------------------------------
async function uploadBusinessImages() {
  const path = join(EXPORT_DIR, 'businessImages.json');
  if (!existsSync(path)) { console.log('  businessImages.json not found — skipping'); return; }

  const images = JSON.parse(readFileSync(path, 'utf8'));
  const BUCKET = 'business-photos';
  let uploaded = 0;
  let skipped = 0;

  for (const [bizId, record] of Object.entries(images)) {
    const data = record?.data || record;
    if (!data || typeof data !== 'string') { skipped++; continue; }

    // Parse data URL
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) { skipped++; continue; }
    const [, mimeType, b64] = match;
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg';
    const storagePath = `businesses/${bizId}/showcase.${ext}`;
    const buffer = Buffer.from(b64, 'base64');

    if (!DRY_RUN) {
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: mimeType, upsert: true });
      if (upErr) { console.log(`  WARN: upload failed for ${bizId}: ${upErr.message}`); skipped++; continue; }

      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      const { error: updateErr } = await supabase
        .from('businesses')
        .update({ showcase_image_path: storagePath, showcase_image_url: publicUrl })
        .eq('id', bizId);
      if (updateErr) console.log(`  WARN: businesses update failed for ${bizId}: ${updateErr.message}`);
    }
    uploaded++;
  }
  console.log(`  Images: ${uploaded} uploaded, ${skipped} skipped`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const targetCollections = flagIdx !== -1
  ? args[flagIdx + 1].split(',').map(s => s.trim())
  : null;

function shouldRun(name) {
  return !targetCollections || targetCollections.includes(name);
}

console.log(DRY_RUN ? '=== DRY RUN — no data will be written ===\n' : '=== Importing Firebase data into Supabase ===\n');

let totalRows = 0;

for (const { firebase, table, transform } of COLLECTION_MAP) {
  if (!shouldRun(firebase)) continue;

  const filePath = join(EXPORT_DIR, `${firebase}.json`);
  if (!existsSync(filePath)) {
    console.log(`${firebase} → ${table}: export file missing — skipping`);
    continue;
  }

  const raw = JSON.parse(readFileSync(filePath, 'utf8'));
  const entries = Object.entries(raw);
  if (entries.length === 0) { console.log(`${firebase} → ${table}: empty`); continue; }

  const rows = entries.map(transform).filter(Boolean);
  try {
    const n = await upsertRows(table, rows);
    totalRows += n;
    console.log(`${firebase} → ${table}: ${n} rows`);
  } catch (err) {
    console.error(`ERROR importing ${firebase}: ${err.message}`);
  }
}

// Special: abuseGuards
if (shouldRun('abuseGuards')) {
  const filePath = join(EXPORT_DIR, 'abuseGuards.json');
  if (existsSync(filePath)) {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    const rows = transformAbuseGuards(raw);
    try {
      if (!DRY_RUN && rows.length) {
        const { error } = await supabase.from('abuse_guards').upsert(rows, { onConflict: 'bucket,key' });
        if (error) throw new Error(error.message);
      }
      totalRows += rows.length;
      console.log(`abuseGuards → abuse_guards: ${rows.length} rows`);
    } catch (err) {
      console.error(`ERROR importing abuseGuards: ${err.message}`);
    }
  }
}

// Special: interviewSettings
if (shouldRun('interviewSettings')) {
  const filePath = join(EXPORT_DIR, 'interviewSettings.json');
  if (existsSync(filePath)) {
    const raw = JSON.parse(readFileSync(filePath, 'utf8'));
    const rows = transformInterviewSettings(raw);
    try {
      if (!DRY_RUN) {
        const { error } = await supabase.from('interview_settings').upsert(rows, { onConflict: 'id' });
        if (error) throw new Error(error.message);
      }
      totalRows += rows.length;
      console.log(`interviewSettings → interview_settings: ${rows.length} row`);
    } catch (err) {
      console.error(`ERROR importing interviewSettings: ${err.message}`);
    }
  }
}

// Special: businessImages → Supabase Storage
if (shouldRun('businessImages')) {
  console.log('businessImages → Supabase Storage (business-photos):');
  await uploadBusinessImages();
}

console.log(`\n${DRY_RUN ? '[DRY RUN] Would have written' : 'Done.'} ${totalRows} total rows.`);
process.exit(0);
