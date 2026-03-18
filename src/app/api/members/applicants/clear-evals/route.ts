import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller } from "@/lib/server/adminApi";

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

type ClearEvalsBody = {
  applicationIds?: string[];
  evaluatorUid?: string;
  evaluatorEmail?: string;
};

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as ClearEvalsBody;
  const applicationIds = Array.isArray(body.applicationIds)
    ? body.applicationIds.map((id) => String(id ?? "").trim()).filter(Boolean)
    : [];
  const evaluatorUid = String(body.evaluatorUid ?? "").trim();
  const evaluatorEmail = normalize(body.evaluatorEmail);

  if (applicationIds.length === 0) {
    return NextResponse.json({ error: "missing_application_ids" }, { status: 400 });
  }
  if (!evaluatorUid && !evaluatorEmail) {
    return NextResponse.json({ error: "missing_evaluator_selector" }, { status: 400 });
  }

  const [appsData, slotsData] = await Promise.all([
    dbRead("applications", verified.caller.idToken),
    dbRead("interviewSlots", verified.caller.idToken),
  ]);

  const apps = (appsData ?? {}) as Record<string, Record<string, unknown>>;
  const slots = (slotsData ?? {}) as Record<string, Record<string, unknown>>;

  let removed = 0;

  for (const appId of applicationIds) {
    const app = apps[appId];
    if (!app) continue;

    const evals = app.interviewEvaluations as Record<string, Record<string, unknown>> | undefined;
    if (evals && typeof evals === "object") {
      for (const [uid, evalEntry] of Object.entries(evals)) {
        const uidMatch = evaluatorUid ? uid === evaluatorUid : false;
        const emailMatch = evaluatorEmail
          ? normalize(evalEntry?.interviewerEmail).includes(evaluatorEmail)
          : false;
        if (!uidMatch && !emailMatch) continue;
        await dbPatch(`applications/${appId}`, { [`interviewEvaluations/${uid}`]: null }, verified.caller.idToken);
        removed += 1;
      }
    }

    const slotId = String(app.interviewSlotId ?? "").trim();
    const slot = slots[slotId];
    const evalByUid = slot?.evaluationByUid as Record<string, Record<string, unknown>> | undefined;
    if (!slotId || !evalByUid || typeof evalByUid !== "object") continue;
    for (const [uid, evalEntry] of Object.entries(evalByUid)) {
      const uidMatch = evaluatorUid ? uid === evaluatorUid : false;
      const emailMatch = evaluatorEmail
        ? normalize(evalEntry?.interviewerEmail).includes(evaluatorEmail)
        : false;
      if (!uidMatch && !emailMatch) continue;
      await dbPatch(`interviewSlots/${slotId}`, { [`evaluationByUid/${uid}`]: null }, verified.caller.idToken);
      removed += 1;
    }
  }

  return NextResponse.json({ success: true, removed });
}
