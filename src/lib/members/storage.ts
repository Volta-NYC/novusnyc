// Supabase Postgres storage for the Novus NYC members portal.
// All exported function signatures are unchanged — callers require no edits.
//
// Subscribe functions perform an initial fetch then open a Supabase realtime
// channel so the UI updates automatically when the database changes.

import { supabase } from "@/lib/supabaseClient";

// ── DATA TYPES ────────────────────────────────────────────────────────────────

export interface BIDContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string;
}

export interface BID {
  id: string;
  chapterId?: string;   // which market this partner belongs to
  name: string;
  status: "Active Partner" | "In Conversation" | "Outreach" | "Paused" | "Dead";
  contacts?: BIDContact[];
  contactName?: string;
  contactEmail?: string;
  phone?: string;
  borough: string;
  address?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  nextAction: string;
  notes?: string;
  priority: "High" | "Medium" | "Low";
  timeline?: Record<string, {
    date: string;
    action?: string;
    // Legacy fields retained for backward compatibility with existing entries.
    type?: string;
    note?: string;
    createdAt: string;
  }>;
  sortIndex?: number;
  createdAt: string;
  updatedAt: string;
}

// Tech pipeline. Draft Ready requires previewUrl and Live requires liveUrl —
// enforced at the transition so the list stays honest without anyone policing it.
// No "Building" tier: it said the same thing as Assigned, and nothing ever
// used it.
export const TECH_STATUSES = [
  "Backlog", "Assigned", "Draft Ready", "With Client", "Live", "On Hold", "Dropped",
] as const;
export type TechStatus = (typeof TECH_STATUSES)[number];

export const TECH_PIPELINE: TechStatus[] = [
  "Backlog", "Assigned", "Draft Ready", "With Client", "Live",
];

export const TECH_PRIORITIES = ["High", "Medium", "Maybe"] as const;
export type TechPriority = (typeof TECH_PRIORITIES)[number];

export interface Business {
  id: string;
  name: string;
  bidId?: string;
  ownerName: string;
  ownerEmail: string;
  ownerAlternateEmail: string;
  phone: string;
  alternatePhone: string;
  address: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
  website: string;
  // ── Tech project tracker ──────────────────────────────────────────────────
  // Three URLs because two columns previously carried three meanings between
  // them, and launching a site overwrote its preview link.
  chapterId?: string;     // which market this client belongs to
  clientUrl?: string;     // what the business had before Novus
  previewUrl?: string;    // the Vercel deploy
  liveUrl?: string;       // launched on its own domain — the "real domains" list
  techStatus?: TechStatus;
  techPriority?: TechPriority;
  assignees?: string[];   // team member ids
  hoursLogged?: number;   // entered by hand by a tech lead; optional by design
  targetDate?: string;
  lastTouchedAt?: string;
  activeServices?: string[];   // legacy field
  projectStatus:
    | "Ongoing"
    | "Upcoming"
    | "Completed"
    | "Not Started"
    | "Discovery"
    | "Active"
    | "On Hold"
    | "Complete";
  teamLead: string;
  languages?: string[];        // legacy field
  firstContactDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Project-level fields (merged from Projects tab)
  division?: "Tech" | "Marketing" | "Finance";
  teamMembers?: string[];     // may be undefined on legacy rows
  githubUrl?: string;         // legacy field
  driveFolderUrl?: string;    // legacy field
  clientNotes?: string;       // legacy field
  sortIndex?: number;
  intakeSource?: "website_form" | "discovery";
  archived?: boolean;
  referredBy?: string;
  servicesRequested?: string;
  // Public-site showcase configuration (optional, managed in Projects UI).
  showcaseEnabled?: boolean;
  showcaseFeaturedOnHome?: boolean;
  showcaseName?: string;
  showcaseType?: string;
  showcaseNeighborhood?: string;
  showcaseServices?: string[]; // may be undefined on legacy rows
  showcaseStatus?: "In Progress" | "Active" | "Upcoming";
  showcaseDescription?: string;
  showcaseUrl?: string;
  showcaseImageUrl?: string;
  // showcaseImageData is no longer stored inline in businesses — it lives at
  // businessImages/{id}. This field is kept for reading legacy records that
  // haven't been re-saved yet. New writes go through setBusinessImage().
  showcaseImageData?: string;
  showcaseImageSet?: boolean;   // true when an image exists in businessImages/{id}
  showcaseColor?:
    | "green"
    | "blue"
    | "orange"
    | "amber"
    | "pink"
    | "purple"
    | "blue-soft"
    | "blue-mid"
    | "blue-deep"
    | "lime-soft"
    | "lime-mid"
    | "lime-deep"
    | "green-soft"
    | "green-mid"
    | "green-deep"
    | "amber-soft"
    | "amber-mid"
    | "amber-deep"
    | "pink-soft"
    | "pink-mid"
    | "pink-deep"
    | "purple-mid"
    | "red-soft"
    | "red-mid"
    | "red-deep";
  // Multi-track project model for per-business track workstreams.
  projectTracks?: Array<"Tech" | "Marketing" | "Finance">;
  trackProjects?: Partial<Record<"Tech" | "Marketing" | "Finance", {
    projectStatus?: "Ongoing" | "Upcoming" | "Completed" | "Not Started" | "Discovery" | "Active" | "On Hold" | "Complete" | "In Development" | "Awaiting Client" | "Awaiting Deployment" | "In Planning" | "Consistent Posts" | "In Progress";
    teamMembers?: string[];
    deadlines?: Array<{
      label?: string;
      date?: string;
    }>;
    notes?: string;
  }>>;
}

export interface TeamMember {
  id: string;
  name: string;
  school: string;
  grade?: string;
  acceptedDate?: string;
  divisions: string[];    // may be undefined on legacy rows
  // Rank on the ladder in roles.ts. Free-form so any legacy value still shows
  // verbatim rather than vanishing from the directory.
  role: string;
  // Where the member actually lives. Information only — it is NOT their
  // chapter, since remote members routinely work on another city's clients.
  homeCity?: string;
  homeState?: string;
  // Which market they were recruited into. Blank means New York, so this is
  // set only for a recruit in a new chapter who has no pod or client yet.
  chapterId?: string;
  deletedAt?: string | null;
  slackHandle: string;
  email: string;
  alternateEmail?: string;
  // Reserve = headcount-only, gray dot, removed from the active credit system.
  // Inactive remains as a legacy value treated equivalently to Reserve at display time.
  status: "Active" | "On Leave" | "Alumni" | "Inactive" | "Reserve";
  skills: string[];       // may be undefined on legacy rows
  joinDate: string;
  notes: string;
  createdAt: string;
  // Automation bookkeeping — populated by the cycle sweep so warnings/strikes
  // are issued at most once per cycle per member, and biweekly check-ins fire
  // exactly once per 14-day mark.
  lastWarningCycleId?: string;
  lastAutoStrikeCycleId?: string;
  lastBiweeklyCheckinMark?: number;     // floor(daysSinceCycleStart / 14)
  lastBiweeklyCheckinCycleId?: string;  // resets when cycle changes
  authUid?: string;
  canInterview?: boolean;
}

export type ApplicationStatus =
  | "New"
  | "Invited for Interview"
  | "Interview Scheduled"
  | "Interview Completed"
  | "Accepted"
  | "Not Accepted";

export interface ApplicationRecord {
  id: string;
  fullName: string;
  email: string;
  schoolName: string;
  grade?: string;
  cityState?: string;
  referral?: string;
  referralName?: string;
  state?: string;
  chapter?: string;
  tracksSelected?: string;
  marketingSubtrack?: string;
  hasResume?: string;
  resumeUrl?: string;
  toolsSoftware?: string;
  accomplishment?: string;
  status: ApplicationStatus;
  notes?: string;
  interviewInviteToken?: string;
  interviewInviteSentAt?: string;
  interviewReminderSentAt?: string;
  interviewSlotId?: string;
  interviewScheduledAt?: string;
  interviewEvaluations?: Record<string, {
    interviewerUid?: string;
    interviewerEmail?: string;
    interviewerName?: string;
    rating?: "Extremely Qualified" | "Qualified" | "Decent" | "Unqualified";
    comments?: string;
    updatedAt?: string;
    slotId?: string;
  }>;
  finalDecisionRole?: string;
  memberId?: string | null;   // the member this application became
  decidedAt?: string | null;
  decidedBy?: string | null;
  city?: string;
  source?: "website_form" | "csv_import" | "manual" | "legacy_sheet_import";
  sourceTimestampRaw?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  businessId: string;
  division: "Tech" | "Marketing" | "Finance";
  status: "Planning" | "Active" | "On Hold" | "Delivered" | "Complete";
  teamLead: string;
  teamMembers: string[];  // may be undefined on legacy rows
  startDate: string;
  targetEndDate: string;
  actualEndDate: string;
  week1Deliverable: string;
  finalDeliverable: string;
  slackChannel: string;
  driveFolderUrl: string;
  clientNotes: string;
  progress: "0%" | "25%" | "50%" | "75%" | "100%";
  createdAt: string;
  updatedAt: string;
}

// ── Credit cycle types ────────────────────────────────────────────────────────
//
// A Cycle defines a credit-earning period (typically a quarter). Targets are
// per-track × per-role. Senior Associate and Board are intentionally excluded
// from the credit/strike system — they run it.

// ── Infraction catalog ────────────────────────────────────────────────────────
// One row per *type* of infraction. Issued instances live separately on a
// member's record. Severity is implicit in the point value: 1 = minor,
// 2 = major, 3 = severe. To retire an infraction, just delete it.

export interface Infraction {
  id: string;
  name: string;
  description: string;
  points: number;                  // 1 (minor), 2 (major), 3 (severe)
  createdAt: string;
  updatedAt: string;
}

// ── Email templates ───────────────────────────────────────────────────────────
// Admin-editable copy for every automated email. Hardcoding is intentionally
// avoided — admins control wording without a deploy.

// Stable keys referenced by automation. Custom (admin-authored) templates use
// arbitrary strings — typically `custom_<id>` — and never collide with these.
export type SystemEmailTemplateKey =
  | "orange_pace_warning"
  | "red_pace_strike"
  | "demotion_notice"
  | "cycle_start"
  | "cycle_end_summary"
  | "assignment_approved"
  | "assignment_rejected"
  | "assignment_update"
  | "infraction_notice"
  | "monthly_portal_reminder"
  | "biweekly_checkin"
  | "interview_invite"
  | "interview_invite_reminder"
  | "applicant_accepted"
  | "interview_booked"
  | "interview_rescheduled"
  | "interviewer_booking_notify"
  | "interviewer_reschedule_notify"
  | "invite"
  | "setup-link"
  | "password-reset";

// Aliased for back-compat with earlier callers — same shape, just any string allowed.
export type EmailTemplateKey = SystemEmailTemplateKey | (string & {});

export interface EmailTemplate {
  id: string;
  key: string;                     // SystemEmailTemplateKey for system; arbitrary for custom
  label: string;                   // human-readable name (admin-editable for custom)
  description: string;             // when this template fires (or what it's for)
  subject: string;                 // mustache-style {{variable}} tokens supported
  body: string;                    // HTML, same token style
  // The set of variable tokens this template understands. Drives the preview
  // panel's sample-data substitution and the variable-insert helper.
  availableVariables: string[];
  active: boolean;
  updatedAt: string;
  updatedBy: string;               // uid or email of the last admin to edit
  // Usage tracking
  usageCount?: number;             // how many times this template has been used
  lastUsedAt?: string;             // ISO timestamp of when this template was last used
}

// ── Automation configs ────────────────────────────────────────────────────────

export interface AutomationConfig {
  id: string;             // same value as automationId — required by makeSubscriber
  automationId: string;   // stable slug PK, e.g. "cycle_warning"
  label: string;
  description: string;
  templateKey: string | null;  // references email_templates.key; null means disabled
  enabled: boolean;
  updatedAt: string;
  updatedBy: string;
}

// Work tracks. Named CycleTrack while credits existed; the cycles are gone but
// the three tracks still label divisions and project work.
export type TrackName = "Tech" | "Marketing" | "Finance" | "General";

// ── Project groups (standalone non-business project containers) ───────────────
// Businesses already serve as their own group via business_id on assignments.
// ProjectGroup covers internal work, cohorts, or multi-business initiatives that
// don't map to a single client record.

export interface ProjectGroup {
  id: string;
  name: string;
  description: string;
  color: "green" | "blue" | "amber" | "purple" | "gray";
  status: "Ongoing" | "Upcoming" | "Completed";
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ── Member strikes + credit adjustments ───────────────────────────────────────
// Strikes are point-bearing infractions issued against a member; thresholds on
// the active cycle convert points → strike count (warning / demotion / reserve).

export interface MemberStrike {
  id: string;
  memberId: string;
  memberName: string;              // denormalized for display
  infractionId: string;            // catalog reference
  infractionName: string;          // denormalized in case the catalog row is retired
  points: number;                  // matches Infraction.points at time of issue
  issuedAt: string;
  issuedBy: string;
  note: string;
  // "attendance" is issued straight from the grid, where the absence happened.
  source: "manual" | "attendance";
}

// ── Handbook pages ────────────────────────────────────────────────────────────
// Admin-editable pages (credit/infraction policy etc.) shown to members.
// Members must acknowledge each page on first login.

export interface HandbookPage {
  id: string;
  slug: string;         // e.g. "credit-infraction-policy"
  title: string;
  content: string;      // HTML (rich-text)
  updatedAt: string;
  updatedBy: string;    // uid or email
}

export interface MemberAcknowledgment {
  id: string;
  memberId: string;
  pageSlug: string;
  contentHash: string;  // SHA-256 of content at time of ack — stale when content changes
  acknowledgedAt: string;
}

export interface AssignmentUpdate {
  id: string;
  assignmentId: string;
  message: string;
  postedBy: string;   // email of the admin who posted
  postedAt: string;
}

// ── Auth and invite types ─────────────────────────────────────────────────────

export type AuthRole = "owner" | "admin" | "member";

export interface UserProfile {
  id: string;
  email: string;
  authRole: AuthRole;
  name?: string;
  school?: string;
  grade?: string;
  active: boolean;
  createdAt: string;
}

// ── Calendar event type ───────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;        // ISO datetime string
  end: string;          // ISO datetime string
  iCalUID?: string;
  description?: string;
  color?: string;       // hex color, e.g. "#F6B78D"
  allDay?: boolean;
  createdBy: string;    // uid
  createdAt: number;    // Unix ms timestamp
}

// ── Interview scheduling types ────────────────────────────────────────────────

export type InterviewStatus = "pending" | "booked" | "expired" | "cancelled";

export interface InterviewInvite {
  id: string;             // the booking token
  applicantName?: string; // only set for single-use invites
  applicantEmail?: string;
  role: string;
  expiresAt: number;      // Unix ms timestamp
  bookedSlotId?: string;  // only for single-use invites
  status: InterviewStatus;
  multiUse?: boolean;     // if true, link can be used by multiple applicants
  createdBy: string;      // uid
  createdAt: number;      // Unix ms timestamp
  note?: string;
}

export interface InterviewSlot {
  id: string;
  datetime: string;       // ISO datetime (UTC)
  durationMinutes: number;
  available: boolean;
  bookedBy?: string;      // booking token that reserved this slot
  bookerName?: string;    // name entered by applicant at booking time
  bookerEmail?: string;   // email entered by applicant at booking time
  interviewerMemberIds: string[];
  evaluationByUid?: Record<string, {
    interviewerUid?: string;
    interviewerEmail?: string;
    interviewerName?: string;
    interviewerRole?: string;
    rating?: "Extremely Qualified" | "Qualified" | "Decent" | "Unqualified";
    comments?: string;
    updatedAt?: string;
  }>;
  recurringWeekly?: boolean;
  recurringSeriesId?: string;
  noShow?: boolean;
  location?: string;
  createdBy: string;      // uid
  createdAt: number;      // Unix ms timestamp
}

export interface InterviewSettings {
  zoomLink?: string;
  zoomEnabled?: boolean;
  updatedAt?: number;
  updatedBy?: string;
}

export type AuditAction = "create" | "update" | "delete" | "import" | "export";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  collection: string;
  recordId?: string;
  actorUid: string;
  actorEmail: string;
  actorName?: string;
  details?: Record<string, unknown>;
}

// ── STATUS NORMALIZERS ────────────────────────────────────────────────────────
// The DB may contain legacy lowercase values written before the types were
// formalised. Normalise on read so all callers see canonical Title-Case values.

// ── INTERNAL HELPERS ──────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

function genId(): string {
  return crypto.randomUUID();
}

async function getAuditActor() {
  const { data: { user } } = await supabase.auth.getUser();
  return {
    actorUid:   user?.id    ?? "unknown",
    actorEmail: user?.email ?? "unknown",
    actorName:  (user?.user_metadata?.full_name as string | undefined) ?? "",
  };
}

async function writeAuditLog(
  entry: Omit<AuditLogEntry, "id" | "timestamp" | "actorUid" | "actorEmail" | "actorName">
): Promise<void> {
  try {
    const actor = await getAuditActor();
    await supabase.from("audit_logs").insert({
      id: genId(),
      timestamp: nowISO(),
      actor_uid: actor.actorUid,
      actor_email: actor.actorEmail,
      actor_name: actor.actorName,
      action: entry.action,
      collection: entry.collection,
      record_id: entry.recordId ?? null,
      details: entry.details ?? null,
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}

// camelCase ↔ snake_case converters
function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// Generic row → camelCase TS object
function fromRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    out[snakeToCamel(k)] = v;
  }
  return out as T;
}

// Generic TS object → snake_case Postgres row (undefined and empty-string timestamps → null)
function toRow(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    const col = camelToSnake(k);
    // coerce empty strings to null for timestamp/date columns
    if (v === "" && (col.endsWith("_at") || col.endsWith("_date") || k === "datetime")) {
      out[col] = null;
    } else {
      out[col] = v;
    }
  }
  return out;
}

// Realtime subscriber factory.
// 1. Fetches the full table immediately and calls callback.
// 2. Opens a Supabase postgres_changes channel; re-fetches on any row change.
// 3. Returns an unsubscribe function that removes the channel.
function makeSubscriber<T extends { id: string }>(
  table: string,
  transform?: (row: Record<string, unknown>) => T,
  options?: { excludeSoftDeleted?: boolean },
) {
  return (callback: (items: T[]) => void): (() => void) => {
    let current: T[] = [];
    const applyRow = (row: Record<string, unknown>): T =>
      transform ? transform(row) : fromRow<T>(row);

    const fetchAll = () => {
      let query = supabase.from(table).select("*");
      if (options?.excludeSoftDeleted) query = query.is("deleted_at", null);
      return query.then(({ data, error }) => {
        if (error || !data) { callback([]); return; }
        current = (data as Record<string, unknown>[]).map(applyRow);
        callback(current);
      });
    };

    void fetchAll();

    const channel = supabase
      .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = payload as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> };
        if (p.eventType === "INSERT") {
          if (options?.excludeSoftDeleted && p.new.deleted_at) return;
          current = [...current, applyRow(p.new)];
        } else if (p.eventType === "UPDATE") {
          if (options?.excludeSoftDeleted && p.new.deleted_at) {
            current = current.filter((x) => x.id !== p.new.id);
          } else {
            const updated = applyRow(p.new);
            current = current.map((x) => x.id === updated.id ? updated : x);
          }
        } else if (p.eventType === "DELETE") {
          current = current.filter((x) => x.id !== p.old.id);
        }
        callback(current);
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  };
}

// ── SPECIALISED ROW CONVERTERS ────────────────────────────────────────────────

// InterviewSlot/InterviewInvite/CalendarEvent store createdAt as Unix ms in TS
// but as timestamptz in Postgres — convert on read.
function tsToMs(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string" && val) return new Date(val).getTime();
  return 0;
}
// Convert Unix ms → ISO for write
function msToIso(val: unknown): string | null {
  if (typeof val === "number" && val > 0) return new Date(val).toISOString();
  if (typeof val === "string" && val) return val;
  return null;
}

function interviewSlotFromRow(row: Record<string, unknown>): InterviewSlot {
  return {
    id:                    row.id as string,
    datetime:              row.datetime as string ?? "",
    durationMinutes:       row.duration_minutes as number,
    available:             row.available as boolean ?? true,
    bookedBy:              row.booked_by as string | undefined,
    bookerName:            row.booker_name as string | undefined,
    bookerEmail:           row.booker_email as string | undefined,
    interviewerMemberIds:  (row.interviewer_member_ids as string[]) ?? [],
    evaluationByUid:       row.evaluation_by_uid as InterviewSlot["evaluationByUid"],
    recurringWeekly:       row.recurring_weekly as boolean | undefined,
    recurringSeriesId:     row.recurring_series_id as string | undefined,
    noShow:                row.no_show as boolean | undefined,
    location:              row.location as string | undefined,
    createdBy:             row.created_by as string ?? "",
    createdAt:             tsToMs(row.created_at),
  };
}

function interviewSlotToRow(data: Partial<InterviewSlot>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (data.datetime           !== undefined) out.datetime                = data.datetime || null;
  if (data.durationMinutes    !== undefined) out.duration_minutes        = data.durationMinutes;
  if (data.available          !== undefined) out.available               = data.available;
  if (data.bookedBy           !== undefined) out.booked_by               = data.bookedBy || null;
  if (data.bookerName         !== undefined) out.booker_name             = data.bookerName || null;
  if (data.bookerEmail        !== undefined) out.booker_email            = data.bookerEmail || null;
  if (data.interviewerMemberIds !== undefined) out.interviewer_member_ids = data.interviewerMemberIds;
  if (data.evaluationByUid    !== undefined) out.evaluation_by_uid      = data.evaluationByUid;
  if (data.recurringWeekly    !== undefined) out.recurring_weekly        = data.recurringWeekly;
  if (data.recurringSeriesId  !== undefined) out.recurring_series_id     = data.recurringSeriesId;
  if (data.noShow             !== undefined) out.no_show                 = data.noShow;
  if (data.location           !== undefined) out.location                = data.location;
  if (data.createdBy          !== undefined) out.created_by              = data.createdBy;
  if (data.createdAt          !== undefined) out.created_at              = msToIso(data.createdAt);
  return out;
}

function interviewInviteFromRow(row: Record<string, unknown>): InterviewInvite {
  return {
    id:             row.id as string,
    applicantName:  row.applicant_name as string | undefined,
    applicantEmail: row.applicant_email as string | undefined,
    role:           row.role as string ?? "",
    expiresAt:      tsToMs(row.expires_at),
    bookedSlotId:   row.booked_slot_id as string | undefined,
    status:         row.status as InterviewStatus ?? "pending",
    multiUse:       row.multi_use as boolean | undefined,
    createdBy:      row.created_by as string ?? "",
    createdAt:      tsToMs(row.created_at),
    note:           row.note as string | undefined,
  };
}

function calendarEventFromRow(row: Record<string, unknown>): CalendarEvent {
  return {
    id:          row.id as string,
    title:       row.title as string ?? "",
    start:       row.start as string ?? "",
    end:         row.end as string ?? "",
    iCalUID:     row.i_cal_uid as string | undefined,
    description: row.description as string | undefined,
    color:       row.color as string | undefined,
    allDay:      row.all_day as boolean | undefined,
    createdBy:   row.created_by as string ?? "",
    createdAt:   tsToMs(row.created_at),
  };
}

function readLegacyText(row: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeTimestamp(value: unknown, fallbackIso?: string): string {
  if (typeof value === "string" && value.trim()) {
    const ms = Date.parse(value.trim());
    if (!Number.isNaN(ms)) return new Date(ms).toISOString();
    return value.trim();
  }
  return fallbackIso ?? nowISO();
}

function normalizeApplicationStatus(
  raw: string,
  hasScheduledInterview: boolean,
  hasCompletedInterview: boolean,
  hasInviteSent: boolean,
  hasPassedInterviewTime: boolean,
): ApplicationStatus {
  const key = raw.trim().toLowerCase();
  // Accepted is always terminal
  if (key === "accepted") return "Accepted";
  // Interview time passed or eval submitted → Completed
  if (hasCompletedInterview || hasPassedInterviewTime) return "Interview Completed";
  // Slot booked (datetime in future) → Scheduled
  if (hasScheduledInterview) return "Interview Scheduled";
  // Invite sent → Invited
  if (hasInviteSent) return "Invited for Interview";
  // Respect any stored explicit status (legacy records)
  if (key === "interview completed") return "Interview Completed";
  if (key === "interview scheduled") return "Interview Scheduled";
  if (key === "invited for interview") return "Invited for Interview";
  return "New";
}

function normalizeApplicationRecord(id: string, row: Record<string, unknown>): ApplicationRecord {
  const createdAt = normalizeTimestamp(row.createdAt ?? row.Timestamp);
  const updatedAt = normalizeTimestamp(row.updatedAt, createdAt);
  const interviewSlotId = readLegacyText(row, ["interviewSlotId"]);
  const interviewScheduledAt = readLegacyText(row, ["interviewScheduledAt"]);
  const hasScheduledInterview = !!(interviewSlotId || interviewScheduledAt);

  const interviewEvaluations = (row.interviewEvaluations && typeof row.interviewEvaluations === "object")
      ? (row.interviewEvaluations as ApplicationRecord["interviewEvaluations"])
      : {};
  const hasCompletedInterview = Object.keys(interviewEvaluations || {}).length > 0;

  const interviewInviteSentAt = readLegacyText(row, ["interviewInviteSentAt"]);
  const hasInviteSent = !!interviewInviteSentAt;

  // If the interview slot datetime is in the past, mark as completed
  const hasPassedInterviewTime = !!interviewScheduledAt && Date.parse(interviewScheduledAt) < Date.now();

  return {
    id,
    fullName: readLegacyText(row, ["fullName", "Full Name", "name"]),
    email: readLegacyText(row, ["email", "Email"]).toLowerCase(),
    schoolName: readLegacyText(row, ["schoolName", "School Name", "Education", "school"]),
    grade: readLegacyText(row, ["grade", "Grade"]),
    cityState: readLegacyText(row, ["cityState", "City, State", "City"]),
    referral: readLegacyText(row, ["referral", "How They Heard"]),
    referralName: readLegacyText(row, ["referral_name", "referralName", "Referral Name"]),
    state: readLegacyText(row, ["state", "State"]),
    chapter: readLegacyText(row, ["chapter", "Chapter"]),
    marketingSubtrack: readLegacyText(row, ["marketing_subtrack", "marketingSubtrack", "Marketing Subtrack"]),
    tracksSelected: (() => {
      const v = row["tracks_selected"] ?? row["tracksSelected"] ?? row["Tracks Selected"];
      if (Array.isArray(v)) return v.filter(Boolean).join(", ");
      if (typeof v === "string" && v.trim()) return v.trim();
      return "";
    })(),
    hasResume: readLegacyText(row, ["hasResume", "Has Resume"]),
    resumeUrl: readLegacyText(row, ["resumeUrl", "Resume URL"]),
    toolsSoftware: readLegacyText(row, ["toolsSoftware", "Tools/Software"]),
    accomplishment: readLegacyText(row, ["accomplishment", "Accomplishment"]),
    status: normalizeApplicationStatus(readLegacyText(row, ["status"]), hasScheduledInterview, hasCompletedInterview, hasInviteSent, hasPassedInterviewTime),
    notes: readLegacyText(row, ["notes", "Notes"]),
    interviewInviteToken: readLegacyText(row, ["interviewInviteToken"]),
    interviewInviteSentAt: readLegacyText(row, ["interviewInviteSentAt"]),
    interviewReminderSentAt: readLegacyText(row, ["interviewReminderSentAt"]),
    interviewSlotId,
    interviewScheduledAt,
    interviewEvaluations,
    finalDecisionRole: readLegacyText(row, ["finalDecisionRole"]),
    source: (readLegacyText(row, ["source"]) as ApplicationRecord["source"]) || undefined,
    sourceTimestampRaw: readLegacyText(row, ["sourceTimestampRaw", "Timestamp"]),
    createdAt,
    updatedAt,
  };
}

function normalizeAuthRoleValue(value: unknown): AuthRole {
  const raw = String(value ?? "").trim();
  if (raw === "owner") return "owner";
  if (raw === "admin") return "admin";
  return "member";
}

// ── SUBSCRIBERS ───────────────────────────────────────────────────────────────
// Each subscriber fetches once and calls callback immediately.
// Returns a no-op unsubscribe (real-time channels can be added later).

export const subscribeBIDs =
  makeSubscriber<BID>("bids", (r) => fromRow<BID>(r));

export const subscribeBusinesses =
  makeSubscriber<Business>("businesses", (r) => fromRow<Business>(r), { excludeSoftDeleted: true });

export const subscribeTeam =
  makeSubscriber<TeamMember>("team", (r) => fromRow<TeamMember>(r), { excludeSoftDeleted: true });

export const subscribeProjects =
  makeSubscriber<Project>("projects", (r) => fromRow<Project>(r));

export const subscribeInfractions =
  makeSubscriber<Infraction>("infractions", (r) => fromRow<Infraction>(r));

export const subscribeEmailTemplates =
  makeSubscriber<EmailTemplate>("email_templates", (r) => ({
    ...fromRow<EmailTemplate>(r),
    availableVariables: (r.available_variables as string[]) ?? [],
  }));

export const subscribeAutomationConfigs =
  makeSubscriber<AutomationConfig>("automation_configs", (r) => ({
    id:           String(r.automation_id),
    automationId: String(r.automation_id),
    label:        String(r.label ?? ""),
    description:  String(r.description ?? ""),
    templateKey:  r.template_key != null ? String(r.template_key) : null,
    enabled:      Boolean(r.enabled ?? true),
    updatedAt:    String(r.updated_at ?? ""),
    updatedBy:    String(r.updated_by ?? ""),
  }));

export const subscribeProjectGroups =
  makeSubscriber<ProjectGroup>("project_groups", (r) => fromRow<ProjectGroup>(r));

export const subscribeMemberStrikes =
  makeSubscriber<MemberStrike>("member_strikes", (r) => fromRow<MemberStrike>(r));

export const subscribeAuditLogs =
  makeSubscriber<AuditLogEntry>("audit_logs", (r) => fromRow<AuditLogEntry>(r));

export function subscribeApplications(callback: (items: ApplicationRecord[]) => void): (() => void) {
  const fetchAll = () =>
    supabase.from("applications").select("*").then(({ data, error }) => {
      if (error || !data) { callback([]); return; }
      callback((data as Record<string, unknown>[]).map((r) => normalizeApplicationRecord(String(r.id), fromRow<Record<string, unknown>>(r))));
    });

  void fetchAll();

  const channel = supabase
    .channel(`realtime-applications-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => void fetchAll())
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}

// ── BIDs ──────────────────────────────────────────────────────────────────────

export async function createBID(data: Omit<BID, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const id = genId();
  const now = nowISO();
  const row = toRow({ ...data, id, createdAt: now, updatedAt: now });
  const { error: insertError } = await supabase.from("bids").insert(row);
  if (insertError) throw new Error(insertError.message);
  await writeAuditLog({ action: "create", collection: "bids", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateBID(id: string, data: Partial<BID>): Promise<void> {
  const { error: updateError } = await supabase.from("bids").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  if (updateError) throw new Error(updateError.message);
  await writeAuditLog({ action: "update", collection: "bids", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteBID(id: string): Promise<void> {
  const { error: deleteError } = await supabase.from("bids").delete().eq("id", id);
  if (deleteError) throw new Error(deleteError.message);
  await writeAuditLog({ action: "delete", collection: "bids", recordId: id });
}

export async function addBIDTimelineEntry(
  bidId: string,
  entry: { date: string; action: string; createdAt: string }
): Promise<void> {
  const { data: row } = await supabase.from("bids").select("timeline").eq("id", bidId).single();
  const timeline = ((row as Record<string, unknown> | null)?.timeline ?? {}) as Record<string, unknown>;
  const entryId = genId();
  timeline[entryId] = entry;
  const { error: timelineAddError } = await supabase.from("bids").update({ timeline }).eq("id", bidId);
  if (timelineAddError) throw new Error(timelineAddError.message);
  await writeAuditLog({ action: "create", collection: "bids.timeline", recordId: `${bidId}/${entryId}`, details: { action: entry.action, date: entry.date } });
}

export async function deleteBIDTimelineEntry(bidId: string, entryId: string): Promise<void> {
  const { data: row } = await supabase.from("bids").select("timeline").eq("id", bidId).single();
  const timeline = ((row as Record<string, unknown> | null)?.timeline ?? {}) as Record<string, unknown>;
  delete timeline[entryId];
  const { error: timelineDeleteError } = await supabase.from("bids").update({ timeline }).eq("id", bidId);
  if (timelineDeleteError) throw new Error(timelineDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "bids.timeline", recordId: `${bidId}/${entryId}` });
}

// ── Businesses ────────────────────────────────────────────────────────────────

export async function createBusiness(data: Omit<Business, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const { showcaseImageData, ...rest } = data;
  const id = genId();
  const now = nowISO();
  const row = toRow({ ...rest, id, showcaseImageSet: false, createdAt: now, updatedAt: now });
  const { error: bizInsertError } = await supabase.from("businesses").insert(row);
  if (bizInsertError) throw new Error(bizInsertError.message);

  if (showcaseImageData) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (token) {
        const res = await fetch("/api/members/upload-business-image", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ businessId: id, dataUrl: showcaseImageData }),
        });
        if (!res.ok) {
          console.error("Business image upload failed on create:", await res.text());
        }
      }
    } catch (err) {
      console.error("Business image upload failed on create:", err);
    }
  }

  await writeAuditLog({ action: "create", collection: "businesses", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateBusiness(id: string, data: Partial<Business>): Promise<void> {
  const { showcaseImageData, ...rest } = data;

  if (showcaseImageData !== undefined) {
    if (showcaseImageData) {
      // Upload image via server-side API route (service role required for Storage)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (token) {
          const res = await fetch("/api/members/upload-business-image", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ businessId: id, dataUrl: showcaseImageData }),
          });
          if (res.ok) {
            const { path, url } = await res.json() as { path: string; url: string };
            (rest as Partial<Business> & Record<string, unknown>).showcaseImagePath = path;
            (rest as Partial<Business>).showcaseImageUrl = url;
            (rest as Partial<Business>).showcaseImageSet = true;
          }
        }
      } catch (err) {
        console.error("Business image upload failed:", err);
      }
    } else {
      (rest as Partial<Business>).showcaseImageSet = false;
      (rest as Partial<Business> & Record<string, unknown>).showcaseImagePath = null;
      (rest as Partial<Business>).showcaseImageUrl = undefined;
    }
  }

  const { error: bizUpdateError } = await supabase.from("businesses").update(toRow({ ...rest, updatedAt: nowISO() })).eq("id", id);
  if (bizUpdateError) throw new Error(bizUpdateError.message);
  await writeAuditLog({ action: "update", collection: "businesses", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteBusiness(id: string): Promise<void> {
  const { error: bizDeleteError } = await supabase
    .from("businesses")
    .update({ deleted_at: nowISO(), updated_at: nowISO() })
    .eq("id", id);
  if (bizDeleteError) throw new Error(bizDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "businesses", recordId: id });
}

export async function hardDeleteBusiness(id: string): Promise<void> {
  const { error: assignmentsDeleteError } = await supabase
    .from("assignments")
    .delete()
    .eq("business_id", id);
  if (assignmentsDeleteError) throw new Error(assignmentsDeleteError.message);
  const { error: bizDeleteError } = await supabase
    .from("businesses")
    .delete()
    .eq("id", id);
  if (bizDeleteError) throw new Error(bizDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "businesses", recordId: id, details: { permanent: true } });
}

// ── Team ──────────────────────────────────────────────────────────────────────

export async function createTeamMember(data: Omit<TeamMember, "id" | "createdAt">): Promise<void> {
  const id = genId();
  const row = toRow({ ...data, id, createdAt: nowISO(), updatedAt: nowISO() });
  const { error: teamInsertError } = await supabase.from("team").insert(row);
  if (teamInsertError) throw new Error(teamInsertError.message);
  await writeAuditLog({ action: "create", collection: "team", recordId: id, details: { fields: Object.keys(data) } });
}

export async function createApplicationRecord(
  data: Omit<ApplicationRecord, "id" | "createdAt" | "updatedAt">
    & Partial<Pick<ApplicationRecord, "createdAt" | "updatedAt">>
): Promise<void> {
  const id = genId();
  const createdAt = data.createdAt ?? nowISO();
  const updatedAt = data.updatedAt ?? createdAt;
  const row = toRow({ ...data, id, createdAt, updatedAt });
  const { error: appInsertError } = await supabase.from("applications").insert(row);
  if (appInsertError) throw new Error(appInsertError.message);
  await writeAuditLog({ action: "create", collection: "applications", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateApplicationRecord(
  id: string,
  data: Partial<ApplicationRecord>
): Promise<void> {
  const { error: appUpdateError } = await supabase.from("applications").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  if (appUpdateError) throw new Error(appUpdateError.message);
  await writeAuditLog({ action: "update", collection: "applications", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateTeamMember(id: string, data: Partial<TeamMember>): Promise<void> {
  const { error: teamUpdateError } = await supabase.from("team")
    .update(toRow({ ...data, updatedAt: nowISO() } as Record<string, unknown>)).eq("id", id);
  if (teamUpdateError) throw new Error(teamUpdateError.message);
  await writeAuditLog({ action: "update", collection: "team", recordId: id, details: { fields: Object.keys(data) } });
}

// Removal is a soft delete, so a mistake is recoverable — but nothing surfaced
// the removed rows, which made it recoverable only from the database.
// An accepted application is history about a member, so it belongs on their
// record rather than in a separate tab you have to go and find.
export async function fetchApplicationForMember(memberId: string): Promise<ApplicationRecord | null> {
  const { data } = await supabase.from("applications").select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1);
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  return row ? fromRow<ApplicationRecord>(row) : null;
}

export async function fetchDeletedTeamMembers(): Promise<TeamMember[]> {
  const { data } = await supabase.from("team").select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(50);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<TeamMember>(r));
}

export async function restoreTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from("team")
    .update({ deleted_at: null, updated_at: nowISO() }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "team", recordId: id, details: { restored: true } });
}

export async function deleteTeamMember(id: string): Promise<void> {
  const { error: teamDeleteError } = await supabase
    .from("team")
    .update({ deleted_at: nowISO() })
    .eq("id", id);
  if (teamDeleteError) throw new Error(teamDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "team", recordId: id });
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const id = genId();
  const now = nowISO();
  const { error: projectInsertError } = await supabase.from("projects").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  if (projectInsertError) throw new Error(projectInsertError.message);
  await writeAuditLog({ action: "create", collection: "projects", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  const { error: projectUpdateError } = await supabase.from("projects").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  if (projectUpdateError) throw new Error(projectUpdateError.message);
  await writeAuditLog({ action: "update", collection: "projects", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteProject(id: string): Promise<void> {
  const { error: projectDeleteError } = await supabase.from("projects").delete().eq("id", id);
  if (projectDeleteError) throw new Error(projectDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "projects", recordId: id });
}

// ── Finance Assignments ──────────────────────────────────────────────────────

// ── UserProfiles (admin only) ─────────────────────────────────────────────────

export function subscribeUserProfiles(callback: (items: UserProfile[]) => void): (() => void) {
  const fetchAll = () =>
    supabase.from("user_profiles").select("*").then(({ data, error }) => {
      if (error || !data) { callback([]); return; }
      callback((data as Record<string, unknown>[]).map((r) => ({
        ...fromRow<UserProfile>(r),
        authRole: normalizeAuthRoleValue((r.auth_role)),
      })));
    });

  void fetchAll();

  const channel = supabase
    .channel(`realtime-user_profiles-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "user_profiles" }, () => void fetchAll())
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const { error: profileUpdateError } = await supabase.from("user_profiles").update(toRow(data as Record<string, unknown>)).eq("id", uid);
  if (profileUpdateError) throw new Error(profileUpdateError.message);
  await writeAuditLog({ action: "update", collection: "userProfiles", recordId: uid, details: { fields: Object.keys(data) } });
}

export async function setUserProfileRecord(uid: string, data: Omit<UserProfile, "id">): Promise<void> {
  const { data: existing } = await supabase.from("user_profiles").select("*").eq("id", uid).maybeSingle();
  const before = existing ? fromRow<Omit<UserProfile, "id">>(existing as Record<string, unknown>) : null;
  const merged = before ? { ...before, ...data } : data;
  merged.authRole = normalizeAuthRoleValue(merged.authRole);
  const { error: profileUpsertError } = await supabase.from("user_profiles").upsert(toRow({ ...merged, id: uid }), { onConflict: "id" });
  if (profileUpsertError) throw new Error(profileUpsertError.message);
  await writeAuditLog({ action: before ? "update" : "create", collection: "userProfiles", recordId: uid, details: { fields: Object.keys(merged) } });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  const { error: profileDeleteError } = await supabase.from("user_profiles").delete().eq("id", uid);
  if (profileDeleteError) throw new Error(profileDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "userProfiles", recordId: uid });
}

// Deletes a portal account via a protected admin API route.
// Requires the current user to be signed in as admin.
export async function deletePortalUserAccount(uid: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("not_authenticated");

  const token = session.access_token;
  const res = await fetch(`/api/members/admin/users/${encodeURIComponent(uid)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    let error = "delete_failed";
    try {
      const data = await res.json() as { error?: string };
      if (data.error) error = data.error;
    } catch {
      // ignore json parse error
    }
    throw new Error(error);
  }
}

export async function getUserProfilesList(): Promise<UserProfile[]> {
  const { data } = await supabase.from("user_profiles").select("*");
  return (data ?? []).map((r) => ({
    ...fromRow<UserProfile>(r as Record<string, unknown>),
    authRole: normalizeAuthRoleValue((r as Record<string, unknown>).auth_role),
  }));
}

export async function getTeamMembersList(): Promise<TeamMember[]> {
  const { data } = await supabase.from("team").select("*").is("deleted_at", null);
  return (data ?? []).map((r) => fromRow<TeamMember>(r as Record<string, unknown>));
}

export async function getAuditLogsList(limit = 200): Promise<AuditLogEntry[]> {
  const { data } = await supabase
    .from("audit_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => fromRow<AuditLogEntry>(r as Record<string, unknown>));
}

// Returns the public showcase image URL for a business, or null if none set.
export async function getBusinessImage(id: string): Promise<string | null> {
  const { data } = await supabase
    .from("businesses")
    .select("showcase_image_url")
    .eq("id", id)
    .maybeSingle();
  return (data as Record<string, unknown> | null)?.showcase_image_url as string | null ?? null;
}

// ── ONE-SHOT GET VARIANTS ─────────────────────────────────────────────────────

export async function getBusinessesList(): Promise<Business[]> {
  const { data } = await supabase.from("businesses").select("*").is("deleted_at", null);
  return (data ?? []).map((r) => fromRow<Business>(r as Record<string, unknown>));
}

export async function getBIDsList(): Promise<BID[]> {
  const { data } = await supabase.from("bids").select("*");
  return (data ?? []).map((r) => fromRow<BID>(r as Record<string, unknown>));
}

export async function getProjectsList(): Promise<Project[]> {
  const { data } = await supabase.from("projects").select("*");
  return (data ?? []).map((r) => fromRow<Project>(r as Record<string, unknown>));
}

export async function getInfractionsList(): Promise<Infraction[]> {
  const { data } = await supabase.from("infractions").select("*");
  return (data ?? []).map((r) => fromRow<Infraction>(r as Record<string, unknown>));
}

// Get distinct school names from applications for autocomplete
export async function getApplicationSchoolNames(): Promise<string[]> {
  const { data } = await supabase
    .from("applications")
    .select("schoolName")
    .not("schoolName", "is", "");

  if (!data?.length) return [];

  // Extract distinct school names
  const schoolNames = [...new Set(
    data
      .map((r: { schoolName?: string | null }) => r.schoolName?.trim())
      .filter((name): name is string => name !== null && name !== undefined && name !== "")
  )];

  return schoolNames.sort();
}

// Get distinct school names from team directory for autocomplete
export async function getTeamSchoolNames(): Promise<string[]> {
  const { data } = await supabase
    .from("team")
    .select("school")
    .not("school", "is", null)
    .neq("school", "");

  if (!data?.length) return [];

  return [...new Set(
    data
      .map((r: { school?: string | null }) => r.school?.trim())
      .filter((name): name is string => Boolean(name))
  )].sort();
}

export async function getEmailTemplatesList(): Promise<EmailTemplate[]> {
  const { data } = await supabase.from("email_templates").select("*");
  return (data ?? []).map((r) => ({
    ...fromRow<EmailTemplate>(r as Record<string, unknown>),
    availableVariables: ((r as Record<string, unknown>).available_variables as string[]) ?? [],
  }));
}

// getAssignmentsList is defined above in the unified assignments section.

export async function getMemberStrikesList(): Promise<MemberStrike[]> {
  const { data } = await supabase.from("member_strikes").select("*");
  return (data ?? []).map((r) => fromRow<MemberStrike>(r as Record<string, unknown>));
}

export async function getApplicationsList(): Promise<ApplicationRecord[]> {
  const { data } = await supabase.from("applications").select("*");
  if (!data?.length) return [];
  return (data as Record<string, unknown>[]).map((r) => normalizeApplicationRecord(String(r.id), fromRow<Record<string, unknown>>(r)));
}

export async function getCalendarEventsList(): Promise<CalendarEvent[]> {
  const { data } = await supabase.from("calendar_events").select("*");
  return (data ?? []).map((r) => calendarEventFromRow(r as Record<string, unknown>));
}

// ── CalendarEvents ────────────────────────────────────────────────────────────

export const subscribeCalendarEvents =
  makeSubscriber<CalendarEvent>("calendar_events", calendarEventFromRow);

export async function createCalendarEvent(data: Omit<CalendarEvent, "id">): Promise<void> {
  const id = genId();
  await supabase.from("calendar_events").insert({
    id,
    title: data.title,
    start: data.start || null,
    end: data.end || null,
    i_cal_uid: data.iCalUID ?? null,
    description: data.description ?? null,
    color: data.color ?? null,
    all_day: data.allDay ?? false,
    created_by: data.createdBy,
    created_at: msToIso(data.createdAt),
  });
  await writeAuditLog({ action: "create", collection: "calendarEvents", recordId: id, details: { title: data.title } });
}

export async function updateCalendarEvent(id: string, data: Partial<CalendarEvent>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (data.title       !== undefined) row.title       = data.title;
  if (data.start       !== undefined) row.start       = data.start || null;
  if (data.end         !== undefined) row.end         = data.end || null;
  if (data.iCalUID     !== undefined) row.i_cal_uid   = data.iCalUID;
  if (data.description !== undefined) row.description = data.description;
  if (data.color       !== undefined) row.color       = data.color;
  if (data.allDay      !== undefined) row.all_day     = data.allDay;
  await supabase.from("calendar_events").update(row).eq("id", id);
  await writeAuditLog({ action: "update", collection: "calendarEvents", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  await supabase.from("calendar_events").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "calendarEvents", recordId: id });
}

// ── InterviewInvites ──────────────────────────────────────────────────────────

export const subscribeInterviewInvites =
  makeSubscriber<InterviewInvite>("interview_invites", interviewInviteFromRow);

export async function createInterviewInvite(token: string, data: Omit<InterviewInvite, "id">): Promise<void> {
  await supabase.from("interview_invites").upsert({
    id: token,
    applicant_name:  data.applicantName ?? null,
    applicant_email: data.applicantEmail ?? null,
    role:            data.role,
    expires_at:      msToIso(data.expiresAt),
    booked_slot_id:  data.bookedSlotId ?? null,
    status:          data.status,
    multi_use:       data.multiUse ?? false,
    created_by:      data.createdBy,
    created_at:      msToIso(data.createdAt),
    note:            data.note ?? null,
  }, { onConflict: "id" });
  await writeAuditLog({ action: "create", collection: "interviewInvites", recordId: token, details: { role: data.role, expiresAt: data.expiresAt, multiUse: !!data.multiUse } });
}

export async function updateInterviewInvite(token: string, data: Partial<InterviewInvite>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (data.applicantName  !== undefined) row.applicant_name  = data.applicantName;
  if (data.applicantEmail !== undefined) row.applicant_email = data.applicantEmail;
  if (data.role           !== undefined) row.role            = data.role;
  if (data.expiresAt      !== undefined) row.expires_at      = msToIso(data.expiresAt);
  if (data.bookedSlotId   !== undefined) row.booked_slot_id  = data.bookedSlotId;
  if (data.status         !== undefined) row.status          = data.status;
  if (data.multiUse       !== undefined) row.multi_use       = data.multiUse;
  if (data.note           !== undefined) row.note            = data.note;
  await supabase.from("interview_invites").update(row).eq("id", token);
  await writeAuditLog({ action: "update", collection: "interviewInvites", recordId: token, details: { fields: Object.keys(data) } });
}

export async function getInterviewInvite(token: string): Promise<InterviewInvite | null> {
  const { data } = await supabase.from("interview_invites").select("*").eq("id", token).maybeSingle();
  if (!data) return null;
  return interviewInviteFromRow(data as Record<string, unknown>);
}

// ── InterviewSlots ────────────────────────────────────────────────────────────

export const subscribeInterviewSlots =
  makeSubscriber<InterviewSlot>("interview_slots", interviewSlotFromRow);

export async function createInterviewSlot(data: Omit<InterviewSlot, "id">): Promise<void> {
  const id = genId();
  await supabase.from("interview_slots").insert({ ...interviewSlotToRow(data), id });
  await writeAuditLog({ action: "create", collection: "interviewSlots", recordId: id, details: { datetime: data.datetime, durationMinutes: data.durationMinutes } });
}

export async function updateInterviewSlot(id: string, data: Partial<InterviewSlot>): Promise<void> {
  await supabase.from("interview_slots").update(interviewSlotToRow(data)).eq("id", id);
  await writeAuditLog({ action: "update", collection: "interviewSlots", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteBookedInterview(slotId: string): Promise<void> {
  const { data: slotRow } = await supabase.from("interview_slots").select("*").eq("id", slotId).maybeSingle();
  if (!slotRow) return;

  const slot = interviewSlotFromRow(slotRow as Record<string, unknown>);

  await supabase.from("interview_slots").update({
    available:        true,
    booked_by:        null,
    booker_name:      null,
    booker_email:     null,
    reminder_sent_at: null,
  }).eq("id", slotId);

  const bookedEmail = String(slot.bookerEmail ?? "").trim().toLowerCase();
  const bookedName  = String(slot.bookerName  ?? "").trim().toLowerCase();
  const bookedBy    = String(slot.bookedBy    ?? "").trim();

  if (bookedEmail) {
    const now = nowISO();
    const terminal = new Set(["accepted", "not accepted", "rejected"]);

    const { data: apps } = await supabase
      .from("applications")
      .select("*")
      .eq("email", bookedEmail)
      .limit(10);

    const appEntries = (apps ?? []).map((r) => ({
      id: String((r as Record<string, unknown>).id),
      row: r as Record<string, unknown>,
    }));

    let target = appEntries.find(({ row }) => {
      const token = String(row.interview_invite_token ?? "").trim();
      return bookedBy && bookedBy !== "public-booking" && token === bookedBy;
    });
    if (!target) target = appEntries.find(({ row }) => String(row.interview_slot_id ?? "").trim() === slotId);
    if (!target) {
      const sorted = [...appEntries].sort((a, b) => {
        const aT = Date.parse(String(a.row.updated_at ?? a.row.created_at ?? ""));
        const bT = Date.parse(String(b.row.updated_at ?? b.row.created_at ?? ""));
        return (Number.isNaN(bT) ? 0 : bT) - (Number.isNaN(aT) ? 0 : aT);
      });
      target = sorted.find(({ row }) => String(row.full_name ?? "").trim().toLowerCase() === bookedName) ?? sorted[0];
    }

    if (target) {
      const currentStatus = String(target.row.status ?? "").trim().toLowerCase();
      const patch: Record<string, unknown> = { interview_slot_id: null, interview_scheduled_at: null, updated_at: now };
      if (!target.row.status_manual_override && !terminal.has(currentStatus)) {
        patch.status = "Invited for Interview";
      }
      await supabase.from("applications").update(patch).eq("id", target.id);
    }
  }

  await writeAuditLog({ action: "delete", collection: "interviewBookings", recordId: slotId, details: { datetime: slot.datetime, previousBookedBy: slot.bookedBy, previousBookerName: slot.bookerName, previousBookerEmail: slot.bookerEmail } });
}

export async function deleteInterviewSlot(id: string): Promise<void> {
  await supabase.from("interview_slots").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "interviewSlots", recordId: id });
}

export async function getInterviewSlots(): Promise<InterviewSlot[]> {
  const { data } = await supabase.from("interview_slots").select("*");
  return (data ?? []).map((r) => interviewSlotFromRow(r as Record<string, unknown>));
}

// ── Interview Settings ───────────────────────────────────────────────────────

export function subscribeInterviewSettings(callback: (settings: InterviewSettings | null) => void): (() => void) {
  const fetchSettings = () =>
    supabase.from("interview_settings").select("*").eq("id", "singleton").maybeSingle().then(({ data }) => {
      if (!data) { callback(null); return; }
      const r = data as Record<string, unknown>;
      callback({
        zoomLink:    r.zoom_link as string | undefined,
        zoomEnabled: r.zoom_enabled as boolean | undefined,
        updatedAt:   tsToMs(r.updated_at) || undefined,
        updatedBy:   r.updated_by as string | undefined,
      });
    });

  void fetchSettings();

  const channel = supabase
    .channel(`realtime-interview_settings-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "interview_settings" }, () => void fetchSettings())
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}

export async function updateInterviewSettings(data: Partial<InterviewSettings>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (data.zoomLink    !== undefined) row.zoom_link    = data.zoomLink;
  if (data.zoomEnabled !== undefined) row.zoom_enabled = data.zoomEnabled;
  if (data.updatedAt   !== undefined) row.updated_at   = msToIso(data.updatedAt);
  if (data.updatedBy   !== undefined) row.updated_by   = data.updatedBy;
  await supabase.from("interview_settings").update(row).eq("id", "singleton");
  await writeAuditLog({ action: "update", collection: "interviewSettings", recordId: "singleton", details: { fields: Object.keys(data) } });
}

// ── Site Settings ─────────────────────────────────────────────────────────────

export type PortalPermissionKey =
  | "interview"
  | "reviewSubmissions"
  | "email"
  | "viewApplicants"
  | "manageAssignments"
  | "manageShowcase";

export type PortalRole = "Analyst" | "Senior Analyst" | "Associate" | "Reserve";

export type PortalPermissions = Record<PortalRole, Record<PortalPermissionKey, boolean>>;

export interface SiteSettings {
  applicationsPaused:       boolean;
  applicationsPausedMsg:    string;
  services:                 string[];
  /** Chapter options on the public application form. Order is shown as-is. */
  chapters:                 string[];
  publicBannerEnabled:      boolean;
  publicBannerMessage:      string;
  publicBannerBg:           string;
  publicBannerText:         string;
  portalBannerEnabled:      boolean;
  portalBannerMessage:      string;
  portalBannerBg:           string;
  portalBannerText:         string;
  permissions:              PortalPermissions;
  infractionThresholds:     { notice: number; warning: number; review: number };
  handbookAckRequiredAt:    string | null;
  publicStatOverrides:      Record<string, string>;
}

const DEFAULT_PERMISSIONS: PortalPermissions = {
  "Analyst":        { interview: false, reviewSubmissions: false, email: false, viewApplicants: false, manageAssignments: false, manageShowcase: false },
  "Senior Analyst": { interview: false, reviewSubmissions: false, email: false, viewApplicants: false, manageAssignments: false, manageShowcase: false },
  "Associate":      { interview: true,  reviewSubmissions: true,  email: true,  viewApplicants: true,  manageAssignments: true,  manageShowcase: true  },
  "Reserve":        { interview: false, reviewSubmissions: false, email: false, viewApplicants: false, manageAssignments: false, manageShowcase: false },
};

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  applicationsPaused:    false,
  applicationsPausedMsg: "Applications are currently paused. Check back soon.",
  services:              ["Website", "SEO", "Social Media", "Graphic Design", "Grants"],
  chapters:              [],   // superseded by the chapters table
  publicBannerEnabled:   false,
  publicBannerMessage:   "",
  publicBannerBg:        "#1a1a2e",
  publicBannerText:      "#ffffff",
  portalBannerEnabled:   false,
  portalBannerMessage:   "",
  portalBannerBg:        "#F6B78D",
  portalBannerText:      "#0D0D0D",
  permissions:           DEFAULT_PERMISSIONS,
  infractionThresholds:  { notice: 3, warning: 6, review: 10 },
  handbookAckRequiredAt: null,
  publicStatOverrides:    {},
};

function parsePermissions(raw: unknown): PortalPermissions {
  const ROLES: PortalRole[] = ["Analyst", "Senior Analyst", "Associate", "Reserve"];
  const KEYS: PortalPermissionKey[] = ["interview", "reviewSubmissions", "email", "viewApplicants", "manageAssignments", "manageShowcase"];
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, Record<string, unknown>>;
  const out = {} as PortalPermissions;
  for (const role of ROLES) {
    const roleRow = (src[role] && typeof src[role] === "object" ? src[role] : {}) as Record<string, unknown>;
    const defaults = DEFAULT_PERMISSIONS[role];
    out[role] = {} as Record<PortalPermissionKey, boolean>;
    for (const key of KEYS) {
      out[role][key] = typeof roleRow[key] === "boolean" ? roleRow[key] as boolean : defaults[key];
    }
  }
  return out;
}

function siteSettingsFromRow(r: Record<string, unknown>): SiteSettings {
  return {
    applicationsPaused:    Boolean(r.applications_paused ?? false),
    applicationsPausedMsg: String(r.applications_paused_msg ?? DEFAULT_SITE_SETTINGS.applicationsPausedMsg),
    services:              Array.isArray(r.services) ? (r.services as string[]) : DEFAULT_SITE_SETTINGS.services,
    chapters:              Array.isArray(r.chapters) && r.chapters.length > 0 ? (r.chapters as string[]) : DEFAULT_SITE_SETTINGS.chapters,
    publicBannerEnabled:   Boolean(r.public_banner_enabled ?? false),
    publicBannerMessage:   String(r.public_banner_message ?? ""),
    publicBannerBg:        String(r.public_banner_bg ?? DEFAULT_SITE_SETTINGS.publicBannerBg),
    publicBannerText:      String(r.public_banner_text ?? DEFAULT_SITE_SETTINGS.publicBannerText),
    portalBannerEnabled:   Boolean(r.portal_banner_enabled ?? false),
    portalBannerMessage:   String(r.portal_banner_message ?? ""),
    portalBannerBg:        String(r.portal_banner_bg ?? DEFAULT_SITE_SETTINGS.portalBannerBg),
    portalBannerText:      String(r.portal_banner_text ?? DEFAULT_SITE_SETTINGS.portalBannerText),
    permissions:           parsePermissions(r.permissions),
    infractionThresholds:  parseThresholds(r.infraction_thresholds),
    handbookAckRequiredAt: r.handbook_ack_required_at ? String(r.handbook_ack_required_at) : null,
    publicStatOverrides: typeof r.public_stat_overrides === "object" && r.public_stat_overrides !== null && !Array.isArray(r.public_stat_overrides)
      ? Object.fromEntries(Object.entries(r.public_stat_overrides as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "")]))
      : {},
  };
}

export function subscribeSiteSettings(callback: (s: SiteSettings) => void): () => void {
  const fetch = () =>
    supabase.from("site_settings").select("*").eq("id", "singleton").maybeSingle().then(({ data }) => {
      callback(data ? siteSettingsFromRow(data as Record<string, unknown>) : DEFAULT_SITE_SETTINGS);
    });

  void fetch();
  const channel = supabase
    .channel(`realtime-site_settings-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => void fetch())
    .subscribe();
  return () => { void supabase.removeChannel(channel); };
}

function parseThresholds(value: unknown): { notice: number; warning: number; review: number } {
  const fallback = { notice: 3, warning: 6, review: 10 };
  if (!value || typeof value !== "object") return fallback;
  const raw = value as Record<string, unknown>;
  const num = (key: keyof typeof fallback) =>
    typeof raw[key] === "number" && Number.isFinite(raw[key]) ? (raw[key] as number) : fallback[key];
  return { notice: num("notice"), warning: num("warning"), review: num("review") };
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data } = await supabase.from("site_settings").select("*").eq("id", "singleton").maybeSingle();
  return data ? siteSettingsFromRow(data as Record<string, unknown>) : DEFAULT_SITE_SETTINGS;
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<void> {
  const row: Record<string, unknown> = { updated_at: nowISO() };
  if (patch.applicationsPaused    !== undefined) row.applications_paused     = patch.applicationsPaused;
  if (patch.applicationsPausedMsg !== undefined) row.applications_paused_msg = patch.applicationsPausedMsg;
  if (patch.services              !== undefined) row.services                = patch.services;
  if (patch.chapters              !== undefined) row.chapters                = patch.chapters;
  if (patch.publicBannerEnabled   !== undefined) row.public_banner_enabled   = patch.publicBannerEnabled;
  if (patch.publicBannerMessage   !== undefined) row.public_banner_message   = patch.publicBannerMessage;
  if (patch.publicBannerBg        !== undefined) row.public_banner_bg        = patch.publicBannerBg;
  if (patch.publicBannerText      !== undefined) row.public_banner_text      = patch.publicBannerText;
  if (patch.portalBannerEnabled   !== undefined) row.portal_banner_enabled   = patch.portalBannerEnabled;
  if (patch.portalBannerMessage   !== undefined) row.portal_banner_message   = patch.portalBannerMessage;
  if (patch.portalBannerBg        !== undefined) row.portal_banner_bg        = patch.portalBannerBg;
  if (patch.portalBannerText      !== undefined) row.portal_banner_text      = patch.portalBannerText;
  if (patch.permissions           !== undefined) row.permissions             = patch.permissions;
  if (patch.infractionThresholds  !== undefined) row.infraction_thresholds   = patch.infractionThresholds;
  if (patch.handbookAckRequiredAt !== undefined) row.handbook_ack_required_at = patch.handbookAckRequiredAt;
  if (patch.publicStatOverrides      !== undefined) row.public_stat_overrides      = patch.publicStatOverrides;
  const { data, error } = await supabase.from("site_settings").update(row).eq("id", "singleton").select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Site settings were not updated. Confirm that this account has admin access.");
  void writeAuditLog({ action: "update", collection: "siteSettings", recordId: "singleton", details: { fields: Object.keys(patch) } });
}

// ── Cycles ────────────────────────────────────────────────────────────────────

// ── Infractions ───────────────────────────────────────────────────────────────

export async function createInfraction(data: Omit<Infraction, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const id = genId();
  const now = nowISO();
  await supabase.from("infractions").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  await writeAuditLog({ action: "create", collection: "infractions", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateInfraction(id: string, data: Partial<Infraction>): Promise<void> {
  await supabase.from("infractions").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "infractions", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteInfraction(id: string): Promise<void> {
  await supabase.from("infractions").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "infractions", recordId: id });
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function createEmailTemplate(data: Omit<EmailTemplate, "id" | "updatedAt">): Promise<void> {
  const id = genId();
  const { error: emailTemplateInsertError } = await supabase.from("email_templates").insert({
    id,
    key:                 data.key,
    label:               data.label,
    description:         data.description,
    subject:             data.subject,
    body:                data.body,
    available_variables: data.availableVariables,
    active:              data.active,
    updated_by:          data.updatedBy,
    updated_at:          nowISO(),
    usage_count:         0,
    last_used_at:        null,
  });
  if (emailTemplateInsertError) throw new Error(emailTemplateInsertError.message);
  await writeAuditLog({ action: "create", collection: "emailTemplates", recordId: id, details: { key: data.key } });
}

export async function updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<void> {
  const row: Record<string, unknown> = { updated_at: nowISO() };
  if (data.key                !== undefined) row.key                 = data.key;
  if (data.label              !== undefined) row.label               = data.label;
  if (data.description        !== undefined) row.description         = data.description;
  if (data.subject            !== undefined) row.subject             = data.subject;
  if (data.body               !== undefined) row.body                = data.body;
  if (data.availableVariables !== undefined) row.available_variables = data.availableVariables;
  if (data.active             !== undefined) row.active              = data.active;
  if (data.updatedBy          !== undefined) row.updated_by          = data.updatedBy;
  if (data.usageCount         !== undefined) row.usage_count         = data.usageCount;
  if (data.lastUsedAt         !== undefined) row.last_used_at        = data.lastUsedAt;
  const { error: emailTemplateUpdateError } = await supabase.from("email_templates").update(row).eq("id", id);
  if (emailTemplateUpdateError) throw new Error(emailTemplateUpdateError.message);
  await writeAuditLog({ action: "update", collection: "emailTemplates", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const { error: emailTemplateDeleteError } = await supabase.from("email_templates").delete().eq("id", id);
  if (emailTemplateDeleteError) throw new Error(emailTemplateDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "emailTemplates", recordId: id });
}

// ── Automation configs ────────────────────────────────────────────────────────

export async function updateAutomationConfig(automationId: string, patch: {
  templateKey?: string | null;
  enabled?: boolean;
  updatedBy: string;
}): Promise<void> {
  const row: Record<string, unknown> = { updated_at: nowISO(), updated_by: patch.updatedBy };
  if (patch.templateKey !== undefined) row.template_key = patch.templateKey;
  if (patch.enabled     !== undefined) row.enabled      = patch.enabled;
  const { error: automationConfigUpdateError } = await supabase
    .from("automation_configs").update(row).eq("automation_id", automationId);
  if (automationConfigUpdateError) throw new Error(automationConfigUpdateError.message);
  await writeAuditLog({ action: "update", collection: "automationConfigs", recordId: automationId, details: { fields: Object.keys(patch) } });
}

// ── Assignments (new unified table) ──────────────────────────────────────────

// Legacy soft-delete kept for existing callers; prefer archiveAssignment.
// ── Assignment templates ──────────────────────────────────────────────────────

// ── Project groups ────────────────────────────────────────────────────────────

export async function createProjectGroup(
  data: Omit<ProjectGroup, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = genId();
  const now = nowISO();
  const { error: groupInsertError } = await supabase.from("project_groups").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  if (groupInsertError) throw new Error(groupInsertError.message);
  await writeAuditLog({ action: "create", collection: "projectGroups", recordId: id, details: { name: data.name } });
  return id;
}

export async function updateProjectGroup(id: string, data: Partial<ProjectGroup>): Promise<void> {
  const { error: groupUpdateError } = await supabase.from("project_groups").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  if (groupUpdateError) throw new Error(groupUpdateError.message);
  await writeAuditLog({ action: "update", collection: "projectGroups", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteProjectGroup(id: string): Promise<void> {
  const { error: groupDeleteError } = await supabase.from("project_groups").delete().eq("id", id);
  if (groupDeleteError) throw new Error(groupDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "projectGroups", recordId: id });
}

// ── Assignment claims ─────────────────────────────────────────────────────────

// Approve a recurring check-in. Awards credits for this period, increments the
// check-in counter, sets the next due date, and resets the claim to In Progress
// so the member can submit the following period.
// ── Assignment updates (admin → member messages) ──────────────────────────────

export const subscribeAssignmentUpdates =
  makeSubscriber<AssignmentUpdate>("assignment_updates");

export async function createAssignmentUpdate(
  data: Omit<AssignmentUpdate, "id" | "postedAt">,
): Promise<void> {
  const id = genId();
  const { error } = await supabase
    .from("assignment_updates")
    .insert(toRow({ ...data, id, postedAt: nowISO() }));
  if (error) throw new Error(error.message);
}

export async function deleteAssignmentUpdate(id: string): Promise<void> {
  const { error } = await supabase.from("assignment_updates").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ── Member strikes ────────────────────────────────────────────────────────────

export async function createMemberStrike(data: Omit<MemberStrike, "id" | "issuedAt">): Promise<string | null> {
  const id = genId();
  const { error: strikeInsertError } = await supabase.from("member_strikes").insert(toRow({ ...data, id, issuedAt: nowISO() }));
  if (strikeInsertError) throw new Error(strikeInsertError.message);
  await writeAuditLog({ action: "create", collection: "memberStrikes", recordId: id, details: { memberId: data.memberId, infractionId: data.infractionId, points: data.points, source: data.source } });

  // Tell them, with their running total — a points tally nobody sees can't
  // change anyone's behaviour.
  const { data: totals } = await supabase.from("member_contributions")
    .select("infraction_points").eq("member_id", data.memberId).maybeSingle();
  const settings = await getSiteSettings();
  const points = Number((totals as { infraction_points?: number } | null)?.infraction_points ?? data.points);
  const t = settings.infractionThresholds;
  const standing = points >= t.review ? "your standing needs review"
    : points >= t.warning ? "this is a formal warning"
    : points >= t.notice ? "consider this a notice"
    : "no further action for now";
  const people = await emailsForMemberIds([data.memberId]);
  await notify("infraction_issued", people.map((p) => p.email), {
    memberName: people[0]?.name.split(" ")[0] ?? "there",
    infractionName: data.infractionName,
    points: String(data.points),
    notePart: data.note ? data.note : "No further detail was recorded.",
    totalPoints: String(points),
    standing,
  });
  return id;
}

export async function deleteMemberStrike(id: string): Promise<void> {
  const { error: strikeDeleteError } = await supabase.from("member_strikes").delete().eq("id", id);
  if (strikeDeleteError) throw new Error(strikeDeleteError.message);
  await writeAuditLog({ action: "delete", collection: "memberStrikes", recordId: id });
}

export async function clearMemberStrikes(strikeIds: string[]): Promise<void> {
  if (!strikeIds.length) return;
  const { error: strikesClearError } = await supabase.from("member_strikes").delete().in("id", strikeIds);
  if (strikesClearError) throw new Error(strikesClearError.message);
  await writeAuditLog({ action: "delete", collection: "memberStrikes", recordId: "bulk", details: { count: strikeIds.length, ids: strikeIds } });
}

// ── Member credit adjustments ─────────────────────────────────────────────────

// ── Handbook pages ────────────────────────────────────────────────────────────

export const subscribeHandbookPages =
  makeSubscriber<HandbookPage>("handbook_pages", (r) => fromRow<HandbookPage>(r));

export async function getHandbookPagesList(): Promise<HandbookPage[]> {
  const { data } = await supabase.from("handbook_pages").select("*");
  return (data ?? []).map((r) => fromRow<HandbookPage>(r as Record<string, unknown>));
}

export async function getHandbookPage(slug: string): Promise<HandbookPage | null> {
  const { data } = await supabase.from("handbook_pages").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  return fromRow<HandbookPage>(data as Record<string, unknown>);
}

export async function upsertHandbookPage(slug: string, data: Omit<HandbookPage, "id" | "updatedAt">): Promise<void> {
  const existing = await getHandbookPage(slug);
  const now = nowISO();
  if (existing) {
    const { error: handbookUpdateError } = await supabase.from("handbook_pages").update(toRow({ ...data, updatedAt: now })).eq("slug", slug);
    if (handbookUpdateError) throw new Error(handbookUpdateError.message);
    await writeAuditLog({ action: "update", collection: "handbookPages", recordId: existing.id, details: { slug } });
  } else {
    const id = genId();
    const { error: handbookInsertError } = await supabase.from("handbook_pages").insert(toRow({ ...data, id, slug, updatedAt: now }));
    if (handbookInsertError) throw new Error(handbookInsertError.message);
    await writeAuditLog({ action: "create", collection: "handbookPages", recordId: id, details: { slug } });
  }
}

export async function getMemberAcknowledgment(memberId: string, pageSlug: string): Promise<MemberAcknowledgment | null> {
  const { data } = await supabase
    .from("member_acknowledgments")
    .select("*")
    .eq("member_id", memberId)
    .eq("page_slug", pageSlug)
    .maybeSingle();
  if (!data) return null;
  return fromRow<MemberAcknowledgment>(data as Record<string, unknown>);
}

export async function createMemberAcknowledgment(data: Omit<MemberAcknowledgment, "id" | "acknowledgedAt">): Promise<void> {
  const id = genId();
  const { error: ackUpsertError } = await supabase.from("member_acknowledgments").upsert(
    toRow({ ...data, id, acknowledgedAt: nowISO() }),
    { onConflict: "member_id,page_slug" }
  );
  if (ackUpsertError) throw new Error(ackUpsertError.message);
}

// ═════════════════════════════════════════════════════════════════════════════
// PODS — marketing & finance
//
// A pod is a standing group with one or more LITs, meeting on its own cadence.
// Membership is many-to-many: the recruitment page offers "choose a focus, or
// work across all four", and a member can lead one pod while sitting in another.
// ═════════════════════════════════════════════════════════════════════════════

// A chapter is a market — the city whose small businesses we take on as
// clients. Members are mostly remote and are not confined to one.
export interface Chapter {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  status: "Active" | "Launching" | "Archived";
  siteUrl: string;
  sortOrder: number;
}

export const subscribeChapters = makeSubscriber<Chapter>("chapters");

export async function updateChapter(id: string, patch: Partial<Chapter>): Promise<void> {
  const { error } = await supabase.from("chapters")
    .update(toRow({ ...patch, updatedAt: nowISO() })).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "chapters", recordId: id, details: { fields: Object.keys(patch) } });
}

export async function createChapter(name: string, city: string, state: string): Promise<void> {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("A chapter needs a name.");
  const { data: existing } = await supabase.from("chapters").select("sort_order").order("sort_order", { ascending: false }).limit(1);
  const nextOrder = Number((existing ?? [])[0]?.sort_order ?? 0) + 1;
  const { error } = await supabase.from("chapters").insert(toRow({
    id: `chapter_${slug.replace(/-/g, "_")}`,
    name: name.trim(), slug, city: city.trim(), state: state.trim().toUpperCase(),
    status: "Launching", sortOrder: nextOrder, createdAt: nowISO(), updatedAt: nowISO(),
  }));
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "chapters", recordId: slug, details: { name } });
}

export interface Pod {
  id: string;
  chapterId: string;
  // Marketing exists for the businesses we take on as clients; finance and
  // operations keep Novus running. Shown on the pod so nobody has to infer it.
  track: "Marketing" | "Finance";
  serves: "clients" | "novus";
  name: string;
  slug: string;
  description: string;
  cadenceDays: number;
  // Prefill values for the LIT — editable per pod, overridable per meeting or
  // task. Nothing about hours is fixed in code.
  defaultMeetingHours: number;
  defaultTaskHours: number;
  status: "Active" | "Archived";
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export type PodRole = "lit" | "member";

export interface PodMember {
  id: string;
  podId: string;
  memberId: string;
  role: PodRole;
  joinedAt: string;
  leftAt?: string | null;
}

export interface PodMeeting {
  id: string;
  podId: string;
  meetsOn: string;
  title: string;
  hours: number;
  notes: string;
  createdBy?: string;
  createdAt?: string;
}

export const ATTENDANCE_STATUSES = ["Present", "Excused", "Unexcused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface PodAttendance {
  id: string;
  meetingId: string;
  memberId: string;
  status: AttendanceStatus;
  tasksDone: number;
  hours?: number | null;   // null inherits the meeting's hours
  note: string;
  markedBy?: string;
  markedAt?: string;
}

export const subscribePods         = makeSubscriber<Pod>("pods");
export const subscribePodMembers   = makeSubscriber<PodMember>("pod_members");
export const subscribePodMeetings  = makeSubscriber<PodMeeting>("pod_meetings");

export async function updatePod(id: string, patch: Partial<Pod>): Promise<void> {
  const { error } = await supabase.from("pods")
    .update(toRow({ ...patch, updatedAt: nowISO() })).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "pods", recordId: id, details: { fields: Object.keys(patch) } });
}

// Single-row membership edits. One click in the UI should be one write, not a
// diff of the whole roster.
export async function addPodMember(
  podId: string, memberId: string, role: PodRole = "member",
): Promise<void> {
  const { error } = await supabase.from("pod_members").upsert(
    toRow({ id: genId(), podId, memberId, role, joinedAt: nowISO(), leftAt: null }),
    { onConflict: "pod_id,member_id" },
  );
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "pod_members", recordId: `${podId}/${memberId}`, details: { role } });
}

export async function setPodMemberRole(
  podId: string, memberId: string, role: PodRole,
): Promise<void> {
  const { error } = await supabase.from("pod_members")
    .update({ role }).eq("pod_id", podId).eq("member_id", memberId);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "pod_members", recordId: `${podId}/${memberId}`, details: { role } });
}

// Someone who has attended a meeting keeps their row with left_at set, because
// their hours are still on the service letter. Someone added by mistake and
// removed before any meeting leaves nothing behind.
export async function removePodMember(podId: string, memberId: string): Promise<void> {
  const { data: meetingRows } = await supabase.from("pod_meetings").select("id").eq("pod_id", podId);
  const meetingIds = ((meetingRows ?? []) as { id: string }[]).map((m) => m.id);

  let hasHistory = false;
  if (meetingIds.length) {
    const { count } = await supabase.from("pod_attendance")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId).in("meeting_id", meetingIds);
    hasHistory = (count ?? 0) > 0;
  }

  const { error } = hasHistory
    ? await supabase.from("pod_members").update({ left_at: nowISO() })
        .eq("pod_id", podId).eq("member_id", memberId)
    : await supabase.from("pod_members").delete()
        .eq("pod_id", podId).eq("member_id", memberId);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "delete", collection: "pod_members", recordId: `${podId}/${memberId}`, details: { keptHistory: hasHistory } });
}

export async function createPodMeeting(
  podId: string,
  meetsOn: string,
  title: string,
  hours: number,
): Promise<string> {
  const id = genId();
  const { error } = await supabase.from("pod_meetings")
    .insert(toRow({ id, podId, meetsOn, title, hours, notes: "", createdAt: nowISO() }));
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "pod_meetings", recordId: id, details: { podId, meetsOn } });
  return id;
}

export async function updatePodMeeting(id: string, patch: Partial<PodMeeting>): Promise<void> {
  const { error } = await supabase.from("pod_meetings").update(toRow(patch)).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deletePodMeeting(id: string): Promise<void> {
  const { error } = await supabase.from("pod_meetings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "delete", collection: "pod_meetings", recordId: id });
}

export async function fetchAttendance(meetingId: string): Promise<PodAttendance[]> {
  const { data } = await supabase.from("pod_attendance").select("*").eq("meeting_id", meetingId);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<PodAttendance>(r));
}

// The whole grid saves in one call — a LIT fills a column and presses save once.
export async function saveAttendance(
  meetingId: string,
  cells: { memberId: string; status: AttendanceStatus; tasksDone: number; hours?: number | null; note?: string }[],
): Promise<void> {
  const existing = await fetchAttendance(meetingId);
  const byMember = new Map(existing.map((c) => [c.memberId, c.id]));
  const rows = cells.map((c) => toRow({
    id: byMember.get(c.memberId) ?? genId(),
    meetingId,
    memberId: c.memberId,
    status: c.status,
    tasksDone: c.tasksDone,
    hours: c.hours ?? null,
    note: c.note ?? "",
    markedAt: nowISO(),
  }));
  const { error } = await supabase.from("pod_attendance")
    .upsert(rows, { onConflict: "meeting_id,member_id" });
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "pod_attendance", recordId: meetingId, details: { cells: cells.length } });
}

// ── Hours ────────────────────────────────────────────────────────────────────
// Hours replaced credits. The ledger is a view over meetings, pod tasks, tech
// projects and manual adjustments, so there is no total to keep in sync.

export interface HoursEntry {
  memberId: string;
  source: "meeting" | "task" | "project" | "adjustment";
  department: string;
  occurredOn: string;
  hours: number;
  detail: string;
}

// Everything a member has done, in one row. Sources are disjoint, so nothing is
// counted twice and no kind of work is missing.
export interface MemberContribution {
  memberId: string;
  hoursTotal: number;
  hoursMeeting: number;
  hoursTask: number;
  hoursProject: number;
  meetingsPresent: number;
  meetingsExcused: number;
  meetingsMissed: number;
  tasksDone: number;
  tasksOpen: number;
  tasksOverdue: number;
  projectsLive: number;
  projectsActive: number;
  projectsTotal: number;
  podsLed: number;
  podsJoined: number;
  infractionPoints: number;
  infractionCount: number;
  workScore: number;
  lastActivity: string | null;
  noRecordedWork: boolean;
}

export async function fetchMemberContributions(): Promise<MemberContribution[]> {
  const { data } = await supabase.from("member_contributions").select("*");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<MemberContribution>(r));
}

export interface HoursTotals {
  memberId: string;
  totalHours: number;
  meetingHours: number | null;
  taskHours: number | null;
  projectHours: number | null;
  adjustmentHours: number | null;
  firstActivity: string | null;
  lastActivity: string | null;
}

export async function fetchHoursTotals(): Promise<HoursTotals[]> {
  const { data } = await supabase.from("member_hours_totals").select("*");
  return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<HoursTotals>(r));
}

export async function fetchMemberHours(memberId: string, from?: string, to?: string): Promise<HoursEntry[]> {
  let q = supabase.from("member_hours_ledger").select("*").eq("member_id", memberId);
  if (from) q = q.gte("occurred_on", from);
  if (to)   q = q.lte("occurred_on", to);
  const { data } = await q.order("occurred_on", { ascending: false });
  return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<HoursEntry>(r));
}

export async function createHoursAdjustment(
  memberId: string, hours: number, reason: string, occurredOn: string,
): Promise<void> {
  const id = genId();
  const { error } = await supabase.from("hours_adjustments")
    .insert(toRow({ id, memberId, hours, reason, occurredOn, createdAt: nowISO() }));
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "hours_adjustments", recordId: id, details: { memberId, hours } });
}

// Fire an event-driven automation. Failure is deliberately swallowed: the
// action that triggered it has already happened, and an unsent notification
// must not make it look like the action failed.
async function notify(
  automationId: string,
  to: string[],
  variables: Record<string, string>,
): Promise<void> {
  const recipients = to.filter(Boolean);
  if (recipients.length === 0) return;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await fetch("/api/members/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ automationId, to: recipients, variables }),
    });
  } catch {
    // no-op
  }
}

async function emailsForMemberIds(ids: string[]): Promise<{ email: string; name: string }[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase.from("team").select("id, name, email")
    .in("id", ids).is("deleted_at", null);
  return ((data ?? []) as Record<string, unknown>[])
    .map((r) => ({ email: String(r.email ?? ""), name: String(r.name ?? "") }))
    .filter((r) => !!r.email);
}

// ── Tech project notifications ───────────────────────────────────────────────

export async function notifyProjectAssigned(
  business: Business, newAssigneeIds: string[],
): Promise<void> {
  const people = await emailsForMemberIds(newAssigneeIds);
  const contact = [business.ownerName, business.ownerEmail, business.phone]
    .map((v) => String(v ?? "").trim()).filter(Boolean).join(" · ");
  await notify("project_assigned", people.map((p) => p.email), {
    memberName: people.length === 1 ? people[0].name.split(" ")[0] : "there",
    businessName: business.name,
    neighborhoodPart: business.neighborhood ? ` in ${business.neighborhood}` : "",
    contactPart: contact || "No contact details on file yet.",
  });
}

export async function notifyDraftReady(business: Business): Promise<void> {
  // Goes to whoever can act on it: the leads, not the whole directory.
  const { data } = await supabase.from("team").select("name, email, role")
    .in("role", ["Board", "Developer"]).is("deleted_at", null);
  const leads = ((data ?? []) as Record<string, unknown>[])
    .map((r) => String(r.email ?? "")).filter(Boolean);
  const assignees = await emailsForMemberIds(business.assignees ?? []);
  await notify("project_draft_ready", leads, {
    leadName: "there",
    businessName: business.name,
    assigneeNames: assignees.map((a) => a.name).join(", ") || "the team",
    previewUrl: business.previewUrl ?? business.liveUrl ?? "",
  });
}

// ── Pod assignments ──────────────────────────────────────────────────────────
// The assignments table survives the marketplace, scoped to a pod and pushed to
// named people instead of posted to a catalog for anyone to claim.

export interface PodAssignment {
  id: string;
  podId: string;
  title: string;
  description: string;
  status: "Open" | "Done";
  assignedMemberIds: string[];
  assignedMemberNames: string[];
  dueDate?: string | null;
  hours?: number | null;
  completedAt?: string | null;
  completedBy?: string | null;
  createdAt?: string;
}

export function subscribePodAssignments(callback: (items: PodAssignment[]) => void): () => void {
  return makeSubscriber<PodAssignment>("assignments")((rows) =>
    callback(rows.filter((r) => !!r.podId)));
}

export async function createPodAssignment(
  data: Omit<PodAssignment, "id" | "createdAt" | "completedAt" | "completedBy">,
): Promise<void> {
  const id = genId();
  const { error } = await supabase.from("assignments")
    .insert(toRow({ ...data, id, type: "Task", track: "Marketing", createdAt: nowISO(), updatedAt: nowISO() }));
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "assignments", recordId: id, details: { podId: data.podId, title: data.title } });

  const { data: pod } = await supabase.from("pods").select("name").eq("id", data.podId).maybeSingle();
  const people = await emailsForMemberIds(data.assignedMemberIds);
  await notify("pod_task_assigned", people.map((p) => p.email), {
    memberName: people.length === 1 ? people[0].name.split(" ")[0] : "there",
    taskTitle: data.title,
    podName: String((pod as { name?: string } | null)?.name ?? "your pod"),
    dueDatePart: data.dueDate ? `Due ${data.dueDate}` : "No deadline set",
  });
}

export async function updatePodAssignment(id: string, patch: Partial<PodAssignment>): Promise<void> {
  const { error } = await supabase.from("assignments")
    .update(toRow({ ...patch, updatedAt: nowISO() })).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function completePodAssignment(id: string, done: boolean): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("assignments").update({
    status: done ? "Done" : "Open",
    completed_at: done ? nowISO() : null,
    completed_by: done ? (user?.email ?? null) : null,
    updated_at: nowISO(),
  }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "assignments", recordId: id, details: { completed: done } });
}

export async function deletePodAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "delete", collection: "assignments", recordId: id });
}
