"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuth, getDB } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { get, ref } from "firebase/database";

function normalizeAuthRole(value: unknown): "admin" | "interviewer" | "member" {
  const raw = String(value ?? "").trim();
  if (raw === "admin") return "admin";
  if (raw === "interviewer") return "interviewer";
  return "member";
}

function defaultPathForRole(role: "admin" | "interviewer" | "member"): string {
  if (role === "admin") return "/members/projects";
  return "/members/dashboard";
}

export default function MembersIndex() {
  const router = useRouter();
  useEffect(() => {
    const auth = getAuth();
    if (!auth) { router.replace("/members/login"); return; }
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace("/members/login");
        return;
      }

      const db = getDB();
      if (!db) {
        router.replace("/members/dashboard");
        return;
      }

      try {
        const roleSnap = await get(ref(db, `userProfiles/${user.uid}/authRole`));
        const role = normalizeAuthRole(roleSnap.val());
        router.replace(defaultPathForRole(role));
      } catch {
        router.replace("/members/dashboard");
      }
    });
    return unsub;
  }, [router]);
  return (
    <div className="min-h-screen bg-[#0F1014] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
    </div>
  );
}
