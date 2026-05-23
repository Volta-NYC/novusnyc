"use client";

import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";

import { signOut } from "@/lib/members/supabaseAuth";
import { useAuth } from "@/lib/members/authContext";
import { type AuthRole, getMemberAcknowledgment, createMemberAcknowledgment, getHandbookPage, subscribeSiteSettings } from "@/lib/members/storage";

// ── NAV ITEM TYPE ─────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeMatchRoots?: string[];
};

// ── NAV ITEM LIST ─────────────────────────────────────────────────────────────

const OWNER_NAV_ITEMS: NavItem[] = [
  {
    href: "/members/overview",
    label: "Dashboard",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  },
  {
    href: "/members/projects",
    label: "Businesses and Projects",
    activeMatchRoots: ["/members/projects"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="13" x2="21" y2="13"/></svg>,
  },
  {
    href: "/members/assignments/by-project",
    label: "Assignments",
    activeMatchRoots: ["/members/assignments"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  },
  {
    href: "/members/bids",
    label: "Partner Organizations",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/><path d="M10 21v-4h4v4"/></svg>,
  },
  {
    href: "/members/team",
    label: "Members",
    activeMatchRoots: ["/members/team"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
  {
    href: "/members/applicants",
    label: "Applicants",
    activeMatchRoots: ["/members/applicants"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  },
  {
    href: "/members/email",
    label: "Email",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16v16H4z"/><polyline points="22,6 12,13 2,6"/></svg>,
  },
  {
    href: "/members/admin",
    label: "Admin",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>,
  },
];

const ADMIN_NAV_HREFS = new Set(["/members/overview", "/members/projects", "/members/assignments/by-project"]);
const ADMIN_NAV_ITEMS: NavItem[] = OWNER_NAV_ITEMS.filter((item) => ADMIN_NAV_HREFS.has(item.href));

const MEMBER_NAV_ITEMS: NavItem[] = [
  {
    href: "/members/me",
    label: "Overview",
    activeMatchRoots: ["/members/me", "/members/overview"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  },
  {
    href: "/members/work",
    label: "Work",
    activeMatchRoots: ["/members/work"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  },
  {
    href: "/members/handbook",
    label: "Handbook",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function getDefaultMembersPath(_role: AuthRole | null): string {
  if (_role === "member") return "/members/me";
  return "/members/overview";
}

function getNavItemsForRole(role: AuthRole | null): NavItem[] {
  if (role === "owner") return OWNER_NAV_ITEMS;
  if (role === "admin") return ADMIN_NAV_ITEMS;
  return MEMBER_NAV_ITEMS;
}

function getAllowedRootsForRole(role: AuthRole | null): string[] {
  if (role === "owner") {
    return [
      "/members/projects",
      "/members/overview",
      "/members/assignments",
      "/members/bids",
      "/members/team",
      "/members/applicants",
      "/members/email",
      "/members/admin",
    ];
  }
  if (role === "admin") {
    return [
      "/members/overview",
      "/members/projects",
      "/members/assignments",
    ];
  }
  return ["/members/work", "/members/me", "/members/handbook"];
}

function isAllowedPath(pathname: string, allowedRoots: string[]): boolean {
  return allowedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

// ── INNER LAYOUT ──────────────────────────────────────────────────────────────

function MembersLayoutInner({ children }: { children: ReactNode }) {
  const { user, userProfile, authRole, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  const [showAckModal, setShowAckModal] = useState(false);
  const [portalBanner, setPortalBanner] = useState<{ message: string; bg: string; text: string } | null>(null);

  // Load collapse preference from localStorage after mount (avoids hydration mismatch).
  useEffect(() => {
    const stored = localStorage.getItem("volta-sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("volta-sidebar-collapsed", String(next));
      return next;
    });
  };

  useEffect(() => subscribeSiteSettings((s) => {
    setPortalBanner(s.portalBannerEnabled && s.portalBannerMessage.trim()
      ? { message: s.portalBannerMessage.trim(), bg: s.portalBannerBg, text: s.portalBannerText }
      : null);
  }), []);

  const [ackChecked, setAckChecked] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [currentContentHash, setCurrentContentHash] = useState("");
  const ackCheckFired = useRef(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/members/login");
    } else if (userProfile && !userProfile.active) {
      signOut().then(() => router.replace("/members/login"));
    }
  }, [loading, user, userProfile, router]);

  useEffect(() => {
    if (loading || !user || !userProfile || authRole !== "member") return;
    if (ackCheckFired.current) return;
    ackCheckFired.current = true;
    Promise.all([
      getMemberAcknowledgment(userProfile.id, "credit-infraction-policy"),
      getHandbookPage("credit-infraction-policy"),
    ])
      .then(async ([ack, page]) => {
        const content = page?.content ?? "";
        const hash = content ? await sha256(content) : "";
        setCurrentContentHash(hash);
        if (!ack || (hash && ack.contentHash !== hash)) {
          setShowAckModal(true);
        }
      })
      .catch(() => {});
  }, [loading, user, userProfile, authRole]);

  const handleConfirmAck = async () => {
    if (!userProfile) return;
    setAckLoading(true);
    try {
      await createMemberAcknowledgment({
        memberId: userProfile.id,
        pageSlug: "credit-infraction-policy",
        contentHash: currentContentHash,
      });
      setShowAckModal(false);
    } catch {
      setShowAckModal(false);
    } finally {
      setAckLoading(false);
    }
  };

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

  const closeProfilePopover = useCallback(() => setProfilePopoverOpen(false), []);

  useEffect(() => {
    if (!profilePopoverOpen) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (profilePopoverRef.current?.contains(e.target as Node)) return;
      closeProfilePopover();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeProfilePopover(); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profilePopoverOpen, closeProfilePopover]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
      </div>
    );
  }

  const memberDisplayName = userProfile?.name || user.email?.split("@")[0] || "Member";
  const memberRoleLabel =
    authRole === "owner" ? "Owner" :
    authRole === "admin" ? "Admin" :
    "Member";
  const initials = getInitials(memberDisplayName);

  const lightTheme = authRole === "member";
  const tone = lightTheme
    ? {
        page: "bg-[#F5F6F8]",
        sidebar: "bg-white border-r border-black/8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
        sidebarLogoText: "text-[#5C9911]",
        sidebarSubtle: "text-black/55",
        sidebarBorder: "border-black/8",
        navInactive: "text-black/55 hover:text-black/85 hover:bg-black/5",
        navActive: "bg-[#85CC17]/15 text-[#5C9911]",
        navIconInactive: "text-black/35",
        navIconActive: "text-[#5C9911]",
        userName: "text-black/75",
        userRole: "text-black/35",
        footerLink: "text-black/45 hover:text-black/70 hover:bg-black/5",
        signOut: "text-red-600 hover:text-red-700 hover:bg-red-50",
        mobileBar: "bg-white border-b border-black/8",
        mobileBarText: "text-black/85",
        mobileBarLink: "text-black/45 hover:text-black/70",
        burgerText: "text-black/55",
        collapseBtn: "text-black/30 hover:text-black/55 hover:bg-black/5",
      }
    : {
        page: "bg-[#0F1014]",
        sidebar: "bg-[#13151A] border-r border-white/6",
        sidebarLogoText: "text-[#85CC17]",
        sidebarSubtle: "text-white",
        sidebarBorder: "border-white/6",
        navInactive: "text-white/45 hover:text-white/80 hover:bg-white/4",
        navActive: "bg-[#85CC17]/12 text-[#85CC17]",
        navIconInactive: "text-white/25",
        navIconActive: "text-[#85CC17]",
        userName: "text-white/60",
        userRole: "text-white/25",
        footerLink: "text-white/30 hover:text-white/60 hover:bg-white/4",
        signOut: "text-red-300/80 hover:text-red-200 hover:bg-red-500/10",
        mobileBar: "bg-[#13151A] border-b border-white/6",
        mobileBarText: "text-white",
        mobileBarLink: "text-white/30 hover:text-white/60",
        burgerText: "text-white/50",
        collapseBtn: "text-white/20 hover:text-white/45 hover:bg-white/4",
      };

  // Sidebar width classes
  const sidebarW = sidebarCollapsed ? "w-14" : "w-56";
  const contentPl = sidebarCollapsed ? "lg:pl-14" : "lg:pl-56";

  return (
    <div className={`members-portal ${lightTheme ? "members-portal-light" : ""} min-h-screen ${tone.page} flex`}>

      {/* Handbook acknowledgment modal */}
      {showAckModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 md:p-8">
            <h2 className="font-display font-bold text-black/85 text-xl mb-2">Before you continue</h2>
            <p className="text-black/60 text-sm font-body mb-4 leading-relaxed">
              By continuing, you acknowledge that you have read and understand the Volta NYC credit and infraction system as described in the Member Handbook.
            </p>
            <a
              href="/members/handbook"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-[#5C9911] hover:text-[#85CC17] font-body font-medium mb-5 transition-colors"
            >
              Read the Handbook →
            </a>
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#85CC17] cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-black/70 font-body">
                I have read and understand the credit and infraction policy.
              </span>
            </label>
            <button
              onClick={() => void handleConfirmAck()}
              disabled={!ackChecked || ackLoading}
              className={`w-full py-2.5 rounded-xl font-display font-bold text-sm transition-colors ${
                ackChecked && !ackLoading
                  ? "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"
                  : "bg-black/10 text-black/35 cursor-not-allowed"
              }`}
            >
              {ackLoading ? "Saving…" : "Confirm"}
            </button>
          </div>
        </div>
      )}

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full ${sidebarW} ${tone.sidebar} z-30 flex flex-col transition-[width] duration-200 overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Announcement banner */}
        {portalBanner && (
          <div
            className="px-3 py-2 text-xs font-body font-semibold text-center leading-snug shrink-0"
            style={{ backgroundColor: portalBanner.bg, color: portalBanner.text }}
          >
            {!sidebarCollapsed && portalBanner.message}
          </div>
        )}

        {/* Logo + collapse toggle */}
        <div className={`px-3 py-3 border-b ${tone.sidebarBorder} flex items-center shrink-0 ${sidebarCollapsed ? "justify-center" : "justify-between gap-2"}`}>
          {sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Expand sidebar"
              className="flex items-center justify-center"
            >
              <Image src="/logo.png" alt="Volta" width={26} height={26} className="object-contain" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <Image src="/logo.png" alt="Volta" width={26} height={26} className="object-contain shrink-0" />
                <div className="min-w-0">
                  <p className={`font-display font-bold ${tone.sidebarLogoText} text-sm leading-none`}>VOLTA</p>
                  <p className={`font-body text-[10px] ${tone.sidebarSubtle} mt-0.5 truncate`}>Members Portal</p>
                </div>
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                title="Collapse sidebar"
                className={`rounded-md p-1 transition-colors shrink-0 ${tone.collapseBtn}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {visibleNavItems.map((item) => {
            const matchRoots = item.activeMatchRoots?.length ? item.activeMatchRoots : [item.href];
            const isActive = pathname === item.href || matchRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                className={`flex items-center rounded-lg text-sm font-body transition-colors ${
                  sidebarCollapsed ? "justify-center px-2 py-2" : "gap-2.5 px-3 py-2"
                } ${isActive ? tone.navActive : tone.navInactive}`}
              >
                <span className={`shrink-0 ${isActive ? tone.navIconActive : tone.navIconInactive}`}>{item.icon}</span>
                {!sidebarCollapsed && item.label}
              </Link>
            );
          })}
        </nav>

        {/* User / footer */}
        <div className={`p-2 border-t ${tone.sidebarBorder} space-y-0.5 shrink-0`}>
          <div ref={profilePopoverRef} className="relative">
            <button
              type="button"
              onClick={() => setProfilePopoverOpen((v) => !v)}
              title={sidebarCollapsed ? memberDisplayName : undefined}
              className={`w-full flex items-center rounded-lg text-left transition-colors mb-1 ${
                sidebarCollapsed ? "justify-center p-2" : "gap-2.5 px-3 py-2"
              } ${tone.navInactive}`}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 tracking-tight"
                style={lightTheme
                  ? { backgroundColor: "rgba(133,204,23,0.18)", color: "#5C9911" }
                  : { backgroundColor: "rgba(133,204,23,0.15)", color: "#85CC17" }}
              >
                {initials}
              </span>
              {!sidebarCollapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <p className={`${tone.userName} text-xs font-body font-medium truncate`}>{memberDisplayName}</p>
                    <p className={`${tone.userRole} text-[10px] font-body`}>{memberRoleLabel}</p>
                  </span>
                  <svg
                    className={`w-3 h-3 shrink-0 transition-transform ${profilePopoverOpen ? "rotate-180" : ""} ${tone.userRole}`}
                    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                  >
                    <polyline points="18 15 12 9 6 15" />
                  </svg>
                </>
              )}
            </button>

            {profilePopoverOpen && (
              <div className={`absolute bottom-full mb-1 rounded-xl border shadow-xl z-50 overflow-hidden ${
                sidebarCollapsed ? "left-full ml-2 w-48" : "left-0 right-0"
              } ${lightTheme ? "bg-white border-black/10" : "bg-[#1C1F26] border-white/12"}`}>
                <div className={`px-4 py-3 border-b ${lightTheme ? "border-black/8" : "border-white/8"}`}>
                  <p className={`text-xs font-semibold font-body truncate ${lightTheme ? "text-black/80" : "text-white/85"}`}>{memberDisplayName}</p>
                  <p className={`text-[10px] font-body truncate mt-0.5 ${lightTheme ? "text-black/40" : "text-white/40"}`}>{user?.email ?? ""}</p>
                </div>
                <div className="p-1">
                  <Link
                    href="/members/me"
                    onClick={closeProfilePopover}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body transition-colors ${tone.footerLink}`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                    Account settings
                  </Link>
                  <Link
                    href="/"
                    onClick={closeProfilePopover}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body transition-colors ${tone.footerLink}`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to public site
                  </Link>
                  <button
                    onClick={() => { closeProfilePopover(); void handleSignOut(); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-body rounded-lg transition-colors ${tone.signOut}`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`flex-1 ${contentPl} flex flex-col min-h-screen min-w-0 overflow-x-hidden transition-[padding] duration-200`}>

        {/* Mobile top bar */}
        <div className={`lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-10 ${tone.mobileBar}`}>
          <button onClick={() => setSidebarOpen(true)} className={`p-1 ${tone.burgerText}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className={`font-display font-bold text-sm ${tone.mobileBarText}`}>Members Portal</span>
          <Link href="/" className={`ml-auto text-xs font-body transition-colors ${tone.mobileBarLink}`}>
            ← Site
          </Link>
        </div>

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

// ── PUBLIC EXPORT ─────────────────────────────────────────────────────────────

export default function MembersLayout({ children }: { children: ReactNode }) {
  return <MembersLayoutInner>{children}</MembersLayoutInner>;
}
