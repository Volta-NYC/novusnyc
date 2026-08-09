import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { EMAIL } from "@/lib/mail";

export type PublicShowcaseStatus = "Ongoing" | "Upcoming" | "Completed";
export type PublicShowcaseColor =
  | "blue-soft"
  | "blue-mid"
  | "blue-deep"
  | "lime-soft"
  | "lime-mid"
  | "lime-deep"
  | "amber-soft"
  | "amber-mid"
  | "amber-deep"
  | "pink-soft"
  | "pink-mid"
  | "pink-deep"
  | "purple-mid"
  | "red-soft"
  | "red-mid"
  | "red-deep";

export interface PublicShowcaseCard {
  id: string;
  name: string;
  type: string;
  neighborhood: string;
  services: string[];
  status: PublicShowcaseStatus;
  color: PublicShowcaseColor;
  desc: string;
  url?: string;
  imageUrl?: string;
  featuredOnHome: boolean;
  sortIndex?: number;
}

export interface PublicMapEntry {
  id: string;
  name: string;
  type: string;
  neighborhood: string;
  borough?: string;
  lat?: number;
  lng?: number;
  services: string[];
  status: PublicShowcaseStatus;
  color: PublicShowcaseColor;
  url?: string;
  source: "business" | "bid";
}

export interface PublicImpactStats {
  totalProjects: number;
  websiteProjects: number;
  socialMediaProjects: number;
  seoProjects: number;
  grantProjects: number;
  financeProjects: number;
}

export interface PublicLiveStats {
  totalBusinesses: number;
  websiteProjects: number;   // W# count
  marketingProjects: number; // M# count
  caseStudies: number;       // C# count
  educationalReports: number;// R# count
  bidPartners: number;
}

// Module-level cache so parallel calls within the same ISR revalidation share
// a single Supabase read instead of fetching the full businesses table twice.
let businessesCache: {
  data: Record<string, Record<string, unknown>>;
  fetchedAt: number;
} | null = null;
const BUSINESSES_CACHE_TTL_MS = 60_000;
const NYC_COORDINATE_BOUNDS = {
  minLat: 40.45,
  maxLat: 40.95,
  minLng: -74.35,
  maxLng: -73.65,
};

async function fetchBusinesses(): Promise<Record<string, Record<string, unknown>>> {
  const now = Date.now();
  if (businessesCache && now - businessesCache.fetchedAt < BUSINESSES_CACHE_TTL_MS) {
    return businessesCache.data;
  }
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("businesses").select("*").is("deleted_at", null);
    const obj: Record<string, Record<string, unknown>> = {};
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? "");
      if (!id) continue;
      // Normalize snake_case keys to camelCase for the rest of the logic.
      obj[id] = snakeToCamelRow(r);
    }
    businessesCache = { data: obj, fetchedAt: now };
    return obj;
  } catch {
    return {};
  }
}

function snakeToCamelRow(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    const camel = k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = v;
  }
  return out;
}

function resolvePublicShowcaseImageUrl(
  id: string,
  row: Record<string, unknown>,
): string {
  // Prefer the direct Supabase Storage URL — no redirect, Next.js can optimize it.
  if (asText(row.showcaseImagePath) && asText(row.showcaseImageUrl)) {
    return asText(row.showcaseImageUrl);
  }
  if (row.showcaseImageSet === true || asText(row.showcaseImageData)) {
    return `/api/showcase-image/${encodeURIComponent(id)}`;
  }
  return asText(row.showcaseImageUrl);
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const lower = value.trim().toLowerCase();
    if (lower === "true") return true;
    if (lower === "false") return false;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => asText(item))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeColor(value: unknown): PublicShowcaseColor {
  const key = asText(value).toLowerCase();
  switch (key) {
    case "blue-soft":
    case "blue-mid":
    case "blue-deep":
    case "lime-soft":
    case "lime-mid":
    case "lime-deep":
    case "amber-soft":
    case "amber-mid":
    case "amber-deep":
    case "pink-soft":
    case "pink-mid":
    case "pink-deep":
    case "purple-mid":
    case "red-soft":
    case "red-mid":
    case "red-deep":
      return key;
    // Legacy mappings
    case "green":
    case "green-mid":
    case "green-soft":
      return "lime-mid";
    case "green-deep":
      return "lime-deep";
    case "blue":
      return "blue-mid";
    case "amber":
      return "amber-mid";
    case "orange":
      return "red-mid";
    case "pink":
      return "pink-mid";
    case "purple":
      return "purple-mid";
    default:
      return "blue-mid";
  }
}

function defaultShowcaseColor(): PublicShowcaseColor {
  return "blue-mid";
}

function mapBusinessStatusToShowcase(value: unknown): PublicShowcaseStatus {
  const key = asText(value);
  if (key === "Completed" || key === "Complete") return "Completed";
  if (key === "Ongoing" || key === "Active" || key === "In Progress") return "Ongoing";
  if (key === "Upcoming" || key === "Not Started" || key === "Discovery" || key === "On Hold") return "Upcoming";
  return "Upcoming";
}

function defaultServicesFromDivision(value: unknown): string[] {
  const key = asText(value);
  if (key === "Tech") return ["Website", "SEO"];
  if (key === "Marketing") return ["Social Media", "Brand Strategy"];
  if (key === "Finance") return ["Grant Writing", "Operations"];
  return ["Business Support"];
}

function inferDivision(value: unknown, row: Record<string, unknown>): "Tech" | "Marketing" | "Finance" {
  const direct = asText(value);
  if (direct === "Tech" || direct === "Marketing" || direct === "Finance") return direct;

  const services = asStringArray(row.showcaseServices).map((item) => item.toLowerCase());
  if (services.some((item) => item.includes("grant") || item.includes("finance") || item.includes("ops"))) return "Finance";
  if (services.some((item) => item.includes("social") || item.includes("content") || item.includes("brand"))) return "Marketing";
  return "Tech";
}

function divisionLabel(value: "Tech" | "Marketing" | "Finance"): string {
  if (value === "Tech") return "Digital & Tech";
  if (value === "Marketing") return "Marketing & Strategy";
  return "Finance & Operations";
}

function normalizeNeighborhood(value: unknown, row: Record<string, unknown>): string {
  const fromBusinessField = asText(row.neighborhood);
  if (fromBusinessField) return fromBusinessField;

  const explicit = asText(value);
  if (explicit) return explicit;

  const address = asText(row.address);
  if (!address) return "Neighborhood, Borough";
  const parts = address.split(",").map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]}, ${parts[1]}`;
  return parts[0];
}

function normalizeDescription(value: unknown): string {
  return asText(value);
}

function compareCards(a: PublicShowcaseCard, b: PublicShowcaseCard): number {
  const ai = a.sortIndex ?? Number.MAX_SAFE_INTEGER;
  const bi = b.sortIndex ?? Number.MAX_SAFE_INTEGER;
  if (ai !== bi) return ai - bi;
  return a.name.localeCompare(b.name);
}

function compareMapEntries(a: PublicMapEntry, b: PublicMapEntry): number {
  return a.name.localeCompare(b.name);
}

function isNycCoordinate(lat?: number, lng?: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= NYC_COORDINATE_BOUNDS.minLat &&
    lat <= NYC_COORDINATE_BOUNDS.maxLat &&
    lng >= NYC_COORDINATE_BOUNDS.minLng &&
    lng <= NYC_COORDINATE_BOUNDS.maxLng
  );
}

function mapBidStatusToShowcase(value: unknown): PublicShowcaseStatus {
  const key = asText(value);
  if (key === "Active Partner") return "Ongoing";
  if (key === "In Conversation" || key === "Outreach") return "Upcoming";
  return "Upcoming";
}

function normalizeBoroughName(value: string): string {
  const raw = value.trim().toLowerCase();
  if (!raw) return "";
  if (raw.includes("brooklyn")) return "Brooklyn";
  if (raw.includes("queens")) return "Queens";
  if (raw.includes("manhattan")) return "Manhattan";
  if (raw.includes("bronx")) return "Bronx";
  if (raw.includes("staten")) return "Staten Island";
  return "";
}

function dedupeQueries(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of values) {
    const value = raw.trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function buildBusinessGeocodeQueries(address: string, borough: string): string[] {
  const a = address.trim();
  const b = borough.trim();
  if (!a) return [];
  return dedupeQueries([
    a,
    `${a}, New York, NY`,
    b ? `${a}, ${b}, New York, NY` : "",
  ]);
}

async function geocodeWithGoogle(query: string): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_GEOCODING_API_KEY;
  if (!key) return null;

  const components = encodeURIComponent("country:US|administrative_area:NY");
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=${components}&region=us&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;

  const data = await res.json() as {
    status?: string;
    results?: Array<{
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };
  if (data.status !== "OK") return null;

  const lat = data.results?.[0]?.geometry?.location?.lat;
  const lng = data.results?.[0]?.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return { lat, lng };
}

async function geocodeWithNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": `NovusNYC/1.0 (${EMAIL.info})`,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;

  const rows = await res.json() as Array<{ lat?: string; lon?: string }>;
  const first = rows?.[0];
  if (!first?.lat || !first?.lon) return null;
  const lat = Number(first.lat);
  const lng = Number(first.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

const geocodeCache = new Map<string, { lat: number; lng: number }>();

async function geocodeBusinessAddress(address: string, borough: string): Promise<{ lat: number; lng: number } | null> {
  const queries = buildBusinessGeocodeQueries(address, borough);
  for (const query of queries) {
    const cacheKey = query.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached) return cached;

    const google = await geocodeWithGoogle(query);
    if (google && isNycCoordinate(google.lat, google.lng)) {
      geocodeCache.set(cacheKey, google);
      return google;
    }
  }

  for (const query of queries) {
    const cacheKey = query.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached) return cached;

    const nominatim = await geocodeWithNominatim(query);
    if (nominatim && isNycCoordinate(nominatim.lat, nominatim.lng)) {
      geocodeCache.set(cacheKey, nominatim);
      return nominatim;
    }
  }

  return null;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current] as T);
    }
  };

  const count = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: count }, () => runWorker()));
  return results;
}

function hasService(services: string[], keywords: string[]): boolean {
  return services.some((s) => {
    const lower = s.toLowerCase();
    return keywords.some((kw) => lower.includes(kw));
  });
}

export async function getPublicShowcaseCards(): Promise<PublicShowcaseCard[]> {
  const rows = await fetchBusinesses();
  if (Object.keys(rows).length === 0) return [];
  const explicitCards: PublicShowcaseCard[] = [];
  const fallbackCards: PublicShowcaseCard[] = [];

  for (const [id, row] of Object.entries(rows)) {
    const name = asText(row.showcaseName) || asText(row.name);
    if (!name) continue;

    const division = inferDivision(row.division, row);
    const type = divisionLabel(division);
    const neighborhood = normalizeNeighborhood(row.showcaseNeighborhood, row);
    const services = asStringArray(row.showcaseServices);
    const mergedServices = services.length > 0 ? services : defaultServicesFromDivision(division);
    const status = mapBusinessStatusToShowcase(row.projectStatus);
    const desc = normalizeDescription(row.showcaseDescription);
    const url = asText(row.showcaseUrl);
    const imageUrl = resolvePublicShowcaseImageUrl(id, row);
    const color = asText(row.showcaseColor)
      ? normalizeColor(row.showcaseColor)
      : defaultShowcaseColor();
    const featuredOnHome = asBool(row.showcaseFeaturedOnHome, status !== "Upcoming");
    const sortIndex = typeof row.sortIndex === "number" ? row.sortIndex : undefined;

    const card: PublicShowcaseCard = {
      id,
      name,
      type,
      neighborhood,
      services: mergedServices,
      status,
      color,
      desc,
      url: url || undefined,
      imageUrl: imageUrl || undefined,
      featuredOnHome,
      sortIndex,
    };

    if (asBool(row.showcaseEnabled, false)) {
      explicitCards.push(card);
    } else {
      fallbackCards.push(card);
    }
  }

  if (explicitCards.length > 0) {
    return explicitCards.sort(compareCards);
  }

  return fallbackCards
    .filter((card) => card.status !== "Upcoming")
    .sort(compareCards)
    .slice(0, 12);
}

export async function getPublicImpactStats(): Promise<PublicImpactStats> {
  const rows = await fetchBusinesses();
  if (Object.keys(rows).length === 0) {
    return { totalProjects: 0, websiteProjects: 0, socialMediaProjects: 0, seoProjects: 0, grantProjects: 0, financeProjects: 0 };
  }
  let totalProjects = 0;
  let websiteProjects = 0;
  let socialMediaProjects = 0;
  let seoProjects = 0;
  let grantProjects = 0;
  let financeProjects = 0;

  for (const [, row] of Object.entries(rows)) {
    const name = asText(row.showcaseName) || asText(row.name);
    if (!name) continue;

    const status = mapBusinessStatusToShowcase(row.projectStatus);
    if (status === "Upcoming") continue;

    totalProjects++;
    const services = asStringArray(row.showcaseServices);
    const division = inferDivision(row.division, row);
    const mergedServices = services.length > 0 ? services : defaultServicesFromDivision(division);

    if (hasService(mergedServices, ["website", "web design", "web development"])) websiteProjects++;
    if (hasService(mergedServices, ["social"])) socialMediaProjects++;
    if (hasService(mergedServices, ["seo", "google"])) seoProjects++;
    if (hasService(mergedServices, ["grant"])) grantProjects++;
    if (division === "Finance") financeProjects++;
  }

  return { totalProjects, websiteProjects, socialMediaProjects, seoProjects, grantProjects, financeProjects };
}

export async function getPublicLiveStats(): Promise<PublicLiveStats> {
  const ZERO: PublicLiveStats = { totalBusinesses: 0, websiteProjects: 0, marketingProjects: 0, caseStudies: 0, educationalReports: 0, bidPartners: 0 };
  let sb;
  try { sb = getSupabaseAdmin(); } catch { return ZERO; }

  const [businessRows, { data: financeRows }, { data: bidsRows }] = await Promise.all([
    fetchBusinesses(),
    sb.from("finance_assignments").select("type"),
    sb.from("bids").select("id"),
  ]);

  let totalBusinesses = 0;
  const businesses: Array<{ id: string; name: string; projectTracks?: string[]; trackProjects?: Record<string, unknown> }> = [];

  for (const [id, row] of Object.entries(businessRows)) {
    const name = asText(row.showcaseName) || asText(row.name);
    if (!name) continue;
    totalBusinesses++;
    businesses.push({
      id,
      name,
      projectTracks: Array.isArray(row.projectTracks) ? row.projectTracks as string[] : undefined,
      trackProjects: typeof row.trackProjects === "object" && row.trackProjects !== null
        ? row.trackProjects as Record<string, unknown>
        : undefined,
    });
  }

  let wCount = 0;
  let mCount = 0;

  const sorted = [...businesses].sort((a, b) => a.name.localeCompare(b.name));
  for (const business of sorted) {
    const requestedTracks = (business.projectTracks ?? []) as string[];
    const explicitTracks = Object.keys(business.trackProjects ?? {});
    const allTracks = [...new Set([...requestedTracks, ...explicitTracks])].filter(
      (t) => t === "Tech" || t === "Marketing" || t === "Finance"
    );

    if (allTracks.length === 0) {
      wCount++;
    } else {
      for (const track of allTracks) {
        if (track === "Marketing") mCount++;
        else wCount++;
      }
    }
  }

  let caseStudies = 0;
  let educationalReports = 0;
  for (const row of financeRows ?? []) {
    const r = row as Record<string, unknown>;
    if (r.type === "Case Study") caseStudies++;
    else if (r.type === "Report") educationalReports++;
  }

  const bidPartners = bidsRows?.length ?? 0;

  return { totalBusinesses, websiteProjects: wCount, marketingProjects: mCount, caseStudies, educationalReports, bidPartners };
}

export async function getPublicMapEntries(): Promise<PublicMapEntry[]> {
  let sb;
  try { sb = getSupabaseAdmin(); } catch { return []; }

  const [businessRows, { data: bidsRows }] = await Promise.all([
    fetchBusinesses(),
    sb.from("bids").select("*"),
  ]);

  const entries: PublicMapEntry[] = [];
  const businessGeocodeWrites: Array<{ id: string; lat: number; lng: number }> = [];
  const businessesMissingCoords: Array<{ id: string; address: string; borough: string; entry: PublicMapEntry }> = [];

  for (const [id, row] of Object.entries(businessRows)) {
    const name = asText(row.showcaseName) || asText(row.name);
    if (!name) continue;

    const division = inferDivision(row.division, row);
    const type = divisionLabel(division);
    const neighborhood = normalizeNeighborhood(row.showcaseNeighborhood, row);
    const services = asStringArray(row.showcaseServices);
    const mergedServices = services.length > 0 ? services : defaultServicesFromDivision(division);
    const status = mapBusinessStatusToShowcase(row.projectStatus);
    const url = asText(row.showcaseUrl);
    const color = asText(row.showcaseColor)
      ? normalizeColor(row.showcaseColor)
      : defaultShowcaseColor();
    const address = asText(row.address);
    const borough = normalizeBoroughName(asText(row.borough) || normalizeNeighborhood(row.showcaseNeighborhood, row));
    const lat = asNumber(row.lat);
    const lng = asNumber(row.lng);
    const hasNycCoords = isNycCoordinate(lat ?? undefined, lng ?? undefined);

    const entry: PublicMapEntry = {
      id: `business:${id}`,
      name,
      type,
      neighborhood,
      borough: borough || undefined,
      lat: hasNycCoords ? lat ?? undefined : undefined,
      lng: hasNycCoords ? lng ?? undefined : undefined,
      services: mergedServices,
      status,
      color,
      url: url || undefined,
      source: "business",
    };

    if (!hasNycCoords && address) {
      businessesMissingCoords.push({ id, address, borough, entry });
    }

    entries.push(entry);
  }

  if (businessesMissingCoords.length > 0) {
    const geocoded = await mapWithConcurrency(
      businessesMissingCoords,
      6,
      async ({ id, address, borough, entry }) => {
        const result = await geocodeBusinessAddress(address, borough);
        if (result) {
          entry.lat = result.lat;
          entry.lng = result.lng;
          return { id, lat: result.lat, lng: result.lng };
        }
        return null;
      },
    );

    for (const item of geocoded) {
      if (item) businessGeocodeWrites.push(item);
    }
  }

  if (businessGeocodeWrites.length > 0) {
    await Promise.allSettled(
      businessGeocodeWrites.map(({ id, lat, lng }) =>
        sb.from("businesses").update({
          lat,
          lng,
          updated_at: new Date().toISOString(),
        }).eq("id", id),
      ),
    );
    // Bust the cache so next call picks up the new coords.
    businessesCache = null;
  }

  for (const rawBid of bidsRows ?? []) {
    const row = rawBid as Record<string, unknown>;
    const name = asText(row.name);
    if (!name) continue;

    const id = String(row.id ?? "");
    const borough = normalizeBoroughName(asText(row.borough));
    const address = asText(row.address);
    const zipCode = asText(row.zipCode ?? row.zipcode ?? row.zip);
    const locationLabel = [address, zipCode].filter(Boolean).join(" · ");
    const lat = asNumber(row.lat);
    const lng = asNumber(row.lng);
    const hasNycCoords = isNycCoordinate(lat ?? undefined, lng ?? undefined);
    const status = mapBidStatusToShowcase(row.status);
    const services = asStringArray(row.services);

    entries.push({
      id: `bid:${id}`,
      name,
      type: asText(row.type) || "BID",
      neighborhood: locationLabel || borough || "Location TBD",
      borough: borough || undefined,
      lat: hasNycCoords ? lat ?? undefined : undefined,
      lng: hasNycCoords ? lng ?? undefined : undefined,
      services: services.length > 0 ? services : ["BID"],
      status,
      color: "blue-mid",
      source: "bid",
    });
  }

  return entries.sort(compareMapEntries);
}


export async function getApplicationsStatus(): Promise<{ paused: boolean; message: string }> {
  let sb;
  try { sb = getSupabaseAdmin(); } catch { return { paused: false, message: "" }; }
  const { data } = await sb.from("site_settings").select("applications_paused, applications_paused_msg").eq("id", "singleton").maybeSingle();
  if (!data) return { paused: false, message: "" };
  const r = data as Record<string, unknown>;
  return {
    paused: Boolean(r.applications_paused ?? false),
    message: String(r.applications_paused_msg ?? "Applications are currently paused. Check back soon."),
  };
}
