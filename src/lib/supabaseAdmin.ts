// Server-side only — never import in client components.
// Replaces getAdminDB() / dbRead / dbPatch / dbPush / dbDelete from firebaseAdmin.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin env vars missing");
  _client = createClient(url, key, { auth: { persistSession: false } });
  return _client;
}

// ---------------------------------------------------------------------------
// Path → table + id helpers
// Converts Firebase-style path strings ("applications/abc123") to
// {table, id} so callers don't need to know the Supabase table names.
// ---------------------------------------------------------------------------
type Parsed = { table: string; id?: string; field?: string };

const PATH_TABLE: Record<string, string> = {
  applications:             "applications",
  team:                     "team",
  businesses:               "businesses",
  bids:                     "bids",
  projects:                 "projects",
  financeAssignments:       "finance_assignments",
  assignmentCatalog:        "assignment_catalog",
  assignmentClaims:         "assignment_claims",
  memberStrikes:            "member_strikes",
  memberCreditAdjustments:  "member_credit_adjustments",
  cycles:                   "cycles",
  infractions:              "infractions",
  emailTemplates:           "email_templates",
  userProfiles:             "user_profiles",
  auditLogs:                "audit_logs",
  inviteCodes:              "invite_codes",
  calendarEvents:           "calendar_events",
  interviewInvites:         "interview_invites",
  interviewSlots:           "interview_slots",
  interviewSettings:        "interview_settings",
  inquiries:                "inquiries",
};

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

function parsePath(path: string): Parsed {
  const parts = path.replace(/^\/+|\/+$/, "").split("/");
  const collection = parts[0];
  const table = PATH_TABLE[collection] ?? camelToSnake(collection);
  if (parts.length === 1) return { table };
  if (parts.length === 2) return { table, id: parts[1] };
  // e.g. userProfiles/{uid}/authRole — treat as single-row field read
  return { table, id: parts[1], field: parts[2] };
}

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function rowToCamel(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([k, v]) => [snakeToCamel(k), v]));
}

function objToSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[camelToSnake(k)] = v === "" ? null : v;
  }
  return out;
}

// ---------------------------------------------------------------------------
// dbRead — reads a whole collection or one row by legacy path.
// ---------------------------------------------------------------------------
export async function dbRead(path: string): Promise<unknown> {
  const sb = getSupabaseAdmin();
  const { table, id, field } = parsePath(path);

  if (!id) {
    // Read entire collection
    const { data } = await sb.from(table).select("*");
    if (!data?.length) return null;
    const obj: Record<string, unknown> = {};
    for (const row of data) {
      const r = row as Record<string, unknown>;
      const key = String(r.id ?? r.bucket + "/" + r.key);
      obj[key] = rowToCamel(r);
    }
    return obj;
  }

  const { data } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  if (!data) return null;

  const camel = rowToCamel(data as Record<string, unknown>);
  if (field) {
    const camelField = snakeToCamel(camelToSnake(field));
    return camel[camelField] ?? camel[field] ?? null;
  }
  return camel;
}

// ---------------------------------------------------------------------------
// dbPatch — shallow patch using legacy path syntax.
// Shallow patch: writes only the supplied fields.
// ---------------------------------------------------------------------------
export async function dbPatch(path: string, data: Record<string, unknown>): Promise<void> {
  const sb = getSupabaseAdmin();
  const { table, id, field } = parsePath(path);
  const snake = objToSnake(data);

  if (id && field) {
    // Patching a single nested field (e.g. userProfiles/{uid}/authRole → handled as a column update)
    const colName = camelToSnake(field);
    await sb.from(table).update({ [colName]: data[field] ?? data[Object.keys(data)[0]] }).eq("id", id);
    return;
  }

  if (id) {
    await sb.from(table).update(snake).eq("id", id);
    return;
  }

  // No id — multi-record patch via object of id→patch (Firebase multi-path update style)
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "object" && value !== null) {
      await sb.from(table).update(objToSnake(value as Record<string, unknown>)).eq("id", key);
    }
  }
}

// ---------------------------------------------------------------------------
// dbPush — insert a new row (generates UUID for id)
// ---------------------------------------------------------------------------
export async function dbPush(path: string, data: Record<string, unknown>): Promise<string> {
  const sb = getSupabaseAdmin();
  const { table } = parsePath(path);
  const id = crypto.randomUUID();
  const snake = objToSnake(data);
  await sb.from(table).insert({ ...snake, id });
  return id;
}

// ---------------------------------------------------------------------------
// dbDelete — deletes one row by legacy path.
// ---------------------------------------------------------------------------
export async function dbDelete(path: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { table, id } = parsePath(path);
  if (id) {
    await sb.from(table).delete().eq("id", id);
  }
}

// ---------------------------------------------------------------------------
// writeAuditLog — server-side audit logging
// ---------------------------------------------------------------------------
export async function writeAuditLog(entry: {
  action: string;
  collection: string;
  recordId?: string;
  actorUid?: string;
  actorEmail?: string;
  actorName?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    const sb = getSupabaseAdmin();
    await sb.from("audit_logs").insert({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: entry.action,
      collection: entry.collection,
      record_id: entry.recordId ?? null,
      actor_uid: entry.actorUid ?? "server",
      actor_email: entry.actorEmail ?? "server",
      actor_name: entry.actorName ?? null,
      details: entry.details ?? null,
    });
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
