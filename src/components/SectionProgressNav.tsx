"use client";

import { useEffect, useRef, useState } from "react";

interface SectionLink {
  id: string;
  label: string;
}

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

export default function SectionProgressNav({ sections }: { sections: SectionLink[] }) {
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
    if (!darkRegions.length) return;

    let frameId = 0;
    const updateBoundaryColor = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        const nav = navRef.current;
        if (!nav) return;

        const navBounds = nav.getBoundingClientRect();
        setIsOverDarkBoundary(darkRegions.some((region) => {
          const regionBounds = region.getBoundingClientRect();
          return regionBounds.top < navBounds.bottom && regionBounds.bottom > navBounds.top;
        }));
      });
    };

    updateBoundaryColor();
    window.addEventListener("scroll", updateBoundaryColor, { passive: true });
    window.addEventListener("resize", updateBoundaryColor);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", updateBoundaryColor);
      window.removeEventListener("resize", updateBoundaryColor);
    };
  }, []);

  const showDarkText = useDarkText && !isOverDarkBoundary;

  return (
    <nav ref={navRef} aria-label="Page sections" className="fixed right-4 top-1/2 z-30 hidden -translate-y-1/2 lg:block xl:right-10">
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
                  <span className={`h-2.5 w-2.5 rounded-full border transition-transform duration-200 ${active ? "scale-110 border-n-orange bg-n-orange shadow-[0_0_0_3px_rgba(246,183,141,0.18)]" : (showDarkText ? "border-n-ink/40 bg-n-ink/80 group-hover:border-n-orange/80 group-hover:bg-n-orange/85" : "border-white/65 bg-white/90 group-hover:border-n-orange/80 group-hover:bg-n-orange/85")}`} />
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
