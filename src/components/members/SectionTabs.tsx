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
  // When true, the pathname must equal a root exactly — no prefix match. Use this
  // for landing pages like /members/admin that share a parent path with sub-pages.
  exact?: boolean;
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
  if (tab.exact) return roots.some((root) => pathname === root);
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
  { href: "/members/projects", label: "Businesses", exact: true },
  { href: "/members/projects/discovery", label: "Discovery" },
  { href: "/members/projects/showcase", label: "Showcase" },
];

export const MEMBERS_GROUP_TABS: SectionTab[] = [
  { href: "/members", label: "Members", exact: true },
];

// Applicants + Interviews live on the same Applicants page.
export const APPLICANTS_GROUP_TABS: SectionTab[] = [
  { href: "/members/applicants", label: "Applicants", exact: true },
  { href: "/members/applicants/interviews", label: "Interviews" },
];

// Email: compose + templates.
export const EMAIL_TABS: SectionTab[] = [
  { href: "/members/email", label: "Compose", exact: true },
  { href: "/members/email/templates", label: "Templates" },
];

// Assignments: by-project grouped view, flat list, review queue, templates.
export const ASSIGNMENTS_TABS: SectionTab[] = [
  { href: "/members/assignments/by-project", label: "By Project" },
  { href: "/members/assignments/catalog", label: "All Assignments" },
  { href: "/members/assignments/for-review", label: "For Review" },
  { href: "/members/assignments/templates", label: "Create + Templates" },
];
