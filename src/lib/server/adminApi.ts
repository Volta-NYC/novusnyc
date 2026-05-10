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
  idToken: string;
}

type VerifyResult =
  | { ok: true; caller: VerifiedCaller }
  | { ok: false; status: number; error: string };

function normalizeCallerRole(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (raw === "project_lead") return "member";
  return raw;
}

export function getBearerToken(req: NextRequest): string {
  const authHeader = req.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
}

export async function dbRead(path: string, _idToken?: string): Promise<unknown> {
  return sbRead(path);
}

export async function dbPatch(path: string, data: Record<string, unknown>, _idToken?: string): Promise<void> {
  return sbPatch(path, data);
}

export async function dbPush(path: string, data: Record<string, unknown>, _idToken?: string): Promise<string> {
  return sbPush(path, data);
}

export async function dbDelete(path: string, _idToken?: string): Promise<void> {
  return sbDelete(path);
}

export async function verifyCaller(
  req: NextRequest,
  allowedRoles: string[]
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

  // Look up auth_role from the team table.
  const { data: teamRow } = await sb
    .from("team")
    .select("auth_role")
    .eq("auth_uid", user.id)
    .single();

  const role = normalizeCallerRole(teamRow?.auth_role ?? "");
  if (!allowedRoles.includes(role)) {
    return { ok: false, status: 403, error: "forbidden" };
  }

  const name = (user.user_metadata?.full_name as string | undefined) ?? "";
  return {
    ok: true,
    caller: { uid: user.id, email: user.email ?? "", name, role, idToken },
  };
}
