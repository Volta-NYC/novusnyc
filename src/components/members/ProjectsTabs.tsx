"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TAB_ITEMS = [
  { href: "/members/projects", label: "Business Projects" },
  { href: "/members/projects/finance", label: "Finance Assignments" },
] as const;

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/members/projects") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function ProjectsTabs() {
  const pathname = usePathname();
  return (
    <div className="mb-4 border-b border-white/10">
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {TAB_ITEMS.map((tab) => {
          const active = isTabActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                active
                  ? "bg-[#85CC17]/18 text-[#85CC17] border border-[#85CC17]/40"
                  : "bg-white/[0.04] text-white/65 border border-white/10 hover:text-white"
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
