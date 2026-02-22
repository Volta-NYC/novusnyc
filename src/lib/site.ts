// Canonical public URL for this site.
// Override via NEXT_PUBLIC_SITE_URL in .env.local / Vercel env vars.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://voltanyc.org";

export const SITE_HOSTNAME = new URL(SITE_URL).hostname;
