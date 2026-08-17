import type { Metadata } from "next";
import { projects as fallbackProjects } from "@/data";
import { getPublicMapEntries, getPublicShowcaseCards } from "@/lib/server/publicShowcase";
import { getPublicStatOverrides, PUBLISHED_IMPACT_TOTALS, publicCommunityOrganizationStat } from "@/lib/server/publicStats";
import ShowcaseClient from "./page-client";


export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Our Work",
    description:
      `Interactive map and project portfolio showing Novus NYC's active work across New York City — websites, social media, SEO, and grant writing for ${PUBLISHED_IMPACT_TOTALS.businesses} small businesses.`,
    openGraph: {
      title: "Our Work | Novus NYC",
      description: `${PUBLISHED_IMPACT_TOTALS.businesses} businesses across New York City. See every project.`,
      images: ["/api/og"],
    },
  };
}

const SHOWCASE_COLOR_CLASS: Record<string, string> = {
  "blue-soft": "bg-violet-200",
  "blue-mid": "bg-violet-300",
  "blue-deep": "bg-violet-400",
  "lime-soft": "bg-orange-200",
  "lime-mid": "bg-orange-300",
  "lime-deep": "bg-orange-400",
  "amber-soft": "bg-amber-200",
  "amber-mid": "bg-amber-300",
  "amber-deep": "bg-amber-400",
  "pink-soft": "bg-fuchsia-200",
  "pink-mid": "bg-fuchsia-300",
  "pink-deep": "bg-fuchsia-400",
  "purple-mid": "bg-purple-300",
  "red-soft": "bg-rose-200",
  "red-mid": "bg-rose-300",
  "red-deep": "bg-rose-400",
  // Safety mapping for older entries.
  green: "bg-orange-300",
  blue: "bg-violet-300",
  orange: "bg-rose-300",
  amber: "bg-amber-300",
  pink: "bg-fuchsia-300",
  purple: "bg-purple-300",
  "green-soft": "bg-orange-200",
  "green-mid": "bg-orange-300",
  "green-deep": "bg-orange-400",
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
  // Fetch all public datasets in parallel so the showcase does not repeat work.
  const [publicShowcase, publicMapEntries, statOverrides] = await Promise.all([
    getPublicShowcaseCards(),
    getPublicMapEntries(),
    getPublicStatOverrides(),
  ]);

  const projects = publicShowcase.length > 0
    ? publicShowcase.map((card) => ({
      name: card.name,
      type: card.type,
      neighborhood: card.neighborhood,
      borough: extractBoroughFromNeighborhood(card.neighborhood),
      services: card.services,
      status: normalizeProjectDisplayStatus(card.status),
      colorClass: SHOWCASE_COLOR_CLASS[card.color] ?? "bg-violet-300",
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
    return colorOptions[idx] ?? "bg-violet-300";
  };

  const mapProjects = publicMapEntries.map((entry) => {
    const isBusinessWithoutCard =
      entry.source === "business" &&
      publicShowcase.length > 0 &&
      !showcasedBusinessIds.has(entry.id);
    const colorClass = isBusinessWithoutCard
      ? pickPseudoRandomColor(entry.id || entry.name)
      : (SHOWCASE_COLOR_CLASS[entry.color] ?? "bg-violet-300");

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

  return (
    <ShowcaseClient
      projects={projects}
      mapProjects={mapProjects}
      totalBusinesses={PUBLISHED_IMPACT_TOTALS.businesses}
      orgPartners={publicCommunityOrganizationStat(statOverrides, PUBLISHED_IMPACT_TOTALS.communityOrganizations)}
    />
  );
}
