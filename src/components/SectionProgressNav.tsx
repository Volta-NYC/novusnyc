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
    <nav aria-label="Page sections" className="fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 2xl:block">
      <div className="border-l border-n-border/80 pl-3">
        <p className="mb-2 font-body text-[9px] font-bold uppercase tracking-[0.16em] text-n-muted">On this page</p>
        <ol className="space-y-1.5">
          {sections.map((section) => {
            const active = activeId === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active ? "location" : undefined}
                  className={`group flex items-center gap-2 font-body text-xs transition-colors ${active ? "font-semibold text-n-ink" : "text-n-muted hover:text-n-ink"}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full transition-transform duration-200 ${active ? "scale-125 bg-n-orange" : "bg-n-border group-hover:bg-n-orange/70"}`} />
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
