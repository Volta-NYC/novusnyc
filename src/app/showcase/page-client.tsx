"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import NeighborhoodMap from "@/components/NeighborhoodMap";
import { MapPinIcon } from "@/components/Icons";
import ExpandableDescription from "@/components/ExpandableDescription";
import MasonryGrid from "@/components/MasonryGrid";

type ProjectDisplayStatus = "Ongoing" | "Upcoming" | "Completed";

type ShowcaseProject = {
  name: string;
  type: string;
  neighborhood: string;
  borough: string;
  services: string[];
  status: ProjectDisplayStatus;
  colorClass: string;
  desc: string;
  url?: string;
  imageUrl?: string;
  quote?: string;
  lat?: number;
  lng?: number;
  source?: "business" | "bid";
};

const BOROUGH_OPTIONS = ["All Boroughs", "Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island"];
const SERVICE_OPTIONS = ["All Services", "Website", "Social Media", "SEO", "Grant Writing", "Finance"];

function getServiceTagClass(service: string): string {
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
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function boroughCardClass(borough: string) {
  const key = borough.trim().toLowerCase();
  if (key.includes("brooklyn")) return "bg-lime-100/70 border-lime-300 text-lime-800";
  if (key.includes("queens")) return "bg-blue-100/75 border-blue-300 text-blue-800";
  if (key.includes("manhattan")) return "bg-amber-100/70 border-amber-300 text-amber-800";
  if (key.includes("bronx")) return "bg-violet-100/75 border-violet-300 text-violet-800";
  if (key.includes("staten")) return "bg-rose-100/75 border-rose-300 text-rose-800";
  return "bg-v-bg border-v-border text-v-ink";
}

function matchesService(projectServices: string[], filter: string): boolean {
  if (filter === "All Services") return true;
  const key = filter.toLowerCase();
  return projectServices.some((s) => {
    const lower = s.toLowerCase();
    if (key === "website") return lower.includes("website") || lower.includes("web");
    if (key === "social media") return lower.includes("social");
    if (key === "seo") return lower.includes("seo") || lower.includes("google");
    if (key === "grant writing") return lower.includes("grant");
    if (key === "finance") return lower.includes("finance") || lower.includes("sales") || lower.includes("payment");
    return false;
  });
}

function matchesBorough(projectBorough: string, filter: string): boolean {
  if (filter === "All Boroughs") return true;
  return projectBorough.toLowerCase().includes(filter.toLowerCase());
}

export default function ShowcaseClient({
  projects,
  mapProjects,
  bidPartners,
  totalBusinesses,
  orgPartners,
}: {
  projects: ShowcaseProject[];
  mapProjects: Array<{
    name: string; type: string; services: string[]; neighborhood: string;
    borough?: string; lat?: number; lng?: number; status: ProjectDisplayStatus;
    url?: string; colorClass: string; source?: "business" | "bid";
  }>;
  bidPartners: Array<{ id: string; name: string; borough: string }>;
  totalBusinesses: number;
  orgPartners: number;
}) {
  const [boroughFilter, setBoroughFilter] = useState("All Boroughs");
  const [serviceFilter, setServiceFilter] = useState("All Services");

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const boroughMatch = matchesBorough(p.borough, boroughFilter);
      const serviceMatch = matchesService(p.services, serviceFilter);
      return boroughMatch && serviceMatch;
    });
  }, [projects, boroughFilter, serviceFilter]);

  const filteredMapProjects = useMemo(() => {
    return mapProjects.filter((p) => {
      const boroughMatch = matchesBorough(p.borough || "", boroughFilter);
      const serviceMatch = matchesService(p.services, serviceFilter);
      return boroughMatch && serviceMatch;
    });
  }, [mapProjects, boroughFilter, serviceFilter]);

  const filteredBidPartners = useMemo(() => {
    return bidPartners.filter((bid) => matchesBorough(bid.borough, boroughFilter));
  }, [bidPartners, boroughFilter]);

  const activeFilterCount = (boroughFilter !== "All Boroughs" ? 1 : 0) + (serviceFilter !== "All Services" ? 1 : 0);

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
                  { value: `${totalBusinesses}+`, label: "Businesses" },
                  { value: `${orgPartners}+`, label: "Community organizations" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-display font-bold text-v-green text-3xl leading-none">{s.value}</p>
                    <p className="font-body text-xs text-white/60 uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* ── MAP ───────────────────────────────────────────────── */}
        <div className="w-full h-[520px] md:h-[600px] relative z-0">
          <NeighborhoodMap projects={filteredMapProjects} />
        </div>
      </section>

      {/* ── FILTERS + PROJECT CARDS ─────────────────────────── */}
      <section className="py-16 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-6 flex items-end justify-between flex-wrap gap-3">
            <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl">
              Selected Projects
            </h2>
            <Link href="/updates" className="font-body text-sm font-semibold text-v-blue hover:underline">
              See progress updates →
            </Link>
          </AnimatedSection>

          {/* Filter bar */}
          <AnimatedSection className="mb-8">
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex flex-wrap gap-2">
                <span className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest self-center mr-1">Borough:</span>
                {BOROUGH_OPTIONS.map((b) => (
                  <button
                    key={b}
                    onClick={() => setBoroughFilter(b)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body font-semibold transition-colors ${
                      boroughFilter === b
                        ? "bg-v-green text-v-ink"
                        : "bg-white border border-v-border text-v-muted hover:border-v-ink"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest self-center mr-1">Service:</span>
                {SERVICE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setServiceFilter(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-body font-semibold transition-colors ${
                      serviceFilter === s
                        ? "bg-v-blue text-white"
                        : "bg-white border border-v-border text-v-muted hover:border-v-ink"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setBoroughFilter("All Boroughs"); setServiceFilter("All Services"); }}
                  className="font-body text-xs text-v-muted hover:text-v-ink underline"
                >
                  Clear filters ({activeFilterCount})
                </button>
              )}
            </div>
          </AnimatedSection>

          {filteredProjects.length === 0 ? (
            <div className="border border-v-border rounded-2xl bg-white px-6 py-8 text-center">
              <p className="font-body text-sm text-v-muted">No projects match your current filters. Try adjusting your selection.</p>
            </div>
          ) : (
            <>
              <div className="lg:hidden -mx-5 px-5 overflow-x-auto pb-2">
                <div className="flex gap-4 w-max min-w-full snap-x snap-mandatory items-start">
                  {filteredProjects.map((p, i) => (
                    <AnimatedSection
                      key={`mobile-${p.name}`}
                      delay={i * 0.05}
                      className="snap-start shrink-0 w-[84vw] max-w-[380px]"
                    >
                      <div className="bg-white border border-v-border rounded-2xl overflow-hidden project-card flex flex-col">
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
                                  : "bg-slate-100 text-slate-600"
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
                                View live site →
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
                  itemIds={filteredProjects.map((p) => p.name)}
                  itemWidth={290}
                  gap={24}
                >
                  {filteredProjects.map((p) => (
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
                                : "bg-slate-100 text-slate-600"
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
                              View live site →
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </MasonryGrid>
              </div>
            </>
          )}

          {/* ── BID PARTNERS ─────────────────────────────────── */}
          <AnimatedSection className="mt-14 mb-6">
            <h3 className="font-display font-bold text-v-ink text-xl md:text-2xl">
              Our Organization Partners
            </h3>
          </AnimatedSection>
          {filteredBidPartners.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {filteredBidPartners.map((bid) => (
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
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
              Your business could be next.
            </h2>
            <p className="font-body text-white/65 text-base md:text-lg mb-8">
              We&apos;re actively taking on projects in Brooklyn, Queens, Manhattan, the Bronx, and Staten Island.
            </p>
            <Link
              href="/partners#contact"
              className="inline-flex items-center justify-center rounded-full bg-v-green px-8 py-3.5 font-display text-base font-bold text-v-ink transition-colors hover:bg-v-green-dark"
            >
              Work with us
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
