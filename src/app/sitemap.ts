import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// ─── Sitemap design decisions ──────────────────────────────────────────────
// Priority tiers:
//   1.0  Primary conversion pages (homepage, main audience entry points)
//   0.8  Section hubs (informational/content index pages)
//   0.6  Individual content items (reserved — no individual pages yet)
//   0.3  Utility pages that must be indexable but are never a landing target
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
// Each date is the last commit touching that page's own file, per `git log -1
// --format=%cs -- <path>`. They shared one rebrand date while the Volta -> Novus
// migration was the only thing that had touched them; that stopped being true as
// the pages diverged, and a date that understates a real change is the same
// wasted signal as one that overstates it. Re-check the page you edited.
//
// Pages intentionally excluded:
//   /impact      — 308 redirects to the impact section on /about
//   /book        — retired self-booking portal; 308 redirects to /apply
//   /members/*   — private portal, behind auth (also disallowed in robots.txt)
//   /updates, /progress-updates — 308 → /showcase (page retired)
//   /students, /business-guides, /contact, /guides, /reports — 308 redirects
// ───────────────────────────────────────────────────────────────────────────

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  return [
    // ── Primary pages (1.0) ────────────────────────────────────────────────
    {
      url: base,
      lastModified: new Date("2026-09-01"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/partners`,
      lastModified: new Date("2026-08-27"),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${base}/join`,
      lastModified: new Date("2026-08-19"),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${base}/apply`,
      lastModified: new Date("2026-08-23"),
      changeFrequency: "monthly",
      priority: 1.0,
    },

    // ── Section hubs (0.8) ─────────────────────────────────────────────────
    {
      url: `${base}/showcase`,
      lastModified: new Date("2026-08-20"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: new Date("2026-09-01"),
      changeFrequency: "yearly",
      priority: 0.8,
    },

    // ── Utility (0.3) ──────────────────────────────────────────────────────
    // Indexed already via footer links; listing it keeps the sitemap an honest
    // inventory of the public site rather than only its marketing surface.
    {
      url: `${base}/privacy`,
      lastModified: new Date("2026-08-12"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
