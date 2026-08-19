"use client";

import { useEffect, useRef, useState } from "react";

interface SectionLink {
  id: string;
  label: string;
}

type NavAccent = "orange" | "purple" | "yellow";

const ACCENT_CLASSES: Record<NavAccent, { dot: string; ring: string; hover: string }> = {
  orange: { dot: "border-n-orange bg-n-orange", ring: "shadow-[0_0_0_3px_rgba(246,183,141,0.18)]", hover: "group-hover:border-n-orange/80 group-hover:bg-n-orange/85" },
  purple: { dot: "border-n-purple bg-n-purple", ring: "shadow-[0_0_0_3px_rgba(190,162,186,0.22)]", hover: "group-hover:border-n-purple/80 group-hover:bg-n-purple/85" },
  yellow: { dot: "border-n-yellow bg-n-yellow", ring: "shadow-[0_0_0_3px_rgba(243,226,141,0.22)]", hover: "group-hover:border-n-yellow/80 group-hover:bg-n-yellow/85" },
};

function isLightSection(element: HTMLElement) {
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    const styles = window.getComputedStyle(current);

    const match = styles.backgroundColor.match(/rgba?\(([^)]+)\)/);
    if (match) {
      const [red, green, blue, alpha = "1"] = match[1].split(",").map((value) => value.trim());
      if (Number(alpha) > 0.5) {
        const luminance = (0.2126 * Number(red) + 0.7152 * Number(green) + 0.0722 * Number(blue)) / 255;
        return luminance > 0.62;
      }
    }

    current = current.parentElement;
  }

  return true;
}

export default function SectionProgressNav({ sections, accent = "orange" }: { sections: SectionLink[]; accent?: NavAccent }) {
  const colors = ACCENT_CLASSES[accent];
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const [useDarkText, setUseDarkText] = useState(true);
  const [isOverDarkBoundary, setIsOverDarkBoundary] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length) return;
    setUseDarkText(isLightSection(elements[0]));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          setActiveId(visible.target.id);
          setUseDarkText(isLightSection(visible.target as HTMLElement));
        }
      },
      { rootMargin: "-35% 0px -50%", threshold: [0.01, 0.35, 0.7] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  useEffect(() => {
    const darkRegions = [
      document.querySelector<HTMLElement>(".public-site > section[data-home-dark-end='true']"),
      document.querySelector<HTMLElement>(".site-footer"),
    ].filter((element): element is HTMLElement => Boolean(element));

    // The observer's rootMargin ("-35% 0px -50%") only watches a band from
    // 35%-50% of viewport height, and the hero above the first tracked
    // section isn't itself tracked. Scrolled back to the very top, that band
    // sits inside the untracked hero, no observed section intersects it, and
    // the observer simply stops firing — activeId is left stuck on whatever
    // was last active on the way up. Force it back to sections[0] whenever
    // the first section hasn't reached the band's bottom edge yet.
    const firstSection = sections[0] ? document.getElementById(sections[0].id) : null;

    if (!darkRegions.length && !firstSection) return;

    let frameId = 0;
    const update = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        if (firstSection && firstSection.getBoundingClientRect().top > window.innerHeight * 0.5) {
          setActiveId(sections[0].id);
        }

        const nav = navRef.current;
        if (!nav || !darkRegions.length) return;
        const navBounds = nav.getBoundingClientRect();
        setIsOverDarkBoundary(darkRegions.some((region) => {
          const regionBounds = region.getBoundingClientRect();
          return regionBounds.top < navBounds.bottom && regionBounds.bottom > navBounds.top;
        }));
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [sections]);

  const showDarkText = useDarkText && !isOverDarkBoundary;

  return (
    <nav
      ref={navRef}
      aria-label="Page sections"
      className="fixed top-1/2 z-30 hidden w-[12rem] -translate-y-1/2 min-[1730px]:block"
      style={{ left: "calc(50% + 42rem)" }}
    >
      {/*
        Positioned off the content column's true right edge (half of the
        page's max-w-7xl content width, plus a gutter) rather than a fixed
        distance from the viewport edge, so it's mathematically guaranteed to
        clear content instead of sitting on top of it.

        Two things had to be true together, not just the position:
        1. An explicit `width`. Without one, a fixed-position element with
           only `left` set uses shrink-to-fit sizing, and the shrink-to-fit
           algorithm clamps to the *available* space (viewport edge minus
           left) before wrapping — so on medium-wide screens the nav would
           still render on-screen, just with its labels wrapping mid-word
           ("Get supp" / "ort") instead of overflowing cleanly.
        2. Visibility gated to the width where the nav's full box — not just
           its left edge — fits inside the viewport (1280px content cap +
           2rem gutter + this 12rem width, rounded up for scrollbar slop).
           Anything narrower and it's `hidden` outright; there's no
           partially-on-screen state where a clipped or wrapped label could
           show.
      */}
      <div className={`border-l py-1 pl-5 transition-colors duration-200 ${showDarkText ? "border-black/45" : "border-white/75 [text-shadow:0_1px_10px_rgba(0,0,0,0.38)]"}`}>
        <p className={`mb-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] ${showDarkText ? "text-n-ink/55" : "text-white/60"}`}>On this page</p>
        <ol className="space-y-2">
          {sections.map((section) => {
            const active = activeId === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active ? "location" : undefined}
                  className={`group flex items-center gap-3 font-body text-[0.95rem] transition-colors ${active ? (showDarkText ? "font-semibold text-n-ink" : "font-semibold text-white") : (showDarkText ? "text-n-ink/60 hover:text-n-ink" : "text-white/65 hover:text-white")}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full border transition-transform duration-200 ${active ? `scale-110 ${colors.dot} ${colors.ring}` : (showDarkText ? `border-n-ink/40 bg-n-ink/80 ${colors.hover}` : `border-white/65 bg-white/90 ${colors.hover}`)}`} />
                  {section.label}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
