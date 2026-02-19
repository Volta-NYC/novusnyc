"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { isAuthenticated, clearAuth } from "@/lib/members/auth";
import { isFirebaseConfigured } from "@/lib/firebase";

const navItems = [
  { href: "/members/dashboard", label: "Dashboard", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  { href: "/members/projects", label: "Projects", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
  { href: "/members/businesses", label: "Businesses", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  { href: "/members/tasks", label: "Tasks", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  { href: "/members/bids", label: "BID Tracker", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: "/members/grants", label: "Grant Library", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> },
  { href: "/members/team", label: "Team", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { href: "/members/admin", label: "Data", icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
];

export default function MembersLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [firebaseReady, setFirebaseReady] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/members/login");
      return;
    }
    setFirebaseReady(isFirebaseConfigured());
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1014] flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-56 bg-[#13151A] border-r border-white/6 z-30 flex flex-col transition-transform duration-200 ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Logo */}
        <div className="px-4 py-4 border-b border-white/6 flex items-center gap-2.5">
          <Image src="/logo.png" alt="Volta" width={28} height={28} className="object-contain" />
          <div>
            <p className="font-display font-bold text-white text-sm leading-none">VOLTA NYC</p>
            <p className="font-body text-[10px] text-white/30 mt-0.5">Members Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                  active ? "bg-[#85CC17]/12 text-[#85CC17]" : "text-white/45 hover:text-white/80 hover:bg-white/4"
                }`}>
                <span className={active ? "text-[#85CC17]" : "text-white/25"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Footer links */}
        <div className="p-2 border-t border-white/6 space-y-0.5">
          <Link href="/" className="flex items-center gap-2 px-3 py-2 text-white/30 hover:text-white/60 text-xs font-body rounded-lg hover:bg-white/4 transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to public site
          </Link>
          <button
            onClick={() => { clearAuth(); router.replace("/members/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-white/25 hover:text-red-400 text-xs font-body rounded-lg hover:bg-white/4 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:pl-56 flex flex-col min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-[#13151A] border-b border-white/6 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(true)} className="text-white/50 p-1">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <span className="font-display font-bold text-white text-sm">Members Portal</span>
          <Link href="/" className="ml-auto text-white/30 hover:text-white/60 text-xs font-body transition-colors">← Site</Link>
        </div>

        {/* Firebase not configured warning */}
        {!firebaseReady && (
          <div className="mx-4 mt-4 bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3 text-orange-400 text-sm">
            <strong>Firebase not configured.</strong> Data is not being saved or shared. Add Firebase env vars in Vercel to enable shared storage. See README for setup instructions.
          </div>
        )}

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
