import { NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  dbRead as sbRead,
  dbPatch as sbPatch,
  dbPush as sbPush,
  dbDelete as sbDelete,
} from "@/lib/supabaseAdmin";

export interface VerifiedCaller {
  uid: string;
  email: string;
  name: string;
  role: string;
  canInterview: boolean;
  idToken: string;
}

type VerifyResult =
  | { ok: true; caller: VerifiedCaller }
  | { ok: false; status: number; error: string };

function normalizeCallerRole(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (raw === "owner") return "owner";
  if (raw === "admin") return "admin";
  return raw;
}

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function getBearerToken(req: NextRequest): string {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

export async function dbRead(path: string): Promise<unknown> {
  return sbRead(path);
}

export async function dbPatch(path: string, data: Record<string, unknown>): Promise<void> {
  return sbPatch(path, data);
}

export async function dbPush(path: string, data: Record<string, unknown>): Promise<string> {
  return sbPush(path, data);
}

export async function dbDelete(path: string): Promise<void> {
  return sbDelete(path);
}

export async function verifyCaller(
  req: NextRequest,
  allowedRoles: string[],
  opts?: { allowIfCanInterview?: boolean }
): Promise<VerifyResult> {
  const idToken = getBearerToken(req);
  if (!idToken) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  const sb = getSupabaseAdmin();
  const { data: { user }, error } = await sb.auth.getUser(idToken);
  if (error || !user) {
    return { ok: false, status: 401, error: "unauthorized" };
  }

  // Read auth_role from app_metadata — set server-side only, always in the JWT,
  // no PostgREST schema-cache dependency. Migrated/confirmed accounts may not
  // have that metadata yet, so fall back to the linked team row.
  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  let role = normalizeCallerRole(appMeta.auth_role ?? "");
  const canInterview = appMeta.can_interview === true;
  let profileName = (user.user_metadata?.full_name as string | undefined) ?? "";

  if (!role) {
    const email = normalizeEmail(user.email);
    const byUid = await sb
      .from("team")
      .select("name, auth_role")
      .eq("auth_uid", user.id)
      .maybeSingle();

    let teamRow = byUid.data as Record<string, unknown> | null;
    if (!teamRow && email) {
      const byEmail = await sb
        .from("team")
        .select("name, auth_role")
        .or(`email.eq.${email},alternate_email.eq.${email}`)
        .limit(1);
      teamRow = (byEmail.data?.[0] as Record<string, unknown> | undefined) ?? null;
    }

    role = normalizeCallerRole(teamRow?.auth_role ?? "");
    profileName = profileName || String(teamRow?.name ?? "");
  }

  const roleAllowed = allowedRoles.includes(role);
  const interviewAllowed = opts?.allowIfCanInterview === true && canInterview;
  if (!roleAllowed && !interviewAllowed) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  return {
    ok: true,
    caller: { uid: user.id, email: user.email ?? "", name: profileName, role, canInterview, idToken },
  };
}
