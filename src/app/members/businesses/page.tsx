"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BusinessesRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/members/projects"); }, [router]);
  return null;
}
