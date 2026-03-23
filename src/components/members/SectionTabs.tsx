"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type SectionTab = {
  href: string;
  label: string;
  matchRoots?: string[];
};

function isTabActive(pathname: string, tab: SectionTab): boolean {
  const roots = tab.matchRoots?.length ? tab.matchRoots : [tab.href];
  return roots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

export default function SectionTabs({
  tabs,
  className = "",
}: {
  tabs: SectionTab[];
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <div className={`mb-4 overflow-x-auto ${className}`}>
      <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#12151B] p-1 min-w-max">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? "bg-[#85CC17]/15 text-[#9BE22B] border border-[#85CC17]/30"
                  : "text-white/55 hover:text-white/85 hover:bg-white/5 border border-transparent"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export const PROJECT_GROUP_TABS: SectionTab[] = [
  { href: "/members/projects", label: "Business Projects" },
  { href: "/members/assignments", label: "Independent Projects" },
  { href: "/members/grants", label: "Grant Library" },
];

export const PEOPLE_GROUP_TABS: SectionTab[] = [
  { href: "/members/team", label: "Members" },
  { href: "/members/applicants", label: "Applicants" },
  { href: "/members/interviews", label: "Interviews" },
];
