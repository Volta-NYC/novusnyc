import "server-only";

import { getAdminDB } from "@/lib/firebaseAdmin";

export type PublicShowcaseStatus = "In Progress" | "Active" | "Upcoming";
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

function normalizeStatusFromShowcase(value: unknown): PublicShowcaseStatus | null {
  const key = asText(value);
  if (key === "In Progress" || key === "Active" || key === "Upcoming") return key;
  return null;
}

function mapBusinessStatusToShowcase(value: unknown): PublicShowcaseStatus {
  const key = asText(value);
  if (key === "Active" || key === "Complete") return "Active";
  if (key === "Not Started" || key === "Discovery" || key === "On Hold") return "Upcoming";
  return "In Progress";
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
  if (key === "Active Partner") return "Active";
  if (key === "In Conversation" || key === "Outreach") return "In Progress";
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
    const status = normalizeStatusFromShowcase(row.showcaseStatus) ?? mapBusinessStatusToShowcase(row.projectStatus);
    const desc = normalizeDescription(row.showcaseDescription);
    const url = asText(row.showcaseUrl) || asText(row.website) || "";
    const imageUrl = asText(row.showcaseImageUrl);
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
      const status = normalizeStatusFromShowcase(row.showcaseStatus) ?? mapBusinessStatusToShowcase(row.projectStatus);
      const url = asText(row.showcaseUrl) || asText(row.website) || "";
      const color = asText(row.showcaseColor)
        ? normalizeColor(row.showcaseColor)
        : defaultShowcaseColor();

      entries.push({
        id: `business:${id}`,
        name,
        type,
        neighborhood,
        borough: normalizeBoroughName(asText(row.borough) || neighborhood),
        lat: asNumber(row.lat) ?? undefined,
        lng: asNumber(row.lng) ?? undefined,
        services: mergedServices,
        status,
        color,
        url: url || undefined,
        source: "business",
      });
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
