"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import Wordmark from "@/components/Wordmark";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { href: "/showcase", label: "Our Work" },
  { href: "/about", label: "About" },
  { href: "/partners", label: "For Businesses" },
  { href: "/join", label: "For Students" },
];

const moreLinks = [
  { href: "/reports", label: "Reports & Case Studies" },
  { href: "/guides", label: "Guides for Businesses" },
  { href: "/members", label: "Member Portal" },
];

// The navbar is always dark. The palette is pastel, so a light bar washes the
// accents out and the mid-scroll theme flip read as a glitch. A constant dark
// surface also means the header markup no longer depends on scroll position,
// which removes a server/client hydration mismatch.

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const browserPathname = typeof window !== "undefined" ? window.location.pathname : "";
  const currentPathname = (pathname || browserPathname || "/").replace(/\/$/, "") || "/";

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [currentPathname]);

  useEffect(() => {
    if (!moreOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMoreOpen(false);
        moreButtonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreOpen]);

  useEffect(() => {
    if (!open) return;
    const menu = mobileMenuRef.current;
    const mobileButton = mobileButtonRef.current;
    const background = Array.from(document.querySelectorAll<HTMLElement>("main, footer"));
    background.forEach((element) => { element.inert = true; });
    const timer = window.setTimeout(() => menu?.querySelector<HTMLElement>("a[href]")?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab" || !menu) return;
      const menuItems = Array.from(menu.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'));
      const focusable = mobileButton ? [mobileButton, ...menuItems] : menuItems;
      if (!focusable.length) { event.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      background.forEach((element) => { element.inert = false; });
      mobileButton?.focus();
    };
  }, [open]);

  const navTextClass = "text-white/75 hover:text-white";
  const moreActive = moreLinks.some((l) => currentPathname === l.href) || currentPathname.startsWith("/members");

  return (
    <>
      <header
        className="fixed left-0 right-0 z-[70] isolate border-b border-white/15 bg-[#17151a]/[0.97] text-white backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
        style={{ top: "var(--banner-h, 0px)" }}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 md:gap-2 group">
            <Image
              src="/logo.png"
              alt="Novus NYC logo"
              width={223}
              height={200}
              className="h-9 w-auto object-contain"
            />
            <Wordmark className="text-xl text-n-orange" />
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative flex h-16 items-center font-body text-sm font-semibold transition-colors after:absolute after:bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:bg-n-orange after:transition-transform after:duration-200 ${
                  currentPathname === l.href
                    ? "text-n-orange after:scale-x-100"
                    : `${navTextClass} after:scale-x-0 hover:after:scale-x-100`
                }`}
              >
                {l.label}
              </Link>
            ))}

            {/* More dropdown */}
            <div
              ref={moreRef}
              className="relative"
              onMouseEnter={() => setMoreOpen(true)}
              onMouseLeave={() => setMoreOpen(false)}
            >
              <button
                ref={moreButtonRef}
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                aria-haspopup="true"
                aria-controls="desktop-more-menu"
                className={`relative flex h-16 items-center gap-1 font-body text-sm font-semibold transition-colors after:absolute after:bottom-1 after:left-0 after:h-0.5 after:w-full after:origin-left after:bg-n-orange after:transition-transform after:duration-200 ${
                  moreActive
                    ? "text-n-orange after:scale-x-100"
                    : `${navTextClass} after:scale-x-0 hover:after:scale-x-100`
                }`}
              >
                More
                <svg
                  className={`w-3 h-3 transition-transform duration-200 ${moreOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <AnimatePresence>
                {moreOpen && (
                  <motion.div
                    id="desktop-more-menu"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 pt-3 min-w-[160px]"
                  >
                    <div className="bg-[#221f26] border border-white/10 rounded-xl shadow-[0_16px_40px_rgba(0,0,0,0.45)] py-1.5 overflow-hidden">
                      {moreLinks.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className={`block px-4 py-2.5 font-body text-sm transition-colors hover:bg-white/8 ${
                            l.href === "/members" || currentPathname === l.href
                              ? "text-n-orange font-semibold"
                              : "text-white/75 hover:text-white"
                          }`}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="/apply"
              className="bg-n-orange text-n-ink font-display font-bold text-sm px-5 py-2.5 rounded-full hover:bg-n-orange-dark transition-colors"
            >
              Apply Now
            </Link>
          </nav>

          <div className="flex items-center gap-1 md:hidden">
            <Link
              href="/apply"
              className="rounded-full bg-n-orange px-3.5 py-2 font-display text-sm font-bold text-n-ink transition-colors hover:bg-n-orange-dark"
            >
              Apply
            </Link>
            <button
              ref={mobileButtonRef}
              type="button"
              onClick={() => setOpen(!open)}
              className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 rounded-full"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-nav-menu"
            >
              <span className={`block h-0.5 w-5 transition-all duration-300 bg-white ${open ? "rotate-45 translate-y-2" : ""}`} />
              <span className={`block h-0.5 w-5 transition-all duration-300 bg-white ${open ? "opacity-0" : ""}`} />
              <span className={`block h-0.5 w-5 transition-all duration-300 bg-white ${open ? "-rotate-45 -translate-y-2" : ""}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={mobileMenuRef}
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-4 overflow-y-auto bg-[#17151a] px-5 pb-8 pt-6 md:hidden"
            style={{ top: "calc(var(--banner-h, 0px) + 4rem)" }}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`font-display font-bold text-xl border-b border-white/10 py-3 pl-3 border-l-2 ${
                  currentPathname === l.href ? "text-n-orange border-l-n-orange" : "text-white/85 border-l-transparent"
                }`}
              >
                {l.label}
              </Link>
            ))}

            {/* More section in mobile */}
            <div className="border-b border-white/10 py-3">
              <p className="font-display font-bold text-xl text-white/85 mb-3">More</p>
              <div className="flex flex-col gap-2 pl-2">
                {moreLinks.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    className={`font-body text-base transition-colors ${
                      l.href === "/members" ? "text-n-orange font-semibold" : "text-white/60 hover:text-white"
                    }`}
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>

            <Link
              href="/apply"
              className="bg-n-orange text-n-ink font-display font-bold text-lg px-6 py-4 rounded-xl text-center mt-2"
            >
              Apply Now
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
