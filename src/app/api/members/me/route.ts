import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Returns the team profile for the currently authenticated user.
// Uses the service role key so it's immune to PostgREST schema cache issues.
export async function GET(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: row } = await sb
    .from("team")
    .select("id, email, name, active, auth_role")
    .eq("auth_uid", user.id)
    .single();

  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    email: row.email ?? user.email ?? "",
    name: row.name ?? "",
    active: row.active !== false,
    authRole: row.auth_role ?? "member",
  });
}
