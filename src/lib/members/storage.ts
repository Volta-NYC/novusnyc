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
  // Public logo managed in Supabase Storage. The local data catalog is only a
  // fallback for legacy partner records that have not been migrated yet.
  logoPath?: string;
  logoUrl?: string;
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
  lastTouchedAt?: string;
  activeServices?: string[];   // services shown on the public project card
  projectStatus:
    | "Ongoing"
    | "Upcoming"
    | "Completed"
    | "Not Started"
    | "Discovery"
    | "Active"
    | "On Hold"
    | "Complete";
  languages?: string[];        // legacy field
  firstContactDate: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  // Project-level fields (merged from Projects tab)
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
  showcaseType?: string;
  showcaseDescription?: string;
  showcaseImageUrl?: string;
  showcaseSortIndex?: number;
  homeSortIndex?: number;
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
      deadlines?: Array<{
      label?: string;
      date?: string;
    }>;
    notes?: string;
  }>>;
}

// notes lives in member_notes now — owner/admin only. It was readable by every
// member here.
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
  createdAt: string;
  authUid?: string;
  canInterview?: boolean;
}

export type ApplicationStatus =
  | "New"
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
  | "applicant_accepted"
  | "interview_confirmation"
  | "interview_rescheduled"
  | "interviewer_booking_notify"
  | "interviewer_reschedule_notify"
  | "pod_meeting_reminder"
  | "pod_attendance_missing"
  | "pod_task_assigned"
  | "pod_task_due_soon"
  | "project_assigned"
  | "project_draft_ready"
  | "infraction_issued"
  | "service_hours_summary"
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
  automationId: string;   // stable slug PK, e.g. "pod_meeting_reminder"
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

// ── Member infractions ────────────────────────────────────────────────────────
// Strikes are point-bearing infractions issued against a member. The live
// threshold settings determine notice, warning and review standing.

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
// Admin-editable policy pages shown to members.
// Members must acknowledge each page on first login.

export interface HandbookPage {
  id: string;
  slug: string;
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

// ── Interview scheduling types ────────────────────────────────────────────────

export type InterviewRecordStatus = "scheduled" | "completed" | "no_show" | "cancelled";

export interface InterviewRecord {
  id: string;
  applicantId?: string;
  applicantName: string;
  applicantEmail: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingLink: string;
  interviewerMemberIds: string[];
  status: InterviewRecordStatus;
  notes: string;
  confirmationSentAt?: string;
  reminderSentAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
    const { error } = await supabase.from("audit_logs").insert({
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
    if (error) throw new Error(error.message);
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
// A failed query used to be delivered as an empty array, so an outage rendered
// as "0 projects" or "no members" — a wrong answer stated confidently. The
// second callback argument carries load state; callers that ignore it behave
// exactly as before, and the rows already on screen are kept rather than blanked.
export type LoadState = { error: string | null };

export type SubscribeCallback<T> = (items: T[], state: LoadState) => void;

const OK: LoadState = { error: null };

function makeSubscriber<T extends { id: string }>(
  table: string,
  transform?: (row: Record<string, unknown>) => T,
  options?: { excludeSoftDeleted?: boolean },
) {
  return (callback: SubscribeCallback<T>): (() => void) => {
    let current: T[] = [];
    const applyRow = (row: Record<string, unknown>): T =>
      transform ? transform(row) : fromRow<T>(row);

    const fetchAll = () => {
      let query = supabase.from(table).select("*");
      if (options?.excludeSoftDeleted) query = query.is("deleted_at", null);
      return query.then(({ data, error }) => {
        if (error) { callback(current, { error: error.message }); return; }
        current = ((data ?? []) as Record<string, unknown>[]).map(applyRow);
        callback(current, OK);
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
        callback(current, OK);
      })
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  };
}

// ── SPECIALISED ROW CONVERTERS ────────────────────────────────────────────────

function interviewRecordFromRow(row: Record<string, unknown>): InterviewRecord {
  return {
    id: String(row.id ?? ""),
    applicantId: typeof row.applicant_id === "string" ? row.applicant_id : undefined,
    applicantName: String(row.applicant_name ?? ""),
    applicantEmail: String(row.applicant_email ?? ""),
    scheduledAt: String(row.scheduled_at ?? ""),
    durationMinutes: Number(row.duration_minutes ?? 30),
    meetingLink: String(row.meeting_link ?? ""),
    interviewerMemberIds: Array.isArray(row.interviewer_member_ids)
      ? row.interviewer_member_ids.map(String)
      : [],
    status: String(row.status ?? "scheduled") as InterviewRecordStatus,
    notes: String(row.notes ?? ""),
    confirmationSentAt: typeof row.confirmation_sent_at === "string" ? row.confirmation_sent_at : undefined,
    reminderSentAt: typeof row.reminder_sent_at === "string" ? row.reminder_sent_at : undefined,
    createdBy: String(row.created_by ?? ""),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? ""),
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

function normalizeApplicationStatus(raw: string): ApplicationStatus {
  const key = raw.trim().toLowerCase();
  if (key === "accepted") return "Accepted";
  if (key === "interview completed") return "Interview Completed";
  if (key === "interview scheduled") return "Interview Scheduled";
  if (key === "not accepted" || key === "rejected") return "Not Accepted";
  return "New";
}

function normalizeApplicationRecord(id: string, row: Record<string, unknown>): ApplicationRecord {
  const createdAt = normalizeTimestamp(row.createdAt ?? row.Timestamp);
  const updatedAt = normalizeTimestamp(row.updatedAt, createdAt);
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
    status: normalizeApplicationStatus(readLegacyText(row, ["status"])),
    notes: readLegacyText(row, ["notes", "Notes"]),
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

export const subscribeMemberStrikes =
  makeSubscriber<MemberStrike>("member_strikes", (r) => fromRow<MemberStrike>(r));

export const subscribeAuditLogs =
  makeSubscriber<AuditLogEntry>("audit_logs", (r) => fromRow<AuditLogEntry>(r));

export function subscribeApplications(callback: SubscribeCallback<ApplicationRecord>): (() => void) {
  const fetchAll = () =>
    supabase.from("applications").select("*").then(({ data, error }) => {
      if (error) { callback([], { error: error.message }); return; }
      callback(((data ?? []) as Record<string, unknown>[])
        .map((r) => normalizeApplicationRecord(String(r.id), fromRow<Record<string, unknown>>(r))), OK);
    });

  void fetchAll();

  const channel = supabase
    .channel(`realtime-applications-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => void fetchAll())
    .subscribe();

  return () => { void supabase.removeChannel(channel); };
}

// ── BIDs ──────────────────────────────────────────────────────────────────────

export async function createBID(data: Omit<BID, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const id = genId();
  const now = nowISO();
  const row = toRow({ ...data, id, createdAt: now, updatedAt: now });
  const { error: insertError } = await supabase.from("bids").insert(row);
  if (insertError) throw new Error(insertError.message);
  await writeAuditLog({ action: "create", collection: "bids", recordId: id, details: { fields: Object.keys(data) } });
  return id;
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
  const { data: row, error: timelineReadError } = await supabase.from("bids").select("timeline").eq("id", bidId).single();
  if (timelineReadError) throw new Error(timelineReadError.message);
  const timeline = ((row as Record<string, unknown> | null)?.timeline ?? {}) as Record<string, unknown>;
  const entryId = genId();
  timeline[entryId] = entry;
  const { error: timelineAddError } = await supabase.from("bids").update({ timeline }).eq("id", bidId);
  if (timelineAddError) throw new Error(timelineAddError.message);
  await writeAuditLog({ action: "create", collection: "bids.timeline", recordId: `${bidId}/${entryId}`, details: { action: entry.action, date: entry.date } });
}

export async function deleteBIDTimelineEntry(bidId: string, entryId: string): Promise<void> {
  const { data: row, error: timelineReadError } = await supabase.from("bids").select("timeline").eq("id", bidId).single();
  if (timelineReadError) throw new Error(timelineReadError.message);
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
        if (!token) throw new Error("Your session expired. Sign in again before uploading a card photo.");
        const res = await fetch("/api/members/upload-business-image", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ businessId: id, dataUrl: showcaseImageData }),
        });
        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail || "The card photo could not be uploaded.");
        }
        const { path, url } = await res.json() as { path: string; url: string };
        (rest as Partial<Business> & Record<string, unknown>).showcaseImagePath = path;
        (rest as Partial<Business>).showcaseImageUrl = url;
        (rest as Partial<Business>).showcaseImageSet = true;
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : "The card photo could not be uploaded.");
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

export async function revalidatePublicPages(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;
    const response = await fetch("/api/members/admin/revalidate", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
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
  const { data, error } = await supabase.from("applications").select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  const row = (data ?? [])[0] as Record<string, unknown> | undefined;
  return row ? fromRow<ApplicationRecord>(row) : null;
}

export async function fetchDeletedTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase.from("team").select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
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

export function subscribeUserProfiles(callback: SubscribeCallback<UserProfile>): (() => void) {
  const fetchAll = () =>
    supabase.from("user_profiles").select("*").then(({ data, error }) => {
      if (error) { callback([], { error: error.message }); return; }
      callback(((data ?? []) as Record<string, unknown>[]).map((r) => ({
        ...fromRow<UserProfile>(r),
        authRole: normalizeAuthRoleValue((r.auth_role)),
      })), OK);
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
  const { data: existing, error: existingError } = await supabase.from("user_profiles").select("*").eq("id", uid).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  const before = existing ? fromRow<Omit<UserProfile, "id">>(existing as Record<string, unknown>) : null;
  const merged = before ? { ...before, ...data } : data;
  merged.authRole = normalizeAuthRoleValue(merged.authRole);
  const { error: profileUpsertError } = await supabase.from("user_profiles").upsert(toRow({ ...merged, id: uid }), { onConflict: "id" });
  if (profileUpsertError) throw new Error(profileUpsertError.message);
  await writeAuditLog({ action: before ? "update" : "create", collection: "userProfiles", recordId: uid, details: { fields: Object.keys(merged) } });
}

export async function getUserProfilesList(): Promise<UserProfile[]> {
  const { data, error } = await supabase.from("user_profiles").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...fromRow<UserProfile>(r as Record<string, unknown>),
    authRole: normalizeAuthRoleValue((r as Record<string, unknown>).auth_role),
  }));
}

export async function getTeamMembersList(): Promise<TeamMember[]> {
  const { data, error } = await supabase.from("team").select("*").is("deleted_at", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow<TeamMember>(r as Record<string, unknown>));
}

export async function getAuditLogsList(limit = 200): Promise<AuditLogEntry[]> {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow<AuditLogEntry>(r as Record<string, unknown>));
}

// Returns the public showcase image URL for a business, or null if none set.
export async function getBusinessImage(id: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("showcase_image_url")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Record<string, unknown> | null)?.showcase_image_url as string | null ?? null;
}

// ── ONE-SHOT GET VARIANTS ─────────────────────────────────────────────────────

export async function getBusinessesList(): Promise<Business[]> {
  const { data, error } = await supabase.from("businesses").select("*").is("deleted_at", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow<Business>(r as Record<string, unknown>));
}

export async function getBIDsList(): Promise<BID[]> {
  const { data, error } = await supabase.from("bids").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow<BID>(r as Record<string, unknown>));
}

export async function getProjectsList(): Promise<Project[]> {
  const { data, error } = await supabase.from("projects").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow<Project>(r as Record<string, unknown>));
}

export async function getInfractionsList(): Promise<Infraction[]> {
  const { data, error } = await supabase.from("infractions").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow<Infraction>(r as Record<string, unknown>));
}

// Get distinct school names from applications for autocomplete
export async function getApplicationSchoolNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from("applications")
    .select("school_name")
    .not("school_name", "is", "");
  if (error) throw new Error(error.message);

  if (!data?.length) return [];

  // Extract distinct school names
  const schoolNames = [...new Set(
    data
      .map((r: { school_name?: string | null }) => r.school_name?.trim())
      .filter((name): name is string => name !== null && name !== undefined && name !== "")
  )];

  return schoolNames.sort();
}

// Get distinct school names from team directory for autocomplete
export async function getTeamSchoolNames(): Promise<string[]> {
  const { data, error } = await supabase
    .from("team")
    .select("school")
    .not("school", "is", null)
    .neq("school", "");
  if (error) throw new Error(error.message);

  if (!data?.length) return [];

  return [...new Set(
    data
      .map((r: { school?: string | null }) => r.school?.trim())
      .filter((name): name is string => Boolean(name))
  )].sort();
}

export async function getEmailTemplatesList(): Promise<EmailTemplate[]> {
  const { data, error } = await supabase.from("email_templates").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({
    ...fromRow<EmailTemplate>(r as Record<string, unknown>),
    availableVariables: ((r as Record<string, unknown>).available_variables as string[]) ?? [],
  }));
}

// getAssignmentsList is defined above in the unified assignments section.

export async function getMemberStrikesList(): Promise<MemberStrike[]> {
  const { data, error } = await supabase.from("member_strikes").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow<MemberStrike>(r as Record<string, unknown>));
}

export async function getApplicationsList(): Promise<ApplicationRecord[]> {
  const { data, error } = await supabase.from("applications").select("*");
  if (error) throw new Error(error.message);
  if (!data?.length) return [];
  return (data as Record<string, unknown>[]).map((r) => normalizeApplicationRecord(String(r.id), fromRow<Record<string, unknown>>(r)));
}

// ── Direct interview records (August 2026 cutover) ──────────────────────────

export const subscribeInterviews =
  makeSubscriber<InterviewRecord>("interviews", interviewRecordFromRow);

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
  const { data, error } = await supabase.from("site_settings").select("*").eq("id", "singleton").maybeSingle();
  if (error) throw new Error(error.message);
  return data ? siteSettingsFromRow(data as Record<string, unknown>) : DEFAULT_SITE_SETTINGS;
}

export async function updateSiteSettings(patch: Partial<SiteSettings>): Promise<void> {
  const row: Record<string, unknown> = { updated_at: nowISO() };
  if (patch.applicationsPaused    !== undefined) row.applications_paused     = patch.applicationsPaused;
  if (patch.applicationsPausedMsg !== undefined) row.applications_paused_msg = patch.applicationsPausedMsg;
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
  const { error } = await supabase.from("infractions").insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "infractions", recordId: id, details: { fields: Object.keys(data) } });
}

export async function updateInfraction(id: string, data: Partial<Infraction>): Promise<void> {
  const { data: updated, error } = await supabase.from("infractions").update(toRow({ ...data, updatedAt: nowISO() })).eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!updated) throw new Error("The infraction type was not updated.");
  await writeAuditLog({ action: "update", collection: "infractions", recordId: id, details: { fields: Object.keys(data) } });
}

export async function deleteInfraction(id: string): Promise<void> {
  const { data: deleted, error } = await supabase.from("infractions").delete().eq("id", id).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!deleted) throw new Error("The infraction type was not deleted.");
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

// ── Member strikes ────────────────────────────────────────────────────────────

export async function createMemberStrike(data: Omit<MemberStrike, "id" | "issuedAt">): Promise<string | null> {
  const id = genId();
  const { error: strikeInsertError } = await supabase.from("member_strikes").insert(toRow({ ...data, id, issuedAt: nowISO() }));
  if (strikeInsertError) throw new Error(strikeInsertError.message);
  await writeAuditLog({ action: "create", collection: "memberStrikes", recordId: id, details: { memberId: data.memberId, infractionId: data.infractionId, points: data.points, source: data.source } });

  // Tell them, with their running total — a points tally nobody sees can't
  // change anyone's behaviour. The total and standing are computed server-side.
  await notify("infraction_issued", { strikeId: id });
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

// ── Handbook pages ────────────────────────────────────────────────────────────

export const subscribeHandbookPages =
  makeSubscriber<HandbookPage>("handbook_pages", (r) => fromRow<HandbookPage>(r));

export async function getHandbookPagesList(): Promise<HandbookPage[]> {
  const { data, error } = await supabase.from("handbook_pages").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => fromRow<HandbookPage>(r as Record<string, unknown>));
}

export async function getHandbookPage(slug: string): Promise<HandbookPage | null> {
  const { data, error } = await supabase.from("handbook_pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(error.message);
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
  const { data: chapterId, error } = await supabase.rpc("create_chapter_with_pods", {
    p_name: name.trim(), p_slug: slug, p_city: city.trim(), p_state: state.trim().toUpperCase(),
  });
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "chapters", recordId: String(chapterId), details: { name } });
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
  startsAt?: string | null;
  endsAt?: string | null;
  meetingUrl: string;
  createdBy?: string;
  createdAt?: string;
  attendanceFinalizedAt?: string | null;
  attendanceFinalizedBy?: string | null;
}

export const ATTENDANCE_STATUSES = ["Present", "Late", "Excused", "Unexcused"] as const;
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
  const { data: meetingRows, error: meetingsError } = await supabase.from("pod_meetings").select("id").eq("pod_id", podId);
  if (meetingsError) throw new Error(meetingsError.message);
  const meetingIds = ((meetingRows ?? []) as { id: string }[]).map((m) => m.id);

  let hasHistory = false;
  if (meetingIds.length) {
    const { count, error: attendanceError } = await supabase.from("pod_attendance")
      .select("id", { count: "exact", head: true })
      .eq("member_id", memberId).in("meeting_id", meetingIds);
    if (attendanceError) throw new Error(attendanceError.message);
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
  meeting: Pick<PodMeeting, "meetsOn" | "title" | "hours"> &
    Partial<Pick<PodMeeting, "notes" | "startsAt" | "endsAt" | "meetingUrl">>,
): Promise<string> {
  const id = genId();
  const { error } = await supabase.from("pod_meetings")
    .insert(toRow({
      id, podId, ...meeting, notes: meeting.notes ?? "",
      meetingUrl: meeting.meetingUrl ?? "", createdAt: nowISO(),
    }));
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "pod_meetings", recordId: id, details: { podId, meetsOn: meeting.meetsOn } });
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
  const { data, error } = await supabase.from("pod_attendance").select("*").eq("meeting_id", meetingId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<PodAttendance>(r));
}

export async function fetchAttendanceForMeetings(meetingIds: string[]): Promise<PodAttendance[]> {
  if (meetingIds.length === 0) return [];
  const { data, error } = await supabase.from("pod_attendance").select("*").in("meeting_id", meetingIds);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<PodAttendance>(r));
}

// The whole grid saves in one call — a LIT fills a column and presses save once.
export async function saveAttendance(
  meetingId: string,
  cells: { memberId: string; status: AttendanceStatus; tasksDone: number; hours?: number | null; note?: string }[],
  meeting: { title: string; hours: number },
): Promise<void> {
  const { error } = await supabase.rpc("save_pod_attendance", {
    p_meeting_id: meetingId,
    p_cells: cells.map((cell) => ({
      member_id: cell.memberId,
      status: cell.status,
      tasks_done: cell.tasksDone,
      hours: cell.hours ?? null,
      note: cell.note ?? "",
    })),
    p_title: meeting.title,
    p_hours: meeting.hours,
  });
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
  const { data, error } = await supabase.from("member_contributions").select("*");
  if (error) throw new Error(error.message);
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
  const { data, error } = await supabase.from("member_hours_totals").select("*");
  if (error) throw new Error(error.message);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => fromRow<HoursTotals>(r));
}

export async function fetchMemberHours(memberId: string, from?: string, to?: string): Promise<HoursEntry[]> {
  let q = supabase.from("member_hours_ledger").select("*").eq("member_id", memberId);
  if (from) q = q.gte("occurred_on", from);
  if (to)   q = q.lte("occurred_on", to);
  const { data, error } = await q.order("occurred_on", { ascending: false });
  if (error) throw new Error(error.message);
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
// Names the record the notification is about. The server resolves addresses
// and message content from persisted data; a client-provided member subset is
// always intersected with the people saved on that record.
async function notify(
  automationId: string,
  subject: Record<string, unknown>,
): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    await fetch("/api/members/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ automationId, subject }),
    });
  } catch {
    // no-op
  }
}

// ── Tech project notifications ───────────────────────────────────────────────

export async function notifyProjectAssigned(
  business: Business, newAssigneeIds: string[],
): Promise<void> {
  if (newAssigneeIds.length === 0) return;
  await notify("project_assigned", {
    businessId: business.id,
    addedAssigneeIds: newAssigneeIds,
  });
}

export async function notifyDraftReady(business: Business): Promise<void> {
  // Goes to whoever can act on it: the leads, not the whole directory.
  await notify("project_draft_ready", { businessId: business.id });
}

// ── Pod assignments ──────────────────────────────────────────────────────────
// The assignments table survives the marketplace, scoped to a pod and pushed to
// named people instead of posted to a catalog for anyone to claim.

export interface PodAssignment {
  id: string;
  podId: string;
  title: string;
  description: string;
  status: "Open" | "In Progress" | "In Review" | "Done";
  assignedMemberIds: string[];
  assignedMemberNames: string[];
  dueDate?: string | null;
  hours?: number | null;
  deliverableUrl?: string | null;
  reviewRequestedAt?: string | null;
  completedAt?: string | null;
  completedBy?: string | null;
  createdAt?: string;
}

export function subscribePodAssignments(callback: SubscribeCallback<PodAssignment>): () => void {
  return makeSubscriber<PodAssignment>("assignments")((rows, state) =>
    callback(rows.filter((r) => !!r.podId), state));
}

export async function createPodAssignment(
  data: Omit<PodAssignment, "id" | "createdAt" | "completedAt" | "completedBy">,
): Promise<void> {
  const id = genId();
  const { error } = await supabase.from("assignments")
    .insert(toRow({ ...data, id, type: "Task", track: "Marketing", createdAt: nowISO(), updatedAt: nowISO() }));
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "assignments", recordId: id, details: { podId: data.podId, title: data.title } });

  await notify("pod_task_assigned", { assignmentId: id });
}

export async function updatePodAssignment(id: string, patch: Partial<PodAssignment>): Promise<void> {
  const { error } = await supabase.from("assignments")
    .update(toRow({ ...patch, updatedAt: nowISO() })).eq("id", id);
  if (error) throw new Error(error.message);
  if (patch.assignedMemberIds) await notify("pod_task_assigned", { assignmentId: id });
}

export async function completePodAssignment(id: string, done: boolean): Promise<void> {
  const { error } = await supabase.rpc("set_assignment_completion", {
    p_assignment_id: id,
    p_done: done,
  });
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "assignments", recordId: id, details: { completed: done } });
}

export async function setPodAssignmentStatus(
  id: string,
  status: PodAssignment["status"],
): Promise<void> {
  const { error } = await supabase.rpc("set_assignment_workflow_status", {
    p_assignment_id: id,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "assignments", recordId: id, details: { status } });
}

export async function deletePodAssignment(id: string): Promise<void> {
  const { error } = await supabase.from("assignments").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "delete", collection: "assignments", recordId: id });
}

export const GRANT_STATUSES = ["Researching", "Ready to Share", "Shared", "Closed"] as const;
export type GrantStatus = (typeof GRANT_STATUSES)[number];

export interface GrantOpportunity {
  id: string;
  podId: string;
  name: string;
  funder: string;
  url: string;
  deadline?: string | null;
  amount: string;
  geography: string;
  eligibility: string;
  focusAreas: string[];
  status: GrantStatus;
  notes: string;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export const subscribeGrantOpportunities = makeSubscriber<GrantOpportunity>("grant_opportunities");

export async function createGrantOpportunity(
  data: Omit<GrantOpportunity, "id" | "createdAt" | "updatedAt" | "deletedAt">,
): Promise<void> {
  const id = genId();
  const now = nowISO();
  const { error } = await supabase.from("grant_opportunities")
    .insert(toRow({ ...data, id, createdAt: now, updatedAt: now }));
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "create", collection: "grant_opportunities", recordId: id, details: { podId: data.podId } });
}

export async function updateGrantOpportunity(
  id: string,
  patch: Partial<GrantOpportunity>,
): Promise<void> {
  const { error } = await supabase.from("grant_opportunities")
    .update(toRow({ ...patch, updatedAt: nowISO() })).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "update", collection: "grant_opportunities", recordId: id, details: { fields: Object.keys(patch) } });
}

export async function deleteGrantOpportunity(id: string): Promise<void> {
  const { error } = await supabase.from("grant_opportunities")
    .update({ deleted_at: nowISO(), updated_at: nowISO() }).eq("id", id);
  if (error) throw new Error(error.message);
  await writeAuditLog({ action: "delete", collection: "grant_opportunities", recordId: id });
}
