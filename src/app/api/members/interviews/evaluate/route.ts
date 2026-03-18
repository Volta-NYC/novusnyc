import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller } from "@/lib/server/adminApi";

type Rating = "Extremely Qualified" | "Qualified" | "Decent" | "Unqualified";

type EvaluateBody = {
  slotId?: string;
  rating?: Rating;
  comments?: string;
  action?: "save" | "delete";
};

type SlotRecord = Record<string, unknown>;
type ApplicationEntry = { id: string; row: Record<string, unknown> };
type EvalRecord = Record<string, unknown>;
type EvalMap = Record<string, EvalRecord>;

const VALID_RATINGS: Rating[] = ["Extremely Qualified", "Qualified", "Decent", "Unqualified"];

function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeName(value: unknown): string {
  return normalize(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalEmail(value: unknown): string {
  const raw = normalize(value);
  const [local, domain] = raw.split("@");
  if (!local || !domain) return raw;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return `${local.split("+")[0].replace(/\./g, "")}@gmail.com`;
  }
  return `${local}@${domain}`;
}

function namesLikelyMatch(a: unknown, b: unknown): boolean {
  const left = normalizeName(a);
  const right = normalizeName(b);
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const lt = new Set(left.split(" ").filter(Boolean));
  const rt = new Set(right.split(" ").filter(Boolean));
  let overlap = 0;
  lt.forEach((token) => {
    if (rt.has(token)) overlap += 1;
  });
  return overlap >= 2;
}

function asEvalMap(value: unknown): EvalMap {
  if (!value || typeof value !== "object") return {};
  return value as EvalMap;
}

function isValidEvalRecord(value: unknown): value is EvalRecord {
  if (!value || typeof value !== "object") return false;
  const row = value as EvalRecord;
  const rating = String(row.rating ?? "").trim() as Rating;
  if (!VALID_RATINGS.includes(rating)) return false;
  const interviewerUid = String(row.interviewerUid ?? "").trim();
  const interviewerEmail = String(row.interviewerEmail ?? "").trim();
  const interviewerName = String(row.interviewerName ?? "").trim();
  return !!(interviewerUid || interviewerEmail || interviewerName);
}

function pickApplicationBySlot(
  slot: SlotRecord,
  entries: ApplicationEntry[],
): ApplicationEntry | null {
  const slotId = String(slot.id ?? "").trim();
  if (slotId) {
    const bySlot = entries.find(({ row }) => normalize(row.interviewSlotId) === normalize(slotId));
    if (bySlot) return bySlot;
  }
  const slotToken = normalize(slot.bookedBy);
  if (slotToken && slotToken !== "public-booking") {
    const byToken = entries.find(({ row }) => normalize(row.interviewInviteToken) === slotToken);
    if (byToken) return byToken;
  }
  const slotEmail = normalize(slot.bookerEmail);
  const slotCanonical = canonicalEmail(slot.bookerEmail);
  const slotName = slot.bookerName;

  const byEmail = entries.find(({ row }) => {
    const email = normalize(row.email);
    return email && (email === slotEmail || canonicalEmail(row.email) === slotCanonical);
  });
  if (byEmail) return byEmail;

  const byName = entries.find(({ row }) => namesLikelyMatch(row.fullName, slotName));
  if (byName) return byName;
  return null;
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead", "interviewer"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as EvaluateBody;
  const slotId = (body.slotId ?? "").trim();
  const rating = (body.rating ?? "").trim() as Rating;
  const comments = (body.comments ?? "").trim();
  const action = body.action || "save";

  if (!slotId) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const slotData = await dbRead(`interviewSlots/${slotId}`, verified.caller.idToken);
  if (!slotData || typeof slotData !== "object") {
    return NextResponse.json({ error: "slot_not_found" }, { status: 404 });
  }
  const slot: SlotRecord = { ...(slotData as SlotRecord), id: slotId };

  if (action === "delete") {
    const slotEvalMap = asEvalMap(slot.evaluationByUid);
    const slotDeletePatch: Record<string, unknown> = {};
    for (const uid of Object.keys(slotEvalMap)) {
      slotDeletePatch[`evaluationByUid/${uid}`] = null;
    }
    if (Object.keys(slotDeletePatch).length > 0) {
      await dbPatch(`interviewSlots/${slotId}`, slotDeletePatch, verified.caller.idToken);
    }

    const appsData = await dbRead("applications", verified.caller.idToken);
    const entries = Object.entries((appsData ?? {}) as Record<string, Record<string, unknown>>)
      .map(([id, row]) => ({ id, row: row ?? {} }));
    const target = pickApplicationBySlot(slot, entries);
    
    if (target) {
      const appEvalMap = asEvalMap(target.row.interviewEvaluations);
      const appDeletePatch: Record<string, unknown> = {};
      for (const uid of Object.keys(appEvalMap)) {
        appDeletePatch[`interviewEvaluations/${uid}`] = null;
      }
      if (Object.keys(appDeletePatch).length > 0) {
        await dbPatch(`applications/${target.id}`, appDeletePatch, verified.caller.idToken);
      }
    }
    
    return NextResponse.json({ success: true, deleted: true });
  }

  if (!rating || !VALID_RATINGS.includes(rating)) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (!slot.bookedBy || !slot.bookerEmail) {
    return NextResponse.json({ error: "slot_not_booked" }, { status: 409 });
  }

  const evalEntry = {
    interviewerUid: verified.caller.uid,
    interviewerEmail: verified.caller.email,
    interviewerName: verified.caller.name || verified.caller.email,
    rating,
    comments,
    updatedAt: new Date().toISOString(),
  };

  // Strict normalization: keep only one evaluation record per slot.
  const slotEvalMap = asEvalMap(slot.evaluationByUid);
  const slotPatch: Record<string, unknown> = {};
  for (const uid of Object.keys(slotEvalMap)) {
    if (uid !== verified.caller.uid) {
      slotPatch[`evaluationByUid/${uid}`] = null;
    }
  }
  slotPatch[`evaluationByUid/${verified.caller.uid}`] = evalEntry;
  await dbPatch(`interviewSlots/${slotId}`, slotPatch, verified.caller.idToken);

  const appsData = await dbRead("applications", verified.caller.idToken);
  const entries = Object.entries((appsData ?? {}) as Record<string, Record<string, unknown>>)
    .map(([id, row]) => ({ id, row: row ?? {} }));
  const target = pickApplicationBySlot(slot, entries);
  if (target) {
    const appEvalMap = asEvalMap(target.row.interviewEvaluations);
    const appPatch: Record<string, unknown> = {};
    for (const uid of Object.keys(appEvalMap)) {
      if (uid !== verified.caller.uid) {
        appPatch[`interviewEvaluations/${uid}`] = null;
      }
    }
    appPatch[`interviewEvaluations/${verified.caller.uid}`] = {
      ...evalEntry,
      slotId,
    };
    appPatch.status = "Interview Completed";
    appPatch.updatedAt = new Date().toISOString();
    await dbPatch(`applications/${target.id}`, appPatch, verified.caller.idToken);
  }

  return NextResponse.json({ success: true, applicationId: target?.id ?? "" });
}
