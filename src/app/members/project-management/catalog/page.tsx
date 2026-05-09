"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LegacyProjectManagementCatalogRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/members/assignments/catalog");
  }, [router]);
  return null;
}
