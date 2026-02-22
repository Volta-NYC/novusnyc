"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The Projects page has been merged into the Businesses page.
export default function ProjectsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/members/businesses"); }, [router]);
  return null;
}
