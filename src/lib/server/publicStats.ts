import "server-only";

import { communityPartners } from "@/data";
import { chapterLocations } from "@/data/network";
import { formatCounter } from "@/lib/formatCounter";
import { getPublicLiveStats } from "@/lib/server/publicShowcase";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type PublicStatOverrides = Record<string, string>;

export const PUBLIC_STAT_KEYS = [
  "homeStudentMembers",
  "homeBusinessesSupported",
  "communityOrganizations",
  "homeNetworkLocations",
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

export const PUBLISHED_IMPACT_TOTALS = {
  students: "400+",
  businesses: "150+",
} as const;

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
  const [rawOverrides, liveStats] = await Promise.all([
    getPublicStatOverrides(),
    getPublicLiveStats(),
  ]);

  const overrides: PublicStatOverrides = { ...rawOverrides };
  const communityOverride = rawOverrides.communityOrganizations
    || rawOverrides.homeCommunityPartners
    || rawOverrides.aboutCommunityPartners;
  if (communityOverride) overrides.communityOrganizations = communityOverride;
  delete overrides.homeCommunityPartners;
  delete overrides.aboutCommunityPartners;

  const automaticValues: PublicStatValues = {
    homeStudentMembers: PUBLISHED_IMPACT_TOTALS.students,
    homeBusinessesSupported: PUBLISHED_IMPACT_TOTALS.businesses,
    communityOrganizations: String(communityPartners.length),
    homeNetworkLocations: String(chapterLocations.length),
    aboutBusinesses: PUBLISHED_IMPACT_TOTALS.businesses,
    aboutWebsiteProjects: formatCounter(liveStats.websiteProjects),
    aboutMarketingProjects: formatCounter(liveStats.marketingProjects),
  };

  const effectiveValues: PublicStatValues = {
    homeStudentMembers: publicStat(overrides, "homeStudentMembers", automaticValues.homeStudentMembers),
    homeBusinessesSupported: publicStat(overrides, "homeBusinessesSupported", automaticValues.homeBusinessesSupported),
    communityOrganizations: publicCommunityOrganizationStat(overrides, automaticValues.communityOrganizations),
    homeNetworkLocations: publicStat(overrides, "homeNetworkLocations", automaticValues.homeNetworkLocations),
    aboutBusinesses: publicStat(overrides, "aboutBusinesses", automaticValues.aboutBusinesses),
    aboutWebsiteProjects: publicStat(overrides, "aboutWebsiteProjects", automaticValues.aboutWebsiteProjects),
    aboutMarketingProjects: publicStat(overrides, "aboutMarketingProjects", automaticValues.aboutMarketingProjects),
  };

  return { automaticValues, effectiveValues, overrides };
}
