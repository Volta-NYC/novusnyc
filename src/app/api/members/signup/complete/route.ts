import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getBearerToken } from "@/lib/server/adminApi";

export const runtime = "nodejs";

// Called after a new member sets their password via the Supabase invite flow.
// Links their Supabase Auth user ID (auth_uid) to the matching team row so
// verifyCaller can resolve their auth_role on future requests.
export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const email = (user.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "no_email" }, { status: 400 });

  // Parse optional name from request body.
  let displayName = "";
  try {
    const body = await req.json() as Record<string, unknown>;
    if (typeof body.name === "string") displayName = body.name.trim();
  } catch {
    // name is optional
  }

  // Find the team row by primary email, then alternate email.
  const { data: rows } = await sb
    .from("team")
    .select("id, auth_uid")
    .or(`email.eq.${email},alternate_email.eq.${email}`)
    .limit(1);

  const teamRow = rows?.[0];
  if (!teamRow) {
    return NextResponse.json({ error: "team_member_not_found" }, { status: 404 });
  }

  // Write auth_uid — skip if already linked to this user (idempotent).
  if (teamRow.auth_uid && teamRow.auth_uid !== user.id) {
    return NextResponse.json({ error: "already_linked" }, { status: 409 });
  }

  const patch: Record<string, unknown> = { auth_uid: user.id };
  if (displayName) patch.name = displayName;

  await sb.from("team").update(patch).eq("id", teamRow.id);

  // Store full_name in auth user metadata for audit logs.
  if (displayName) {
    await sb.auth.admin.updateUserById(user.id, {
      user_metadata: { full_name: displayName },
    });
  }

  return NextResponse.json({ success: true });
}
