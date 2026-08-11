"use client";

import Image from "next/image";
import { type PointerEvent as ReactPointerEvent, useCallback, useEffect, useRef } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import { MapPinIcon } from "@/components/Icons";

const AUTO_SCROLL_SPEED = 24;
const RESUME_DELAY_MS = 180;

type HomeProject = {
  name: string;
  type: string;
  neighborhood: string;
  services: string[];
  status: "Ongoing" | "Upcoming" | "Completed";
  colorClass: string;
  url?: string;
  imageUrl?: string;
  desc?: string;
  quote?: string;
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
  return "bg-n-border text-n-muted border-n-border";
}

function ProjectCard({ project, copy, index }: { project: HomeProject; copy: number; index: number }) {
  const isDuplicate = copy === 1;
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
            sizes="82vw"
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
              <span key={`${copy}-${project.name}-${service}`} className={`tag border ${getServiceTagClass(service)}`}>{service}</span>
            ))}
          </div>
          <span className={`tag text-xs flex-shrink-0 ${project.status === "Completed" ? "bg-n-orange/25 text-n-ink" : project.status === "Ongoing" ? "bg-n-purple/25 text-n-ink" : "bg-n-yellow/35 text-n-ink"}`}>
            {project.status}
          </span>
        </div>
        <h3 className="font-display font-bold text-n-ink text-lg mb-1">{project.name}</h3>
        <p className="font-body text-sm text-n-muted mb-3">{project.type}</p>
        {project.desc && (
          <p className="home-project-mobile-description flex-1 font-body text-sm text-n-ink/70 leading-relaxed line-clamp-3">{project.desc}</p>
        )}
        {project.quote && (
          <blockquote className="mt-4 border-l-2 border-n-orange pl-3 font-body text-sm text-n-muted italic leading-relaxed">
            &ldquo;{project.quote}&rdquo;
          </blockquote>
        )}
        <div className="flex items-center justify-between mt-4">
          <p className="font-body text-xs text-n-muted/70 flex items-center gap-1.5">
            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {project.neighborhood}
          </p>
          {project.url && <span className="font-body text-xs font-semibold text-n-purple">View live site →</span>}
        </div>
      </div>
    </div>
  );

  return (
    <AnimatedSection
      delay={index * 0.05}
      className={`scroll-reveal scroll-reveal-card scroll-reveal-${index % 3} shrink-0 w-[82vw] max-w-[360px]`}
    >
      {project.url ? (
        <a href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`Visit ${project.name} live site`} className="block">
          {card}
        </a>
      ) : card}
    </AnimatedSection>
  );
}

export default function HomeProjectMobileCarousel({ projects }: { projects: HomeProject[] }) {
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
    const updateMotionPreference = (event: MediaQueryListEvent | MediaQueryList) => {
      reducedMotionRef.current = event.matches;
    };
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    updateMotionPreference(mediaQuery);
    mediaQuery.addEventListener("change", updateMotionPreference);

    const updateMobileViewport = (event: MediaQueryListEvent | MediaQueryList) => {
      mobileViewportRef.current = event.matches;
    };
    const mobileMediaQuery = window.matchMedia("(max-width: 639px)");
    updateMobileViewport(mobileMediaQuery);
    mobileMediaQuery.addEventListener("change", updateMobileViewport);

    const handleVisibilityChange = () => {
      documentHiddenRef.current = document.hidden;
      lastFrameRef.current = undefined;
    };
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
      mediaQuery.removeEventListener("change", updateMotionPreference);
      mobileMediaQuery.removeEventListener("change", updateMobileViewport);
    };
  }, [updateProgress]);

  return (
    <div className="home-project-mobile-carousel sm:hidden">
      <div className="home-project-mobile-progress">
        <span id="featured-project-carousel-label" className="home-project-mobile-progress-label">Swipe to explore</span>
        <input
          ref={progressRef}
          aria-labelledby="featured-project-carousel-label"
          className="home-project-mobile-progress-track"
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
        className="home-project-mobile-marquee -mx-5 overflow-x-auto overscroll-x-contain pb-2"
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
        <div className="home-project-mobile-track flex w-max items-start">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-4 pr-4" aria-hidden={copy === 1}>
              {projects.map((project, index) => (
                <ProjectCard key={`${copy}-${project.name}`} project={project} copy={copy} index={index} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
