"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export type SectionTab = {
  href: string;
  label: string;
  matchRoots?: string[];
  // When set, this tab is active only when the URL's `tab` query param equals this value.
  // Use "" for the default tab on a path (when no `tab` query param is present).
  matchTab?: string;
};

function getBasePath(href: string): string {
  const idx = href.indexOf("?");
  return idx >= 0 ? href.slice(0, idx) : href;
}

function isTabActive(pathname: string, currentTab: string, tab: SectionTab): boolean {
  if (tab.matchTab !== undefined) {
    const basePath = getBasePath(tab.href);
    return pathname === basePath && currentTab === tab.matchTab;
  }
  const roots = tab.matchRoots?.length ? tab.matchRoots : [getBasePath(tab.href)];
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
  const searchParams = useSearchParams();
  const currentTab = (searchParams?.get("tab") ?? "").toLowerCase();

  return (
    <div className={`mb-4 overflow-x-auto pb-1 ${className}`}>
      <div className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-[#12151B] p-1 min-w-max">
        {tabs.map((tab) => {
          const active = isTabActive(pathname, currentTab, tab);
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
  { href: "/members/projects", label: "Tech Projects", matchTab: "" },
  { href: "/members/projects?tab=marketing", label: "Marketing Projects", matchTab: "marketing" },
  { href: "/members/projects?tab=discovery", label: "Discovery", matchTab: "discovery" },
  { href: "/members/assignments", label: "Finance Projects" },
];

export const PEOPLE_GROUP_TABS: SectionTab[] = [
  { href: "/members/team", label: "Members" },
  { href: "/members/applicants", label: "Applicants" },
  { href: "/members/interviews", label: "Interviews" },
];
