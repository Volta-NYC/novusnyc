import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://voltanyc.org";
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "monthly", priority: 1.0 },
    { url: `${base}/partners`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/join`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/apply`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/showcase`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/impact`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
