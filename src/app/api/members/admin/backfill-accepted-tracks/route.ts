import { NextRequest, NextResponse } from "next/server";
import { dbPatch, dbRead, verifyCaller } from "@/lib/server/adminApi";
import {
  canonicalEmail,
  namesLikelyMatch,
  pickPrimaryTrack,
  suggestTeamForTrack,
  trackToDivisions,
  type MemberTrack,
} from "@/lib/server/memberPlacement";
import { normalizeTeamPod } from "@/lib/teamPod";

type TeamRow = Record<string, unknown>;
type AppRow = Record<string, unknown>;

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asIsoTime(value: unknown): number {
  const text = asText(value);
  if (!text) return 0;
  const ms = Date.parse(text);
  return Number.isNaN(ms) ? 0 : ms;
}

function inferTrackFromDivisions(row: TeamRow): MemberTrack {
  const divisions = Array.isArray(row.divisions)
    ? row.divisions.map((item) => asText(item))
    : [];
  if (divisions.includes("Tech")) return "Tech";
  if (divisions.includes("Marketing")) return "Marketing";
  if (divisions.includes("Finance")) return "Finance";
  return "Other";
}

function isAcceptedApplication(row: AppRow): boolean {
  return asText(row.status).toLowerCase() === "accepted";
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "project_lead"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const [teamData, applicationsData] = await Promise.all([
    dbRead("team", verified.caller.idToken),
    dbRead("applications", verified.caller.idToken),
  ]);

  const team = (teamData ?? {}) as Record<string, TeamRow>;
  const applications = (applicationsData ?? {}) as Record<string, AppRow>;
  const appList = Object.values(applications)
    .filter((row) => isAcceptedApplication(row))
    .map((row) => ({
      fullName: asText(row.fullName),
      email: asText(row.email).toLowerCase(),
      canonicalEmail: canonicalEmail(asText(row.email)),
      tracksSelected: asText(row.tracksSelected),
      createdAtMs: asIsoTime(row.updatedAt) || asIsoTime(row.createdAt),
    }))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);

  let updated = 0;
  let skipped = 0;
  const touchedMemberIds: string[] = [];
  const workingTeam: Record<string, TeamRow> = { ...team };

  for (const [memberId, row] of Object.entries(team)) {
    const primaryEmail = asText(row.email).toLowerCase();
    const altEmail = asText(row.alternateEmail).toLowerCase();
    const primaryCanonical = canonicalEmail(primaryEmail);
    const altCanonical = canonicalEmail(altEmail);
    const name = asText(row.name);

    let match = appList.find((app) => {
      if (primaryEmail && (app.email === primaryEmail || app.canonicalEmail === primaryCanonical)) return true;
      if (altEmail && (app.email === altEmail || app.canonicalEmail === altCanonical)) return true;
      return false;
    });
    if (!match && name) {
      match = appList.find((app) => namesLikelyMatch(app.fullName, name));
    }
    if (!match) {
      skipped += 1;
      continue;
    }

    const track = pickPrimaryTrack(match.tracksSelected);
    if (track === "Other") {
      skipped += 1;
      continue;
    }

    const patch: Record<string, unknown> = {};
    const existingTrack = inferTrackFromDivisions(row);
    if (existingTrack !== track) {
      patch.divisions = trackToDivisions(track);
    }

    const existingPod = normalizeTeamPod(row.pod);
    if (existingPod !== asText(row.pod)) {
      patch.pod = existingPod;
    }

    if (!existingPod) {
      const suggestedPod = normalizeTeamPod(suggestTeamForTrack(track, workingTeam));
      if (suggestedPod) patch.pod = suggestedPod;
    }

    if (Object.keys(patch).length === 0) {
      skipped += 1;
      continue;
    }

    patch.updatedAt = new Date().toISOString();
    await dbPatch(`team/${memberId}`, patch, verified.caller.idToken);
    workingTeam[memberId] = { ...row, ...patch };
    touchedMemberIds.push(memberId);
    updated += 1;
  }

  return NextResponse.json({
    success: true,
    updated,
    skipped,
    touchedMemberIds,
  });
}
