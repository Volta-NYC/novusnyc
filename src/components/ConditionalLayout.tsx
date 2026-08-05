"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import MobileStickyAction from "@/components/MobileStickyAction";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMembersPage = (pathname?.startsWith("/members") && pathname !== "/members/login") || pathname?.startsWith("/book");

  return (
    <>
      {!isMembersPage && <Navbar />}
      <main id="main-content" className={!isMembersPage ? "public-site bg-v-bg pb-20 md:pb-0" : undefined}>{children}</main>
      {!isMembersPage && <Footer />}
      {!isMembersPage && <MobileStickyAction />}
    </>
  );
}
