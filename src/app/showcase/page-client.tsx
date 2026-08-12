"use client";

import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import NeighborhoodMap from "@/components/NeighborhoodMap";
import { MapPinIcon } from "@/components/Icons";
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
    return "bg-n-purple/20 text-n-ink border-n-purple/40";
  }
  if (key.includes("social")) {
    return "bg-n-orange/20 text-n-ink border-n-orange/40";
  }
  if (key.includes("finance") || key.includes("grant") || key.includes("payment")) {
    return "bg-n-yellow/40 text-n-ink border-n-yellow";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

function ShowcaseMobileCard({ project, isDuplicate = false }: { project: ShowcaseProject; isDuplicate?: boolean }) {
  const card = (
    <div className="bg-n-bg border border-n-border rounded-2xl overflow-hidden project-card flex flex-col">
      <div className={`${project.colorClass} h-2`} />
      {project.imageUrl ? (
        <div className="mx-4 mt-5 rounded-xl border border-n-border bg-white overflow-hidden">
          <Image
            src={project.imageUrl}
            alt={isDuplicate ? "" : `Preview of ${project.name}, a ${project.type.toLowerCase()} project in ${project.neighborhood}`}
            width={1600}
            height={1000}
            sizes="(max-width: 1024px) 78vw, 290px"
            className="block w-full h-auto"
            loading="lazy"
          />
        </div>
      ) : (
        <div className="mx-4 mt-5 rounded-xl border border-n-border bg-white h-36 flex items-center justify-center">
          <span className="font-body text-xs text-n-muted uppercase tracking-wider">Project photo coming soon</span>
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
                ? "bg-n-orange/25 text-n-ink"
                : project.status === "Ongoing"
                ? "bg-n-purple/25 text-n-ink"
                : "bg-n-yellow/35 text-n-ink"
            }`}
          >
            {project.status}
          </span>
        </div>
        <h3 className="font-display font-bold text-n-ink text-lg mb-1">{project.name}</h3>
        <p className="font-body text-sm text-n-muted mb-3">{project.type}</p>
        <p className="showcase-project-mobile-description flex-1 font-body text-sm text-n-ink/70 leading-relaxed line-clamp-3">{project.desc}</p>
        {project.quote && (
          <blockquote className="mt-4 border-l-2 border-n-orange pl-3 font-body text-sm text-n-muted italic leading-relaxed">
            &ldquo;{project.quote}&rdquo;
          </blockquote>
        )}
        <div className="flex items-center justify-between mt-4">
          <p className="font-body text-xs text-n-muted flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
            {project.neighborhood}
          </p>
          {project.url && <span className="font-body text-xs font-semibold text-n-purple">View live site →</span>}
        </div>
      </div>
    </div>
  );

  return (
    project.url ? (
      <a
        href={project.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${project.name} live site`}
        aria-hidden={isDuplicate || undefined}
        tabIndex={isDuplicate ? -1 : undefined}
        className="block"
      >
        {card}
      </a>
    ) : card
  );
}

const AUTO_SCROLL_SPEED = 24;
const RESUME_DELAY_MS = 180;

function ShowcaseMobileCarousel({ projects }: { projects: ShowcaseProject[] }) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameRef = useRef<number>();
  const interactionRef = useRef(false);
  const pointerDownRef = useRef(false);
  const dragRef = useRef<{ pointerId: number; startX: number; scrollLeft: number }>();
  const documentHiddenRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const mobileViewportRef = useRef(false);
  const lastAutoScrollRef = useRef(0);
  const autoScrollPositionRef = useRef(0);
  const resumeTimerRef = useRef<number>();

  const updateProgress = useCallback(() => {
    const carousel = carouselRef.current;
    const progress = progressRef.current;
    if (!carousel || !progress) return;

    const loopWidth = carousel.scrollWidth / 2;
    const progressValue = loopWidth > carousel.clientWidth
      ? (carousel.scrollLeft % loopWidth) / loopWidth
      : 0;
    const percentage = Math.round(Math.max(0, progressValue) * 100);

    progress.style.setProperty("--carousel-progress", `${Math.max(0, progressValue)}`);
    progress.value = `${percentage}`;
  }, []);

  const resumeAutoScroll = useCallback(() => {
    window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => {
      interactionRef.current = false;
    }, RESUME_DELAY_MS);
  }, []);

  const pauseAutoScroll = useCallback(() => {
    interactionRef.current = true;
    window.clearTimeout(resumeTimerRef.current);
  }, []);

  const startDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;

    pointerDownRef.current = true;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    pauseAutoScroll();
  }, [pauseAutoScroll]);

  const dragCarousel = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const carousel = carouselRef.current;
    if (!drag || !carousel || drag.pointerId !== event.pointerId) return;

    carousel.scrollLeft = drag.scrollLeft + drag.startX - event.clientX;
    autoScrollPositionRef.current = carousel.scrollLeft;
    updateProgress();
  }, [updateProgress]);

  const stopDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;

    dragRef.current = undefined;
    pointerDownRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resumeAutoScroll();
  }, [resumeAutoScroll]);

  const setProgress = useCallback((percentage: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const loopWidth = carousel.scrollWidth / 2;
    carousel.scrollLeft = loopWidth * (percentage / 100);
    autoScrollPositionRef.current = carousel.scrollLeft;
    updateProgress();
  }, [updateProgress]);

  useEffect(() => {
    const motionMediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const mobileMediaQuery = window.matchMedia("(max-width: 639px)");
    const updateMotionPreference = (event: MediaQueryListEvent | MediaQueryList) => {
      reducedMotionRef.current = event.matches;
    };
    const updateMobileViewport = (event: MediaQueryListEvent | MediaQueryList) => {
      mobileViewportRef.current = event.matches;
    };
    const handleVisibilityChange = () => {
      documentHiddenRef.current = document.hidden;
      lastFrameRef.current = undefined;
    };

    updateMotionPreference(motionMediaQuery);
    updateMobileViewport(mobileMediaQuery);
    motionMediaQuery.addEventListener("change", updateMotionPreference);
    mobileMediaQuery.addEventListener("change", updateMobileViewport);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const animate = (timestamp: number) => {
      const carousel = carouselRef.current;
      const previousTimestamp = lastFrameRef.current ?? timestamp;
      lastFrameRef.current = timestamp;

      if (carousel && mobileViewportRef.current && !interactionRef.current && !documentHiddenRef.current && !reducedMotionRef.current) {
        const loopWidth = carousel.scrollWidth / 2;
        if (loopWidth > carousel.clientWidth) {
          const elapsedSeconds = Math.min((timestamp - previousTimestamp) / 1000, 0.05);
          let nextScrollLeft = autoScrollPositionRef.current + AUTO_SCROLL_SPEED * elapsedSeconds;
          if (nextScrollLeft >= loopWidth) nextScrollLeft -= loopWidth;
          autoScrollPositionRef.current = nextScrollLeft;
          lastAutoScrollRef.current = performance.now();
          carousel.scrollLeft = nextScrollLeft;
          updateProgress();
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(animate);
    };

    animationFrameRef.current = window.requestAnimationFrame(animate);
    window.addEventListener("resize", updateProgress);
    updateProgress();

    return () => {
      if (animationFrameRef.current !== undefined) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      window.clearTimeout(resumeTimerRef.current);
      window.removeEventListener("resize", updateProgress);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      motionMediaQuery.removeEventListener("change", updateMotionPreference);
      mobileMediaQuery.removeEventListener("change", updateMobileViewport);
    };
  }, [updateProgress]);

  return (
    <div className="sm:hidden">
      <div className="showcase-project-mobile-progress">
        <span id="showcase-project-carousel-label" className="showcase-project-mobile-progress-label">Swipe to explore</span>
        <input
          ref={progressRef}
          aria-labelledby="showcase-project-carousel-label"
          className="showcase-project-mobile-progress-track"
          type="range"
          min="0"
          max="100"
          defaultValue="0"
          onPointerDown={pauseAutoScroll}
          onPointerUp={resumeAutoScroll}
          onPointerCancel={resumeAutoScroll}
          onInput={(event) => setProgress(Number(event.currentTarget.value))}
        />
      </div>
      <div
        ref={carouselRef}
        className="showcase-project-mobile-carousel -mx-5 overflow-x-auto overscroll-x-contain pb-2"
        onPointerDown={startDrag}
        onPointerMove={dragCarousel}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onScroll={() => {
          updateProgress();
          if (performance.now() - lastAutoScrollRef.current > 80) {
            autoScrollPositionRef.current = carouselRef.current?.scrollLeft ?? 0;
            pauseAutoScroll();
            if (!pointerDownRef.current) resumeAutoScroll();
          }
        }}
        onFocus={pauseAutoScroll}
        onBlur={resumeAutoScroll}
      >
        <div className="flex w-max items-start">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-4 pr-4" aria-hidden={copy === 1}>
              {projects.map((project) => (
                <div key={`${copy}-${project.name}`} className="shrink-0 w-[78vw] max-w-[340px]">
                  <ShowcaseMobileCard project={project} isDuplicate={copy === 1} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShowcaseScrollProgress() {
  return (
    <div aria-hidden="true" className="home-scroll-rail">
      <span className="home-scroll-rail-label">NYC / IN MOTION</span>
      <span className="home-scroll-rail-track">
        <span className="home-scroll-rail-fill" />
      </span>
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
      <ShowcaseScrollProgress />
      {/* ── INTRO ─────────────────────────────────────────────── */}
      <section id="showcase-overview" className="section-flush-bottom bg-n-dark pt-32 pb-0 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8 pb-10">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-4">
              Our Work
            </p>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <h1
                className="font-display font-bold text-white leading-none tracking-tight"
                style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
              >
                Projects across<br />
                <span className="text-n-orange">New York City</span>
              </h1>
              <div className="flex gap-8 md:pb-2">
                {[
                  { value: formatCounter(totalBusinesses), label: "Businesses" },
                  { value: formatCounter(orgPartners, true), label: "Community organizations" },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-display font-bold text-n-orange text-3xl leading-none">{s.value}</p>
                    <p className="font-body text-xs text-white/60 uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>

        {/* ── MAP ───────────────────────────────────────────────── */}
        <div id="showcase-map" className="w-full h-[520px] md:h-[600px] relative z-0">
          <NeighborhoodMap projects={mapProjects} />
        </div>
      </section>

      {/* ── PROJECT CARDS ───────────────────────────────────── */}
      <section id="showcase-projects" className="public-surface public-surface-grid py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-6">
            <h2 className="font-display font-bold text-n-ink text-2xl md:text-3xl">
              Selected Projects
            </h2>
          </AnimatedSection>

          {projects.length === 0 ? (
            <div className="border border-n-border rounded-xl bg-n-bg px-6 py-10 text-center">
              <p className="font-display text-xl font-bold text-n-ink">Project stories are being prepared.</p>
              <p className="mx-auto mt-2 max-w-md font-body text-sm leading-relaxed text-n-muted">Novus teams are actively building with businesses across the city. Check back soon for the next published case studies.</p>
              <Link href="/partners#contact" className="mt-5 inline-flex font-body text-sm font-semibold text-n-purple hover:underline">Get free business support →</Link>
            </div>
          ) : (
            <>
              <ShowcaseMobileCarousel projects={projects} />

              <div className="hidden sm:block lg:hidden">
                <div className="relative">
                  <div
                    ref={mobileScrollRef}
                    className="-mx-5 overflow-x-auto pb-3 [&::-webkit-scrollbar]:hidden"
                    style={{ scrollbarWidth: "none" }}
                  >
                    <div className="flex gap-4 pl-5 pr-8 items-start">
                      {projects.map((p) => (
                        <div key={`mobile-${p.name}`} className="shrink-0 w-[78vw] max-w-[340px]">
                          <ShowcaseMobileCard project={p} />
                        </div>
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
                  {projects.map((p) => {
                    const card = (
                    <div className="bg-n-bg border border-n-border rounded-2xl overflow-hidden project-card flex flex-col">
                      <div className={`${p.colorClass} h-2`} />
                      {p.imageUrl ? (
                        <div className="mx-4 sm:mx-7 mt-7 rounded-xl border border-n-border bg-white overflow-hidden">
                          <Image
                            src={p.imageUrl}
                            alt={`Preview of ${p.name}, a ${p.type.toLowerCase()} project in ${p.neighborhood}`}
                            width={1600}
                            height={1000}
                            unoptimized
                            className="block w-full h-auto"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="mx-4 sm:mx-7 mt-7 rounded-xl border border-n-border bg-white h-40 flex items-center justify-center">
                          <span className="font-body text-xs text-n-muted uppercase tracking-wider">Project photo coming soon</span>
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
                                ? "bg-n-orange/25 text-n-ink"
                                : p.status === "Ongoing"
                                ? "bg-n-purple/25 text-n-ink"
                                : "bg-n-yellow/35 text-n-ink"
                            }`}
                          >
                            {p.status}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-n-ink text-xl mb-1">{p.name}</h3>
                        <p className="font-body text-sm text-n-muted mb-3">{p.type}</p>
                        <p className="font-body text-sm text-n-ink/70 leading-relaxed line-clamp-3">{p.desc}</p>
                        {p.quote && (
                          <blockquote className="mt-4 border-l-2 border-n-orange pl-3 font-body text-sm text-n-muted italic leading-relaxed">
                            &ldquo;{p.quote}&rdquo;
                          </blockquote>
                        )}
                        <div className="flex items-center justify-between mt-4">
                          <p className="font-body text-xs text-n-muted flex items-center gap-1.5">
                            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            {p.neighborhood}
                          </p>
                          {p.url && <span className="font-body text-xs font-semibold text-n-purple">View live site →</span>}
                        </div>
                      </div>
                    </div>
                    );

                    return p.url ? (
                      <a key={`desktop-${p.name}`} href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${p.name} live site`} className="block">
                        {card}
                      </a>
                    ) : <div key={`desktop-${p.name}`}>{card}</div>;
                  })}
                </MasonryGrid>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────── */}
      <section id="showcase-cta" className="py-20 bg-n-dark text-center">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
              Looking for support for your business?
            </h2>
            <p className="font-body text-white/65 text-base md:text-lg mb-8">
              We&apos;re taking on new projects across New York City. Tell us about your business and the support you need, and we&apos;ll follow up within a few business days.
            </p>
            <Link
              href="/partners#contact"
              className="inline-flex items-center justify-center rounded-full bg-n-orange px-8 py-3.5 font-display text-base font-bold text-n-ink transition-colors hover:bg-n-orange-dark"
            >
              Work with us
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
