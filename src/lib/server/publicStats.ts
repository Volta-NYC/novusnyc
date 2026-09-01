import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getPublicLiveStats } from "@/lib/server/publicShowcase";

export type PublicStatOverrides = Record<string, string>;

export const PUBLIC_STAT_KEYS = [
  "homeStudentMembers",
  "homeBusinessesSupported",
  "communityOrganizations",
  "homeSchoolsRepresented",
  "aboutBusinesses",
  "aboutWebsiteProjects",
  "aboutMarketingProjects",
] as const;

export type PublicStatKey = (typeof PUBLIC_STAT_KEYS)[number];
export type PublicStatValues = Record<PublicStatKey, string>;

export interface PublicStatSnapshot {
  automaticValues: PublicStatValues;
  effectiveValues: PublicStatValues;
  overrides: PublicStatOverrides;
}

/**
 * All-time public totals. The database is not a complete historical archive —
 * it holds current members and current businesses, not everyone ever served —
 * so these run ahead of the live counts on purpose.
 *
 * They are the *seed for an override*, not an automatic value. Presenting them
 * as automatic meant the admin panel showed a hand-written figure in the column
 * labelled "automatic" and there was no way to see the real number at all.
 */
export const PUBLISHED_IMPACT_TOTALS = {
  students: "400+",
  businesses: "170+",
} as const;

async function getActiveMemberCount(): Promise<number> {
  try {
    const { count } = await getSupabaseAdmin()
      .from("team")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .neq("status", "Inactive");
    return count ?? 0;
  } catch {
    return 0;
  }
}

async function getSchoolsRepresentedCount(): Promise<number> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("team")
      .select("school")
      .is("deleted_at", null)
      .neq("status", "Inactive");
    if (error) throw error;

    // Distinct on the trimmed, case-folded name so "Stuyvesant High School" and
    // a stray " stuyvesant high school " count once. Normalization of known
    // aliases happens in migration 20260824000006; this only guards leftovers.
    const names = new Set<string>();
    for (const row of data ?? []) {
      const name = typeof row.school === "string" ? row.school.trim() : "";
      if (name) names.add(name.toLowerCase());
    }
    return names.size;
  } catch {
    return 0;
  }
}

async function getCommunityOrganizationCount(): Promise<number> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("bids")
      .select("name");
    if (error) throw error;

    return (data ?? []).filter((row) => typeof row.name === "string" && row.name.trim().length > 0).length;
  } catch {
    // Do not substitute an unverifiable marketing claim when the live source
    // cannot be reached. A manual portal override remains available if needed.
    return 0;
  }
}

export async function getPublicStatOverrides(): Promise<PublicStatOverrides> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("site_settings")
      .select("public_stat_overrides")
      .eq("id", "singleton")
      .maybeSingle();
    const raw = data?.public_stat_overrides;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "").trim()]));
  } catch {
    return {};
  }
}

export function publicStat(overrides: PublicStatOverrides, key: string, fallback: string): string {
  return overrides[key] || fallback;
}

export function publicCommunityOrganizationStat(overrides: PublicStatOverrides, fallback: string): string {
  return overrides.communityOrganizations
    || overrides.homeCommunityPartners
    || overrides.aboutCommunityPartners
    || fallback;
}

/**
 * The single source of truth for every value shown in the Public Numbers admin
 * panel and its corresponding public counter. Keeping both the automatic and
 * effective values here prevents the admin preview from drifting from the site.
 */
export async function getPublicStatSnapshot(): Promise<PublicStatSnapshot> {
  const [rawOverrides, liveStats, communityOrganizations, activeMembers, schoolsRepresented] = await Promise.all([
    getPublicStatOverrides(),
    getPublicLiveStats(),
    getCommunityOrganizationCount(),
    getActiveMemberCount(),
    getSchoolsRepresentedCount(),
  ]);

  const overrides: PublicStatOverrides = { ...rawOverrides };
  const communityOverride = rawOverrides.communityOrganizations
    || rawOverrides.homeCommunityPartners
    || rawOverrides.aboutCommunityPartners;
  if (communityOverride) overrides.communityOrganizations = communityOverride;
  delete overrides.homeCommunityPartners;
  delete overrides.aboutCommunityPartners;

  const automaticValues: PublicStatValues = {
    // What the database actually holds right now. The published all-time
    // figures live in the overrides, so the panel can show both.
    homeStudentMembers: `${activeMembers}`,
    homeBusinessesSupported: `${liveStats.totalBusinesses}`,
    communityOrganizations: `${communityOrganizations}+`,
    homeSchoolsRepresented: `${schoolsRepresented}+`,
    aboutBusinesses: `${liveStats.totalBusinesses}`,
    aboutWebsiteProjects: `${liveStats.websiteProjects}+`,
    aboutMarketingProjects: `${liveStats.marketingProjects}+`,
  };

  const effectiveValues: PublicStatValues = {
    homeStudentMembers: publicStat(overrides, "homeStudentMembers", automaticValues.homeStudentMembers),
    homeBusinessesSupported: publicStat(overrides, "homeBusinessesSupported", automaticValues.homeBusinessesSupported),
    communityOrganizations: publicCommunityOrganizationStat(overrides, automaticValues.communityOrganizations),
    homeSchoolsRepresented: publicStat(overrides, "homeSchoolsRepresented", automaticValues.homeSchoolsRepresented),
    aboutBusinesses: publicStat(overrides, "aboutBusinesses", automaticValues.aboutBusinesses),
    aboutWebsiteProjects: publicStat(overrides, "aboutWebsiteProjects", automaticValues.aboutWebsiteProjects),
    aboutMarketingProjects: publicStat(overrides, "aboutMarketingProjects", automaticValues.aboutMarketingProjects),
  };

  return { automaticValues, effectiveValues, overrides };
}
