"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/members/authContext";
import { Spinner } from "@/components/members/ui";

function defaultPathForRole(_role: "owner" | "admin" | "member" | null): string {
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
      <Spinner size="lg" />
    </div>
  );
}
