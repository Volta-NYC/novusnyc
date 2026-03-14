import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getAdminDB } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const db = getAdminDB();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 500 });

  const teamSnap = await db.ref("team").get();
  const team = teamSnap.val() || {};

  const appsSnap = await db.ref("applications").get();
  const apps = appsSnap.val() || {};

  let patched = 0;

  for (const [teamId, member] of Object.entries(team) as any) {
    if (member.grade && member.grade.trim() !== "") continue;

    const email = (member.email || "").trim().toLowerCase();
    const alt = (member.alternateEmail || "").trim().toLowerCase();
    let grade = "";

    // 1. match by email
    for (const app of Object.values(apps) as any) {
      const appEmail = (app.email || "").trim().toLowerCase();
      if ((email && appEmail === email) || (alt && appEmail === alt)) {
        if (app.grade && app.grade.trim() !== "") {
          grade = app.grade.trim();
          break;
        }
      }
    }

    // 2. match by name
    if (!grade) {
      for (const app of Object.values(apps) as any) {
        if (app.fullName && member.name && app.fullName.trim().toLowerCase() === member.name.trim().toLowerCase()) {
          if (app.grade && app.grade.trim() !== "") {
            grade = app.grade.trim();
            break;
          }
        }
      }
    }

    if (grade) {
      await db.ref(`team/${teamId}`).update({ grade });
      patched++;
    }
  }

  return NextResponse.json({ success: true, patched });
}
