"use client";

// Finance assignments have been unified into the main Assignments section.
// Redirect anyone landing on the old URL to the new By Business view.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FinanceAssignmentsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/members/assignments/by-project");
  }, [router]);
  return null;
}
