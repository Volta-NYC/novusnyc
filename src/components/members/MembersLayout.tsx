"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { isFirebaseConfigured } from "@/lib/firebase";
import { signOut } from "@/lib/members/firebaseAuth";
import { AuthProvider, useAuth } from "@/lib/members/authContext";
import { type AuthRole } from "@/lib/members/storage";

// ── NAV ITEM TYPE ─────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeMatchRoots?: string[];
};

// ── NAV ITEM LIST ─────────────────────────────────────────────────────────────

const ADMIN_NAV_ITEMS: NavItem[] = [
  {
    href: "/members/projects",
    label: "Projects",
    activeMatchRoots: ["/members/projects", "/members/assignments", "/members/grants"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="13" x2="21" y2="13"/></svg>,
  },
  {
    href: "/members/bids",
    label: "BIDs",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/><path d="M10 21v-4h4v4"/></svg>,
  },
  {
    href: "/members/team",
    label: "Members",
    activeMatchRoots: ["/members/team", "/members/applicants", "/members/interviews"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: "/members/email",
    label: "Emails",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><polyline points="22,6 12,13 2,6"/></svg>,
  },
  {
    href: "/members/calendar",
    label: "Calendar",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  },
  {
    href: "/members/admin",
    label: "Admin",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  },
];

const INTERVIEWER_NAV_ITEMS: NavItem[] = [
  {
    href: "/members/dashboard",
    label: "Dashboard",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  },
  {
    href: "/members/interviews",
    label: "Interviews",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>,
  },
];

const MEMBER_NAV_ITEMS: NavItem[] = [
  {
    href: "/members/dashboard",
    label: "Dashboard",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>,
  },
];

function getDefaultMembersPath(role: AuthRole | null): string {
  if (role === "admin") return "/members/projects";
  return "/members/dashboard";
}

function getNavItemsForRole(role: AuthRole | null): NavItem[] {
  if (role === "admin") return ADMIN_NAV_ITEMS;
  if (role === "interviewer") return INTERVIEWER_NAV_ITEMS;
  return MEMBER_NAV_ITEMS;
}

function getAllowedRootsForRole(role: AuthRole | null): string[] {
  if (role === "admin") {
    return [
      "/members/projects",
      "/members/assignments",
      "/members/grants",
      "/members/bids",
      "/members/team",
      "/members/applicants",
      "/members/interviews",
      "/members/email",
      "/members/calendar",
      "/members/admin",
    ];
  }
  if (role === "interviewer") return ["/members/dashboard", "/members/interviews"];
  return ["/members/dashboard"];
}

function isAllowedPath(pathname: string, allowedRoots: string[]): boolean {
  return allowedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

// ── INNER LAYOUT (has access to AuthContext) ──────────────────────────────────

function MembersLayoutInner({ children }: { children: ReactNode }) {
  const { user, userProfile, authRole, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firebaseReady] = useState(isFirebaseConfigured());
  const pathname = usePathname();
  const router = useRouter();

  // Redirect to login if not authenticated, or sign out deactivated accounts.
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/members/login");
    } else if (userProfile && !userProfile.active) {
      signOut().then(() => router.replace("/members/login"));
    }
  }, [loading, user, userProfile, router]);

  const visibleNavItems = getNavItemsForRole(authRole);

  useEffect(() => {
    if (loading || !user) return;
    const allowedRoots = getAllowedRootsForRole(authRole);
    if (!isAllowedPath(pathname, allowedRoots)) {
      router.replace(getDefaultMembersPath(authRole));
    }
  }, [authRole, loading, pathname, router, user]);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/members/login");
  };

  // Show a spinner while Firebase resolves the auth state.
  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
      </div>
    );
  }

  const memberDisplayName = userProfile?.name || user.email?.split("@")[0] || "Member";
  const memberRoleLabel =
    authRole === "admin" ? "Admin" :
    authRole === "interviewer" ? "Interviewer" :
    "Member";

  return (
    <div className="min-h-screen bg-[#0F1014] flex">

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — fixed so it doesn't participate in page width calculations */}
      <aside className={`fixed left-0 top-0 h-full w-56 bg-[#13151A] border-r border-white/6 z-30 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>

        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/6 flex items-center gap-2.5">
          <Image src="/logo.png" alt="Volta" width={28} height={28} className="object-contain" />
          <div>
            <p className="font-display font-bold text-[#85CC17] text-sm leading-none">VOLTA</p>
            <p className="font-body text-[10px] text-white mt-0.5">Members Portal</p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const matchRoots = item.activeMatchRoots?.length ? item.activeMatchRoots : [item.href];
            const isActive = matchRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                  isActive ? "bg-[#85CC17]/12 text-[#85CC17]" : "text-white/45 hover:text-white/80 hover:bg-white/4"
                }`}
              >
                <span className={isActive ? "text-[#85CC17]" : "text-white/25"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User info and footer actions */}
        <div className="p-2 border-t border-white/6 space-y-0.5">
          <div className="px-3 py-2 mb-1">
            <p className="text-white/60 text-xs font-body font-medium truncate">{memberDisplayName}</p>
            <p className="text-white/25 text-[10px] font-body">{memberRoleLabel}</p>
          </div>
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2 text-white/30 hover:text-white/60 text-xs font-body rounded-lg hover:bg-white/4 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to public site
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-red-300/80 hover:text-red-200 text-xs font-body rounded-lg hover:bg-red-500/10 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content column — overflow-x-hidden prevents wide table content from
          expanding the page and pushing header action buttons off-screen */}
      <div className="flex-1 lg:pl-56 flex flex-col min-h-screen min-w-0 overflow-x-hidden">

        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#13151A] border-b border-white/6 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-white/50 p-1">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-display font-bold text-white text-sm">Members Portal</span>
          <Link href="/" className="ml-auto text-white/30 hover:text-white/60 text-xs font-body transition-colors">
            ← Site
          </Link>
        </div>

        {/* Firebase misconfiguration warning */}
        {!firebaseReady && (
          <div className="mx-4 mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-orange-400 text-sm">
            <strong>Firebase not configured.</strong> Data is not being saved. Add Firebase env vars in Vercel.
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

// ── PUBLIC EXPORT ─────────────────────────────────────────────────────────────
// Wraps the inner layout with the AuthProvider so all child components can
// call useAuth() without needing to wrap the tree themselves.

export default function MembersLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <MembersLayoutInner>{children}</MembersLayoutInner>
    </AuthProvider>
  );
}
