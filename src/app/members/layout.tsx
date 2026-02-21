"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/lib/members/authContext";

// Wraps every /members/* page with AuthProvider so that useAuth() works
// in page-level components, not only inside MembersLayout children.
export default function MembersRootLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
