"use client";

// Default landing for the Project Management section — redirects to the catalog
// tab so the URL always lands on a meaningful view.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectManagementIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/members/project-management/catalog");
  }, [router]);
  return null;
}
