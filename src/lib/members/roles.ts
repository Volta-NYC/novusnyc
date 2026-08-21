// Member roles, ordered most senior first so dropdowns read top-down.
// Board is an internal leadership designation, not something an applicant is
// accepted into — promotion never assigns it.
export const MEMBER_ROLES = [
  "Board",
  "Senior Associate",
  "Associate",
  "Senior Analyst",
  "Analyst",
] as const;

export type MemberRole = (typeof MEMBER_ROLES)[number];

// Where a newly accepted applicant starts. Previously three code paths
// disagreed — the accept modal, bulk accept, and the server fallback each had
// their own default, one of which ("Member") wasn't a valid role at all.
export const DEFAULT_MEMBER_ROLE: MemberRole = "Analyst";

export const ROLE_SORT_ORDER: Record<string, number> =
  Object.fromEntries(MEMBER_ROLES.map((role, i) => [role, i]));

// Member status. Only Active and Inactive are settable, and only those two
// occur in the data — earlier code also branched on "Reserve", "Alumni" and
// "On Leave", which nothing could produce.
export const MEMBER_STATUSES = ["Active", "Inactive"] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export function isInactiveMember(status: unknown): boolean {
  return String(status ?? "").trim().toLowerCase() === "inactive";
}
