"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/members/authContext";

function defaultPathForRole(role: "admin" | "interviewer" | "member" | null): string {
  if (role === "interviewer") return "/members/applicants/interviews";
  return "/members/overview";
}

export default function MembersIndex() {
  const { user, authRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/members/login");
      return;
    }
    router.replace(defaultPathForRole(authRole));
  }, [loading, user, authRole, router]);

  return (
    <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
    </div>
  );
}
