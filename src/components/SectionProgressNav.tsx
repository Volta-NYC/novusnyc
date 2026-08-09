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
      <div className="relative rounded-[1.35rem] px-3 py-3">
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[1.35rem] border border-white/35 bg-[linear-gradient(90deg,rgba(255,255,255,0.84),rgba(255,255,255,0.64))] shadow-[0_12px_34px_rgba(15,16,20,0.16)] backdrop-blur-[10px] supports-[backdrop-filter]:bg-[linear-gradient(90deg,rgba(255,255,255,0.76),rgba(255,255,255,0.52))]"
        />
        <div className="relative border-l border-black/10 pl-3.5">
          <p className="mb-2.5 font-body text-[10px] font-bold uppercase tracking-[0.18em] text-n-ink/55">On this page</p>
          <ol className="space-y-1.5">
            {sections.map((section) => {
              const active = activeId === section.id;
              return (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    aria-current={active ? "location" : undefined}
                    className={`group flex items-center gap-2.5 font-body text-[0.95rem] transition-colors ${active ? "font-semibold text-n-ink" : "text-n-ink/58 hover:text-n-ink/82"}`}
                  >
                    <span className={`h-2 w-2 rounded-full transition-transform duration-200 ${active ? "scale-125 bg-n-orange shadow-[0_0_0_3px_rgba(246,183,141,0.22)]" : "bg-white/96 ring-1 ring-n-purple/45 group-hover:bg-n-orange/75 group-hover:ring-n-orange/35"}`} />
                    {section.label}
                  </a>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </nav>
  );
}
