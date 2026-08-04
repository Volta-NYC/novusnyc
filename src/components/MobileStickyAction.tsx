"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const studentPages = new Set(["/join", "/apply"]);

export default function MobileStickyAction() {
  const pathname = usePathname();
  const isStudentPath = studentPages.has(pathname);
  const href = isStudentPath ? "/apply" : "/partners#contact";
  const label = isStudentPath ? "Apply to Novus" : "Get Free Business Support";

  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] md:hidden">
      <Link
        href={href}
        className="pointer-events-auto flex min-h-12 items-center justify-center rounded-lg border border-v-green/55 bg-v-green px-5 font-display text-sm font-bold text-v-ink shadow-[0_10px_24px_rgba(35,31,36,0.18)] transition-transform duration-200 active:scale-[0.98]"
      >
        {label}
      </Link>
    </div>
  );
}
