"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import AdminDashboard from "@/components/members/AdminDashboard";
import { useAuth } from "@/lib/members/authContext";
import { Spinner } from "@/components/members/ui";

export default function OverviewPage() {
  const { authRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/me");
  }, [loading, authRole, router]);

  if (loading || authRole === "member") {
    return (
      <MembersLayout>
        <div className="flex h-64 items-center justify-center"><Spinner /></div>
      </MembersLayout>
    );
  }

  return <AdminDashboard />;
}
