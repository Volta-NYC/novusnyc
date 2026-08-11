import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import SectionProgressNav from "@/components/SectionProgressNav";
import { businessGuides } from "@/data/publishing";

export const metadata: Metadata = {
  title: "Free Guides for NYC Small Business Owners",
  description:
    "Practical guides for business owners on website costs, vendor pricing, digital tools, and execution decisions.",
  openGraph: {
    title: "Guides for Businesses | Novus NYC",
    description:
      "Practical guides for business owners on website costs, vendor pricing, digital tools, and execution decisions.",
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

export default function BusinessGuidesPage() {
  return (
    <>
      <SectionProgressNav sections={[
        { id: "guides-overview", label: "Overview" },
        { id: "guides-library", label: "Guide library" },
      ]} />
      <section id="guides-overview" className="public-surface public-surface-lavender bg-n-bg pt-32 pb-16">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-3">
              Guides for Businesses
            </p>
            <h1 className="font-display font-bold text-n-ink text-4xl md:text-5xl leading-tight mb-5">
              Practical guides for NYC small business owners.
            </h1>
            <p className="font-body text-n-muted text-lg max-w-3xl">
              We saw repeated confusion around vendor pricing, website costs, and what actually drives results.
              These guides are practical references business owners can use whether or not they work with us directly.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section id="guides-library" className="public-surface public-surface-grid py-14 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8 space-y-5">
          {businessGuides.map((guide, idx) => (
            <AnimatedSection key={guide.id} delay={idx * 0.06}>
              <article className="bg-n-bg border border-n-border rounded-2xl p-6 md:p-7">
                <div className="flex flex-wrap items-center gap-2 text-xs font-body text-n-muted mb-2">
                  <span>{prettyDate(guide.date)}</span>
                  <span>•</span>
                  <span>{guide.readTime}</span>
                </div>
                <h2 className="font-display font-bold text-n-ink text-2xl mb-3">
                  {guide.title}
                </h2>
                <p className="font-body text-n-muted mb-4">{guide.summary}</p>
                <ul className="space-y-1.5 mb-5">
                  {guide.bullets.map((item) => (
                    <li key={item} className="font-body text-sm text-n-ink flex items-start gap-2">
                      <span className="text-n-orange mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <p className="font-body text-xs text-n-muted">
                  Full long-form edition coming soon.
                </p>
              </article>
            </AnimatedSection>
          ))}

          <AnimatedSection delay={businessGuides.length * 0.06}>
            <aside className="rounded-2xl border border-n-purple/40 bg-n-purple/10 p-6 md:flex md:items-center md:justify-between md:gap-8 md:p-8">
              <div>
                <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-violet-700">
                  Put the guidance to work
                </p>
                <h2 className="mt-2 font-display text-2xl font-bold text-n-ink">
                  Need a team to help you execute?
                </h2>
                <p className="mt-2 max-w-2xl font-body text-sm leading-relaxed text-n-muted">
                  Novus pairs NYC small businesses with student teams for free website, SEO, social media, grant, and operations support.
                </p>
              </div>
              <div className="mt-5 flex shrink-0 flex-wrap gap-3 md:mt-0">
                <Link
                  href="/partners#contact"
                  className="rounded-full bg-n-orange px-5 py-2.5 font-body text-sm font-bold text-n-ink transition-colors hover:bg-n-orange-dark"
                >
                  Request free support
                </Link>
                <Link
                  href="/showcase"
                  className="rounded-full border border-n-purple/60 px-5 py-2.5 font-body text-sm font-semibold text-n-ink transition-colors hover:bg-white/70"
                >
                  See our work
                </Link>
              </div>
            </aside>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
