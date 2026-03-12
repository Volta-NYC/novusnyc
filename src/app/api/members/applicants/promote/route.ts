import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getAdminDB } from "@/lib/firebaseAdmin";

type PromoteBody = {
  fullName?: string;
  email?: string;
  schoolName?: string;
  grade?: string;
  role?: string;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const db = getAdminDB();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 500 });

  const body = (await req.json().catch(() => ({}))) as PromoteBody;
  const fullName = (body.fullName ?? "").trim();
  const email = normalize(body.email ?? "");
  const schoolName = (body.schoolName ?? "").trim();
  const grade = (body.grade ?? "").trim();
  const role = (body.role ?? "").trim() || "Member";

  if (!fullName || !email) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const teamSnap = await db.ref("team").get();
  const team = (teamSnap.exists() ? (teamSnap.val() as Record<string, Record<string, unknown>>) : {}) ?? {};
  let targetId = "";

  for (const [id, raw] of Object.entries(team)) {
    const primary = normalize(String(raw.email ?? ""));
    const secondary = normalize(String(raw.alternateEmail ?? ""));
    if (email && (primary === email || secondary === email)) {
      targetId = id;
      break;
    }
  }

  if (!targetId) {
    for (const [id, raw] of Object.entries(team)) {
      const name = normalize(String(raw.name ?? ""));
      if (name && name === normalize(fullName)) {
        targetId = id;
        break;
      }
    }
  }

  const nowIso = new Date().toISOString();
  if (targetId) {
    const existing = team[targetId] ?? {};
    const patch: Record<string, unknown> = {};
    if (!String(existing.name ?? "").trim()) patch.name = fullName;
    if (!String(existing.email ?? "").trim()) patch.email = email;
    else if (
      normalize(String(existing.email ?? "")) !== email
      && !String(existing.alternateEmail ?? "").trim()
    ) {
      patch.alternateEmail = email;
    }
    if (!String(existing.school ?? "").trim() && schoolName) patch.school = schoolName;
    if (!String(existing.grade ?? "").trim() && grade) patch.grade = grade;
    patch.role = role;
    if (!String(existing.notes ?? "").trim()) patch.notes = "Synced from accepted applicant";
    if (Object.keys(patch).length > 0) await db.ref(`team/${targetId}`).update(patch);
    return NextResponse.json({ success: true, action: "updated", memberId: targetId });
  }

  const newRef = db.ref("team").push();
  await newRef.set({
    name: fullName,
    school: schoolName,
    grade,
    divisions: [],
    pod: "",
    role,
    slackHandle: "",
    email,
    alternateEmail: "",
    status: "Active",
    skills: [],
    joinDate: nowIso.slice(0, 10),
    notes: "Synced from accepted applicant",
    createdAt: nowIso,
  });

  return NextResponse.json({ success: true, action: "created", memberId: newRef.key });
}
