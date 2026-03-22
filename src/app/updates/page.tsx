import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import { progressUpdates } from "@/data/publishing";

export const metadata: Metadata = {
  title: "Progress Updates | Volta NYC",
  description:
    "Timestamped Volta progress updates covering projects, systems, and team growth.",
  openGraph: {
    title: "Progress Updates | Volta NYC",
    description: "Timestamped Volta progress updates covering projects, systems, and team growth.",
    images: ["/api/og"],
  },
};

function prettyDate(value: string): string {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type EmbedInfo = {
  url: string;
  kind: "LinkedIn" | "Instagram";
};

function toEmbedInfo(entry: { linkedinUrl?: string; linkedinUrn?: string; instagramEmbedUrl?: string }): EmbedInfo | null {
  if (entry.linkedinUrl && entry.linkedinUrl.includes("/feed/update/")) {
    return {
      url: entry.linkedinUrl.replace("://www.linkedin.com/feed/update/", "://www.linkedin.com/embed/feed/update/"),
      kind: "LinkedIn",
    };
  }
  if (entry.linkedinUrn) {
    return {
      url: `https://www.linkedin.com/embed/feed/update/${entry.linkedinUrn}`,
      kind: "LinkedIn",
    };
  }
  if (entry.instagramEmbedUrl) {
    return {
      url: entry.instagramEmbedUrl,
      kind: "Instagram",
    };
  }
  return null;
}

export default function ProgressUpdatesPage() {
  const sortedUpdates = [...progressUpdates].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <section className="bg-v-bg pt-32 pb-16 border-b border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              Progress Updates
            </p>
            <h1 className="font-display font-bold text-v-ink text-4xl md:text-5xl leading-tight mb-5">
              What we&apos;re building, week by week.
            </h1>
            <p className="font-body text-v-muted text-lg max-w-3xl">
              This is where we share updates on projects, team milestones, and new systems
              as they roll out. It&apos;s a simple running log of our work and progress.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="space-y-6">
            {sortedUpdates.map((entry, idx) => {
              const embed = toEmbedInfo(entry);
              return (
                <AnimatedSection key={entry.id} delay={idx * 0.06}>
                  <article className="bg-v-bg border border-v-border rounded-2xl p-6 md:p-7">
                    <p className="font-body text-xs text-v-muted mb-2">{prettyDate(entry.date)}</p>
                    {embed && (
                      <div className={`mt-4 ${embed.kind === "Instagram" ? "flex justify-center" : ""}`}>
                        <iframe
                          src={embed.url}
                          title={`${entry.title} ${embed.kind} post`}
                          className={embed.kind === "Instagram"
                            ? "w-full max-w-[420px] rounded-xl border border-v-border bg-white"
                            : "w-full rounded-xl border border-v-border bg-white"}
                          style={embed.kind === "Instagram" ? { minHeight: 560 } : { minHeight: 520 }}
                          loading="lazy"
                        />
                      </div>
                    )}
                    {!embed && (
                      <>
                        <h2 className="font-display font-bold text-v-ink text-2xl mb-3">{entry.title}</h2>
                        <p className="font-body text-v-muted mb-4">{entry.summary}</p>
                        <ul className="space-y-1.5">
                          {entry.highlights.map((item) => (
                            <li key={item} className="font-body text-sm text-v-ink flex items-start gap-2">
                              <span className="text-v-green mt-0.5">•</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </>
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
                  </article>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
