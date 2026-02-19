"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

const links = [
  { href: "/showcase", label: "Our Work" },
  { href: "/about", label: "About" },
  { href: "/partners", label: "For Businesses" },
  { href: "/contact", label: "Contact" },
  { href: "/members", label: "Members" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  // Pages with dark/coloured hero backgrounds need white nav text when unscrolled
  const isDarkHero = pathname === "/partners";
  const useWhiteText = isDarkHero && !scrolled && !open;

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled || open
            ? "bg-v-bg/95 backdrop-blur-md shadow-sm border-b border-v-border"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="Volta"
              width={32}
              height={32}
              className={`object-contain transition-all`}
              style={{ filter: useWhiteText ? "brightness(0) invert(1)" : "none" }}
            />
            <span className={`font-display font-bold text-xl tracking-tight transition-colors ${useWhiteText ? "text-white" : "text-v-ink"}`}>
              VOLTA NYC
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`font-body text-sm font-semibold transition-colors ${
                  pathname === l.href
                    ? "text-v-green"
                    : useWhiteText
                    ? "text-white/80 hover:text-white"
                    : "text-v-muted hover:text-v-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/join"
              className="bg-v-green text-v-ink font-display font-bold text-sm px-5 py-2.5 rounded-full hover:bg-v-green-dark transition-colors"
            >
              Apply Now
            </Link>
          </nav>

          <button
            onClick={() => setOpen(!open)}
            className={`md:hidden flex flex-col gap-1.5 p-2 ${useWhiteText ? "text-white" : ""}`}
            aria-label="Menu"
          >
            <span className={`block h-0.5 w-5 transition-all duration-300 ${useWhiteText && !open ? "bg-white" : "bg-v-ink"} ${open ? "rotate-45 translate-y-2" : ""}`} />
            <span className={`block h-0.5 w-5 transition-all duration-300 ${useWhiteText && !open ? "bg-white" : "bg-v-ink"} ${open ? "opacity-0" : ""}`} />
            <span className={`block h-0.5 w-5 transition-all duration-300 ${useWhiteText && !open ? "bg-white" : "bg-v-ink"} ${open ? "-rotate-45 -translate-y-2" : ""}`} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 top-16 z-40 bg-v-bg flex flex-col px-6 pt-8 gap-6 md:hidden"
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="font-display font-bold text-2xl text-v-ink border-b border-v-border pb-4"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/join"
              className="bg-v-green text-v-ink font-display font-bold text-lg px-6 py-4 rounded-xl text-center mt-2"
            >
              Apply Now
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
