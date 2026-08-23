import "server-only";

import { dbRead, getSupabaseAdmin } from "@/lib/supabaseAdmin";
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
  interviewSlotId?: string;
  interviewScheduledAt?: string;
  applicationNotes?: string;
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
    { strictNames: true, allowNameFallbackWithEmail: false },
  );

  // The application already knows where this person is; not carrying it over
  // left every promoted member with a blank location and no chapter.
  const application = params.applicationId
    ? ((await dbRead(`applications/${params.applicationId}`)) as Record<string, unknown> | null)
    : null;
  const appCity     = String(application?.city ?? "").trim();
  const appState    = String(application?.state ?? "").trim();
  const appChapterRaw = String(application?.chapterId ?? application?.chapter_id ?? application?.chapter ?? "").trim();
  let appChapter = "";
  if (appChapterRaw) {
    const chapters = ((await dbRead("chapters")) ?? {}) as Record<string, Record<string, unknown>>;
    const wanted = normalizeKey(appChapterRaw);
    const resolved = Object.entries(chapters).find(([id, row]) =>
      normalizeKey(id) === wanted
      || normalizeKey(row.name) === wanted
      || normalizeKey(row.slug) === wanted
      || normalizeKey(row.city) === wanted,
    );
    appChapter = resolved?.[0] ?? "";
  }

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
      patch.updated_at = nowIso;
    }
    await applyPromotionTransaction(params, targetId, toDatabasePatch(patch), nowIso);
    return {
      memberId: targetId,
      action: "updated",
      matchedOn,
      changedFields: Object.keys(patch).filter((k) => k !== "updated_at"),
    };
  }

  const memberId = `member_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
  const memberData = {
    id: memberId,
    name: fullName,
    school: params.schoolName ?? "",
    grade: params.grade ?? "",
    divisions: track === "Other" ? [] : trackToDivisions(track),
    role: params.role,
    slack_handle: "",
    email,
    alternate_email: "",
    status: "Active",
    skills: [],
    join_date: today,
    accepted_date: today,
    home_city: appCity,
    home_state: appState,
    ...(appChapter ? { chapter_id: appChapter } : {}),
    created_at: nowIso,
    updated_at: nowIso,
  };

  await applyPromotionTransaction(params, null, memberData, nowIso);
  return { memberId, action: "created", matchedOn: null, changedFields: ["created"] };
}

function toDatabasePatch(patch: Record<string, unknown>): Record<string, unknown> {
  const names: Record<string, string> = {
    alternateEmail: "alternate_email", acceptedDate: "accepted_date",
    homeCity: "home_city", homeState: "home_state", chapterId: "chapter_id",
  };
  return Object.fromEntries(Object.entries(patch).map(([key, value]) => [names[key] ?? key, value]));
}

async function applyPromotionTransaction(
  params: Parameters<typeof promoteApplicantToMember>[0],
  memberId: string | null,
  memberPatch: Record<string, unknown>,
  nowIso: string,
): Promise<void> {
  if (!params.applicationId) throw new Error("missing_application_id");
  const { error } = await getSupabaseAdmin().rpc("promote_application_transaction", {
    p_application_id: params.applicationId,
    p_member_id: memberId,
    p_member_patch: { ...memberPatch, updated_at: nowIso },
    p_source_note: params.source,
    p_decided_by: params.decidedBy ?? "",
    p_final_role: params.markAcceptedRole ?? params.role,
    p_interview_slot_id: params.interviewSlotId ?? null,
    p_interview_scheduled_at: params.interviewScheduledAt ?? null,
    p_application_notes: params.applicationNotes ?? null,
  });
  if (error) throw new Error(error.message);
}
