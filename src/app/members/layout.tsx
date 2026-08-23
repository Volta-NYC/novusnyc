"use client";

import { type ReactNode } from "react";
import { AuthProvider } from "@/lib/members/authContext";

// Wraps every /members/* page with AuthProvider so that useAuth() works
// in page-level components, not only inside MembersLayout children.
export default function MembersRootLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {/*
        Inline script runs before any React paint and applies the portal's one
        supported theme, preventing a dark flash before the light UI mounts.
        dangerouslySetInnerHTML is required for a synchronous inline script.
      */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{document.body.style.backgroundColor='#F5F6F8';}catch(e){}})();`,
        }}
      />
      {children}
    </AuthProvider>
  );
}
