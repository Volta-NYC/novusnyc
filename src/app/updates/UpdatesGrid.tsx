"use client";

import MasonryGrid from "@/components/MasonryGrid";
import type { UpdateEntry } from "@/data/publishing";

function prettyDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function toEmbedInfo(entry: UpdateEntry): { url: string; kind: "LinkedIn" | "Instagram" } | null {
  if (entry.linkedinUrl && entry.linkedinUrl.includes("/feed/update/")) {
    return {
      url: entry.linkedinUrl.replace("://www.linkedin.com/feed/update/", "://www.linkedin.com/embed/feed/update/"),
      kind: "LinkedIn",
    };
  }
  if (entry.linkedinUrn) {
    return { url: `https://www.linkedin.com/embed/feed/update/${entry.linkedinUrn}`, kind: "LinkedIn" };
  }
  if (entry.instagramEmbedUrl) {
    return { url: entry.instagramEmbedUrl, kind: "Instagram" };
  }
  return null;
}

export default function UpdatesGrid({ updates }: { updates: UpdateEntry[] }) {
  return (
    <MasonryGrid itemIds={updates.map((u) => u.id)} itemWidth={340} gap={16}>
      {updates.map((entry) => {
        const embed = toEmbedInfo(entry);
        return (
          <div key={entry.id} className="bg-white border border-v-border rounded-2xl overflow-hidden">
            <p className="px-4 pt-3 pb-1 font-body text-[11px] uppercase tracking-wider text-v-muted/60">
              {prettyDate(entry.date)}
            </p>
            {embed ? (
              <iframe
                src={embed.url}
                title={`${entry.title} ${embed.kind} post`}
                className="w-full block"
                style={{ height: embed.kind === "Instagram" ? 500 : 480 }}
                loading="lazy"
              />
            ) : (
              <div className="px-4 pb-5 pt-1">
                <h2 className="font-display font-bold text-v-ink text-lg mb-2">{entry.title}</h2>
                <p className="font-body text-v-muted text-sm mb-3">{entry.summary}</p>
                {entry.highlights.length > 0 && (
                  <ul className="space-y-1.5">
                    {entry.highlights.map((item) => (
                      <li key={item} className="font-body text-sm text-v-ink flex items-start gap-2">
                        <span className="text-v-green mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {entry.links && entry.links.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {entry.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-body px-3 py-1.5 rounded-full border border-v-border text-v-muted hover:text-v-ink hover:border-v-ink transition-colors"
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </MasonryGrid>
  );
}
