// Canonical public URL for this site.
//
// www is canonical: DNS/Vercel 301 the apex (novusnyc.org) to www.novusnyc.org,
// so this must use www or every canonical tag and og:url costs an extra hop.
//
// Override via NEXT_PUBLIC_SITE_URL in .env.local / Vercel env vars — but a
// pre-rebrand host is never a valid canonical. next.config.mjs 301s all of them
// to www.novusnyc.org, so emitting one here would publish canonical tags,
// og:url values and sitemap entries pointing at URLs that immediately redirect
// away. Google reads that as a conflicting signal and keeps the old domain
// indexed. This exact case shipped once: a stale NEXT_PUBLIC_SITE_URL put
// voltanyc.org into the sitemap, robots.txt and the JSON-LD `url` field.
const CANONICAL_URL = "https://www.novusnyc.org";

const NON_CANONICAL_HOSTS = new Set([
  "voltanyc.org",
  "www.voltanyc.org",
  "nyc.voltanpo.org",
  "volta-nyc.vercel.app",
  "novus-nyc.vercel.app",
  "novusnyc.org", // apex 301s to www
]);

function resolveSiteUrl(): string {
  const override = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!override) return CANONICAL_URL;
  try {
    if (NON_CANONICAL_HOSTS.has(new URL(override).hostname.toLowerCase())) {
      return CANONICAL_URL;
    }
    return override.replace(/\/$/, "");
  } catch {
    return CANONICAL_URL;
  }
}

export const SITE_URL = resolveSiteUrl();

export const SITE_HOSTNAME = new URL(SITE_URL).hostname;
