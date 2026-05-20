import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Returns the team profile for the currently authenticated user.
// Looks up by email so it works regardless of PostgREST schema cache state.
export async function GET(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

  const { data: rows } = await sb
    .from("team")
    .select("id, email, name, active, auth_role")
    .or(`email.eq.${email},alternate_email.eq.${email}`)
    .is("deleted_at", null)
    .limit(1);

  const row = rows?.[0];
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    id: row.id,
    email: row.email ?? email,
    name: row.name ?? "",
    active: row.active !== false,
    authRole: row.auth_role ?? "member",
  });
}
