// Source: novus-partnership-research-v2.md (Sept 19, 2026), with v1 for items
// v2 marks as carried over. Every statement here must trace to that research.
//
// A business may be named only when it is live or already public on /showcase.
// This page must never be the first place a client becomes public.

export type PartnerRole =
  | "introduces-merchants"
  | "field-outreach"
  | "built-their-site"
  | "maintains-sites"
  | "owner-liaison"
  | "connected-network"
  | "event"
  | "shares-resource"
  | "advises-novus";

export type PartnerKind =
  | "network"
  | "chamber"
  | "bid"
  | "ldc"
  | "merchant-association"
  | "community-org"
  | "program";

export type PartnerSector = "citywide" | "Queens" | "Brooklyn" | "Manhattan" | "Bronx" | "Staten Island";

export interface PartnerBusiness {
  name: string;
  status: "live" | "in-progress";
  url?: string;
}

export interface Introduction {
  from: string;
  via?: string;
}

export interface Partnership {
  id: string;
  name: string;
  shortName: string;
  kind: PartnerKind;
  sector: PartnerSector;
  depth: "deep" | "active";
  roles: PartnerRole[];
  summary: string;
  facts?: string[];
  heldFacts?: string[];
  businesses?: PartnerBusiness[];
  introducedBy?: Introduction[];
  worksAlongside?: string[];
  testimonial?: { quote: string; name: string; business: string; approved: boolean };
  image?: { src: string; alt: string };
  monogram?: string;
  since?: string;
  hidden?: boolean;
}

export type PublicPartnership = Omit<Partnership, "heldFacts" | "testimonial" | "hidden"> & {
  logo?: string;
  website?: string;
  testimonial?: { quote: string; name: string; business: string };
};

export const ROLE_META: Record<PartnerRole, { label: string; description: string }> = {
  "introduces-merchants": {
    label: "Introduced merchants",
    description: "Referred business owners who needed a website to Novus.",
  },
  "field-outreach": {
    label: "Walked the corridor with us",
    description: "Organized merchant walks and visits so the team could meet owners in person.",
  },
  "built-their-site": {
    label: "We built their website",
    description: "Novus designed and built the organization's own website.",
  },
  "maintains-sites": {
    label: "Relays owner updates",
    description: "Passes owners' changes to Novus after launch so their sites stay current.",
  },
  "owner-liaison": {
    label: "Gathers owner feedback",
    description: "Visits or follows up with owners to collect feedback, photos and menus for their drafts.",
  },
  "connected-network": {
    label: "Connected us to other organizations",
    description: "Introduced Novus to other organizations that support small businesses.",
  },
  event: {
    label: "Hosted us at an event",
    description: "Invited Novus to a neighborhood event to meet business owners.",
  },
  "shares-resource": {
    label: "Shares Novus with merchants",
    description: "Circulates Novus to local businesses as a resource for their websites.",
  },
  "advises-novus": {
    label: "Advises Novus",
    description: "Offers guidance on how Novus runs as an organization.",
  },
};

export const ROLE_ORDER: PartnerRole[] = [
  "introduces-merchants",
  "field-outreach",
  "owner-liaison",
  "maintains-sites",
  "built-their-site",
  "connected-network",
  "event",
  "shares-resource",
  "advises-novus",
];

export type PartnerTone = "purple" | "orange" | "yellow";

export const KIND_TONE: Record<PartnerKind, PartnerTone> = {
  network: "purple",
  chamber: "purple",
  bid: "orange",
  ldc: "orange",
  "merchant-association": "orange",
  program: "orange",
  "community-org": "yellow",
};

export const KIND_LABEL: Record<PartnerKind, string> = {
  network: "Citywide network",
  chamber: "Chamber of commerce",
  bid: "Business improvement district",
  ldc: "Development organization",
  "merchant-association": "Merchant association",
  program: "Program",
  "community-org": "Community organization",
};

export function sectorLabel(sector: PartnerSector): string {
  return sector === "citywide" ? "Citywide" : sector;
}

export function liveSiteCount(partners: { businesses?: PartnerBusiness[] }[]): number {
  const names = new Set<string>();
  for (const partner of partners) {
    for (const business of partner.businesses ?? []) {
      if (business.status === "live") names.add(business.name);
    }
  }
  return names.size;
}

export const SECTOR_ORDER: PartnerSector[] = ["citywide", "Queens", "Brooklyn", "Manhattan", "Bronx", "Staten Island"];

export const partnerships: Partnership[] = [
  {
    id: "bayside-village-bid",
    name: "Bayside Village BID",
    shortName: "Bayside Village BID",
    kind: "bid",
    sector: "Queens",
    depth: "deep",
    roles: ["introduces-merchants", "owner-liaison", "maintains-sites"],
    summary:
      "The Bayside Village BID introduces merchants in its district to Novus and follows up with owners so drafts get the feedback they need. After a site launches, the BID relays the owner's changes to the team, which keeps the site current.",
    facts: [
      "Walked the team through the neighborhood in March 2026.",
      "Raised web accessibility with a merchant, and Novus brought Spin Bagel's site to the WCAG 2.1 AA standard in July 2026.",
      "Relayed a round of Papazzio's post-launch updates, which went live in September 2026.",
    ],
    // needs founder approval
    heldFacts: ["Helped cover domain and hosting costs for merchant sites in its district."],
    businesses: [
      { name: "Spin Bagel", status: "live", url: "https://spinbagel.com" },
      { name: "Masala Box", status: "live", url: "https://masalaboxbayside.com" },
      { name: "Papazzio", status: "live", url: "https://papazzio.com" },
      { name: "Golden K Burgers", status: "in-progress" },
      { name: "Momo Ashi", status: "in-progress" },
      { name: "Golf Town", status: "in-progress" },
    ],
    testimonial: { quote: "", name: "", business: "Masala Box", approved: false },
    since: "January 2026",
  },
  {
    id: "brooklyn-chamber",
    name: "Brooklyn Chamber of Commerce",
    shortName: "Brooklyn Chamber",
    kind: "chamber",
    sector: "Brooklyn",
    depth: "deep",
    roles: ["introduces-merchants", "field-outreach", "connected-network"],
    summary:
      "The Brooklyn Chamber of Commerce refers Brooklyn business owners to Novus and listed us as a resource in the Small Business Resource Network's referral system, where specialists across the city can find us. It also introduced us to the chamber specialists in Staten Island, Manhattan and the Bronx.",
    facts: [
      "Listed Novus as a resource in the SBRN referral system in May 2026.",
      "Walked Bedford and Nostrand Avenues in Bed-Stuy with the team on July 22, 2026, meeting merchants along the way.",
      "Introduced Novus to the SBRN specialists at the Staten Island, Manhattan and Bronx chambers in July 2026.",
    ],
    businesses: [
      { name: "Golden Rose Employment Agency", status: "live", url: "https://agenciadeempleosnyc.com" },
      { name: "Balabusta Brooklyn", status: "live", url: "https://balabustabrooklyn.com" },
      { name: "NowThen", status: "in-progress" },
      { name: "Rinconcito Domex", status: "in-progress" },
      { name: "Canto Violation Solutions", status: "in-progress" },
    ],
  },
  {
    id: "chldc",
    name: "Cypress Hills Local Development Corporation",
    shortName: "Cypress Hills LDC",
    kind: "ldc",
    sector: "Brooklyn",
    depth: "deep",
    roles: ["introduces-merchants", "field-outreach", "advises-novus"],
    summary:
      "Cypress Hills Local Development Corporation refers entrepreneurs from its Business Partners program to Novus, and the team reports each project's progress back to the program. Its Cypress Hills Fulton BID walked Fulton Street with us on March 9 to meet merchants. CHLDC staff have also offered Novus guidance on operations and client management.",
    facts: [
      "Walked Fulton Street with the team and the Cypress Hills Fulton BID on March 9, 2026.",
      "Met with the team in April 2026, through the Cypress Hills Fulton BID, about Google Business Profiles and social media for Fulton Street businesses.",
    ],
    businesses: [
      { name: "Safa Sanctuary", status: "live", url: "https://www.safasanctuary.org" },
      { name: "BroadPivot Consulting LLC", status: "live", url: "https://broadpivotllc.com" },
      { name: "Gloria Jean Community Art Center", status: "in-progress" },
    ],
    since: "January 2026",
  },
  {
    id: "forest-avenue-bid",
    name: "Forest Avenue BID",
    shortName: "Forest Avenue BID",
    kind: "bid",
    sector: "Staten Island",
    depth: "deep",
    roles: ["built-their-site", "introduces-merchants", "field-outreach", "owner-liaison"],
    summary:
      "Novus designed and built the Forest Avenue BID's own website. The BID also introduces merchants on Forest Avenue, coordinated visits along the corridor, and helps the team reach owners for the photos, menus and feedback their sites need. It works alongside the Staten Island Business Outreach Center, whose website Novus also built.",
    facts: [
      "Novus added neighborhood and storefront photography to the BID's website in May 2026.",
    ],
    businesses: [
      { name: "Forest Avenue BID website", status: "live", url: "https://forestavenuebid.com" },
      { name: "Moretti Bakery", status: "in-progress" },
      { name: "Chey Florist", status: "in-progress" },
      { name: "Taqueria El Buchon", status: "in-progress" },
    ],
    worksAlongside: ["siboc"],
    since: "January 2026",
  },
  {
    id: "siboc",
    name: "Staten Island Business Outreach Center",
    shortName: "SIBOC",
    kind: "ldc",
    sector: "Staten Island",
    depth: "deep",
    roles: ["built-their-site", "shares-resource"],
    summary:
      "The Staten Island Business Outreach Center is the business-support arm of the West Brighton Community Local Development Corporation. Novus designed and built SIBOC's website, with a working inquiry form, and asked for the organization's event schedule to keep it current. SIBOC shares Novus with Staten Island merchants.",
    facts: [
      "Shared Novus's flyer with local merchants in February 2026.",
      "Novus added staff photos to SIBOC's website in August 2026.",
    ],
    businesses: [{ name: "SIBOC website", status: "live", url: "https://siboc.org" }],
    worksAlongside: ["forest-avenue-bid"],
  },
  {
    id: "sunnyside-shines",
    name: "Sunnyside Shines BID",
    shortName: "Sunnyside Shines",
    kind: "bid",
    sector: "Queens",
    depth: "deep",
    roles: ["introduces-merchants", "event"],
    summary:
      "The Sunnyside Shines BID introduces owners in Sunnyside to Novus and invited the team to meet merchants at its events, including the Sunnyside Night Market.",
    facts: [
      "Hosted the team at the Sunnyside Night Market and at a merchant event at a local restaurant.",
      "Introduced owners to Novus directly by email in May and June 2026.",
    ],
    businesses: [
      { name: "Tangra Fusion", status: "live", url: "https://tangrafusion.com" },
      { name: "Eggstravaganza", status: "in-progress" },
      { name: "Cardamom Indian Cuisine", status: "in-progress" },
    ],
  },
  {
    id: "park-slope-bid",
    name: "Park Slope Fifth Avenue BID",
    shortName: "Park Slope BID",
    kind: "bid",
    sector: "Brooklyn",
    depth: "deep",
    roles: ["introduces-merchants", "field-outreach"],
    summary:
      "The Park Slope Fifth Avenue BID introduced Novus to merchants on Fifth Avenue and organized a merchant walk so the team could meet owners in person. Petite Dumpling, one of the businesses the BID introduced, launched its website in August 2026.",
    facts: [
      "Organized a merchant walk along Fifth Avenue on January 29, 2026.",
      "Petite Dumpling's website went live on August 14, 2026.",
    ],
    businesses: [{ name: "Petite Dumpling", status: "live", url: "https://petitedumpling.com" }],
    since: "January 2026",
  },
  {
    id: "aaf",
    name: "Asian American Federation",
    shortName: "Asian American Federation",
    kind: "community-org",
    sector: "citywide",
    depth: "deep",
    roles: ["introduces-merchants", "owner-liaison"],
    summary:
      "The Asian American Federation introduces the owners of small businesses it works with to Novus. Its staff visit owners in person to show them their drafts, gather feedback and help with domains.",
    facts: ["Staff visited owners in person to review drafts and collect their feedback in September 2026."],
    businesses: [{ name: "JeunJu Korean Restaurant", status: "in-progress" }],
    since: "January 2026",
  },
  {
    id: "sbrn",
    name: "NYC Small Business Resource Network (SBRN)",
    shortName: "SBRN",
    kind: "network",
    sector: "citywide",
    depth: "deep",
    roles: ["connected-network", "introduces-merchants"],
    summary:
      "The NYC Small Business Resource Network connects business owners with support in all five boroughs, through specialists based at the borough chambers. After the Queens Chamber introduced us, Novus presented to SBRN specialists from every borough. Specialists now introduce owners who need a website and coordinate follow-up with the team.",
    facts: [
      "Novus presented to SBRN specialists from all five boroughs on June 18, 2026.",
      "Lists Novus as a website resource in its referral system.",
    ],
    introducedBy: [{ from: "queens-chamber" }],
  },
  {
    id: "bronx-chamber",
    name: "Bronx Chamber of Commerce",
    shortName: "Bronx Chamber",
    kind: "chamber",
    sector: "Bronx",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "The Bronx Chamber of Commerce's Small Business Resource Network specialist introduces Bronx business owners to Novus.",
    businesses: [{ name: "Beauty & The Beast Driving School", status: "in-progress" }],
    introducedBy: [{ from: "brooklyn-chamber" }],
  },
  {
    id: "queens-chamber",
    name: "Queens Chamber of Commerce",
    shortName: "Queens Chamber",
    kind: "chamber",
    sector: "Queens",
    depth: "active",
    roles: ["connected-network", "introduces-merchants"],
    summary:
      "The Queens Chamber of Commerce introduced Novus to the Small Business Resource Network's leadership, which led to our presentation to specialists from all five boroughs. Its business support team has also referred a Queens owner to Novus.",
    facts: ["Met with the team in May 2026."],
    introducedBy: [{ from: "bayside-village-bid" }],
  },
  {
    id: "manhattan-chamber",
    name: "Manhattan Chamber of Commerce",
    shortName: "Manhattan Chamber",
    kind: "chamber",
    sector: "Manhattan",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "The Manhattan Chamber of Commerce's Small Business Resource Network specialist refers Manhattan business owners to Novus and coordinates intake with the team.",
    introducedBy: [{ from: "brooklyn-chamber" }],
  },
  {
    id: "si-chamber",
    name: "Staten Island Chamber of Commerce",
    shortName: "Staten Island Chamber",
    kind: "chamber",
    sector: "Staten Island",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "The Staten Island Chamber of Commerce's Small Business Resource Network specialist refers Staten Island business owners to Novus.",
    introducedBy: [{ from: "brooklyn-chamber" }],
  },
  {
    id: "ldceny",
    name: "Local Development Corporation of East New York",
    shortName: "LDC of East New York",
    kind: "ldc",
    sector: "Brooklyn",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "The Local Development Corporation of East New York came to Novus through a client. The founder of Golden Rose Employment Agency, a business the Brooklyn Chamber referred, introduced us in August 2026. After meeting the team in September, the LDC introduced five business owners within three days.",
    facts: [
      "Introduced to Novus by the founder of Golden Rose Employment Agency on August 31, 2026.",
      "Introduced five business owners to Novus between September 8 and 10, 2026.",
    ],
    introducedBy: [{ from: "brooklyn-chamber", via: "Golden Rose Employment Agency" }],
    monogram: "LDCENY",
  },
  {
    id: "enyma",
    name: "East New York Merchants Association",
    shortName: "East New York Merchants",
    kind: "merchant-association",
    sector: "Brooklyn",
    depth: "active",
    roles: ["event", "introduces-merchants"],
    summary:
      "The East New York Merchants Association invited Novus to take part in its \"Let's Fill These Storefronts!\" event, where the team met local owners. Rell's Cafe Corner is one of the projects that grew out of that work.",
    facts: ["Novus took part in \"Let's Fill These Storefronts!\" on May 2, 2026."],
    businesses: [{ name: "Rell's Cafe Corner", status: "in-progress" }],
  },
  {
    id: "north-flatbush-bid",
    name: "North Flatbush BID",
    shortName: "North Flatbush BID",
    kind: "bid",
    sector: "Brooklyn",
    depth: "active",
    roles: ["introduces-merchants", "field-outreach"],
    summary:
      "The North Flatbush BID met with Novus in March 2026, and the team then visited the district. The BID introduced merchants in the district to Novus.",
    facts: ["The team visited the district in late March 2026."],
    businesses: [
      { name: "Pho Bar", status: "in-progress" },
      { name: "Eulalee Beckford Designs", status: "in-progress" },
      { name: "Rika Nail Salon", status: "in-progress" },
    ],
    since: "January 2026",
  },
  {
    id: "bay-ridge-bid",
    name: "Bay Ridge 5th Avenue BID",
    shortName: "Bay Ridge BID",
    kind: "bid",
    sector: "Brooklyn",
    depth: "active",
    roles: ["introduces-merchants", "field-outreach"],
    summary:
      "The Bay Ridge 5th Avenue BID shared its list of Fifth Avenue merchants and recommended owners for Novus to contact. The team followed with personalized outreach to each business the BID recommended.",
    facts: ["Shared its merchant list on September 3, 2026. Novus began personalized outreach the next day."],
  },
  {
    id: "camo",
    name: "Castleton Avenue Merchants Organization",
    shortName: "Castleton Avenue Merchants",
    kind: "merchant-association",
    sector: "Staten Island",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "The Castleton Avenue Merchants Organization represents merchants on Castleton Avenue in Staten Island. The Forest Avenue BID introduced us in May 2026, and Clay & Kiln Studio, which came to Novus through CAMO, launched its website in July 2026.",
    facts: ["Clay & Kiln Studio's website went live on July 21, 2026."],
    businesses: [{ name: "Clay & Kiln Studio", status: "live", url: "https://clayandkilnstudio.com" }],
    introducedBy: [{ from: "forest-avenue-bid" }],
  },
  {
    id: "qedc",
    name: "Queens Economic Development Corporation",
    shortName: "Queens EDC",
    kind: "ldc",
    sector: "Queens",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "The Queens Economic Development Corporation met with Novus in May 2026 about reaching Queens merchants and has since referred a business owner to the team.",
    businesses: [{ name: "Savygurlfashion", status: "in-progress" }],
  },
  {
    id: "licp",
    name: "Long Island City Partnership",
    shortName: "LIC Partnership",
    kind: "ldc",
    sector: "Queens",
    depth: "active",
    roles: ["shares-resource"],
    summary:
      "The Long Island City Partnership shares Novus with local businesses that need help with their websites.",
    facts: ["Met with the team in July 2026."],
  },
  {
    // Pending founder open question 4: the redesign was for a staff member's
    // company, not an RDRC-referred merchant.
    id: "rdrc",
    name: "Rockaway Development & Revitalization Corporation",
    shortName: "RDRC",
    kind: "ldc",
    sector: "Queens",
    depth: "active",
    roles: ["built-their-site"],
    monogram: "RDRC",
    summary:
      "Rockaway Development & Revitalization Corporation replied to Novus's outreach in September 2026, and the team delivered a website redesign that was approved that month.",
    hidden: true,
  },
];

export const visiblePartnerships = partnerships.filter((partner) => !partner.hidden);
