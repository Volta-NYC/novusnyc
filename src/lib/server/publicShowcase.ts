import "server-only";

import { getAdminDB } from "@/lib/firebaseAdmin";

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

function resolvePublicShowcaseImageUrl(
  id: string,
  row: Record<string, unknown>,
): string {
  const inline = asText(row.showcaseImageData);
  if (inline) return `/api/showcase-image/${encodeURIComponent(id)}`;
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
  const text = asText(value);
  if (!text) return "";
  return text.length > 240 ? `${text.slice(0, 237)}...` : text;
}

function compareCards(a: PublicShowcaseCard, b: PublicShowcaseCard): number {
  return a.name.localeCompare(b.name);
}

function compareMapEntries(a: PublicMapEntry, b: PublicMapEntry): number {
  return a.name.localeCompare(b.name);
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
      "User-Agent": "VoltaNYC/1.0 (info@voltanyc.org)",
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
    if (google) {
      geocodeCache.set(cacheKey, google);
      return google;
    }
  }

  for (const query of queries) {
    const cacheKey = query.toLowerCase();
    const cached = geocodeCache.get(cacheKey);
    if (cached) return cached;

    const nominatim = await geocodeWithNominatim(query);
    if (nominatim) {
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

export async function getPublicShowcaseCards(): Promise<PublicShowcaseCard[]> {
  const db = getAdminDB();
  if (!db) return [];

  const snap = await db.ref("businesses").get();
  if (!snap.exists()) return [];

  const rows = snap.val() as Record<string, Record<string, unknown>>;
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

export async function getPublicMapEntries(): Promise<PublicMapEntry[]> {
  const db = getAdminDB();
  if (!db) return [];

  const [businessesSnap, bidsSnap] = await Promise.all([
    db.ref("businesses").get(),
    db.ref("bids").get(),
  ]);

  const entries: PublicMapEntry[] = [];
  const businessGeocodeWrites: Array<{ id: string; lat: number; lng: number }> = [];
  const businessesMissingCoords: Array<{ id: string; address: string; borough: string; entry: PublicMapEntry }> = [];

  if (businessesSnap.exists()) {
    const businesses = businessesSnap.val() as Record<string, Record<string, unknown>>;
    for (const [id, row] of Object.entries(businesses)) {
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

      const entry: PublicMapEntry = {
        id: `business:${id}`,
        name,
        type,
        neighborhood,
        borough: borough || undefined,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        services: mergedServices,
        status,
        color,
        url: url || undefined,
        source: "business",
      };

      if ((lat == null || lng == null) && address) {
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
          db.ref(`businesses/${id}`).update({
            lat,
            lng,
            updatedAt: new Date().toISOString(),
          }),
        ),
      );
    }
  }

  if (bidsSnap.exists()) {
    const bids = bidsSnap.val() as Record<string, Record<string, unknown>>;
    for (const [id, row] of Object.entries(bids)) {
      const name = asText(row.name);
      if (!name) continue;

      const borough = normalizeBoroughName(asText(row.borough));
      const address = asText(row.address);
      const zipCode = asText(row.zipCode ?? row.zipcode ?? row.zip);
      const locationLabel = [address, zipCode].filter(Boolean).join(" · ");
      const lat = asNumber(row.lat);
      const lng = asNumber(row.lng);
      const status = mapBidStatusToShowcase(row.status);
      const services = asStringArray(row.services);

      entries.push({
        id: `bid:${id}`,
        name,
        type: asText(row.type) || "BID",
        neighborhood: locationLabel || borough || "Location TBD",
        borough: borough || undefined,
        lat: lat ?? undefined,
        lng: lng ?? undefined,
        services: services.length > 0 ? services : ["BID"],
        status,
        color: "blue-mid",
        source: "bid",
      });
    }
  }

  return entries.sort(compareMapEntries);
}
