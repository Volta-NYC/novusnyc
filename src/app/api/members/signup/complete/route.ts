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
  const { data: rows, error: teamReadError } = await sb
    .from("team")
    .select("*")
    .or(`email.eq.${email},alternate_email.eq.${email}`)
    .is("deleted_at", null)
    .limit(1);
  if (teamReadError) return NextResponse.json({ error: "team_lookup_failed" }, { status: 500 });

  const teamRow = rows?.[0] as Record<string, unknown> | undefined;
  if (!teamRow) {
    return NextResponse.json({ error: "team_member_not_found" }, { status: 404 });
  }

  // Write auth_uid — skip if already linked to this user (idempotent).
  const existingUid = teamRow.auth_uid as string | null | undefined;
  if (existingUid && existingUid !== user.id) {
    return NextResponse.json({ error: "already_linked" }, { status: 409 });
  }

  const patch: Record<string, unknown> = { auth_uid: user.id };
  if (displayName) patch.name = displayName;

  const { data: updated, error: teamUpdateError } = await sb.from("team")
    .update(patch).eq("id", String(teamRow.id)).select("id").maybeSingle();
  if (teamUpdateError || !updated) return NextResponse.json({ error: "team_link_failed" }, { status: 500 });

  // Write auth_role into app_metadata so verifyCaller and authContext can read it
  // from the JWT without depending on PostgREST schema cache for new columns.
  const authRole = typeof teamRow.auth_role === "string" ? teamRow.auth_role : "member";
  const existingAppMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const { error: metadataError } = await sb.auth.admin.updateUserById(user.id, {
    app_metadata: { ...existingAppMeta, auth_role: authRole },
    ...(displayName ? { user_metadata: { ...user.user_metadata, full_name: displayName } } : {}),
  });
  if (metadataError) return NextResponse.json({ error: "account_metadata_failed" }, { status: 500 });

  return NextResponse.json({ success: true });
}
