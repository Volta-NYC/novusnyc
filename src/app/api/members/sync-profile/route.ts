import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function norm(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const token = getBearerToken(req);
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: { user }, error } = await sb.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const bodyName = typeof body.name === "string" ? body.name.trim() : "";
  const bodySchool = typeof body.school === "string" ? body.school.trim() : "";
  const bodyGrade = typeof body.grade === "string" ? body.grade.trim() : "";

  // The row to sync is chosen by the verified token alone. Honouring an email
  // from the body would let any signed-in member rewrite another member's row.
  const email = norm(user.email ?? "");
  if (!email) return NextResponse.json({ error: "missing_email" }, { status: 400 });

  let targetId = "";
  let targetData: Record<string, unknown> | null = null;

  const { data: byEmail } = await sb.from("team").select("*").eq("email", email).is("deleted_at", null).limit(1);
  if (byEmail?.length) {
    targetId = String(byEmail[0].id ?? "");
    targetData = byEmail[0] as Record<string, unknown>;
  } else {
    const { data: byAlt } = await sb.from("team").select("*").eq("alternate_email", email).is("deleted_at", null).limit(1);
    if (byAlt?.length) {
      targetId = String(byAlt[0].id ?? "");
      targetData = byAlt[0] as Record<string, unknown>;
    }
  }

  const nowIso = new Date().toISOString();
  if (targetId && targetData) {
    const target = targetData;
    const patch: Record<string, unknown> = {};
    if (bodyName && bodyName !== (typeof target.name === "string" ? target.name : "")) patch.name = bodyName;
    if (bodySchool && bodySchool !== (typeof target.school === "string" ? target.school : "")) patch.school = bodySchool;
    if (bodyGrade && bodyGrade !== (typeof target.grade === "string" ? target.grade : "")) patch.grade = bodyGrade;
    if (!target.email) patch.email = email;
    if (!target.join_date) patch.join_date = nowIso.split("T")[0];
    if (Object.keys(patch).length > 0) {
      await sb.from("team").update(patch).eq("id", targetId);
      await sb.from("member_notes")
        .upsert({ member_id: targetId, note: "Synced from signup" }, { onConflict: "member_id" });
    }
  } else {
    const newId = crypto.randomUUID();
    await sb.from("team").insert({
      id: newId,
      name: bodyName || email.split("@")[0],
      school: bodySchool,
      grade: bodyGrade,
      divisions: [],
      pod: "",
      role: "Member",
      slack_handle: "",
      email,
      alternate_email: "",
      status: "Active",
      skills: [],
      join_date: nowIso.split("T")[0],
      created_at: nowIso,
    });
    await sb.from("member_notes").insert({ member_id: newId, note: "Synced from signup" });
  }

  return NextResponse.json({ success: true });
}
