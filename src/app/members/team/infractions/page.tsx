"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InfractionsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/members/admin?tab=infractions"); }, [router]);
  return null;
}
