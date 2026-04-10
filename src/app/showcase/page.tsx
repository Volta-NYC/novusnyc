import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import NeighborhoodMap from "@/components/NeighborhoodMap";
import { MapPinIcon } from "@/components/Icons";
import { projects as fallbackProjects } from "@/data";
import { VOLTA_STATS, formatStat } from "@/data/stats";
import { getPublicMapEntries, getPublicShowcaseCards } from "@/lib/server/publicShowcase";
import ExpandableDescription from "@/components/ExpandableDescription";
import MasonryGrid from "@/components/MasonryGrid";

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

export default async function Showcase() {
  const publicShowcase = await getPublicShowcaseCards();
  const publicMapEntries = await getPublicMapEntries();
  const projects = publicShowcase.length > 0
    ? publicShowcase.map((card) => ({
      name: card.name,
      type: card.type,
      neighborhood: card.neighborhood,
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
      borough: entry.borough,
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

  const boroughCardClass = (borough: string) => {
    const key = borough.trim().toLowerCase();
    if (key.includes("brooklyn")) return "bg-lime-100/70 border-lime-300 text-lime-800";
    if (key.includes("queens")) return "bg-blue-100/75 border-blue-300 text-blue-800";
    if (key.includes("manhattan")) return "bg-amber-100/70 border-amber-300 text-amber-800";
    if (key.includes("bronx")) return "bg-violet-100/75 border-violet-300 text-violet-800";
    if (key.includes("staten")) return "bg-rose-100/75 border-rose-300 text-rose-800";
    return "bg-v-bg border-v-border text-v-ink";
  };

  const getServiceTagClass = (service: string) => {
    const key = service.trim().toLowerCase();
    if (key.includes("website") || key.includes("seo") || key.includes("google")) {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (key.includes("social")) {
      return "bg-lime-100 text-lime-700 border-lime-200";
    }
    if (key.includes("finance") || key.includes("grant") || key.includes("payment")) {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    return "bg-v-border text-v-muted border-v-border";
  };

  return (
    <>
      {/* ── INTRO ─────────────────────────────────────────────── */}
      <section className="bg-v-dark pt-32 pb-0 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8 pb-10">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
              Our Work
            </p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <h1
                className="font-display font-bold text-white leading-none tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
              >
                Projects across<br />
                <span className="text-v-green">NYC.</span>
              </h1>
              <div className="flex gap-8 md:pb-2">
                {[
                  { value: formatStat(VOLTA_STATS.businessesServed), label: "Businesses" },
                  { value: formatStat(VOLTA_STATS.nycNeighborhoods), label: "Neighborhoods" },
                  { value: formatStat(VOLTA_STATS.bidPartners), label: "BID partners" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-display font-bold text-v-green text-3xl leading-none">{s.value}</p>
                    <p className="font-body text-xs text-white/40 uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* ── MAP ───────────────────────────────────────────────── */}
        <div className="w-full h-[520px] md:h-[600px] relative z-0">
          <NeighborhoodMap projects={mapProjects} />
        </div>
      </section>

      {/* ── PROJECT CARDS ─────────────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10 flex items-end justify-between flex-wrap gap-3">
            <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl">
              Selected Projects
            </h2>
            <Link href="/updates" className="font-body text-sm font-semibold text-v-blue hover:underline">
              See progress updates →
            </Link>
          </AnimatedSection>
          <>
            <div className="lg:hidden -mx-5 px-5 overflow-x-auto pb-2">
              <div className="flex gap-4 w-max min-w-full snap-x snap-mandatory">
                {projects.map((p, i) => (
                  <AnimatedSection
                    key={`mobile-${p.name}`}
                    delay={i * 0.05}
                    className="snap-start shrink-0 w-[84vw] max-w-[380px]"
                  >
                    <div className="bg-white border border-v-border rounded-2xl overflow-hidden project-card flex flex-col h-full">
                      <div className={`${p.colorClass} h-2`} />
                      {p.imageUrl ? (
                        <div className="mx-4 mt-5 rounded-xl border border-v-border bg-v-bg overflow-hidden">
                          <Image
                            src={p.imageUrl}
                            alt={`${p.name} project`}
                            width={1600}
                            height={1000}
                            unoptimized
                            className="block w-full h-auto"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="mx-4 mt-5 rounded-xl border border-v-border bg-v-bg h-36 flex items-center justify-center">
                          <span className="font-body text-xs text-v-muted uppercase tracking-wider">Project photo coming soon</span>
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-4 gap-2">
                          <div className="flex gap-2 flex-wrap">
                            {p.services.map((s) => (
                              <span key={`mobile-${p.name}-${s}`} className={`tag border ${getServiceTagClass(s)}`}>{s}</span>
                            ))}
                          </div>
                          <span
                            className={`tag text-xs flex-shrink-0 ${
                              p.status === "Completed"
                                ? "bg-lime-100 text-lime-700"
                                : p.status === "Ongoing"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-v-border text-v-muted"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-v-ink text-lg mb-1">{p.name}</h3>
                        <p className="font-body text-sm text-v-muted mb-3">{p.type}</p>
                        <ExpandableDescription desc={p.desc} className="flex-1" />
                        {p.quote && (
                          <blockquote className="mt-4 border-l-2 border-v-green pl-3 font-body text-sm text-v-muted italic leading-relaxed">
                            &ldquo;{p.quote}&rdquo;
                          </blockquote>
                        )}
                        <div className="flex items-center justify-between mt-4">
                          <p className="font-body text-xs text-v-muted/70 flex items-center gap-1.5">
                            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            {p.neighborhood}
                          </p>
                          {p.url && (
                            <a
                              href={p.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-body text-xs font-semibold text-v-blue hover:underline"
                            >
                              View →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              <MasonryGrid
                itemIds={projects.map((p) => p.name)}
                itemWidth={290}
                gap={24}
              >
                {projects.map((p) => (
                  <div key={`desktop-${p.name}`} className="bg-white border border-v-border rounded-2xl overflow-hidden project-card flex flex-col">
                    <div className={`${p.colorClass} h-2`} />
                    {p.imageUrl ? (
                      <div className="mx-4 sm:mx-7 mt-7 rounded-xl border border-v-border bg-v-bg overflow-hidden">
                        <Image
                          src={p.imageUrl}
                          alt={`${p.name} project`}
                          width={1600}
                          height={1000}
                          unoptimized
                          className="block w-full h-auto"
                          loading="lazy"
                        />
                      </div>
                    ) : (
                      <div className="mx-4 sm:mx-7 mt-7 rounded-xl border border-v-border bg-v-bg h-40 flex items-center justify-center">
                        <span className="font-body text-xs text-v-muted uppercase tracking-wider">Project photo coming soon</span>
                      </div>
                    )}
                    <div className="p-7 flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-2 flex-wrap">
                          {p.services.map((s) => (
                            <span key={`desktop-${p.name}-${s}`} className={`tag border ${getServiceTagClass(s)}`}>{s}</span>
                          ))}
                        </div>
                        <span
                          className={`tag text-xs flex-shrink-0 ${
                            p.status === "Completed"
                              ? "bg-lime-100 text-lime-700"
                              : p.status === "Ongoing"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-v-border text-v-muted"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-v-ink text-xl mb-1">{p.name}</h3>
                      <p className="font-body text-sm text-v-muted mb-3">{p.type}</p>
                      <ExpandableDescription desc={p.desc} />
                      {p.quote && (
                        <blockquote className="mt-4 border-l-2 border-v-green pl-3 font-body text-sm text-v-muted italic leading-relaxed">
                          &ldquo;{p.quote}&rdquo;
                        </blockquote>
                      )}
                      <div className="flex items-center justify-between mt-4">
                        <p className="font-body text-xs text-v-muted/70 flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          {p.neighborhood}
                        </p>
                        {p.url && (
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-xs font-semibold text-v-blue hover:underline"
                          >
                            View →
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </MasonryGrid>
            </div>
          </>

          <AnimatedSection className="mt-14 mb-6">
            <h3 className="font-display font-bold text-v-ink text-xl md:text-2xl">
              All of our organization partners
            </h3>
          </AnimatedSection>
          {bidPartners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {bidPartners.map((bid) => (
                <div key={bid.id} className={`px-3 py-2.5 border rounded-xl ${boroughCardClass(bid.borough)}`}>
                  <p className="font-display font-bold text-[11px] uppercase tracking-wide leading-tight">
                    {bid.name}
                  </p>
                  <p className="font-body text-[11px] mt-1 opacity-85">
                    {bid.borough}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-v-border rounded-xl px-3 py-3 bg-v-bg/55">
              <p className="font-body text-sm text-v-muted">No partner records yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section className="py-20 bg-v-dark text-center">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-xs font-semibold text-v-green uppercase tracking-widest mb-3">
              For business owners
            </p>
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
              Your business could be next.
            </h2>
            <p className="font-body text-white/65 text-base md:text-lg mb-8">
              We&apos;re actively taking on projects in Brooklyn, Queens, Manhattan, the Bronx, and Staten Island.
            </p>
            <Link
              href="/partners#contact"
              className="inline-flex items-center justify-center rounded-full bg-v-green px-8 py-3.5 font-display text-base font-bold text-v-ink transition-colors hover:bg-[#9EDC2F]"
            >
              Work with us
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
