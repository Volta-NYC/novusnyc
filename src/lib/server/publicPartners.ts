import "server-only";

import { communityPartners, type CommunityPartner } from "@/data";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

/**
 * The editorial list controls public order and links. Logo URLs come from the
 * partner record so an owner update in /members/orgs changes every public use.
 */
export async function getPublicCommunityPartners(): Promise<CommunityPartner[]> {
  try {
    const { data, error } = await getSupabaseAdmin().from("bids").select("name, logo_url");
    if (error) throw error;
    const logos = new Map<string, string>();
    for (const row of data ?? []) {
      const name = typeof row.name === "string" ? row.name : "";
      const url = typeof row.logo_url === "string" ? row.logo_url.trim() : "";
      if (name && url) logos.set(normalizeName(name), url);
    }
    return communityPartners.map((partner) => ({
      ...partner,
      logo: logos.get(normalizeName(partner.name)) || partner.logo,
    }));
  } catch {
    // Keep the public site available if Supabase has a transient read failure.
    return communityPartners;
  }
}
