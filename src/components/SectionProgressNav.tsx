"use client";

import { useEffect, useState } from "react";

interface SectionLink {
  id: string;
  label: string;
}

export default function SectionProgressNav({ sections }: { sections: SectionLink[] }) {
  const [activeId, setActiveId] = useState(sections[0]?.id);

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));
    if (!elements.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-35% 0px -50%", threshold: [0.01, 0.35, 0.7] },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="Page sections" className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 xl:block">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="font-body text-[9px] font-bold uppercase tracking-[0.18em] text-n-muted [writing-mode:vertical-rl] rotate-180">
            On this page
          </span>
          <span aria-hidden="true" className="h-32 w-px bg-n-ink/12" />
        </div>
        <ol className="space-y-2.5">
          {sections.map((section) => {
            const active = activeId === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active ? "location" : undefined}
                  className={`group flex items-center gap-2.5 font-body text-sm transition-colors ${active ? "font-semibold text-n-ink" : "text-n-muted/90 hover:text-n-ink"}`}
                >
                  <span className="relative flex h-4 w-3 items-center justify-center">
                    <span aria-hidden="true" className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-n-ink/12" />
                    <span className={`relative h-1.5 w-1.5 rounded-full transition-all duration-200 ${active ? "bg-n-orange scale-125" : "bg-white/95 ring-1 ring-n-border group-hover:bg-n-orange/65"}`} />
                  </span>
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
