"use client";

import MembersLayout from "@/components/members/MembersLayout";
import AdminCycleOverview from "@/components/members/AdminCycleOverview";
import MemberOverview from "@/components/members/MemberOverview";
import { useAuth } from "@/lib/members/authContext";

export default function OverviewPage() {
  const { authRole, loading } = useAuth();

  if (loading) {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
        </div>
      </MembersLayout>
    );
  }

  if (authRole === "admin") return <AdminCycleOverview />;
  return <MemberOverview />;
}
