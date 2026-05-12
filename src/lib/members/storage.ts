// Supabase Postgres storage for the Volta NYC members portal.
// All exported function signatures are unchanged — callers require no edits.
//
// Subscribe functions perform an initial fetch then open a Supabase realtime
// channel so the UI updates automatically when the database changes.

import { supabase } from "@/lib/supabaseClient";
import { normalizeTeamPod } from "@/lib/teamPod";

// ── DATA TYPES ────────────────────────────────────────────────────────────────

export interface BID {
  id: string;
  name: string;
  status: "Active Partner" | "In Conversation" | "Outreach" | "Paused" | "Dead";
  contactName: string;
  contactEmail: string;
  phone: string;
  borough: string;
  address?: string;
  zipCode?: string;
  lat?: number;
  lng?: number;
  nextAction: string;
  notes: string;
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
  intakeSource?: "website_form";
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
    projectStatus?: "Ongoing" | "Upcoming" | "Completed" | "Not Started" | "Discovery" | "Active" | "On Hold" | "Complete";
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
  pod: string;
  // Role label as captured at acceptance (e.g. "Analyst", "Senior Analyst",
  // "Associate", "Senior Associate", "Board") — kept as a free-form string so
  // legacy values from earlier role taxonomies still display verbatim.
  role: string;
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
  tracksSelected?: string;
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

export type FinanceAssignmentType = "Report" | "Case Study";
export type FinanceAssignmentStatus = "Upcoming" | "Ongoing" | "Completed";

export interface FinanceAssignment {
  id: string;
  seedKey?: string;
  type: FinanceAssignmentType;
  title: string;
  topic: string;
  teamLabel: string;
  region: string;
  assignedMemberNames: string[]; // may be undefined on legacy rows
  assignedMemberIds?: string[];  // may be undefined on legacy rows
  deadlines?: Array<{
    label: string;
    date: string;
  }>;
  deadline?: string;
  interviewDueDate?: string;
  firstDraftDueDate?: string;
  finalDueDate?: string;
  deliverableUrl?: string;
  status: FinanceAssignmentStatus;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Credit cycle types ────────────────────────────────────────────────────────
//
// A Cycle defines a credit-earning period (typically a quarter). Targets are
// per-track × per-role. Senior Associate and Board are intentionally excluded
// from the credit/strike system — they run it.

export type CycleTrack = "Tech" | "Marketing" | "Finance" | "General";
export type CycleRole = "Analyst" | "Senior Analyst" | "Associate";

export interface CycleCreditTargets {
  Tech: Record<CycleRole, number>;
  Marketing: Record<CycleRole, number>;
  Finance: Record<CycleRole, number>;
}

export interface CycleStrikeThresholds {
  warning: number;       // points to first strike
  demotion: number;      // points to second strike
  reserve: number;       // points to third strike
}

export interface Cycle {
  id: string;
  name: string;                       // e.g. "Summer 2026"
  startDate: string;                  // ISO date (YYYY-MM-DD)
  endDate: string;                    // ISO date (YYYY-MM-DD)
  active: boolean;                    // exactly one cycle is active at a time
  pacingPercentPerCheckin: number;    // default 20 — drives biweekly nudge + dot
  creditTargets: CycleCreditTargets;
  strikeThresholds: CycleStrikeThresholds;
  createdAt: string;
  updatedAt: string;
}

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
  | "infraction_notice"
  | "monthly_portal_reminder"
  | "biweekly_checkin";

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

// ── Assignment templates (admin-managed blueprints) ───────────────────────────
// Templates are reusable blueprints for creating assignments. They have no
// business_id and no status — they are never "open" assignments themselves.

export interface AssignmentTemplate {
  id: string;
  title: string;
  description: string;             // HTML (rich-text)
  type?: string;                   // null | 'Report' | 'Case Study'
  track: CycleTrack;
  credits: number;
  creditsMax?: number;
  creditsNote?: string;
  difficulty: string;
  estimatedHours: number;
  minRole: CycleRole;
  capacity: number;
  deadlineOffsetDays?: number;     // days after creation → suggested deadline
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ── Active assignments (unified: Tech + Marketing + Finance) ──────────────────

export type AssignmentDifficulty = string; // admin-configurable, free-form

export type AssignmentStatus =
  | "Open"          // visible in marketplace, accepting claims
  | "In Progress"   // at least one active claim
  | "Submitted"     // at least one claim awaiting approval
  | "Approved"      // all claims approved (closed naturally)
  | "Finalized";    // admin-closed

export interface Assignment {
  id: string;
  title: string;
  description: string;             // HTML (rich-text)
  type?: string;                   // null | 'Report' | 'Case Study' (Finance)
  track: CycleTrack;
  businessId?: string;             // required for active assignments
  status: AssignmentStatus;
  assignedMemberIds?: string[];
  assignedMemberNames?: string[];
  deadlines?: Array<{ label: string; date: string }>;
  deliverableUrl?: string;
  credits: number;
  creditsMax?: number;
  creditsNote?: string;
  difficulty: AssignmentDifficulty;
  estimatedHours: number;
  minRole: CycleRole;
  capacity: number;
  projectGroupId?: string;          // set when assignment belongs to a standalone project group
  cycleId?: string;
  templateId?: string;             // template used to create this assignment
  // Finance-specific
  region?: string;
  teamLabel?: string;
  seedKey?: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  primaryTrack?: CycleTrack;
  visibleTracks?: CycleTrack[];
  deadline?: string;
}

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

export type AssignmentClaimStatus =
  | "claimed"
  | "In Progress"
  | "Submitted"
  | "Approved"
  | "rejected";

export interface AssignmentClaim {
  id: string;
  assignmentId: string;
  memberId: string;
  memberName: string;              // denormalized for display
  cycleId: string;
  status: AssignmentClaimStatus;
  deliverableUrl?: string;
  submissionNotes?: string;
  claimedAt: string;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectReason?: string;
  // Awarded credits — usually equal to assignment.credits at approval time, but
  // approver can adjust (e.g. partial completion). Drives the credit ledger.
  creditsAwarded?: number;
  approvedBy?: string;
}

// ── Member strikes + credit adjustments ───────────────────────────────────────
// Strikes are point-bearing infractions issued against a member; thresholds on
// the active cycle convert points → strike count (warning / demotion / reserve).

export interface MemberStrike {
  id: string;
  memberId: string;
  memberName: string;              // denormalized for display
  cycleId: string;
  infractionId: string;            // catalog reference
  infractionName: string;          // denormalized in case the catalog row is retired
  points: number;                  // 1 minor, 2 major, 3 severe — matches Infraction.points
  issuedAt: string;
  issuedBy: string;
  note: string;
  source: "manual" | "auto_pace";  // how it was issued (manual or by automation)
}

export interface MemberCreditAdjustment {
  id: string;
  memberId: string;
  memberName: string;
  cycleId: string;
  points: number;                  // can be negative
  reason: string;
  createdAt: string;
  createdBy: string;
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
  color?: string;       // hex color, e.g. "#85CC17"
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

function normalizeAssignmentStatus(raw: unknown): AssignmentStatus {
  const v = String(raw ?? "").trim().toLowerCase().replace(/_/g, " ");
  if (v === "open") return "Open";
  if (v === "in progress") return "In Progress";
  if (v === "submitted") return "Submitted";
  if (v === "approved") return "Approved";
  if (v === "closed" || v === "finalized") return "Finalized";
  return "Open";
}

function normalizeClaimStatus(raw: unknown): AssignmentClaimStatus {
  const v = String(raw ?? "").trim().toLowerCase().replace(/_/g, " ");
  if (v === "in progress") return "In Progress";
  if (v === "submitted") return "Submitted";
  if (v === "approved") return "Approved";
  if (v === "rejected") return "rejected";
  return "claimed";
}

function assignmentFromRow(r: Record<string, unknown>): Assignment {
  const a = fromRow<Assignment>(r);
  a.status = normalizeAssignmentStatus(r.status);
  // New table uses `track`; old catalog used `primary_track` — normalise both.
  if (!a.track && a.primaryTrack) a.track = a.primaryTrack;
  if (!a.track) a.track = "Tech";
  return a;
}

function claimFromRow(r: Record<string, unknown>): AssignmentClaim {
  const c = fromRow<AssignmentClaim>(r);
  c.status = normalizeClaimStatus(r.status);
  return c;
}

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
function makeSubscriber<T>(table: string, transform?: (row: Record<string, unknown>) => T) {
  return (callback: (items: T[]) => void): (() => void) => {
    const fetchAll = () =>
      supabase
        .from(table)
        .select("*")
        .then(({ data, error }) => {
          if (error || !data) { callback([]); return; }
          callback(
            (data as Record<string, unknown>[]).map(
              transform ? (r) => transform(r) : (r) => fromRow<T>(r)
            )
          );
        });

    void fetchAll();

    const channel = supabase
      .channel(`realtime-${table}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () => void fetchAll())
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
  if (raw === "admin") return "owner"; // legacy: old DB 'admin' values are owners
  if (raw === "Board") return "owner";
  if (raw === "Senior Associate") return "admin";
  if (raw === "admin_lite") return "admin";
  return "member";
}

// ── SUBSCRIBERS ───────────────────────────────────────────────────────────────
// Each subscriber fetches once and calls callback immediately.
// Returns a no-op unsubscribe (real-time channels can be added later).

export const subscribeBIDs =
  makeSubscriber<BID>("bids", (r) => fromRow<BID>(r));

export const subscribeBusinesses =
  makeSubscriber<Business>("businesses", (r) => fromRow<Business>(r));

export const subscribeTeam =
  makeSubscriber<TeamMember>("team", (r) => fromRow<TeamMember>(r));

export const subscribeProjects =
  makeSubscriber<Project>("projects", (r) => fromRow<Project>(r));

export const subscribeFinanceAssignments =
  makeSubscriber<FinanceAssignment>("finance_assignments", (r) => fromRow<FinanceAssignment>(r));

export const subscribeCycles =
  makeSubscriber<Cycle>("cycles", (r) => fromRow<Cycle>(r));

export const subscribeInfractions =
  makeSubscriber<Infraction>("infractions", (r) => fromRow<Infraction>(r));

export const subscribeEmailTemplates =
  makeSubscriber<EmailTemplate>("email_templates", (r) => ({
    ...fromRow<EmailTemplate>(r),
    availableVariables: (r.available_variables as string[]) ?? [],
  }));

// Legacy subscriber retained for the old catalog page (will be removed once
// the catalog page is fully migrated).
export const subscribeAssignments =
  makeSubscriber<Assignment>("assignments", assignmentFromRow);

export const subscribeAssignmentClaims =
  makeSubscriber<AssignmentClaim>("assignment_claims", claimFromRow);

export const subscribeAssignmentTemplates =
  makeSubscriber<AssignmentTemplate>("assignment_templates", (r) => fromRow<AssignmentTemplate>(r));

export const subscribeProjectGroups =
  makeSubscriber<ProjectGroup>("project_groups", (r) => fromRow<ProjectGroup>(r));

export const subscribeMemberStrikes =
  makeSubscriber<MemberStrike>("member_strikes", (r) => fromRow<MemberStrike>(r));

export const subscribeMemberCreditAdjustments =
  makeSubscriber<MemberCreditAdjustment>("member_credit_adjustments", (r) => fromRow<MemberCreditAdjustment>(r));

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
  await supabase.from("bids").insert(row);
  await writeAuditLog({ action: "create", collection: "bids", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateBID(id: string, data: Partial<BID>): Promise<void> {
  await supabase.from("bids").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "bids", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteBID(id: string): Promise<void> {
  await supabase.from("bids").delete().eq("id", id);
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
  await supabase.from("bids").update({ timeline }).eq("id", bidId);
  await writeAuditLog({ action: "create", collection: "bids.timeline", recordId: `${bidId}/${entryId}`, details: { action: entry.action, date: entry.date } });
}

export async function deleteBIDTimelineEntry(bidId: string, entryId: string): Promise<void> {
  const { data: row } = await supabase.from("bids").select("timeline").eq("id", bidId).single();
  const timeline = ((row as Record<string, unknown> | null)?.timeline ?? {}) as Record<string, unknown>;
  delete timeline[entryId];
  await supabase.from("bids").update({ timeline }).eq("id", bidId);
  await writeAuditLog({ action: "delete", collection: "bids.timeline", recordId: `${bidId}/${entryId}` });
}

// ── Businesses ────────────────────────────────────────────────────────────────

export async function createBusiness(data: Omit<Business, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const { showcaseImageData, ...rest } = data;
  const id = genId();
  const now = nowISO();
  const row = toRow({ ...rest, id, showcaseImageSet: false, createdAt: now, updatedAt: now });
  await supabase.from("businesses").insert(row);

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

  await supabase.from("businesses").update(toRow({ ...rest, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "businesses", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteBusiness(id: string): Promise<void> {
  await supabase.from("businesses").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "businesses", recordId: id });
}

// ── Team ──────────────────────────────────────────────────────────────────────

export async function createTeamMember(data: Omit<TeamMember, "id" | "createdAt">): Promise<void> {
  const id = genId();
  const row = toRow({ ...data, id, pod: normalizeTeamPod(data.pod), createdAt: nowISO() });
  await supabase.from("team").insert(row);
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
  await supabase.from("applications").insert(row);
  await writeAuditLog({ action: "create", collection: "applications", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateApplicationRecord(
  id: string,
  data: Partial<ApplicationRecord>
): Promise<void> {
  await supabase.from("applications").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "applications", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateTeamMember(id: string, data: Partial<TeamMember>): Promise<void> {
  const patch = { ...data };
  if (Object.prototype.hasOwnProperty.call(patch, "pod")) {
    patch.pod = normalizeTeamPod(patch.pod);
  }
  await supabase.from("team").update(toRow(patch as Record<string, unknown>)).eq("id", id);
  await writeAuditLog({ action: "update", collection: "team", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteTeamMember(id: string): Promise<void> {
  await supabase.from("team").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "team", recordId: id });
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const id = genId();
  const now = nowISO();
  await supabase.from("projects").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  await writeAuditLog({ action: "create", collection: "projects", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  await supabase.from("projects").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "projects", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteProject(id: string): Promise<void> {
  await supabase.from("projects").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "projects", recordId: id });
}

// ── Finance Assignments ──────────────────────────────────────────────────────

export async function createFinanceAssignment(
  data: Omit<FinanceAssignment, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const id = genId();
  const now = nowISO();
  await supabase.from("finance_assignments").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  await writeAuditLog({ action: "create", collection: "financeAssignments", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateFinanceAssignment(
  id: string,
  data: Partial<FinanceAssignment>
): Promise<void> {
  await supabase.from("finance_assignments").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "financeAssignments", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteFinanceAssignment(id: string): Promise<void> {
  await supabase.from("finance_assignments").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "financeAssignments", recordId: id });
}

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
  await supabase.from("user_profiles").update(toRow(data as Record<string, unknown>)).eq("id", uid);
  await writeAuditLog({ action: "update", collection: "userProfiles", recordId: uid, details: { fields: Object.keys(data) } });
}

export async function setUserProfileRecord(uid: string, data: Omit<UserProfile, "id">): Promise<void> {
  const { data: existing } = await supabase.from("user_profiles").select("*").eq("id", uid).maybeSingle();
  const before = existing ? fromRow<Omit<UserProfile, "id">>(existing as Record<string, unknown>) : null;
  const merged = before ? { ...before, ...data } : data;
  merged.authRole = normalizeAuthRoleValue(merged.authRole);
  await supabase.from("user_profiles").upsert(toRow({ ...merged, id: uid }), { onConflict: "id" });
  await writeAuditLog({ action: before ? "update" : "create", collection: "userProfiles", recordId: uid, details: { fields: Object.keys(merged) } });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  await supabase.from("user_profiles").delete().eq("id", uid);
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
  const { data } = await supabase.from("team").select("*");
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
  const { data } = await supabase.from("businesses").select("*");
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

export async function getFinanceAssignmentsList(): Promise<FinanceAssignment[]> {
  const { data } = await supabase.from("finance_assignments").select("*");
  return (data ?? []).map((r) => fromRow<FinanceAssignment>(r as Record<string, unknown>));
}

export async function getCyclesList(): Promise<Cycle[]> {
  const { data } = await supabase.from("cycles").select("*");
  return (data ?? []).map((r) => fromRow<Cycle>(r as Record<string, unknown>));
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

export async function getAssignmentClaimsList(): Promise<AssignmentClaim[]> {
  const { data } = await supabase.from("assignment_claims").select("*");
  return (data ?? []).map((r) => claimFromRow(r as Record<string, unknown>));
}

export async function getMemberStrikesList(): Promise<MemberStrike[]> {
  const { data } = await supabase.from("member_strikes").select("*");
  return (data ?? []).map((r) => fromRow<MemberStrike>(r as Record<string, unknown>));
}

export async function getMemberCreditAdjustmentsList(): Promise<MemberCreditAdjustment[]> {
  const { data } = await supabase.from("member_credit_adjustments").select("*");
  return (data ?? []).map((r) => fromRow<MemberCreditAdjustment>(r as Record<string, unknown>));
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

// ── Cycles ────────────────────────────────────────────────────────────────────

export async function createCycle(data: Omit<Cycle, "id" | "createdAt" | "updatedAt">): Promise<string | null> {
  const id = genId();
  const now = nowISO();
  await supabase.from("cycles").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  await writeAuditLog({ action: "create", collection: "cycles", recordId: id, details: { fields: Object.keys(data) } });
  return id;
}

export async function updateCycle(id: string, data: Partial<Cycle>): Promise<void> {
  await supabase.from("cycles").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "cycles", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteCycle(id: string): Promise<void> {
  await supabase.from("cycles").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "cycles", recordId: id });
}

export async function activateCycleExclusive(id: string, allCycleIds: string[]): Promise<void> {
  const now = nowISO();
  await supabase.from("cycles").update({ active: true,  updated_at: now }).eq("id", id);
  const others = allCycleIds.filter((c) => c !== id);
  if (others.length) {
    await supabase.from("cycles").update({ active: false, updated_at: now }).in("id", others);
  }
  await writeAuditLog({ action: "update", collection: "cycles", recordId: id, details: { activated: true, deactivated: others } });
}

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
  await supabase.from("email_templates").insert({
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
  await supabase.from("email_templates").update(row).eq("id", id);
  await writeAuditLog({ action: "update", collection: "emailTemplates", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await supabase.from("email_templates").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "emailTemplates", recordId: id });
}

// ── Assignments (new unified table) ──────────────────────────────────────────

export async function createAssignment(data: Omit<Assignment, "id" | "createdAt" | "updatedAt">): Promise<string | null> {
  const id = genId();
  const now = nowISO();
  await supabase.from("assignments").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  await writeAuditLog({ action: "create", collection: "assignments", recordId: id, details: { title: data.title, track: data.track } });
  return id;
}

export async function updateAssignment(id: string, data: Partial<Assignment>): Promise<void> {
  await supabase.from("assignments").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "assignments", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteAssignment(id: string): Promise<void> {
  await supabase.from("assignments").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "assignments", recordId: id });
}

export async function getAssignmentsList(): Promise<Assignment[]> {
  const { data } = await supabase.from("assignments").select("*");
  return (data ?? []).map((r) => assignmentFromRow(r as Record<string, unknown>));
}

// ── Assignment templates ──────────────────────────────────────────────────────

export async function createAssignmentTemplate(data: Omit<AssignmentTemplate, "id" | "createdAt" | "updatedAt">): Promise<string | null> {
  const id = genId();
  const now = nowISO();
  await supabase.from("assignment_templates").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  await writeAuditLog({ action: "create", collection: "assignmentTemplates", recordId: id, details: { title: data.title, track: data.track } });
  return id;
}

export async function updateAssignmentTemplate(id: string, data: Partial<AssignmentTemplate>): Promise<void> {
  await supabase.from("assignment_templates").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "assignmentTemplates", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteAssignmentTemplate(id: string): Promise<void> {
  await supabase.from("assignment_templates").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "assignmentTemplates", recordId: id });
}

export async function getAssignmentTemplatesList(): Promise<AssignmentTemplate[]> {
  const { data } = await supabase.from("assignment_templates").select("*");
  return (data ?? []).map((r) => fromRow<AssignmentTemplate>(r as Record<string, unknown>));
}

// ── Project groups ────────────────────────────────────────────────────────────

export async function createProjectGroup(
  data: Omit<ProjectGroup, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const id = genId();
  const now = nowISO();
  await supabase.from("project_groups").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  await writeAuditLog({ action: "create", collection: "projectGroups", recordId: id, details: { name: data.name } });
  return id;
}

export async function updateProjectGroup(id: string, data: Partial<ProjectGroup>): Promise<void> {
  await supabase.from("project_groups").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id);
  await writeAuditLog({ action: "update", collection: "projectGroups", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteProjectGroup(id: string): Promise<void> {
  await supabase.from("project_groups").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "projectGroups", recordId: id });
}

// ── Assignment claims ─────────────────────────────────────────────────────────

export async function createAssignmentClaim(data: Omit<AssignmentClaim, "id">): Promise<string | null> {
  const id = genId();
  await supabase.from("assignment_claims").insert(toRow({ ...data, id }));
  await writeAuditLog({ action: "create", collection: "assignmentClaims", recordId: id, details: { assignmentId: data.assignmentId, memberId: data.memberId } });
  return id;
}

export async function updateAssignmentClaim(id: string, data: Partial<AssignmentClaim>): Promise<void> {
  await supabase.from("assignment_claims").update(toRow(data as Record<string, unknown>)).eq("id", id);
  await writeAuditLog({ action: "update", collection: "assignmentClaims", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteAssignmentClaim(id: string): Promise<void> {
  await supabase.from("assignment_claims").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "assignmentClaims", recordId: id });
}

// ── Member strikes ────────────────────────────────────────────────────────────

export async function createMemberStrike(data: Omit<MemberStrike, "id" | "issuedAt">): Promise<string | null> {
  const id = genId();
  await supabase.from("member_strikes").insert(toRow({ ...data, id, issuedAt: nowISO() }));
  await writeAuditLog({ action: "create", collection: "memberStrikes", recordId: id, details: { memberId: data.memberId, infractionId: data.infractionId, points: data.points, source: data.source } });
  return id;
}

export async function deleteMemberStrike(id: string): Promise<void> {
  await supabase.from("member_strikes").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "memberStrikes", recordId: id });
}

export async function clearMemberStrikes(strikeIds: string[]): Promise<void> {
  if (!strikeIds.length) return;
  await supabase.from("member_strikes").delete().in("id", strikeIds);
  await writeAuditLog({ action: "delete", collection: "memberStrikes", recordId: "bulk", details: { count: strikeIds.length, ids: strikeIds } });
}

// ── Member credit adjustments ─────────────────────────────────────────────────

export async function createMemberCreditAdjustment(data: Omit<MemberCreditAdjustment, "id" | "createdAt">): Promise<string | null> {
  const id = genId();
  await supabase.from("member_credit_adjustments").insert(toRow({ ...data, id, createdAt: nowISO() }));
  await writeAuditLog({ action: "create", collection: "memberCreditAdjustments", recordId: id, details: { memberId: data.memberId, points: data.points } });
  return id;
}

export async function deleteMemberCreditAdjustment(id: string): Promise<void> {
  await supabase.from("member_credit_adjustments").delete().eq("id", id);
  await writeAuditLog({ action: "delete", collection: "memberCreditAdjustments", recordId: id });
}

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
    await supabase.from("handbook_pages").update(toRow({ ...data, updatedAt: now })).eq("slug", slug);
    await writeAuditLog({ action: "update", collection: "handbookPages", recordId: existing.id, details: { slug } });
  } else {
    const id = genId();
    await supabase.from("handbook_pages").insert(toRow({ ...data, id, slug, updatedAt: now }));
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
  await supabase.from("member_acknowledgments").upsert(
    toRow({ ...data, id, acknowledgedAt: nowISO() }),
    { onConflict: "member_id,page_slug" }
  );
}
