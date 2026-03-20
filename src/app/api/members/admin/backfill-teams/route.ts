import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller } from "@/lib/server/adminApi";
import { normalizeTeamPod } from "@/lib/teamPod";

function normalizeName(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

type TeamRow = Record<string, unknown>;

/**
 * Admin-only one-time backfill endpoint.
 *
 * Reads assignments from Firebase:
 *   teamBackfillAssignments/{normalizedName}: "TeamCode"
 *
 * Then applies `pod` updates on matching entries in `team`.
 */
export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const [teamData, assignmentData] = await Promise.all([
    dbRead("team", verified.caller.idToken),
    dbRead("teamBackfillAssignments", verified.caller.idToken),
  ]);

  const team = (teamData ?? {}) as Record<string, TeamRow>;
  const assignments = (assignmentData ?? {}) as Record<string, unknown>;
  const normalizedAssignments: Record<string, string> = {};

  Object.entries(assignments).forEach(([nameKey, value]) => {
    const key = normalizeName(nameKey);
    const pod = normalizeTeamPod(value);
    if (key && pod) normalizedAssignments[key] = pod;
  });

  if (Object.keys(normalizedAssignments).length === 0) {
    return NextResponse.json({
      success: true,
      updatedCount: 0,
      skippedCount: Object.keys(team).length,
      reason: "no_assignments_found",
    });
  }

  let updatedCount = 0;
  let skippedCount = 0;

  for (const [memberId, member] of Object.entries(team)) {
    const nameKey = normalizeName(member.name);
    const targetPod = normalizedAssignments[nameKey];
    if (!targetPod) {
      skippedCount += 1;
      continue;
    }
    if (normalizeTeamPod(member.pod) === targetPod) {
      skippedCount += 1;
      continue;
    }
    await dbPatch(`team/${memberId}`, {
      pod: targetPod,
      updatedAt: new Date().toISOString(),
    }, verified.caller.idToken);
    updatedCount += 1;
  }

  return NextResponse.json({ success: true, updatedCount, skippedCount });
}
