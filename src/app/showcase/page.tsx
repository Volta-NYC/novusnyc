import type { Metadata } from "next";
import { projects as fallbackProjects } from "@/data";
import { VOLTA_STATS, formatStat } from "@/data/stats";
import { getPublicMapEntries, getPublicShowcaseCards, getPublicLiveStats } from "@/lib/server/publicShowcase";
import ShowcaseClient from "./page-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Work | Volta NYC",
  description:
    `Interactive map and project portfolio showing Volta NYC's active work across ${formatStat(VOLTA_STATS.nycNeighborhoods)} NYC neighborhoods — websites, social media, SEO, and grant writing for small businesses.`,
  openGraph: {
    title: "Our Work | Volta NYC",
    description: `${formatStat(VOLTA_STATS.businessesServed)} businesses across ${formatStat(VOLTA_STATS.nycNeighborhoods)} NYC neighborhoods. See every project.`,
    images: ["/api/og"],
  },
};

const SHOWCASE_COLOR_CLASS: Record<string, string> = {
  "blue-soft": "bg-blue-300",
  "blue-mid": "bg-blue-500",
  "blue-deep": "bg-blue-700",
  "lime-soft": "bg-lime-300",
  "lime-mid": "bg-lime-500",
  "lime-deep": "bg-lime-700",
  "amber-soft": "bg-amber-300",
  "amber-mid": "bg-amber-500",
  "amber-deep": "bg-amber-700",
  "pink-soft": "bg-pink-300",
  "pink-mid": "bg-pink-500",
  "pink-deep": "bg-pink-700",
  "purple-mid": "bg-purple-500",
  "red-soft": "bg-red-300",
  "red-mid": "bg-red-500",
  "red-deep": "bg-red-700",
  // Safety mapping for older entries.
  green: "bg-lime-500",
  blue: "bg-blue-500",
  orange: "bg-red-500",
  amber: "bg-amber-500",
  pink: "bg-pink-500",
  purple: "bg-purple-500",
  "green-soft": "bg-lime-300",
  "green-mid": "bg-lime-500",
  "green-deep": "bg-lime-700",
};

type ProjectDisplayStatus = "Ongoing" | "Upcoming" | "Completed";

function normalizeProjectDisplayStatus(value: string): ProjectDisplayStatus {
  const key = value.trim();
  if (key === "Completed" || key === "Complete") return "Completed";
  if (key === "Ongoing" || key === "Active" || key === "In Progress") return "Ongoing";
  return "Upcoming";
}

function extractBoroughFromNeighborhood(neighborhood: string): string {
  const lower = neighborhood.toLowerCase();
  if (lower.includes("brooklyn")) return "Brooklyn";
  if (lower.includes("queens")) return "Queens";
  if (lower.includes("manhattan")) return "Manhattan";
  if (lower.includes("bronx")) return "Bronx";
  if (lower.includes("staten")) return "Staten Island";
  return "";
}

export default async function Showcase() {
  const publicShowcase = await getPublicShowcaseCards();
  const publicMapEntries = await getPublicMapEntries();

  const projects = publicShowcase.length > 0
    ? publicShowcase.map((card) => ({
      name: card.name,
      type: card.type,
      neighborhood: card.neighborhood,
      borough: extractBoroughFromNeighborhood(card.neighborhood),
      services: card.services,
      status: normalizeProjectDisplayStatus(card.status),
      colorClass: SHOWCASE_COLOR_CLASS[card.color] ?? "bg-blue-500",
      desc: card.desc,
      url: card.url,
      imageUrl: card.imageUrl,
      quote: undefined as string | undefined,
    }))
    : fallbackProjects.map((project) => ({
      name: project.name,
      type: project.type,
      neighborhood: project.neighborhood,
      borough: extractBoroughFromNeighborhood(project.neighborhood),
      services: project.services,
      status: normalizeProjectDisplayStatus(project.status),
      colorClass: project.color,
      desc: project.desc,
      url: project.url,
      imageUrl: undefined as string | undefined,
      quote: project.quote,
    }));

  const showcasedBusinessIds = new Set(publicShowcase.map((card) => `business:${card.id}`));
  const colorOptions = Object.values(SHOWCASE_COLOR_CLASS);
  const pickPseudoRandomColor = (seed: string): string => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % colorOptions.length;
    return colorOptions[idx] ?? "bg-blue-500";
  };

  const mapProjects = publicMapEntries.map((entry) => {
    const isBusinessWithoutCard =
      entry.source === "business" &&
      publicShowcase.length > 0 &&
      !showcasedBusinessIds.has(entry.id);
    const colorClass = isBusinessWithoutCard
      ? pickPseudoRandomColor(entry.id || entry.name)
      : (SHOWCASE_COLOR_CLASS[entry.color] ?? "bg-blue-500");

    return {
      name: entry.name,
      type: entry.type,
      services: entry.services,
      neighborhood: entry.neighborhood,
      borough: entry.borough || "",
      lat: entry.lat,
      lng: entry.lng,
      status: normalizeProjectDisplayStatus(entry.status),
      url: entry.url,
      colorClass,
      source: entry.source,
    };
  });

  const bidPartners = publicMapEntries
    .filter((entry) => entry.source === "bid")
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      borough: entry.borough || "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const liveStats = await getPublicLiveStats();

  return (
    <ShowcaseClient
      projects={projects}
      mapProjects={mapProjects}
      bidPartners={bidPartners}
      totalBusinesses={liveStats.totalBusinesses}
      orgPartners={liveStats.bidPartners}
    />
  );
}
