import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// ─── Sitemap design decisions ──────────────────────────────────────────────
// Priority tiers:
//   1.0  Primary conversion pages (homepage, main audience entry points)
//   0.8  Section hubs (informational/content index pages)
//   0.6  Individual content items (reserved — no individual pages yet)
//
// changeFrequency reflects real update cadence:
//   "weekly"   — pages whose content changes with every cohort cycle
//   "monthly"  — pages that are updated a few times per year
//   "yearly"   — stable evergreen pages
//
// lastModified uses static dates rather than new Date(). A build-time timestamp
// would mark every page as freshly changed on every deploy, which crawlers learn
// to ignore. Set a date here only when a page's content actually changes.
//
// Every page currently shares REBRAND_DATE because the Volta -> Novus rebrand
// genuinely rewrote all of them — titles, descriptions, brand copy and palette.
// That is the honest value, and mid-migration it is also the signal that matters:
// it tells Google these URLs changed and are worth recrawling. Give a page its
// own date as soon as it diverges.
//
// Pages intentionally excluded:
//   /impact      — exports robots:{index:false}; verified still noindex in prod
//   /book        — internal applicant scheduling tool, not a public landing page
//   /members/*   — private portal, behind auth (also disallowed in robots.txt)
//   /updates, /progress-updates — 308 → /showcase (page retired)
//   /students, /business-guides, /contact, /guides, /reports — 308 redirects to active pages
// ───────────────────────────────────────────────────────────────────────────

/** Date the rebrand landed, per `git log` on each page file. */
const REBRAND_DATE = new Date("2026-08-06");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  return [
    // ── Primary pages (1.0) ────────────────────────────────────────────────
    {
      url: base,
      lastModified: REBRAND_DATE,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/partners`,
      lastModified: REBRAND_DATE,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${base}/join`,
      lastModified: REBRAND_DATE,
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${base}/apply`,
      lastModified: REBRAND_DATE,
      changeFrequency: "monthly",
      priority: 1.0,
    },

    // ── Section hubs (0.8) ─────────────────────────────────────────────────
    {
      url: `${base}/showcase`,
      lastModified: REBRAND_DATE,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: REBRAND_DATE,
      changeFrequency: "yearly",
      priority: 0.8,
    },
  ];
}
