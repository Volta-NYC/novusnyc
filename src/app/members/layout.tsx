"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/lib/members/authContext";

// Wraps every /members/* page with AuthProvider so that useAuth() works
// in page-level components, not only inside MembersLayout children.
export default function MembersRootLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {/*
        Inline script runs before any React paint. Reads the cached portal theme
        from localStorage and applies the matching background immediately, so
        repeat visits see no dark flash on the light-theme member portal.
        dangerouslySetInnerHTML is required for a synchronous inline script.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var t=localStorage.getItem('novus-portal-theme');document.body.style.backgroundColor=t==='light'?'#F5F6F8':'#0D0F14';}catch(e){}})();`,
        }}
      />
      {children}
    </AuthProvider>
  );
}
