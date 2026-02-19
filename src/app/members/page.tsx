"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSession } from "@/lib/members/auth";

export default function MembersIndex() {
  const router = useRouter();
  useEffect(() => {
    const s = getSession();
    router.replace(s ? "/members/dashboard" : "/members/login");
  }, [router]);
  return (
    <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
    </div>
  );
}
