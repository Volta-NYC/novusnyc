import "server-only";

import { dbRead, dbPatch, dbPush } from "@/lib/supabaseAdmin";
import { pickPrimaryTrack, trackToDivisions } from "@/lib/server/memberPlacement";
import { canonicalEmail, findPersonMatch, normalizeKey } from "@/lib/identity";

// One promotion path, used by both "Accept applicant" and "Finalize interview".
// They were separate near-copies that had already drifted: one wrote a pod, the
// other didn't; both overwrote role and divisions on an existing member.
//
// Rules:
//   • Never overwrite a field an admin has already filled. Promotion fills gaps.
//   • Never assign a pod. Pods are managed explicitly from the Pods page — the
//     round-robin that used to run here is what put 11 people in Grants by
//     accident.
//   • Never silently downgrade a role. An existing member keeps theirs.

export type PromoteResult = {
  memberId: string;
  action: "created" | "updated";
  matchedOn: "email" | "name" | null;
  changedFields: string[];
};

export async function promoteApplicantToMember(params: {
  fullName: string;
  email: string;
  schoolName?: string;
  grade?: string;
  tracksSelected?: string;
  role: string;
  source: string;          // what triggered this, for the member's notes
  applicationId?: string;  // stamps the durable applicant → member link
  decidedBy?: string;
}): Promise<PromoteResult> {
  const fullName = String(params.fullName ?? "").trim();
  const email = canonicalEmail(params.email);
  if (!fullName || !email) throw new Error("missing_fields");

  const teamData = await dbRead("team");
  const team = (teamData ?? {}) as Record<string, Record<string, unknown>>;
  const entries = Object.entries(team).filter(([, row]) => !row.deletedAt && !row.deleted_at);

  const { match, matchedOn } = findPersonMatch(
    entries,
    { email: params.email, name: fullName },
    ([, row]) => ({ email: row.email, alternateEmail: row.alternateEmail, name: row.name }),
  );

  const track = pickPrimaryTrack(params.tracksSelected ?? "");
  const nowIso = new Date().toISOString();
  const today = nowIso.slice(0, 10);

  if (match) {
    const [targetId, existing] = match;
    const patch: Record<string, unknown> = {};
    const isBlank = (v: unknown) => !String(v ?? "").trim();

    if (isBlank(existing.name)) patch.name = fullName;
    if (isBlank(existing.email)) patch.email = email;
    else if (normalizeKey(existing.email) !== email && isBlank(existing.alternateEmail)) {
      patch.alternateEmail = email;
    }
    if (isBlank(existing.school) && params.schoolName) patch.school = params.schoolName;
    if (isBlank(existing.grade) && params.grade) patch.grade = params.grade;
    if (isBlank(existing.acceptedDate)) patch.acceptedDate = today;

    // Add the applicant's track without dropping tracks they already work in.
    if (track !== "Other") {
      const current = Array.isArray(existing.divisions)
        ? (existing.divisions as unknown[]).map((d) => String(d ?? "")).filter(Boolean)
        : [];
      const merged = [...new Set([...current, ...trackToDivisions(track)])];
      if (merged.length !== current.length) patch.divisions = merged;
    }

    // Only set a role on someone who has none. Re-running a promotion must not
    // demote a member who has since been moved up.
    if (isBlank(existing.role) && params.role) patch.role = params.role;

    // Reactivate rather than leave a returning member marked inactive.
    if (normalizeKey(existing.status) === "inactive") patch.status = "Active";

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = nowIso;
      await dbPatch(`team/${targetId}`, patch);
    }
    await linkApplication(params.applicationId, targetId, params.decidedBy);
    return {
      memberId: targetId,
      action: "updated",
      matchedOn,
      changedFields: Object.keys(patch).filter((k) => k !== "updatedAt"),
    };
  }

  const memberId = await dbPush("team", {
    name: fullName,
    school: params.schoolName ?? "",
    grade: params.grade ?? "",
    divisions: track === "Other" ? [] : trackToDivisions(track),
    role: params.role,
    slackHandle: "",
    email,
    alternateEmail: "",
    status: "Active",
    skills: [],
    joinDate: today,
    acceptedDate: today,
    notes: params.source,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await linkApplication(params.applicationId, memberId, params.decidedBy);
  return { memberId, action: "created", matchedOn: null, changedFields: ["created"] };
}

// Record which member this application became, so nothing has to re-guess the
// match later. A failure here must not undo the promotion itself.
async function linkApplication(
  applicationId: string | undefined, memberId: string, decidedBy?: string,
): Promise<void> {
  if (!applicationId) return;
  try {
    await dbPatch(`applications/${applicationId}`, {
      memberId,
      decidedAt: new Date().toISOString(),
      decidedBy: decidedBy ?? "",
    });
  } catch {
    // The member exists; an unset link is recoverable, a failed accept is not.
  }
}
