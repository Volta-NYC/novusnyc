import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import { businessGuides } from "@/data/publishing";

export const metadata: Metadata = {
  title: "Guides for Businesses | Volta NYC",
  description:
    "Practical guides for business owners on website costs, vendor pricing, digital tools, and execution decisions.",
  openGraph: {
    title: "Guides for Businesses | Volta NYC",
    description:
      "Practical guides for business owners on website costs, vendor pricing, digital tools, and execution decisions.",
    images: ["/hero-nyc-skyline.jpg"],
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

export default function BusinessGuidesPage() {
  return (
    <>
      <section className="bg-v-bg pt-32 pb-16 border-b border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              Guides for Businesses
            </p>
            <h1 className="font-display font-bold text-v-ink text-4xl md:text-5xl leading-tight mb-5">
              Practical playbooks for owners.
            </h1>
            <p className="font-body text-v-muted text-lg max-w-3xl">
              We saw repeated confusion around vendor pricing, website costs, and what actually drives results.
              These guides are practical references business owners can use whether or not they work with us directly.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8 space-y-5">
          {businessGuides.map((guide, idx) => (
            <AnimatedSection key={guide.id} delay={idx * 0.06}>
              <article className="bg-v-bg border border-v-border rounded-2xl p-6 md:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs font-body text-v-muted mb-2">
                  <span>{prettyDate(guide.date)}</span>
                  <span>•</span>
                  <span>{guide.readTime}</span>
                </div>
                <h2 className="font-display font-bold text-v-ink text-2xl mb-3">
                  {guide.title}
                </h2>
                <p className="font-body text-v-muted mb-4">{guide.summary}</p>
                <ul className="space-y-1.5 mb-5">
                  {guide.bullets.map((item) => (
                    <li key={item} className="font-body text-sm text-v-ink flex items-start gap-2">
                      <span className="text-v-green mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="font-body text-xs text-v-muted">
                  Full long-form edition coming soon.
                </p>
              </article>
            </AnimatedSection>
          ))}
        </div>
      </section>
    </>
  );
}
