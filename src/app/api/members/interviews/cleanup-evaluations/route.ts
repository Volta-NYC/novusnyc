import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller } from "@/lib/server/adminApi";

type EvalRow = Record<string, unknown>;
type EvalMap = Record<string, EvalRow>;

const VALID_RATINGS = ["Extremely Qualified", "Qualified", "Decent", "Unqualified"] as const;

function asEvalMap(value: unknown): EvalMap {
  if (!value || typeof value !== "object") return {};
  return value as EvalMap;
}

function isValidEval(row: unknown): row is EvalRow {
  if (!row || typeof row !== "object") return false;
  const entry = row as EvalRow;
  const rating = String(entry.rating ?? "").trim();
  if (!VALID_RATINGS.includes(rating as (typeof VALID_RATINGS)[number])) return false;
  const interviewerUid = String(entry.interviewerUid ?? "").trim();
  const interviewerEmail = String(entry.interviewerEmail ?? "").trim();
  const interviewerName = String(entry.interviewerName ?? "").trim();
  return !!(interviewerUid || interviewerEmail || interviewerName);
}

function getUpdatedAtMs(row: EvalRow): number {
  const value = String(row.updatedAt ?? "").trim();
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

function pickCanonicalEval(entries: Array<[string, EvalRow]>): [string, EvalRow] | null {
  if (entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => getUpdatedAtMs(b[1]) - getUpdatedAtMs(a[1]));
  return sorted[0];
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const [slotsData, appsData] = await Promise.all([
    dbRead("interviewSlots", verified.caller.idToken),
    dbRead("applications", verified.caller.idToken),
  ]);

  const slots = (slotsData ?? {}) as Record<string, Record<string, unknown>>;
  const applications = (appsData ?? {}) as Record<string, Record<string, unknown>>;

  let slotRecordsUpdated = 0;
  let appRecordsUpdated = 0;
  let deletedLegacyEntries = 0;

  for (const [slotId, slot] of Object.entries(slots)) {
    const evalMap = asEvalMap(slot?.evaluationByUid);
    const allEntries = Object.entries(evalMap);
    if (allEntries.length === 0) continue;

    const validEntries = allEntries.filter(([, row]) => isValidEval(row));
    const canonical = pickCanonicalEval(validEntries);
    const patch: Record<string, unknown> = {};

    if (!canonical) {
      for (const [uid] of allEntries) {
        patch[`evaluationByUid/${uid}`] = null;
      }
      deletedLegacyEntries += allEntries.length;
    } else {
      for (const [uid, row] of allEntries) {
        if (uid !== canonical[0] || !isValidEval(row)) {
          patch[`evaluationByUid/${uid}`] = null;
          deletedLegacyEntries += 1;
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      await dbPatch(`interviewSlots/${slotId}`, patch, verified.caller.idToken);
      slotRecordsUpdated += 1;
    }
  }

  for (const [appId, app] of Object.entries(applications)) {
    const evalMap = asEvalMap(app?.interviewEvaluations);
    const allEntries = Object.entries(evalMap);
    if (allEntries.length === 0) continue;

    const validEntries = allEntries.filter(([, row]) => isValidEval(row));
    const canonical = pickCanonicalEval(validEntries);
    const patch: Record<string, unknown> = {};

    if (!canonical) {
      for (const [uid] of allEntries) {
        patch[`interviewEvaluations/${uid}`] = null;
      }
      deletedLegacyEntries += allEntries.length;
    } else {
      for (const [uid, row] of allEntries) {
        if (uid !== canonical[0] || !isValidEval(row)) {
          patch[`interviewEvaluations/${uid}`] = null;
          deletedLegacyEntries += 1;
        }
      }
    }

    if (Object.keys(patch).length > 0) {
      await dbPatch(`applications/${appId}`, patch, verified.caller.idToken);
      appRecordsUpdated += 1;
    }
  }

  return NextResponse.json({
    success: true,
    slotRecordsUpdated,
    appRecordsUpdated,
    deletedLegacyEntries,
  });
}
