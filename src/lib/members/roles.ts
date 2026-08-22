// ── Role ladder ──────────────────────────────────────────────────────────────
// Board · Chapter President / VP · Developer (tech) or Team Lead (marketing &
// finance) · LIT · Member.
//
// LIT is not in this list on purpose. Leading a pod is recorded once, in
// pod_members.role, and the LIT tier is derived from that — so a member can
// never be badged LIT while leading nothing, or lead a pod without the badge.
//
// Rename freely: these strings are the single source for every dropdown, sort
// and export. Nothing infers a role from a person's name.
export const MEMBER_ROLES = [
  "Board",              // org-wide: founders and executive directors
  "Chapter President",  // top of a chapter
  "Chapter VP",
  "Developer",          // tech leadership
  "Team Lead",          // marketing & finance leadership
  "Member",
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

// Tech leadership runs the project tracker. That is the one capability a roster
// title carries on its own — everything else still comes from auth_role.
export const TECH_LEAD_ROLE: MemberRole = "Developer";

export function isTechLeadRole(role: unknown): boolean {
  return String(role ?? "").trim() === TECH_LEAD_ROLE;
}

export const DEFAULT_MEMBER_ROLE: MemberRole = "Member";

// Roles that sit above the rank-and-file, whatever they're called.
export const LEADERSHIP_ROLES: readonly MemberRole[] =
  ["Board", "Chapter President", "Chapter VP", "Developer", "Team Lead"];

// New York is run by the founders, so it has no President — the Board fills
// that seat. Every other chapter gets its own.
export const CHAPTER_EXEC_ROLES: readonly MemberRole[] = ["Chapter President", "Chapter VP"];

export const ROLE_SORT_ORDER: Record<string, number> =
  Object.fromEntries(MEMBER_ROLES.map((role, i) => [role, i]));

// ── Display tiers ────────────────────────────────────────────────────────────
// What the directory groups by. LIT sits between leadership and members and is
// computed from pod leadership rather than stored.
export type MemberTier = "board" | "chapter-exec" | "leadership" | "lit" | "member";

export const TIER_LABEL: Record<MemberTier, string> = {
  board:          "Board",
  "chapter-exec": "Chapter exec",
  leadership:     "Leadership",
  lit:            "LIT",
  member:         "Members",
};

export const TIER_ORDER: MemberTier[] =
  ["board", "chapter-exec", "leadership", "lit", "member"];

export function memberTier(role: unknown, podsLed: number): MemberTier {
  const value = String(role ?? "").trim() as MemberRole;
  if (value === "Board") return "board";
  if (CHAPTER_EXEC_ROLES.includes(value)) return "chapter-exec";
  if (value === TECH_LEAD_ROLE || value === "Team Lead") return "leadership";
  if (podsLed > 0) return "lit";
  return "member";
}

// ── Status ───────────────────────────────────────────────────────────────────
export const MEMBER_STATUSES = ["Active", "Inactive"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export function isInactiveMember(status: unknown): boolean {
  return String(status ?? "").trim().toLowerCase() === "inactive";
}

// ── Infraction standing ──────────────────────────────────────────────────────
// Points used to accumulate against a per-cycle threshold. Cycles are gone, so
// the thresholds are org-level and live in site_settings.permissions so they can
// be retuned without a deploy. These are only the fallback.
export const DEFAULT_INFRACTION_THRESHOLDS = { notice: 3, warning: 6, review: 10 };

export type InfractionThresholds = typeof DEFAULT_INFRACTION_THRESHOLDS;
export type InfractionStanding = "clear" | "notice" | "warning" | "review";

export function infractionStanding(
  points: number,
  thresholds: InfractionThresholds = DEFAULT_INFRACTION_THRESHOLDS,
): InfractionStanding {
  if (points >= thresholds.review) return "review";
  if (points >= thresholds.warning) return "warning";
  if (points >= thresholds.notice) return "notice";
  return "clear";
}

export const STANDING_LABEL: Record<InfractionStanding, string> = {
  clear:   "Clear",
  notice:  "Notice",
  warning: "Warning",
  review:  "Needs review",
};

export const STANDING_STYLE: Record<InfractionStanding, string> = {
  clear:   "text-white/30",
  notice:  "text-yellow-300",
  warning: "text-orange-300",
  review:  "text-red-400",
};

// ── Work score ───────────────────────────────────────────────────────────────
// Mirrors the weighting in member_contributions so the UI can explain it. Kept
// visible on purpose: credits failed partly because nobody could see the maths.
export const WORK_SCORE_WEIGHTS = [
  { label: "site shipped",   weight: 10 },
  { label: "site in flight", weight: 3 },
  { label: "task done",      weight: 2 },
  { label: "meeting",        weight: 1 },
  { label: "hour logged",    weight: 1 },
] as const;

export const WORK_SCORE_EXPLAINER =
  WORK_SCORE_WEIGHTS.map((w) => `${w.weight}× ${w.label}`).join(" · ");
