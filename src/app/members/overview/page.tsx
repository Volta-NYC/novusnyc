"use client";

import MembersLayout from "@/components/members/MembersLayout";
import AdminCycleOverview from "@/components/members/AdminCycleOverview";
import MemberOverview from "@/components/members/MemberOverview";
import { useAuth } from "@/lib/members/authContext";
import { Spinner } from "@/components/members/ui";

export default function OverviewPage() {
  const { authRole, loading } = useAuth();

  if (loading) {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </MembersLayout>
    );
  }

  if (authRole === "owner" || authRole === "admin") return <AdminCycleOverview />;
  return <MemberOverview />;
}
