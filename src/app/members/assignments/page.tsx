"use client";

// Default landing for the Assignments section — redirects to the catalog tab so
// the URL always lands on a meaningful view.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AssignmentsIndex() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/members/assignments/by-business");
  }, [router]);
  return null;
}
