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
  | "agency"
  | "bid"
  | "ldc"
  | "merchant-association"
  | "community-org"
  | "program";

export type Borough = "Queens" | "Brooklyn" | "Manhattan" | "Bronx" | "Staten Island";
export type PartnerSector = "citywide" | Borough;

export interface PartnerBusiness {
  name: string;
  status: "live" | "in-progress";
  url?: string;
  // The partner organization's own site, which Novus built.
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
  // Citywide organizations still need a place on the map's borough ring.
  mapSector?: Borough;
  // A partner that helped form this one, named so the two never read as one listed twice.
  formedWith?: string;
  depth: "deep" | "active";
  roles: PartnerRole[];
  summary: string;
  facts?: string[];
  heldFacts?: string[];
  businesses?: PartnerBusiness[];
  introducedBy?: Introduction[];
  testimonial?: { quote: string; name: string; business: string; approved: boolean };
  monogram?: string;
  since?: string;
  hidden?: boolean;
}

export type PublicPartnership = Omit<Partnership, "heldFacts" | "testimonial" | "hidden"> & {
  logo?: string;
  testimonial?: { quote: string; name: string; business: string };
};

export const ROLE_LABEL: Record<PartnerRole, string> = {
  "introduces-merchants": "introduced merchants",
  "field-outreach": "walked the neighborhood with us",
  "built-their-site": "we built their website",
  "maintains-sites": "relays owner updates",
  "owner-liaison": "gathers owner feedback",
  "connected-network": "connected us to other organizations",
  event: "hosted us at an event",
  "shares-resource": "shares Novus with merchants",
  "advises-novus": "advises Novus",
};

export type PartnerTone = "purple" | "orange";

export const KIND_TONE: Record<PartnerKind, PartnerTone> = {
  network: "purple",
  chamber: "purple",
  agency: "purple",
  "community-org": "purple",
  bid: "orange",
  ldc: "orange",
  "merchant-association": "orange",
  program: "orange",
};

export const KIND_LABEL: Record<PartnerKind, string> = {
  network: "Citywide network",
  chamber: "Chamber of commerce",
  agency: "City agency",
  bid: "Business improvement district",
  ldc: "Development organization",
  "merchant-association": "Merchant association",
  program: "Program",
  "community-org": "Community organization",
};

export function sectorLabel(sector: PartnerSector): string {
  return sector === "citywide" ? "Citywide" : sector;
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
      "The Bayside Village BID introduces merchants in its district to Novus and follows up with owners so drafts get the feedback they need. After a site launches, the BID passes the owner's changes to the team, which keeps the site current.",
    facts: [
      "Walked the team through Bayside in March 2026.",
      "Raised web accessibility with a merchant, which led Novus to bring Spin Bagel's site up to the WCAG 2.1 AA standard in July 2026.",
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
    shortName: "Brooklyn Chamber of Commerce",
    kind: "chamber",
    sector: "Brooklyn",
    depth: "deep",
    roles: ["introduces-merchants", "field-outreach", "connected-network"],
    summary:
      "The Brooklyn Chamber of Commerce refers Brooklyn business owners to Novus. It also introduced the team to the chamber specialists in Staten Island, Manhattan and the Bronx, and one of the businesses it referred later opened the door to the Local Development Corporation of East New York.",
    facts: [
      "Listed Novus as a resource in the Small Business Resource Network's referral system in May 2026.",
      "Walked Bed-Stuy with the team in July 2026, meeting merchants along the way.",
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
      "Cypress Hills Local Development Corporation refers entrepreneurs from its Business Partners program to Novus, and the team reports each project's progress back to the program. Its staff have also advised Novus on operations and client management, and the LDC helped form the Cypress Hills Fulton BID, which works with the team on Fulton Street.",
    businesses: [
      { name: "Safa Sanctuary", status: "live", url: "https://www.safasanctuary.org" },
      { name: "BroadPivot Consulting LLC", status: "live", url: "https://broadpivotllc.com" },
      { name: "Gloria Jean Community Art Center", status: "in-progress" },
    ],
    since: "January 2026",
  },
  {
    id: "cypress-hills-fulton-bid",
    name: "Cypress Hills Fulton BID",
    shortName: "Cypress Hills Fulton BID",
    kind: "bid",
    sector: "Brooklyn",
    depth: "active",
    formedWith: "chldc",
    roles: ["field-outreach"],
    summary:
      "The Cypress Hills Fulton BID has covered Fulton Street in Cypress Hills since it was created in 2024. It walked the corridor with the team in March 2026 to meet merchants, and met with Novus that April about Google Business Profiles and social media for the businesses along it.",
    introducedBy: [{ from: "chldc" }],
  },
  {
    id: "atlantic-avenue-bid",
    name: "Atlantic Avenue BID",
    shortName: "Atlantic Avenue BID",
    kind: "bid",
    sector: "Brooklyn",
    depth: "active",
    roles: ["shares-resource"],
    summary:
      "The Atlantic Avenue BID ran Novus's intake form in its newsletter and approached merchants along Atlantic Avenue about working with the team.",
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
      "Novus designed and built the Forest Avenue BID's own website. The BID introduces merchants along Forest Avenue, coordinates visits to the corridor, and helps the team reach owners for the photos, menus and feedback their sites need.",
    businesses: [
      { name: "forestavenuebid.com", status: "live", url: "https://forestavenuebid.com" },
      { name: "Moretti Bakery", status: "in-progress" },
      { name: "Chey Florist", status: "in-progress" },
      { name: "Taqueria El Buchon", status: "in-progress" },
    ],
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
      "The Staten Island Business Outreach Center is the business-support arm of the West Brighton Community Local Development Corporation. Novus designed and built its website, inquiry form included, and SIBOC shares the team with merchants across Staten Island.",
    facts: ["Shared Novus's flyer with local merchants in February 2026."],
    businesses: [{ name: "siboc.org", status: "live", url: "https://siboc.org" }],
    introducedBy: [{ from: "forest-avenue-bid" }],
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
      "The Sunnyside Shines BID introduces owners in Sunnyside to Novus and invites the team to meet merchants at its events, including the Sunnyside Night Market.",
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
      "The Park Slope Fifth Avenue BID introduced Novus to merchants along Fifth Avenue and organized a merchant walk in January 2026 so the team could meet owners in person. Petite Dumpling, one of those introductions, launched its site that August.",
    businesses: [{ name: "Petite Dumpling", status: "live", url: "https://petitedumpling.com" }],
    since: "January 2026",
  },
  {
    id: "aaf",
    name: "Asian American Federation",
    shortName: "Asian American Federation",
    kind: "community-org",
    sector: "citywide",
    mapSector: "Manhattan",
    depth: "deep",
    roles: ["introduces-merchants", "owner-liaison"],
    summary:
      "The Asian American Federation introduces the owners of small businesses it works with to Novus. Its staff visit owners in person to show them their drafts, gather feedback and help with domains.",
    businesses: [{ name: "JeunJu Korean Restaurant", status: "in-progress" }],
    since: "January 2026",
  },
  {
    id: "sbrn",
    name: "NYC Small Business Resource Network (SBRN)",
    shortName: "SBRN",
    kind: "network",
    sector: "citywide",
    mapSector: "Manhattan",
    depth: "deep",
    roles: ["connected-network", "introduces-merchants"],
    summary:
      "The NYC Small Business Resource Network connects business owners with support in all five boroughs through specialists based at the borough chambers. Novus presented to specialists from every borough in June 2026, and they now introduce owners who need a website and coordinate the follow-up with the team.",
    facts: ["Lists Novus as a website resource in its referral system."],
    introducedBy: [
      { from: "brooklyn-chamber" },
      { from: "bronx-chamber" },
      { from: "queens-chamber" },
      { from: "manhattan-chamber" },
      { from: "si-chamber" },
    ],
  },
  {
    id: "nyc-sbs",
    name: "NYC Small Business Services",
    shortName: "NYC SBS",
    kind: "agency",
    sector: "citywide",
    mapSector: "Manhattan",
    depth: "active",
    roles: [],
    summary:
      "NYC Small Business Services is the city agency for small business support. Novus met with its staff in June 2026 and followed up with an overview of the neighborhood partnerships behind the team's work.",
  },
  {
    id: "bronx-chamber",
    name: "Bronx Chamber of Commerce",
    shortName: "Bronx Chamber of Commerce",
    kind: "chamber",
    sector: "Bronx",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "A Small Business Resource Network specialist based at the Bronx Chamber of Commerce introduces Bronx business owners to Novus.",
    businesses: [{ name: "Beauty & The Beast Driving School", status: "in-progress" }],
    introducedBy: [{ from: "brooklyn-chamber" }],
  },
  {
    // The March tour is from the founder; the February meeting is in the research.
    id: "third-avenue-bid",
    name: "Third Avenue BID",
    shortName: "Third Avenue BID",
    kind: "bid",
    sector: "Bronx",
    depth: "active",
    roles: ["field-outreach"],
    summary:
      "The Third Avenue BID met with Novus in February 2026, and the team toured its Bronx district in person that March.",
  },
  {
    id: "queens-chamber",
    name: "Queens Chamber of Commerce",
    shortName: "Queens Chamber of Commerce",
    kind: "chamber",
    sector: "Queens",
    depth: "active",
    roles: ["connected-network", "introduces-merchants"],
    summary:
      "The Queens Chamber of Commerce met with Novus in May 2026 and introduced the team to the Small Business Resource Network's leadership, which led to the presentation to specialists from all five boroughs. Its business support team has since referred a Queens owner to Novus.",
    introducedBy: [{ from: "bayside-village-bid" }],
  },
  {
    id: "manhattan-chamber",
    name: "Manhattan Chamber of Commerce",
    shortName: "Manhattan Chamber of Commerce",
    kind: "chamber",
    sector: "Manhattan",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "A Small Business Resource Network specialist based at the Manhattan Chamber of Commerce refers Manhattan business owners to Novus and coordinates intake with the team.",
    introducedBy: [{ from: "brooklyn-chamber" }],
  },
  {
    id: "si-chamber",
    name: "Staten Island Chamber of Commerce",
    shortName: "Staten Island Chamber of Commerce",
    kind: "chamber",
    sector: "Staten Island",
    depth: "active",
    roles: ["introduces-merchants"],
    summary:
      "A Small Business Resource Network specialist based at the Staten Island Chamber of Commerce refers Staten Island business owners to Novus.",
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
      "The Local Development Corporation of East New York came to Novus through a client: the founder of Golden Rose Employment Agency, a business the Brooklyn Chamber referred, made the introduction in August 2026. The LDC met the team that September and has since introduced five business owners.",
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
      "The East New York Merchants Association invited Novus to its \"Let's Fill These Storefronts!\" event in May 2026, where the team met local owners. Rell's Cafe Corner is one of the projects that came out of it.",
    businesses: [{ name: "Rell's Cafe Corner", status: "in-progress" }],
    introducedBy: [{ from: "chldc" }],
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
      "The North Flatbush BID met with Novus in March 2026, and the team visited the district later that month. The BID has since introduced merchants along the corridor to Novus.",
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
      "The Bay Ridge 5th Avenue BID shared its list of Fifth Avenue merchants in September 2026 and recommended owners for Novus to contact. The team followed with personalized outreach to each business the BID recommended.",
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
      "The Castleton Avenue Merchants Organization represents the merchants on Castleton Avenue in Staten Island. Clay & Kiln Studio came to Novus through CAMO and launched its site in July 2026.",
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
      "The Queens Economic Development Corporation met with Novus in May 2026 about reaching Queens merchants and has since referred an owner to the team.",
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
      "The Long Island City Partnership met with Novus in July 2026 and shares the team with local businesses that need help with their websites.",
  },
  {
    id: "lower-east-side-partnership",
    name: "Lower East Side Partnership",
    shortName: "Lower East Side Partnership",
    kind: "bid",
    sector: "Manhattan",
    depth: "active",
    roles: ["shares-resource"],
    summary:
      "The Lower East Side Partnership connects Novus with small businesses in the Lower East Side.",
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

const NYC_SBS_ID = "nyc-sbs";

// NYC SBS connects Novus with each organization shown on the public map.
// Keep each partner's specific introductions above, then add the citywide
// connection consistently here.
export const visiblePartnerships = partnerships
  .filter((partner) => !partner.hidden)
  .map((partner) => {
    if (partner.id === NYC_SBS_ID) return partner;
    const introducedBy = partner.introducedBy ?? [];
    if (introducedBy.some((introduction) => introduction.from === NYC_SBS_ID)) return partner;
    return { ...partner, introducedBy: [...introducedBy, { from: NYC_SBS_ID }] };
  });
