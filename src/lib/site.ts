// Canonical public URL for this site.
// www is canonical: DNS/Vercel 301 the apex (novusnyc.org) to www.novusnyc.org,
// so this must use www or every canonical tag and OG url costs an extra hop.
// Override via NEXT_PUBLIC_SITE_URL in .env.local / Vercel env vars.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.novusnyc.org";

export const SITE_HOSTNAME = new URL(SITE_URL).hostname;
