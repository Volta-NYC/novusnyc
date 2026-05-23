"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/members/authContext";

export default function MembersRoot() {
  const { user, authRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) { router.replace("/members/login"); return; }
    if (authRole === "member") { router.replace("/members/me"); return; }
    router.replace("/members/projects");
  }, [loading, user, authRole, router]);

  return null;
}
