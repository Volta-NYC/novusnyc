import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getAdminDB } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const db = getAdminDB();
  if (!db) return NextResponse.json({ error: "admin_not_configured" }, { status: 500 });

  const teamSnap = await db.ref("team").get();
  const team = (teamSnap.val() || {}) as Record<string, Record<string, unknown>>;

  const appsSnap = await db.ref("applications").get();
  const apps = (appsSnap.val() || {}) as Record<string, Record<string, unknown>>;

  let patched = 0;

  for (const [teamId, member] of Object.entries(team)) {
    const memberGrade = String(member.grade || "");
    if (memberGrade && memberGrade.trim() !== "") continue;

    const email = String(member.email || "").trim().toLowerCase();
    const alt = String(member.alternateEmail || "").trim().toLowerCase();
    let grade = "";

    // 1. match by email
    for (const app of Object.values(apps)) {
      const appEmail = String(app.email || "").trim().toLowerCase();
      if ((email && appEmail === email) || (alt && appEmail === alt)) {
        const appGrade = String(app.grade || "");
        if (appGrade && appGrade.trim() !== "") {
          grade = appGrade.trim();
          break;
        }
      }
    }

    // 2. match by name
    if (!grade) {
      for (const app of Object.values(apps)) {
        const appName = String(app.fullName || "");
        const memberName = String(member.name || "");
        
        if (appName && memberName && appName.trim().toLowerCase() === memberName.trim().toLowerCase()) {
          const appGrade = String(app.grade || "");
          if (appGrade && appGrade.trim() !== "") {
            grade = appGrade.trim();
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
