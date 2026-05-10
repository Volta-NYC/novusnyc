import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin, dbDelete, writeAuditLog } from "@/lib/supabaseAdmin";

type RouteContext = { params: Promise<{ uid: string }> };

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { uid } = await params;
  const targetUid = uid?.trim();
  if (!targetUid) {
    return NextResponse.json({ error: "missing_uid" }, { status: 400 });
  }

  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  if (targetUid === verified.caller.uid) {
    return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Look up the target user profile by auth_uid or by user_profiles.id for backward compat.
  const targetProfile = await dbDelete(`userProfiles/${targetUid}`).then(
    () => null, () => null
  );
  void targetProfile;

  // Also remove from user_profiles table directly (belt-and-suspenders).
  await sb.from("user_profiles").delete().eq("id", targetUid);

  // Delete the Supabase Auth user.
  let removedAuthUser = true;
  try {
    const { error } = await sb.auth.admin.deleteUser(targetUid);
    if (error) {
      if (error.message.includes("not found") || error.message.includes("User not found")) {
        removedAuthUser = false;
      } else {
        return NextResponse.json({ error: "delete_failed", detail: error.message }, { status: 500 });
      }
    }
  } catch {
    removedAuthUser = false;
  }

  await writeAuditLog({
    action: "delete",
    collection: "authUsers",
    recordId: targetUid,
    actorUid: verified.caller.uid,
    actorEmail: verified.caller.email,
    actorName: verified.caller.name,
    details: {
      source: "api.members.admin.users.delete",
      removedUserProfile: true,
      removedAuthUser,
    },
  });

  return NextResponse.json({ success: true });
}
