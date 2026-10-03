import type { NextRequest } from "next/server";
import { SITE_URL } from "@/lib/site";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

// Supabase only honours a redirectTo that is on its allow-list, and silently
// falls back to the project's Site URL otherwise — so a reset link requested
// from a Vercel preview landed on the wrong page. Every deployment shares one
// Supabase project, so a link minted anywhere is valid at the canonical origin.
export function authRedirectOrigin(req: NextRequest): string {
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (LOCAL_HOSTS.has(host)) {
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    return `${proto}://${req.headers.get("host")}`;
  }
  return SITE_URL;
}
