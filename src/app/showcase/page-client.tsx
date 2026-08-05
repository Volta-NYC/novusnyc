"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import NeighborhoodMap from "@/components/NeighborhoodMap";
import { MapPinIcon } from "@/components/Icons";
import ExpandableDescription from "@/components/ExpandableDescription";
import MasonryGrid from "@/components/MasonryGrid";
import { formatCounter } from "@/lib/formatCounter";

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

function getServiceTagClass(service: string): string {
  const key = service.trim().toLowerCase();
  if (key.includes("website") || key.includes("seo") || key.includes("google")) {
    return "bg-v-blue/20 text-v-ink border-v-blue/40";
  }
  if (key.includes("social")) {
    return "bg-v-green/20 text-v-ink border-v-green/40";
  }
  if (key.includes("finance") || key.includes("grant") || key.includes("payment")) {
    return "bg-v-yellow/40 text-v-ink border-v-yellow";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function ShowcaseMobileCard({ project }: { project: ShowcaseProject }) {
  return (
    <div className="bg-v-bg border border-v-border rounded-2xl overflow-hidden project-card flex flex-col">
      <div className={`${project.colorClass} h-2`} />
      {project.imageUrl ? (
        <div className="mx-4 mt-5 rounded-xl border border-v-border bg-white overflow-hidden">
          <Image
            src={project.imageUrl}
            alt={`${project.name} project`}
            width={1600}
            height={1000}
            sizes="(max-width: 1024px) 78vw, 290px"
            className="block w-full h-auto"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="mx-4 mt-5 rounded-xl border border-v-border bg-white h-36 flex items-center justify-center">
          <span className="font-body text-xs text-v-muted uppercase tracking-wider">Project photo coming soon</span>
        </div>
      )}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-4 gap-2">
          <div className="flex gap-2 flex-wrap">
            {project.services.map((service) => (
              <span key={`mobile-${project.name}-${service}`} className={`tag border ${getServiceTagClass(service)}`}>{service}</span>
            ))}
          </div>
          <span
            className={`tag text-xs flex-shrink-0 ${
              project.status === "Completed"
                ? "bg-v-green/25 text-v-ink"
                : project.status === "Ongoing"
                ? "bg-v-blue/25 text-v-ink"
                : "bg-v-yellow/35 text-v-ink"
            }`}
          >
            {project.status}
          </span>
        </div>
        <h3 className="font-display font-bold text-v-ink text-lg mb-1">{project.name}</h3>
        <p className="font-body text-sm text-v-muted mb-3">{project.type}</p>
        <ExpandableDescription desc={project.desc} className="flex-1" />
        {project.quote && (
          <blockquote className="mt-4 border-l-2 border-v-green pl-3 font-body text-sm text-v-muted italic leading-relaxed">
            &ldquo;{project.quote}&rdquo;
          </blockquote>
        )}
        <div className="flex items-center justify-between mt-4">
          <p className="font-body text-xs text-v-muted/70 flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
            {project.neighborhood}
          </p>
          {project.url && (
            <a
              href={project.url}
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
  );
}

export default function ShowcaseClient({
  projects,
  mapProjects,
  totalBusinesses,
  orgPartners,
}: {
  projects: ShowcaseProject[];
  mapProjects: Array<{
    name: string; type: string; services: string[]; neighborhood: string;
    borough?: string; lat?: number; lng?: number; status: ProjectDisplayStatus;
    url?: string; colorClass: string; source?: "business" | "bid";
  }>;
  totalBusinesses: number;
  orgPartners: number;
}) {
  const mobileScrollRef = useRef<HTMLDivElement>(null);

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
                <span className="text-v-green">New York City</span>
              </h1>
              <div className="flex gap-8 md:pb-2">
                {[
                  { value: formatCounter(totalBusinesses), label: "Businesses" },
                  { value: formatCounter(orgPartners, true), label: "Community organizations" },
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
          <NeighborhoodMap projects={mapProjects} />
        </div>
      </section>

      {/* ── PROJECT CARDS ───────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-6 flex items-end justify-between flex-wrap gap-3">
            <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl">
              Selected Projects
            </h2>
            <Link href="/updates" className="font-body text-sm font-semibold text-v-blue hover:underline">
              See progress updates →
            </Link>
          </AnimatedSection>

          {projects.length === 0 ? (
            <div className="border border-v-border rounded-xl bg-v-bg px-6 py-10 text-center">
              <p className="font-display text-xl font-bold text-v-ink">Project stories are being prepared.</p>
              <p className="mx-auto mt-2 max-w-md font-body text-sm leading-relaxed text-v-muted">Novus teams are actively building with businesses across the city. Check back soon for the next published case studies.</p>
              <Link href="/partners#contact" className="mt-5 inline-flex font-body text-sm font-semibold text-v-blue hover:underline">Get free business support →</Link>
            </div>
          ) : (
            <>
              <div className="lg:hidden">
                <div className="relative">
                  <div
                    ref={mobileScrollRef}
                    className="-mx-5 overflow-x-auto pb-3 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: "none" }}
                  >
                    <div className="flex gap-4 pl-5 pr-8 items-start">
                      {projects.map((p, i) => (
                        <AnimatedSection
                          key={`mobile-${p.name}`}
                          delay={i * 0.05}
                          className="shrink-0 w-[78vw] max-w-[340px]"
                        >
                          <ShowcaseMobileCard project={p} />
                        </AnimatedSection>
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              <div className="hidden lg:block">
                <MasonryGrid
                  itemIds={projects.map((p) => p.name)}
                  itemWidth={290}
                  gap={24}
                >
                  {projects.map((p) => (
                    <div key={`desktop-${p.name}`} className="bg-v-bg border border-v-border rounded-2xl overflow-hidden project-card flex flex-col">
                      <div className={`${p.colorClass} h-2`} />
                      {p.imageUrl ? (
                        <div className="mx-4 sm:mx-7 mt-7 rounded-xl border border-v-border bg-white overflow-hidden">
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
                        <div className="mx-4 sm:mx-7 mt-7 rounded-xl border border-v-border bg-white h-40 flex items-center justify-center">
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
                                ? "bg-v-green/25 text-v-ink"
                                : p.status === "Ongoing"
                                ? "bg-v-blue/25 text-v-ink"
                                : "bg-v-yellow/35 text-v-ink"
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
