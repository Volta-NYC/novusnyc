"use client";

import { useEffect, useState } from "react";

const sections = [
  { id: "scope", label: "1. Scope" },
  { id: "information", label: "2. Information we collect" },
  { id: "use", label: "3. How we use information" },
  { id: "sharing", label: "4. Service providers and sharing" },
  { id: "analytics-cookies", label: "5. Analytics and cookies" },
  { id: "retention", label: "6. Retention" },
  { id: "security", label: "7. Security" },
  { id: "choices", label: "8. Your choices and rights" },
  { id: "young-people", label: "9. Young people" },
  { id: "changes", label: "10. Changes and contact" },
];

export default function PrivacySectionNav() {
  const [activeId, setActiveId] = useState(sections[0].id);

  useEffect(() => {
    const sectionElements = sections
      .map(({ id }) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const activeSection = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (activeSection) setActiveId(activeSection.target.id);
      },
      { rootMargin: "-20% 0px -65%", threshold: [0, 0.1, 0.5] },
    );

    sectionElements.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Privacy policy sections" className="rounded-2xl border border-n-border bg-white p-5 lg:sticky lg:top-28">
      <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-n-orange">On this page</p>
      <ol className="mt-4 space-y-1 font-body text-sm">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={active ? "location" : undefined}
                className={`block rounded-lg px-2.5 py-2 transition-colors ${active ? "bg-n-yellow/45 font-semibold text-n-ink" : "text-n-muted hover:bg-n-bg hover:text-n-ink"}`}
              >
                {section.label}
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
