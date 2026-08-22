import "server-only";

import { dbRead, dbPatch, dbPush, getSupabaseAdmin } from "@/lib/supabaseAdmin";
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
  // Set only by the accept flow. Stamped here, after the member write, so a
  // failed promotion can never leave an application marked Accepted with no
  // member behind it.
  markAcceptedRole?: string;
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
    // Promotion merges records, so a fuzzy name match here would fuse two
    // different people into one member.
    { strictNames: true },
  );

  // The application already knows where this person is; not carrying it over
  // left every promoted member with a blank location and no chapter.
  const application = params.applicationId
    ? ((await dbRead(`applications/${params.applicationId}`)) as Record<string, unknown> | null)
    : null;
  const appCity     = String(application?.city ?? "").trim();
  const appState    = String(application?.state ?? "").trim();
  const appChapter  = String(application?.chapterId ?? application?.chapter_id ?? "").trim();

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

    if (isBlank(existing.homeCity) && appCity) patch.homeCity = appCity;
    if (isBlank(existing.homeState) && appState) patch.homeState = appState;
    if (isBlank(existing.chapterId) && appChapter) patch.chapterId = appChapter;

    if (Object.keys(patch).length > 0) {
      patch.updatedAt = nowIso;
      await dbPatch(`team/${targetId}`, patch);
    }
    await linkApplication(params.applicationId, targetId, params.decidedBy, params.markAcceptedRole);
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
    homeCity: appCity,
    homeState: appState,
    ...(appChapter ? { chapterId: appChapter } : {}),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  // Provenance lives in member_notes, which only owners and admins can read.
  await getSupabaseAdmin().from("member_notes")
    .upsert({ member_id: memberId, note: params.source, updated_at: nowIso },
            { onConflict: "member_id" });

  await linkApplication(params.applicationId, memberId, params.decidedBy, params.markAcceptedRole);
  return { memberId, action: "created", matchedOn: null, changedFields: ["created"] };
}

// Record which member this application became, so nothing has to re-guess the
// match later, and stamp the decision in the same write.
//
// This runs only once the member row is confirmed, which is the whole point of
// its position: the caller no longer marks the application Accepted up front,
// so the "accepted applicant with no member record" state cannot occur. A
// failure here leaves a real member and an un-stamped application — visible and
// re-runnable, which the reverse never was.
async function linkApplication(
  applicationId: string | undefined,
  memberId: string,
  decidedBy?: string,
  markAcceptedRole?: string,
): Promise<void> {
  if (!applicationId) return;
  await dbPatch(`applications/${applicationId}`, {
    memberId,
    decidedAt: new Date().toISOString(),
    decidedBy: decidedBy ?? "",
    ...(markAcceptedRole
      ? { status: "Accepted", finalDecisionRole: markAcceptedRole }
      : {}),
  });
}
