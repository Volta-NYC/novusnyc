"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/members/authContext";

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
  const { authRole } = useAuth();
  const lightTheme = authRole === "member";
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = (searchParams?.get("tab") ?? "").toLowerCase();

  return (
    <div className={`mb-4 overflow-x-auto pb-1 ${className}`}>
      <div className={`inline-flex items-center gap-1 rounded-xl border p-1 min-w-max ${
        lightTheme ? "border-black/10 bg-black/[0.04]" : "border-white/10 bg-[#12151B]"
      }`}>
        {tabs.map((tab) => {
          const active = isTabActive(pathname, currentTab, tab);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                active
                  ? lightTheme
                    ? "bg-[#F6B78D]/15 text-[#8B5E48] border border-[#F6B78D]/30"
                    : "bg-[#F6B78D]/15 text-[#F3E28D] border border-[#F6B78D]/30"
                  : lightTheme
                    ? "text-black/55 hover:text-black/85 hover:bg-black/5 border border-transparent"
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
  { href: "/members/projects", label: "Tracker", exact: true },
  { href: "/members/projects/showcase", label: "Public Showcase" },
];

export const MEMBERS_GROUP_TABS: SectionTab[] = [
  { href: "/members", label: "Members", exact: true },
];

// Applicants + Interviews live on the same Applicants page.
export const APPLICANTS_GROUP_TABS: SectionTab[] = [
  { href: "/members/applicants", label: "Applicants", exact: true },
  { href: "/members/applicants/interviews", label: "Interviews" },
];

// Email: compose + templates + automations.
export const EMAIL_TABS: SectionTab[] = [
  { href: "/members/email", label: "Compose", exact: true },
  { href: "/members/email/templates", label: "Templates" },
  { href: "/members/email/automations", label: "Automations" },
];

