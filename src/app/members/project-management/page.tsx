"use client";

// Default landing for the Assignments section — redirects to the catalog
// tab so the URL always lands on a meaningful view.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProjectManagementIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/members/assignments/catalog");
  }, [router]);
  return null;
}
