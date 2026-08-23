import "server-only";
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
// ---------------------------------------------------------------------------
type Parsed = { table: string; id?: string; field?: string };

const PATH_TABLE: Record<string, string> = {
  applications:             "applications",
  team:                     "team",
  businesses:               "businesses",
  bids:                     "bids",
  projects:                 "projects",
  memberStrikes:            "member_strikes",
  infractions:              "infractions",
  emailTemplates:           "email_templates",
  userProfiles:             "user_profiles",
  auditLogs:                "audit_logs",
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
// dbRead — reads a whole collection or one row by path.
// ---------------------------------------------------------------------------
export async function dbRead(path: string): Promise<unknown> {
  const sb = getSupabaseAdmin();
  const { table, id, field } = parsePath(path);

  if (!id) {
    // Read entire collection
    const { data, error } = await sb.from(table).select("*");
    if (error) throw new Error(`dbRead ${table}: ${error.message}`);
    if (!data?.length) return null;
    const obj: Record<string, unknown> = {};
    for (const row of data) {
      const r = row as Record<string, unknown>;
      const key = String(r.id ?? r.bucket + "/" + r.key);
      obj[key] = rowToCamel(r);
    }
    return obj;
  }

  const { data, error } = await sb.from(table).select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`dbRead ${table}/${id}: ${error.message}`);
  if (!data) return null;

  const camel = rowToCamel(data as Record<string, unknown>);
  if (field) {
    const camelField = snakeToCamel(camelToSnake(field));
    return camel[camelField] ?? camel[field] ?? null;
  }
  return camel;
}

// ---------------------------------------------------------------------------
// dbPatch — shallow patch. Writes only the supplied fields.
// ---------------------------------------------------------------------------
export async function dbPatch(path: string, data: Record<string, unknown>): Promise<void> {
  const sb = getSupabaseAdmin();
  const { table, id, field } = parsePath(path);
  const snake = objToSnake(data);

  if (id && field) {
    // Patching a single nested field (e.g. userProfiles/{uid}/authRole → handled as a column update)
    const colName = camelToSnake(field);
    const { error } = await sb.from(table).update({ [colName]: data[field] ?? data[Object.keys(data)[0]] }).eq("id", id);
    if (error) throw new Error(`dbPatch ${table}/${id}.${field}: ${error.message}`);
    return;
  }

  if (id) {
    const { error } = await sb.from(table).update(snake).eq("id", id);
    if (error) throw new Error(`dbPatch ${table}/${id}: ${error.message}`);
    return;
  }

  // No id — multi-record patch via object of id→patch (Firebase multi-path update style)
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "object" && value !== null) {
      const { error } = await sb.from(table).update(objToSnake(value as Record<string, unknown>)).eq("id", key);
      if (error) throw new Error(`dbPatch ${table}/${key}: ${error.message}`);
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
  // Returning an id for a row that was never written let callers report success
  // on a failed insert — an accepted applicant with no member record.
  const { error } = await sb.from(table).insert({ ...snake, id });
  if (error) throw new Error(`dbPush ${table}: ${error.message}`);
  return id;
}

// ---------------------------------------------------------------------------
// dbDelete — deletes one row by path.
// ---------------------------------------------------------------------------
export async function dbDelete(path: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { table, id } = parsePath(path);
  if (id) {
    const { error } = await sb.from(table).delete().eq("id", id);
    if (error) throw new Error(`dbDelete ${table}/${id}: ${error.message}`);
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
    const { error } = await sb.from("audit_logs").insert({
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
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("Audit log write failed:", err);
  }
}
