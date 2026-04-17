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
// lastModified uses static dates (not new Date()) so crawlers get meaningful
// signals. Update a date here whenever you make a significant content change.
//
// Pages intentionally excluded:
//   /impact      — has robots:{index:false}, not ready for indexing
//   /book        — internal applicant scheduling tool, not a public landing page
//   /members/*   — private portal, behind auth
//   /students    — 301 → /join
//   /business-guides — 301 → /guides
//   /progress-updates — 301 → /updates
// ───────────────────────────────────────────────────────────────────────────

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;

  return [
    // ── Primary pages (1.0) ────────────────────────────────────────────────
    {
      url: base,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${base}/partners`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${base}/join`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${base}/apply`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 1.0,
    },

    // ── Section hubs (0.8) ─────────────────────────────────────────────────
    {
      url: `${base}/showcase`,
      lastModified: new Date("2026-04-01"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/about`,
      lastModified: new Date("2026-01-01"),
      changeFrequency: "yearly",
      priority: 0.8,
    },
    {
      url: `${base}/updates`,
      lastModified: new Date("2026-04-10"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/guides`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/reports`,
      lastModified: new Date("2026-03-01"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
