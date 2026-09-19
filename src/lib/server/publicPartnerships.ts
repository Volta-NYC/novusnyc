import "server-only";

import { communityPartners } from "@/data";
import { visiblePartnerships, type PublicPartnership } from "@/data/partnerships";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// SIBOC has no bids row of its own; its parent organization's row carries the logo.
const LOGO_NAME: Record<string, string> = {
  siboc: "West Brighton Community Local Development Corporation",
};

function normalizeName(value: string): string {
  return value.toLowerCase().replace(/&/g, "and").replace(/\([^)]*\)/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

async function fetchBidLogos(): Promise<Map<string, string>> {
  const logos = new Map<string, string>();
  try {
    const { data, error } = await getSupabaseAdmin().from("bids").select("name, logo_url");
    if (error) throw error;
    for (const row of data ?? []) {
      const name = typeof row.name === "string" ? row.name : "";
      const url = typeof row.logo_url === "string" ? row.logo_url.trim() : "";
      if (name && url) logos.set(name, url);
    }
  } catch {
    // The editorial logos in communityPartners cover a transient read failure.
  }
  return logos;
}

export async function getPublicPartnerships(): Promise<PublicPartnership[]> {
  const bidLogos = await fetchBidLogos();
  const editorial = new Map(communityPartners.map((partner) => [normalizeName(partner.name), partner]));

  return visiblePartnerships.map((partner) => {
    const joinName = LOGO_NAME[partner.id] ?? partner.name;
    const fallback = editorial.get(normalizeName(joinName));
    const siteBusiness = partner.businesses?.find((business) => business.name.endsWith(" website"));
    const website = siteBusiness?.url ?? fallback?.website;

    const { heldFacts: _heldFacts, testimonial, hidden: _hidden, ...rest } = partner;
    return {
      ...rest,
      logo: bidLogos.get(joinName) ?? fallback?.logo,
      website: website && !website.includes("vercel.app") ? website : undefined,
      testimonial: testimonial?.approved && testimonial.quote
        ? { quote: testimonial.quote, name: testimonial.name, business: testimonial.business }
        : undefined,
    };
  });
}
