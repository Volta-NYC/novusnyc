// Firebase Realtime Database storage for the Volta NYC members portal.
// All data is shared in real-time across all authenticated users.
//
// IMPORTANT: Firebase Realtime Database does NOT store empty arrays or null
// values. If a field like `activeServices: []` is saved, Firebase omits it
// entirely on read. Every caller that uses array fields must guard with `?? []`
// to avoid "Cannot read properties of undefined" crashes.

import { ref, push, update, remove, onValue, get, set, off } from "firebase/database";
import { getDB, getAuth } from "@/lib/firebase";
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
  teamMembers?: string[];     // may be undefined if Firebase omitted empty array
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
  showcaseServices?: string[]; // may be undefined if Firebase omitted empty array
  showcaseStatus?: "In Progress" | "Active" | "Upcoming";
  showcaseDescription?: string;
  showcaseUrl?: string;
  showcaseImageUrl?: string;
  showcaseImageData?: string;
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

export interface Task {
  id: string;
  name: string;
  // "In Progress" and "Blocked" are legacy values retained for backward compatibility.
  status: "To Do" | "On Hold" | "In Progress" | "Blocked" | "Done";
  priority: "Urgent" | "High" | "Medium" | "Low";
  assignedTo: string;
  businessId: string;
  division: "Tech" | "Marketing" | "Finance" | "Outreach";
  dueDate: string;
  week: string;
  notes: string;
  blocker: string;
  sortIndex?: number;
  createdAt: string;
  completedAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  school: string;
  grade?: string;
  acceptedDate?: string;
  divisions: string[];    // may be undefined if Firebase omitted empty array
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
  skills: string[];       // may be undefined if Firebase omitted empty array
  joinDate: string;
  notes: string;
  createdAt: string;
  // Automation bookkeeping — populated by the cycle sweep so warnings/strikes
  // are issued at most once per cycle per member.
  lastWarningCycleId?: string;
  lastAutoStrikeCycleId?: string;
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
  teamMembers: string[];  // may be undefined if Firebase omitted empty array
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

export type FinanceAssignmentType = "Report" | "Case Study" | "Grant";
export type FinanceAssignmentStatus = "Upcoming" | "Ongoing" | "Completed";

export interface FinanceAssignment {
  id: string;
  seedKey?: string;
  type: FinanceAssignmentType;
  title: string;
  topic: string;
  teamLabel: string;
  region: string;
  assignedMemberNames: string[]; // may be undefined if Firebase omitted empty array
  assignedMemberIds?: string[];  // may be undefined if Firebase omitted empty array
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

export type CycleTrack = "Tech" | "Marketing" | "Finance";
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
  // Whether each role auto-demotes on second strike. Sr Associate / Board never
  // auto-demote (handled case-by-case) and aren't represented here.
  autoDemote: Record<CycleRole, boolean>;
  // When true, cross-track work counts toward primary-track target. Defaults
  // true per spec (all members share the same target regardless of track).
  crossTrackCountsTowardTarget: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ── Infraction catalog ────────────────────────────────────────────────────────
// One row per *type* of infraction. Issued instances live separately on a
// member's record.

export type InfractionSeverity = "minor" | "major" | "severe";

export interface Infraction {
  id: string;
  name: string;
  description: string;
  points: number;                  // point penalty when issued
  severity: InfractionSeverity;
  active: boolean;                 // retired entries stay for historical record
  sortIndex: number;               // display order on the rules card
  createdAt: string;
  updatedAt: string;
}

// ── Email templates ───────────────────────────────────────────────────────────
// Admin-editable copy for every automated email. Hardcoding is intentionally
// avoided — admins control wording without a deploy.

export type EmailTemplateKey =
  | "orange_pace_warning"
  | "red_pace_strike"
  | "demotion_notice"
  | "cycle_start"
  | "cycle_end_summary"
  | "assignment_approved"
  | "assignment_rejected"
  | "infraction_notice"
  | "monthly_portal_reminder";

export interface EmailTemplate {
  id: string;
  key: EmailTemplateKey;           // stable key referenced by automation
  label: string;                   // human-readable name
  description: string;             // when this template fires
  subject: string;                 // mustache-style {{variable}} tokens supported
  body: string;                    // HTML, same token style
  // The set of variable tokens this template understands. Drives the preview
  // panel's sample-data substitution and the variable-insert helper.
  availableVariables: string[];
  active: boolean;
  updatedAt: string;
  updatedBy: string;               // uid or email of the last admin to edit
}

// ── Assignment catalog (credit-system marketplace) ────────────────────────────
// An Assignment is the *catalog entry* for work members can claim. AssignmentClaim
// records the member→assignment relationship and carries the lifecycle status.
// Together they replace the older finance-assignment model for credit purposes.

export type AssignmentDifficulty = string; // admin-configurable, free-form

export type AssignmentStatus =
  | "open"          // visible in marketplace, accepting claims
  | "claimed"       // capacity reached but work hasn't been submitted
  | "in_progress"   // mostly informational; admin can still close/duplicate
  | "submitted"     // at least one claim is awaiting approval
  | "approved"      // all claims approved (closed naturally)
  | "closed";       // admin-closed; no longer browseable

export interface Assignment {
  id: string;
  title: string;
  description: string;             // HTML (rich-text)
  primaryTrack: CycleTrack;        // for credit accounting + code prefix
  visibleTracks: CycleTrack[];     // who sees this in their marketplace; defaults to [primaryTrack]
  credits: number;
  difficulty: AssignmentDifficulty;
  estimatedHours: number;
  minRole: CycleRole;              // gate — Analyst / Sr Analyst / Associate
  businessId?: string;             // optional link to a business
  capacity: number;                // how many members can claim simultaneously
  deadline?: string;               // ISO date
  status: AssignmentStatus;
  cycleId: string;                 // cycle this assignment is scoped to
  createdAt: string;
  updatedAt: string;
  createdBy: string;               // uid or email
}

export type AssignmentClaimStatus =
  | "claimed"
  | "in_progress"
  | "submitted"
  | "approved"
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
  severity: InfractionSeverity;
  points: number;
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

// ── Auth and invite types ─────────────────────────────────────────────────────

export type AuthRole = "admin" | "interviewer" | "member";

export interface UserProfile {
  id: string;       // Firebase Auth UID, set to the snapshot key by snapToList
  email: string;
  authRole: AuthRole;
  name?: string;
  school?: string;
  grade?: string;
  active: boolean;
  createdAt: string;
}

export interface InviteCode {
  id: string;
  code: string;     // e.g. "VOLTA-AB3X7C"
  role: AuthRole;
  expiresAt: string;  // ISO date string, or "never"
  used: boolean;
  multiUse?: boolean;
  active?: boolean;
  source?: "manual" | "auto_rotation";
  signupCount?: number;
  lastUsedBy?: string;
  lastUsedAt?: string;
  usedBy?: string;    // email address of the user who redeemed it
  usedAt?: string;
  createdBy: string;  // uid of the admin who generated it
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
  id: string;             // the booking token used as the Firebase key
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

// ── INTERNAL HELPERS ──────────────────────────────────────────────────────────

// Returns the current time as an ISO string, used for createdAt / updatedAt fields.
function nowISO(): string {
  return new Date().toISOString();
}

function getAuditActor() {
  const auth = getAuth();
  const user = auth?.currentUser;
  return {
    actorUid: user?.uid ?? "unknown",
    actorEmail: user?.email ?? "unknown",
    actorName: user?.displayName ?? "",
  };
}

async function writeAuditLog(
  db: NonNullable<ReturnType<typeof getDB>>,
  entry: Omit<AuditLogEntry, "id" | "timestamp" | "actorUid" | "actorEmail" | "actorName">
): Promise<void> {
  try {
    const actor = getAuditActor();
    await push(ref(db, "auditLogs"), {
      timestamp: nowISO(),
      ...actor,
      ...entry,
    });
  } catch (err) {
    // Do not block primary writes if audit logging fails.
    console.error("Audit log write failed:", err);
  }
}

// Converts a Firebase snapshot object into a typed array.
// Firebase stores collections as plain objects keyed by push-ID; this turns
// them back into arrays and injects each item's Firebase key as its `id` field.
function snapToList<T>(snap: import("firebase/database").DataSnapshot): T[] {
  const val = snap.val();
  if (!val) return [];
  return Object.entries(val).map(([id, data]) => ({ ...(data as object), id } as T));
}

// Factory that creates a real-time subscriber function for a given database path.
// Returns a function that registers the listener and returns an unsubscribe callback.
function makeSubscriber<T>(path: string) {
  return (callback: (items: T[]) => void): (() => void) => {
    const database = getDB();
    if (!database) {
      callback([]);
      return () => {};
    }
    const dbRef = ref(database, path);
    const handler = onValue(dbRef, (snap) => callback(snapToList<T>(snap)));
    return () => off(dbRef, "value", handler);
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
    tracksSelected: readLegacyText(row, ["tracksSelected", "Tracks Selected"]),
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
  if (raw === "admin") return "admin";
  if (raw === "interviewer") return "interviewer";
  return "member";
}

// ── REAL-TIME SUBSCRIBERS ─────────────────────────────────────────────────────

export const subscribeBIDs        = makeSubscriber<BID>("bids");
export const subscribeBusinesses  = makeSubscriber<Business>("businesses");
export const subscribeTasks       = makeSubscriber<Task>("tasks");
export const subscribeTeam        = makeSubscriber<TeamMember>("team");
export const subscribeProjects    = makeSubscriber<Project>("projects");
export const subscribeFinanceAssignments = makeSubscriber<FinanceAssignment>("financeAssignments");
export const subscribeCycles      = makeSubscriber<Cycle>("cycles");
export const subscribeInfractions = makeSubscriber<Infraction>("infractions");
export const subscribeEmailTemplates = makeSubscriber<EmailTemplate>("emailTemplates");
export const subscribeAssignments = makeSubscriber<Assignment>("assignmentCatalog");
export const subscribeAssignmentClaims = makeSubscriber<AssignmentClaim>("assignmentClaims");
export const subscribeMemberStrikes = makeSubscriber<MemberStrike>("memberStrikes");
export const subscribeMemberCreditAdjustments = makeSubscriber<MemberCreditAdjustment>("memberCreditAdjustments");
export const subscribeAuditLogs   = makeSubscriber<AuditLogEntry>("auditLogs");

export function subscribeApplications(callback: (items: ApplicationRecord[]) => void): (() => void) {
  const database = getDB();
  if (!database) {
    callback([]);
    return () => {};
  }
  const dbRef = ref(database, "applications");
  const handler = onValue(dbRef, (snap) => {
    const val = snap.val() as Record<string, Record<string, unknown>> | null;
    if (!val) {
      callback([]);
      return;
    }
    const list = Object.entries(val).map(([id, row]) => normalizeApplicationRecord(id, row ?? {}));
    callback(list);
  });
  return () => off(dbRef, "value", handler);
}

// ── BIDs ──────────────────────────────────────────────────────────────────────

export async function createBID(data: Omit<BID, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = getDB();
  if (!db) return;
  const bidRef = push(ref(db, "bids"));
  await set(bidRef, { ...data, createdAt: nowISO(), updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "bids",
    recordId: bidRef.key ?? "",
    details: { fields: Object.keys(data) },
  });
}

export async function updateBID(id: string, data: Partial<BID>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `bids/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "bids",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteBID(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `bids/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "bids",
    recordId: id,
  });
}

export async function addBIDTimelineEntry(
  bidId: string,
  entry: { date: string; action: string; createdAt: string }
): Promise<void> {
  const db = getDB();
  if (!db) return;
  const tlRef = push(ref(db, `bids/${bidId}/timeline`));
  await set(tlRef, entry);
  await writeAuditLog(db, {
    action: "create",
    collection: "bids.timeline",
    recordId: `${bidId}/${tlRef.key ?? ""}`,
    details: { action: entry.action, date: entry.date },
  });
}

export async function deleteBIDTimelineEntry(bidId: string, entryId: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `bids/${bidId}/timeline/${entryId}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "bids.timeline",
    recordId: `${bidId}/${entryId}`,
  });
}

// ── Businesses ────────────────────────────────────────────────────────────────

export async function createBusiness(data: Omit<Business, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = getDB();
  if (!db) return;
  const businessRef = push(ref(db, "businesses"));
  await set(businessRef, { ...data, createdAt: nowISO(), updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "businesses",
    recordId: businessRef.key ?? "",
    details: { fields: Object.keys(data) },
  });
}

export async function updateBusiness(id: string, data: Partial<Business>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `businesses/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "businesses",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteBusiness(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `businesses/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "businesses",
    recordId: id,
  });
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export async function createTask(data: Omit<Task, "id" | "createdAt">): Promise<void> {
  const db = getDB();
  if (!db) return;
  const taskRef = push(ref(db, "tasks"));
  await set(taskRef, { ...data, createdAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "tasks",
    recordId: taskRef.key ?? "",
    details: { fields: Object.keys(data) },
  });
}

export async function updateTask(id: string, data: Partial<Task>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `tasks/${id}`), data);
  await writeAuditLog(db, {
    action: "update",
    collection: "tasks",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteTask(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `tasks/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "tasks",
    recordId: id,
  });
}

// ── Team ──────────────────────────────────────────────────────────────────────

export async function createTeamMember(data: Omit<TeamMember, "id" | "createdAt">): Promise<void> {
  const db = getDB();
  if (!db) return;
  const memberRef = push(ref(db, "team"));
  await set(memberRef, { ...data, pod: normalizeTeamPod(data.pod), createdAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "team",
    recordId: memberRef.key ?? "",
    details: { fields: Object.keys(data) },
  });
}

export async function createApplicationRecord(
  data: Omit<ApplicationRecord, "id" | "createdAt" | "updatedAt">
    & Partial<Pick<ApplicationRecord, "createdAt" | "updatedAt">>
): Promise<void> {
  const db = getDB();
  if (!db) return;
  const appRef = push(ref(db, "applications"));
  const createdAt = data.createdAt ?? nowISO();
  const updatedAt = data.updatedAt ?? createdAt;
  await set(appRef, { ...data, createdAt, updatedAt });
  await writeAuditLog(db, {
    action: "create",
    collection: "applications",
    recordId: appRef.key ?? "",
    details: { fields: Object.keys(data) },
  });
}

export async function updateApplicationRecord(
  id: string,
  data: Partial<ApplicationRecord>
): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `applications/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "applications",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function updateTeamMember(id: string, data: Partial<TeamMember>): Promise<void> {
  const db = getDB();
  if (!db) return;
  const patch: Partial<TeamMember> = { ...data };
  if (Object.prototype.hasOwnProperty.call(patch, "pod")) {
    patch.pod = normalizeTeamPod(patch.pod);
  }
  await update(ref(db, `team/${id}`), patch);
  await writeAuditLog(db, {
    action: "update",
    collection: "team",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteTeamMember(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `team/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "team",
    recordId: id,
  });
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function createProject(data: Omit<Project, "id" | "createdAt" | "updatedAt">): Promise<void> {
  const db = getDB();
  if (!db) return;
  const projectRef = push(ref(db, "projects"));
  await set(projectRef, { ...data, createdAt: nowISO(), updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "projects",
    recordId: projectRef.key ?? "",
    details: { fields: Object.keys(data) },
  });
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `projects/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "projects",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteProject(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `projects/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "projects",
    recordId: id,
  });
}

// ── Finance Assignments ──────────────────────────────────────────────────────

export async function createFinanceAssignment(
  data: Omit<FinanceAssignment, "id" | "createdAt" | "updatedAt">
): Promise<void> {
  const db = getDB();
  if (!db) return;
  const assignmentRef = push(ref(db, "financeAssignments"));
  await set(assignmentRef, { ...data, createdAt: nowISO(), updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "financeAssignments",
    recordId: assignmentRef.key ?? "",
    details: { fields: Object.keys(data) },
  });
}

export async function updateFinanceAssignment(
  id: string,
  data: Partial<FinanceAssignment>
): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `financeAssignments/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "financeAssignments",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteFinanceAssignment(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `financeAssignments/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "financeAssignments",
    recordId: id,
  });
}

// ── UserProfiles (admin only) ─────────────────────────────────────────────────

export function subscribeUserProfiles(callback: (items: UserProfile[]) => void): (() => void) {
  const database = getDB();
  if (!database) {
    callback([]);
    return () => {};
  }
  const dbRef = ref(database, "userProfiles");
  const handler = onValue(dbRef, (snap) => {
    const list = snapToList<UserProfile>(snap).map((row) => ({
      ...row,
      authRole: normalizeAuthRoleValue(row.authRole),
    }));
    callback(list);
  });
  return () => off(dbRef, "value", handler);
}

export async function updateUserProfile(uid: string, data: Partial<UserProfile>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `userProfiles/${uid}`), data);
  await writeAuditLog(db, {
    action: "update",
    collection: "userProfiles",
    recordId: uid,
    details: { fields: Object.keys(data) },
  });
}

export async function setUserProfileRecord(uid: string, data: Omit<UserProfile, "id">): Promise<void> {
  const db = getDB();
  if (!db) return;
  const profileRef = ref(db, `userProfiles/${uid}`);
  const before = await get(profileRef);
  const beforeData = before.exists() ? (before.val() as Omit<UserProfile, "id">) : null;
  const merged = beforeData ? { ...beforeData, ...data } : data;
  merged.authRole = normalizeAuthRoleValue(merged.authRole);
  await set(profileRef, merged);
  await writeAuditLog(db, {
    action: before.exists() ? "update" : "create",
    collection: "userProfiles",
    recordId: uid,
    details: { fields: Object.keys(merged) },
  });
}

export async function deleteUserProfile(uid: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `userProfiles/${uid}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "userProfiles",
    recordId: uid,
  });
}

// Deletes a portal account from both Firebase Auth and userProfiles via a
// protected admin API route. Requires current user to be signed in as admin.
export async function deletePortalUserAccount(uid: string): Promise<void> {
  const auth = getAuth();
  const currentUser = auth?.currentUser;
  if (!currentUser) throw new Error("not_authenticated");

  const token = await currentUser.getIdToken();
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
  const db = getDB();
  if (!db) return [];
  const snap = await get(ref(db, "userProfiles"));
  return snapToList<UserProfile>(snap).map((row) => ({
    ...row,
    authRole: normalizeAuthRoleValue(row.authRole),
  }));
}

export async function getTeamMembersList(): Promise<TeamMember[]> {
  const db = getDB();
  if (!db) return [];
  const snap = await get(ref(db, "team"));
  return snapToList<TeamMember>(snap);
}

export async function getAuditLogsList(): Promise<AuditLogEntry[]> {
  const db = getDB();
  if (!db) return [];
  const snap = await get(ref(db, "auditLogs"));
  return snapToList<AuditLogEntry>(snap);
}

// ── InviteCodes ───────────────────────────────────────────────────────────────

export function subscribeInviteCodes(callback: (items: InviteCode[]) => void): (() => void) {
  const database = getDB();
  if (!database) {
    callback([]);
    return () => {};
  }
  const dbRef = ref(database, "inviteCodes");
  const handler = onValue(dbRef, (snap) => {
    const list = snapToList<InviteCode>(snap).map((row) => ({
      ...row,
      role: normalizeAuthRoleValue(row.role),
    }));
    callback(list);
  });
  return () => off(dbRef, "value", handler);
}

export async function createInviteCode(data: Omit<InviteCode, "id">): Promise<void> {
  const db = getDB();
  if (!db) return;
  // Store at inviteCodes/{code} so the signup page can read a single code without
  // needing to list the entire collection (which requires admin auth).
  const normalizedData = {
    ...data,
    role: normalizeAuthRoleValue(data.role),
  };
  await set(ref(db, `inviteCodes/${data.code}`), normalizedData);
  await writeAuditLog(db, {
    action: "create",
    collection: "inviteCodes",
    recordId: data.code,
    details: {
      role: normalizedData.role,
      expiresAt: data.expiresAt,
      source: data.source ?? "manual",
      multiUse: data.multiUse !== false,
    },
  });
}

// Reads a single invite code by its code value (e.g. "VOLTA-A3BX7M").
// Safe to call while unauthenticated if the Firebase rule allows reading
// individual children of inviteCodes (see CLAUDE.md for rule snippet).
export async function getInviteCodeByValue(code: string): Promise<InviteCode | null> {
  const db = getDB();
  if (!db) return null;
  const snap = await get(ref(db, `inviteCodes/${code}`));
  if (!snap.exists()) return null;
  const row = snap.val() as InviteCode;
  return {
    ...row,
    id: code,
    role: normalizeAuthRoleValue(row.role),
  };
}

export async function updateInviteCode(id: string, data: Partial<InviteCode>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `inviteCodes/${id}`), data);
  await writeAuditLog(db, {
    action: "update",
    collection: "inviteCodes",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteInviteCode(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `inviteCodes/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "inviteCodes",
    recordId: id,
  });
}

export async function getInviteCodes(): Promise<InviteCode[]> {
  const db = getDB();
  if (!db) return [];
  const snap = await get(ref(db, "inviteCodes"));
  return snapToList<InviteCode>(snap).map((row) => ({
    ...row,
    role: normalizeAuthRoleValue(row.role),
  }));
}

// ── CalendarEvents ────────────────────────────────────────────────────────────

export const subscribeCalendarEvents = makeSubscriber<CalendarEvent>("calendarEvents");

export async function createCalendarEvent(data: Omit<CalendarEvent, "id">): Promise<void> {
  const db = getDB();
  if (!db) return;
  const eventRef = push(ref(db, "calendarEvents"));
  await set(eventRef, data);
  await writeAuditLog(db, {
    action: "create",
    collection: "calendarEvents",
    recordId: eventRef.key ?? "",
    details: { title: data.title },
  });
}

export async function updateCalendarEvent(id: string, data: Partial<CalendarEvent>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `calendarEvents/${id}`), data);
  await writeAuditLog(db, {
    action: "update",
    collection: "calendarEvents",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `calendarEvents/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "calendarEvents",
    recordId: id,
  });
}

// ── InterviewInvites ──────────────────────────────────────────────────────────
// Uses the booking token as the Firebase key (instead of a push-generated key),
// so the token IS the record's ID and is embedded in the shareable URL.

export const subscribeInterviewInvites = makeSubscriber<InterviewInvite>("interviewInvites");

export async function createInterviewInvite(token: string, data: Omit<InterviewInvite, "id">): Promise<void> {
  const db = getDB();
  if (!db) return;
  await set(ref(db, `interviewInvites/${token}`), data);
  await writeAuditLog(db, {
    action: "create",
    collection: "interviewInvites",
    recordId: token,
    details: { role: data.role, expiresAt: data.expiresAt, multiUse: !!data.multiUse },
  });
}

export async function updateInterviewInvite(token: string, data: Partial<InterviewInvite>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `interviewInvites/${token}`), data);
  await writeAuditLog(db, {
    action: "update",
    collection: "interviewInvites",
    recordId: token,
    details: { fields: Object.keys(data) },
  });
}

export async function getInterviewInvite(token: string): Promise<InterviewInvite | null> {
  const db = getDB();
  if (!db) return null;
  const snap = await get(ref(db, `interviewInvites/${token}`));
  if (!snap.exists()) return null;
  return { ...snap.val(), id: token } as InterviewInvite;
}

// ── InterviewSlots ────────────────────────────────────────────────────────────

export const subscribeInterviewSlots = makeSubscriber<InterviewSlot>("interviewSlots");

export async function createInterviewSlot(data: Omit<InterviewSlot, "id">): Promise<void> {
  const db = getDB();
  if (!db) return;
  const slotRef = push(ref(db, "interviewSlots"));
  await set(slotRef, data);
  await writeAuditLog(db, {
    action: "create",
    collection: "interviewSlots",
    recordId: slotRef.key ?? "",
    details: { datetime: data.datetime, durationMinutes: data.durationMinutes },
  });
}

export async function updateInterviewSlot(id: string, data: Partial<InterviewSlot>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `interviewSlots/${id}`), data);
  await writeAuditLog(db, {
    action: "update",
    collection: "interviewSlots",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteBookedInterview(slotId: string): Promise<void> {
  const db = getDB();
  if (!db) return;

  const slotRef = ref(db, `interviewSlots/${slotId}`);
  const snap = await get(slotRef);
  if (!snap.exists()) return;

  const slot = snap.val() as Partial<InterviewSlot>;
  await update(slotRef, {
    available: true,
    bookedBy: "",
    bookerName: "",
    bookerEmail: "",
    reminderSentAt: "",
  });

  const bookedEmail = String(slot.bookerEmail ?? "").trim().toLowerCase();
  const bookedName = String(slot.bookerName ?? "").trim().toLowerCase();
  const bookedBy = String(slot.bookedBy ?? "").trim();
  if (bookedEmail) {
    const appsSnap = await get(ref(db, "applications"));
    if (appsSnap.exists()) {
      const entries = appsSnap.val() as Record<string, Record<string, unknown>>;
      const appEntries = Object.entries(entries).map(([id, row]) => ({ id, row: row ?? {} }));
      const now = nowISO();
      const terminal = new Set(["accepted", "not accepted", "rejected"]);
      let target = appEntries.find(({ row }) => {
        const token = String(row.interviewInviteToken ?? "").trim();
        return bookedBy && bookedBy !== "public-booking" && token === bookedBy;
      });
      if (!target) {
        target = appEntries.find(({ row }) => (
          String(row.interviewSlotId ?? "").trim() === slotId
          && String(row.email ?? "").trim().toLowerCase() === bookedEmail
        ));
      }
      if (!target) {
        const candidates = appEntries
          .filter(({ row }) => String(row.email ?? "").trim().toLowerCase() === bookedEmail)
          .sort((a, b) => {
            const aTime = Date.parse(String(a.row.updatedAt ?? a.row.createdAt ?? ""));
            const bTime = Date.parse(String(b.row.updatedAt ?? b.row.createdAt ?? ""));
            return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
          });
        target = candidates.find(({ row }) => String(row.fullName ?? "").trim().toLowerCase() === bookedName) ?? candidates[0];
      }
      if (target) {
        const currentStatus = String(target.row.status ?? "").trim().toLowerCase();
        const patch: Record<string, unknown> = {
          interviewSlotId: "",
          interviewScheduledAt: "",
          updatedAt: now,
        };
        if (!target.row.statusManualOverride && !terminal.has(currentStatus)) {
          patch.status = "Invited for Interview";
        }
        await update(ref(db, `applications/${target.id}`), patch);
      }
    }
  }

  await writeAuditLog(db, {
    action: "delete",
    collection: "interviewBookings",
    recordId: slotId,
    details: {
      datetime: slot.datetime ?? "",
      previousBookedBy: slot.bookedBy ?? "",
      previousBookerName: slot.bookerName ?? "",
      previousBookerEmail: slot.bookerEmail ?? "",
    },
  });
}

export async function deleteInterviewSlot(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `interviewSlots/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "interviewSlots",
    recordId: id,
  });
}

export async function getInterviewSlots(): Promise<InterviewSlot[]> {
  const db = getDB();
  if (!db) return [];
  const snap = await get(ref(db, "interviewSlots"));
  return snapToList<InterviewSlot>(snap);
}

// ── Interview Settings ───────────────────────────────────────────────────────

export function subscribeInterviewSettings(callback: (settings: InterviewSettings | null) => void): (() => void) {
  const db = getDB();
  if (!db) {
    callback(null);
    return () => {};
  }
  const dbRef = ref(db, "interviewSettings");
  const handler = onValue(dbRef, (snap) => {
    callback(snap.exists() ? (snap.val() as InterviewSettings) : null);
  });
  return () => off(dbRef, "value", handler);
}

export async function updateInterviewSettings(data: Partial<InterviewSettings>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, "interviewSettings"), data);
  await writeAuditLog(db, {
    action: "update",
    collection: "interviewSettings",
    recordId: "singleton",
    details: { fields: Object.keys(data) },
  });
}

// ── Cycles ────────────────────────────────────────────────────────────────────

export async function createCycle(
  data: Omit<Cycle, "id" | "createdAt" | "updatedAt">,
): Promise<string | null> {
  const db = getDB();
  if (!db) return null;
  const cycleRef = push(ref(db, "cycles"));
  const id = cycleRef.key ?? "";
  await set(cycleRef, { ...data, createdAt: nowISO(), updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "cycles",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
  return id;
}

export async function updateCycle(id: string, data: Partial<Cycle>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `cycles/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "cycles",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteCycle(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `cycles/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "cycles",
    recordId: id,
  });
}

// Activates one cycle and deactivates every other one in a single multi-path
// update so the "exactly one active cycle" invariant holds atomically.
export async function activateCycleExclusive(id: string, allCycleIds: string[]): Promise<void> {
  const db = getDB();
  if (!db) return;
  const updates: Record<string, unknown> = {};
  const ts = nowISO();
  for (const cycleId of allCycleIds) {
    updates[`cycles/${cycleId}/active`] = cycleId === id;
    updates[`cycles/${cycleId}/updatedAt`] = ts;
  }
  await update(ref(db), updates);
  await writeAuditLog(db, {
    action: "update",
    collection: "cycles",
    recordId: id,
    details: { activated: true, deactivated: allCycleIds.filter((c) => c !== id) },
  });
}

// ── Infractions ───────────────────────────────────────────────────────────────

export async function createInfraction(
  data: Omit<Infraction, "id" | "createdAt" | "updatedAt">,
): Promise<void> {
  const db = getDB();
  if (!db) return;
  const infRef = push(ref(db, "infractions"));
  await set(infRef, { ...data, createdAt: nowISO(), updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "infractions",
    recordId: infRef.key ?? "",
    details: { fields: Object.keys(data) },
  });
}

export async function updateInfraction(id: string, data: Partial<Infraction>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `infractions/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "infractions",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteInfraction(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `infractions/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "infractions",
    recordId: id,
  });
}

// ── Email templates ───────────────────────────────────────────────────────────

export async function createEmailTemplate(
  data: Omit<EmailTemplate, "id" | "updatedAt">,
): Promise<void> {
  const db = getDB();
  if (!db) return;
  const tmplRef = push(ref(db, "emailTemplates"));
  await set(tmplRef, { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "emailTemplates",
    recordId: tmplRef.key ?? "",
    details: { key: data.key },
  });
}

export async function updateEmailTemplate(id: string, data: Partial<EmailTemplate>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `emailTemplates/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "emailTemplates",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `emailTemplates/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "emailTemplates",
    recordId: id,
  });
}

// ── Assignment catalog ────────────────────────────────────────────────────────

export async function createAssignment(
  data: Omit<Assignment, "id" | "createdAt" | "updatedAt">,
): Promise<string | null> {
  const db = getDB();
  if (!db) return null;
  const r = push(ref(db, "assignmentCatalog"));
  const id = r.key ?? "";
  await set(r, { ...data, createdAt: nowISO(), updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "assignmentCatalog",
    recordId: id,
    details: { title: data.title, primaryTrack: data.primaryTrack },
  });
  return id;
}

export async function updateAssignment(id: string, data: Partial<Assignment>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `assignmentCatalog/${id}`), { ...data, updatedAt: nowISO() });
  await writeAuditLog(db, {
    action: "update",
    collection: "assignmentCatalog",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `assignmentCatalog/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "assignmentCatalog",
    recordId: id,
  });
}

// ── Assignment claims ─────────────────────────────────────────────────────────

export async function createAssignmentClaim(
  data: Omit<AssignmentClaim, "id">,
): Promise<string | null> {
  const db = getDB();
  if (!db) return null;
  const r = push(ref(db, "assignmentClaims"));
  const id = r.key ?? "";
  await set(r, data);
  await writeAuditLog(db, {
    action: "create",
    collection: "assignmentClaims",
    recordId: id,
    details: { assignmentId: data.assignmentId, memberId: data.memberId },
  });
  return id;
}

export async function updateAssignmentClaim(id: string, data: Partial<AssignmentClaim>): Promise<void> {
  const db = getDB();
  if (!db) return;
  await update(ref(db, `assignmentClaims/${id}`), data);
  await writeAuditLog(db, {
    action: "update",
    collection: "assignmentClaims",
    recordId: id,
    details: { fields: Object.keys(data) },
  });
}

export async function deleteAssignmentClaim(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `assignmentClaims/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "assignmentClaims",
    recordId: id,
  });
}

// ── Member strikes ────────────────────────────────────────────────────────────

export async function createMemberStrike(
  data: Omit<MemberStrike, "id" | "issuedAt">,
): Promise<string | null> {
  const db = getDB();
  if (!db) return null;
  const r = push(ref(db, "memberStrikes"));
  const id = r.key ?? "";
  await set(r, { ...data, issuedAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "memberStrikes",
    recordId: id,
    details: {
      memberId: data.memberId,
      infractionId: data.infractionId,
      points: data.points,
      source: data.source,
    },
  });
  return id;
}

export async function deleteMemberStrike(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `memberStrikes/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "memberStrikes",
    recordId: id,
  });
}

// Admin-only "clear strikes" — wipes every strike for a member in a cycle.
export async function clearMemberStrikes(
  strikeIds: string[],
): Promise<void> {
  const db = getDB();
  if (!db) return;
  if (strikeIds.length === 0) return;
  const updates: Record<string, unknown> = {};
  for (const sid of strikeIds) {
    updates[`memberStrikes/${sid}`] = null;
  }
  await update(ref(db), updates);
  await writeAuditLog(db, {
    action: "delete",
    collection: "memberStrikes",
    recordId: "bulk",
    details: { count: strikeIds.length, ids: strikeIds },
  });
}

// ── Member credit adjustments ─────────────────────────────────────────────────

export async function createMemberCreditAdjustment(
  data: Omit<MemberCreditAdjustment, "id" | "createdAt">,
): Promise<string | null> {
  const db = getDB();
  if (!db) return null;
  const r = push(ref(db, "memberCreditAdjustments"));
  const id = r.key ?? "";
  await set(r, { ...data, createdAt: nowISO() });
  await writeAuditLog(db, {
    action: "create",
    collection: "memberCreditAdjustments",
    recordId: id,
    details: { memberId: data.memberId, points: data.points },
  });
  return id;
}

export async function deleteMemberCreditAdjustment(id: string): Promise<void> {
  const db = getDB();
  if (!db) return;
  await remove(ref(db, `memberCreditAdjustments/${id}`));
  await writeAuditLog(db, {
    action: "delete",
    collection: "memberCreditAdjustments",
    recordId: id,
  });
}
