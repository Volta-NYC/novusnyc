"use client";

import { useEffect, useRef, useState, ReactNode, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import Wordmark from "@/components/Wordmark";
import { usePathname, useRouter } from "next/navigation";

import { signOut } from "@/lib/members/supabaseAuth";
import { useAuth } from "@/lib/members/authContext";
import { type AuthRole, subscribeSiteSettings } from "@/lib/members/storage";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/members/ui";
import { EMAIL } from "@/lib/mail";

// ── NAV ITEM TYPE ─────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeMatchRoots?: string[];
  excludeMatchRoots?: string[];
  // When true, only the exact href activates this item — no prefix matching.
  activeOnlyExact?: boolean;
  // Activates when pathname.startsWith(root) for any entry here (no equality check).
  startWithRoots?: string[];
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
    label: "Tech Projects",
    activeMatchRoots: ["/members/projects"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="3" y1="13" x2="21" y2="13"/></svg>,
  },
  {
    href: "/members/orgs",
    label: "Partner Organizations",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h.01M12 7h.01M16 7h.01M8 11h.01M12 11h.01M16 11h.01"/><path d="M10 21v-4h4v4"/></svg>,
  },
  {
    href: "/members/pods",
    label: "Marketing & Finance",
    activeMatchRoots: ["/members/pods"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="7" r="2.5"/><path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M17 13a4 4 0 0 1 4 4v1"/></svg>,
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

const ADMIN_NAV_HREFS = new Set(["/members/overview", "/members/projects", "/members/pods", "/members/team", "/members/email"]);
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
    label: "My Work",
    activeOnlyExact: true,
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>,
  },
  {
    href: "/members/pods",
    label: "My Pods",
    startWithRoots: ["/members/pods"],
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="3"/><circle cx="17" cy="7" r="2.5"/><path d="M2 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"/><path d="M17 13a4 4 0 0 1 4 4v1"/></svg>,
  },
  {
    href: "/members/handbook",
    label: "Handbook",
    icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  },
];

// ── HELPERS ───────────────────────────────────────────────────────────────────

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

const TECH_PROJECTS_ITEM = OWNER_NAV_ITEMS.find((i) => i.href === "/members/projects")!;

// Tech leadership is a member everywhere except the project tracker, so it gets
// the member nav with that one page added rather than a tier of its own.
function getNavItemsForRole(role: AuthRole | null, isTechLead: boolean): NavItem[] {
  if (role === "owner") return OWNER_NAV_ITEMS;
  if (role === "admin") return ADMIN_NAV_ITEMS;
  if (isTechLead) {
    const [overview, ...rest] = MEMBER_NAV_ITEMS;
    return [overview, TECH_PROJECTS_ITEM, ...rest];
  }
  return MEMBER_NAV_ITEMS;
}

function getAllowedRootsForRole(role: AuthRole | null, isTechLead: boolean): string[] {
  if (role === "owner") {
    return [
      "/members/projects",
      "/members/overview",
      "/members/pods",
      "/members/orgs",
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
      "/members/pods",
      "/members/team",
      "/members/email",
    ];
  }
  const base = ["/members/work", "/members/me", "/members/pods", "/members/handbook", "/members/settings"];
  return isTechLead ? [...base, "/members/projects"] : base;
}

function isAllowedPath(pathname: string, allowedRoots: string[]): boolean {
  return allowedRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`));
}

// Module-level: persists across page navigations within a tab but resets on full
// page reload. Prevents the ack modal from re-showing on every soft navigation
// after the member has already confirmed (or been shown the modal) this session.
let _ackSessionDone = false;

// ── INNER LAYOUT ──────────────────────────────────────────────────────────────

function MembersLayoutInner({ children }: { children: ReactNode }) {
  const { user, userProfile, authRole, isTechLead, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const profilePopoverRef = useRef<HTMLDivElement>(null);
  const [showAckModal, setShowAckModal] = useState(false);
  const [portalBanner, setPortalBanner] = useState<{ message: string; bg: string; text: string } | null>(null);
  const [handbookAckRequiredAt, setHandbookAckRequiredAt] = useState<string | null | undefined>(undefined);

  // Load collapse preference from localStorage after mount (avoids hydration mismatch).
  useEffect(() => {
    const stored = localStorage.getItem("novus-sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  // Set the body background to the portal surface color so there's no dark flash
  // before the portal shell mounts, and no dark overscroll on iOS (mobile scroll).
  // Reverts on unmount so navigating back to the public site restores the dark bg.
  useEffect(() => {
    if (loading) return;
    document.body.style.backgroundColor = "#F4F5F7";
    localStorage.setItem("novus-portal-theme", "light");
    return () => { document.body.style.backgroundColor = ""; };
  }, [authRole, loading]);

  // When navigating from a public page with an active banner, --banner-h stays set
  // on the root element and gives the body a padding-top. Reset it on mount.
  useEffect(() => {
    document.documentElement.style.setProperty("--banner-h", "0px");
  }, []);

  const toggleCollapsed = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("novus-sidebar-collapsed", String(next));
      return next;
    });
  };

  useEffect(() => subscribeSiteSettings((s) => {
    setPortalBanner(s.portalBannerEnabled && s.portalBannerMessage.trim()
      ? { message: s.portalBannerMessage.trim(), bg: s.portalBannerBg, text: s.portalBannerText }
      : null);
    setHandbookAckRequiredAt(s.handbookAckRequiredAt);
  }), []);

  const [ackChecked, setAckChecked] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!sidebarOpen) return;
    const trigger = sidebarTriggerRef.current;
    const first = sidebarRef.current?.querySelector<HTMLElement>("a[href], button:not([disabled])");
    window.setTimeout(() => first?.focus(), 0);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      trigger?.focus();
    };
  }, [sidebarOpen]);

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
    if (handbookAckRequiredAt === undefined) return;
    // Module-level guard: the check runs at most once per browser session
    // regardless of how many times MembersLayoutInner remounts (one per page).
    if (_ackSessionDone) return;
    _ackSessionDone = true;
    // Acknowledgment is persisted in Supabase auth user metadata so it survives
    // across sessions without requiring a separate table query or RLS policy.
    const ackedAt = (user.user_metadata?.handbook_acknowledged_at as string | undefined) ?? null;
    const needsAck = !ackedAt || (handbookAckRequiredAt !== null && ackedAt < handbookAckRequiredAt);
    if (needsAck && !pathname.startsWith("/members/handbook")) {
      setShowAckModal(true);
    }
  // pathname intentionally excluded: the check should fire once per session,
  // not re-run on every navigation.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, userProfile, authRole, handbookAckRequiredAt]);

  const handleConfirmAck = async () => {
    setAckLoading(true);
    try {
      await supabase.auth.updateUser({
        data: { handbook_acknowledged_at: new Date().toISOString() },
      });
      setShowAckModal(false);
    } catch {
      setShowAckModal(false);
    } finally {
      setAckLoading(false);
    }
  };

  const visibleNavItems = getNavItemsForRole(authRole, isTechLead);

  useEffect(() => {
    if (loading || !user) return;
    const allowedRoots = getAllowedRootsForRole(authRole, isTechLead);
    if (!isAllowedPath(pathname, allowedRoots)) {
      router.replace(getDefaultMembersPath(authRole));
    }
  }, [authRole, isTechLead, loading, pathname, router, user]);

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
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#F6B78D]/30 border-t-[#F6B78D] rounded-full animate-spin" />
      </div>
    );
  }

  // Marking a member inactive used to be cosmetic — a red dot and exclusion from
  // mass email — while they kept full portal access. Owners and admins are never
  // locked out, so an accidental self-deactivation stays recoverable.
  if (userProfile && !userProfile.active && authRole === "member") {
    return (
      <div className="members-portal members-portal-light min-h-screen bg-[#F5F6F8] flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <h1 className="font-display text-lg font-semibold text-black/90">Your access is paused</h1>
          <p className="mt-2 text-sm leading-relaxed text-black/55">
            Your Novus membership is marked inactive, so the portal is closed for now.
            If that&apos;s not right, email{" "}
            <a href={`mailto:${EMAIL.info}`} className="text-[#F6B78D] hover:underline">{EMAIL.info}</a>.
          </p>
          <button
            onClick={() => void signOut()}
            className="mt-5 rounded-lg border border-black/15 bg-white px-4 py-2 text-sm text-black/70 transition-colors hover:border-black/30 hover:text-black"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const memberDisplayName = userProfile?.name || user.email?.split("@")[0] || "Member";
  const memberRoleLabel =
    authRole === "owner" ? "Owner" :
    authRole === "admin" ? "Admin" :
    "Member";
  const initials = getInitials(memberDisplayName);

  const tone = {
    page: "bg-[#F5F6F8]",
    sidebar: "bg-white border-r border-black/8 shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
    sidebarLogoText: "text-[#8B5E48]",
    sidebarSubtle: "text-black/55",
    sidebarBorder: "border-black/8",
    navInactive: "text-black/55 hover:text-black/85 hover:bg-black/5",
    navActive: "bg-[#F6B78D]/15 text-[#8B5E48]",
    navIconInactive: "text-black/35",
    navIconActive: "text-[#8B5E48]",
    userName: "text-black/75",
    userRole: "text-black/35",
    footerLink: "text-black/45 hover:text-black/70 hover:bg-black/5",
    signOut: "text-red-600 hover:text-red-700 hover:bg-red-50",
    mobileBar: "bg-white border-b border-black/8",
    mobileBarText: "text-black/85",
    mobileBarLink: "text-black/45 hover:text-black/70",
    burgerText: "text-black/55",
    collapseBtn: "text-black/30 hover:text-black/55 hover:bg-black/5",
  };

  // Sidebar width classes
  const sidebarW = sidebarCollapsed ? "w-14" : "w-56";
  const contentPl = sidebarCollapsed ? "lg:pl-14" : "lg:pl-56";

  return (
    <div className={`members-portal members-portal-light min-h-screen ${tone.page} flex`}>

      {/* Handbook acknowledgment modal */}
      <Modal open={showAckModal} onClose={() => {}} title="Before you continue" dismissible={false}>
          <div className="max-w-md rounded-xl bg-white p-5">
            <p className="text-black/60 text-sm font-body mb-4 leading-relaxed">
              By continuing, you acknowledge that you have read and understand the Novus NYC conduct, attendance, and infraction policy in the Member Handbook.
            </p>
            <a
              href="/members/handbook"
              className="inline-flex items-center gap-1 text-sm text-[#8B5E48] hover:text-[#F6B78D] font-body font-medium mb-5 transition-colors"
            >
              Read the Handbook →
            </a>
            <label className="flex items-start gap-3 mb-6 cursor-pointer">
              <input
                type="checkbox"
                checked={ackChecked}
                onChange={(e) => setAckChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#F6B78D] cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-black/70 font-body">
                I have read and understand the conduct, attendance, and infraction policy.
              </span>
            </label>
            <button
              type="button"
              onClick={() => void handleConfirmAck()}
              disabled={!ackChecked || ackLoading}
              className={`w-full py-2.5 rounded-xl font-display font-bold text-sm transition-colors ${
                ackChecked && !ackLoading
                  ? "bg-[#F6B78D] text-[#0D0D0D] hover:bg-[#E9A77E]"
                  : "bg-black/10 text-black/35 cursor-not-allowed"
              }`}
            >
              {ackLoading ? "Saving…" : "Confirm"}
            </button>
          </div>
      </Modal>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="member-navigation"
        ref={sidebarRef}
        // Translated offscreen is still focusable: Tab used to walk into a
        // sidebar the reader could not see. data-closed drives visibility, which
        // does remove it from the tab order, delayed so the slide still plays.
        data-closed={!sidebarOpen}
        className={`members-sidebar fixed left-0 top-0 h-full ${sidebarW} ${tone.sidebar} z-30 flex flex-col transition-[width,transform] duration-200 ease-in-out overflow-hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Announcement banner — hidden when collapsed (text doesn't fit) */}
        {portalBanner && !sidebarCollapsed && (
          <div
            className="px-3 py-2 text-xs font-body font-semibold text-center leading-snug shrink-0"
            style={{ backgroundColor: portalBanner.bg, color: portalBanner.text }}
          >
            {portalBanner.message}
          </div>
        )}

        {/* Logo + collapse toggle — fixed height keeps the border-b from shifting */}
        <div className={`h-[52px] border-b ${tone.sidebarBorder} flex items-center shrink-0 ${sidebarCollapsed ? "justify-center" : "px-3 gap-2"}`}>
          {sidebarCollapsed ? (
            <button type="button" onClick={toggleCollapsed} aria-label="Expand sidebar" className="rounded-md p-1">
              <Image src="/logo.png" alt="" width={223} height={200} className="h-8 w-auto object-contain shrink-0" />
            </button>
          ) : (
            <Image src="/logo.png" alt="Novus NYC logo" width={223} height={200} className="h-8 w-auto object-contain shrink-0" />
          )}
          {!sidebarCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <Wordmark className={`${tone.sidebarLogoText} text-sm leading-none`} />
                <p className={`font-body text-[10px] ${tone.sidebarSubtle} mt-0.5`}>Members Portal</p>
              </div>
              <button
                type="button"
                onClick={toggleCollapsed}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className={`rounded-md p-1 shrink-0 transition-colors ${tone.collapseBtn}`}
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
            const inMatch = item.activeOnlyExact
              ? pathname === item.href
              : (pathname === item.href
                  || matchRoots.some((root) => pathname === root || pathname.startsWith(`${root}/`))
                  || (item.startWithRoots?.some((root) => pathname.startsWith(root)) ?? false));
            const excluded = item.excludeMatchRoots?.some((root) => pathname === root || pathname.startsWith(`${root}/`)) ?? false;
            const isActive = inMatch && !excluded;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={sidebarCollapsed ? item.label : undefined}
                aria-label={sidebarCollapsed ? item.label : undefined}
                aria-current={isActive ? "page" : undefined}
                className={`flex items-center gap-2.5 rounded-lg text-sm font-body transition-colors ${
                  sidebarCollapsed ? "justify-center px-2 py-2" : "px-3 py-2"
                } ${isActive ? tone.navActive : tone.navInactive}`}
              >
                <span className={`shrink-0 ${isActive ? tone.navIconActive : tone.navIconInactive}`}>{item.icon}</span>
                {!sidebarCollapsed && <span className="font-body">{item.label}</span>}
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
              aria-label={sidebarCollapsed ? memberDisplayName : undefined}
              className={`w-full flex items-center gap-2.5 rounded-lg text-left transition-colors mb-1 ${
                sidebarCollapsed ? "justify-center p-2" : "px-3 py-2"
              } ${tone.navInactive}`}
            >
              <span
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 tracking-tight"
                style={{ backgroundColor: "rgba(246,183,141,0.18)", color: "#8B5E48" }}
              >
                {initials}
              </span>
              {!sidebarCollapsed && (
                <span className="flex-1 min-w-0">
                  <p className={`${tone.userName} text-xs font-body font-medium truncate`}>{memberDisplayName}</p>
                  <p className={`${tone.userRole} text-[10px] font-body`}>{memberRoleLabel}</p>
                </span>
              )}
              {!sidebarCollapsed && (
                <svg
                  className={`w-3 h-3 shrink-0 transition-transform duration-150 ${profilePopoverOpen ? "rotate-180" : ""} ${tone.userRole}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              )}
            </button>

            {profilePopoverOpen && (
              <div className={`absolute bottom-full mb-1 rounded-xl border shadow-xl z-50 overflow-hidden ${
                sidebarCollapsed ? "left-full ml-2 w-48" : "left-0 right-0"
              } bg-white border-black/10`}>
                <div className="border-b border-black/8 px-4 py-3">
                  <p className="truncate font-body text-xs font-semibold text-black/80">{memberDisplayName}</p>
                  <p className="mt-0.5 truncate font-body text-[10px] text-black/40">{user?.email ?? ""}</p>
                </div>
                <div className="p-1">
                  {authRole === "member" && (
                    <Link
                      href="/members/settings"
                      onClick={closeProfilePopover}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body transition-colors ${tone.footerLink}`}
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                      Account settings
                    </Link>
                  )}
                  <Link
                    href="/"
                    onClick={closeProfilePopover}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-body transition-colors ${tone.footerLink}`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to public site
                  </Link>
                  <button
                    type="button"
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
      <div className={`flex-1 ${contentPl} flex flex-col min-h-screen min-w-0 overflow-x-hidden`}>

        {/* Mobile top bar */}
        <div className={`lg:hidden flex items-center gap-3 px-4 py-3 sticky top-0 z-10 ${tone.mobileBar}`}>
          <button
            ref={sidebarTriggerRef}
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open member navigation"
            aria-expanded={sidebarOpen}
            aria-controls="member-navigation"
            className={`rounded p-1 ${tone.burgerText}`}
          >
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
