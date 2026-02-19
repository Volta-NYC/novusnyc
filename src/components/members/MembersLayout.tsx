"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { getSession, clearSession, type Session } from "@/lib/members/auth";

const navItems = [
  { href: "/members/dashboard", label: "Dashboard", icon: "⬛" },
  { href: "/members/projects", label: "Projects", icon: "📁" },
  { href: "/members/businesses", label: "Businesses", icon: "🏪" },
  { href: "/members/tasks", label: "Tasks", icon: "✅" },
  { href: "/members/bids", label: "BID Tracker", icon: "🤝" },
  { href: "/members/grants", label: "Grant Library", icon: "💰" },
  { href: "/members/team", label: "Team Directory", icon: "👥" },
];

const SVG_ICONS: Record<string, JSX.Element> = {
  "⬛": <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  "📁": <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>,
  "🏪": <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  "✅": <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  "🤝": <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  "💰": <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  "👥": <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

interface Props { children: ReactNode; }

export default function MembersLayout({ children }: Props) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const s = getSession();
    if (!s) {
      router.replace("/members/login");
    } else {
      setSession(s);
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    clearSession();
    router.replace("/members/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const roleColors: Record<string, string> = {
    admin: "bg-red-500/20 text-red-400",
    project_lead: "bg-blue-500/20 text-blue-400",
    member: "bg-green-500/20 text-green-400",
    viewer: "bg-gray-500/20 text-gray-400",
  };

  return (
    <div className="min-h-screen bg-[#0F1014] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-[#16181D] border-r border-white/8 z-30 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="p-5 border-b border-white/8 flex items-center gap-3">
          <Image src="/logo.png" alt="Volta" width={32} height={32} className="object-contain" />
          <div>
            <p className="font-display font-bold text-white text-sm leading-none">VOLTA NYC</p>
            <p className="font-body text-[10px] text-white/40 mt-0.5 uppercase tracking-widest">Members Portal</p>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#85CC17]/20 flex items-center justify-center flex-shrink-0">
              <span className="font-display font-bold text-[#85CC17] text-sm">{session.name[0].toUpperCase()}</span>
            </div>
            <div className="min-w-0">
              <p className="font-body text-sm text-white font-medium truncate">{session.name}</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${roleColors[session.role]}`}>
                {session.role.replace("_", " ")}
              </span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body font-medium transition-colors ${
                  active ? "bg-[#85CC17]/15 text-[#85CC17]" : "text-white/50 hover:text-white hover:bg-white/5"
                }`}>
                <span className={active ? "text-[#85CC17]" : "text-white/30"}>
                  {SVG_ICONS[item.icon]}
                </span>
                {item.label}
              </Link>
            );
          })}

          {session.role === "admin" && (
            <Link href="/members/admin"
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body font-medium transition-colors mt-3 ${
                pathname === "/members/admin" ? "bg-red-500/15 text-red-400" : "text-white/50 hover:text-white hover:bg-white/5"
              }`}>
              <svg className="w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
              </svg>
              Admin Panel
            </Link>
          )}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/8">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-white/30 hover:text-white/60 text-xs font-body transition-colors mb-1">
            ← Back to public site
          </Link>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-white/30 hover:text-red-400 text-xs font-body transition-colors">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#16181D] border-b border-white/8 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-white/60 p-1">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-display font-bold text-white text-sm">Members Portal</span>
        </div>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
