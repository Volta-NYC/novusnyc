"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyProjectManagementApprovalsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/members/assignments/for-review");
  }, [router]);
  return null;
}
