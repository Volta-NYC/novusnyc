"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMembersPage = pathname?.startsWith("/members");

  return (
    <>
      {!isMembersPage && <Navbar />}
      <main>{children}</main>
      {!isMembersPage && <Footer />}
    </>
  );
}
