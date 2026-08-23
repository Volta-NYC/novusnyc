"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMembersPage = pathname?.startsWith("/members") && pathname !== "/members/login";

  return (
    <>
      {!isMembersPage && <Navbar />}
      <main id="main-content" className={!isMembersPage ? "public-site bg-n-bg" : undefined}>{children}</main>
      {!isMembersPage && <Footer />}
    </>
  );
}
