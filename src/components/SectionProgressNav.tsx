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
    <nav aria-label="Page sections" className="fixed right-10 top-1/2 z-30 hidden -translate-y-1/2 xl:block">
      <div className="border-l border-white/75 py-1 pl-5 [text-shadow:0_1px_10px_rgba(0,0,0,0.38)]">
        <p className="mb-3 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">On this page</p>
        <ol className="space-y-2">
          {sections.map((section) => {
            const active = activeId === section.id;
            return (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  aria-current={active ? "location" : undefined}
                  className={`group flex items-center gap-3 font-body text-[0.95rem] transition-colors ${active ? "font-semibold text-white" : "text-white/65 hover:text-white"}`}
                >
                  <span className={`h-2.5 w-2.5 rounded-full border transition-transform duration-200 ${active ? "scale-110 border-n-orange bg-n-orange shadow-[0_0_0_3px_rgba(246,183,141,0.18)]" : "border-white/65 bg-white/90 group-hover:border-n-orange/80 group-hover:bg-n-orange/85"}`} />
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
