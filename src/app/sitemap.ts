import { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL;
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/partners`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/join`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/apply`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/showcase`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/impact`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
  ];
}
