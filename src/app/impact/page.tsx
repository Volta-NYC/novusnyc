// NOTE: This page is intentionally not linked in the navbar.
// It will be published once we have more photos, testimonials, and outcome data.
// Route: /impact

import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import CountUp from "@/components/CountUp";

export const metadata: Metadata = {
  title: "Impact | Volta NYC",
  description:
    "Volta NYC impact report: 20+ businesses served, 9 NYC neighborhoods, 80+ student contributors. Outcomes in digital access, financial access, and marketing reach.",
  openGraph: {
    title: "Impact | Volta NYC",
    description: "Measurable outcomes. Real communities.",
  },
  robots: { index: false }, // keep unlinked until ready
};

const outcomes = [
  { value: 20, suffix: "+", label: "Businesses Served", sub: "Across 9 NYC neighborhoods", color: "text-v-green" },
  { value: 80, suffix: "+", label: "Student Members", sub: "High school & college", color: "text-v-blue" },
  { value: 9, suffix: "", label: "Neighborhoods Active", sub: "Brooklyn, Queens, Manhattan, Bronx", color: "text-amber-500" },
  { value: 30, suffix: "+", label: "FL Businesses Served", sub: "National total growing", color: "text-purple-500" },
  { value: 6, suffix: "", label: "Cities Operating", sub: "NYC, Jacksonville, Bay Area, Atlanta, VA, Dallas", color: "text-v-green" },
  { value: 3, suffix: "", label: "Service Tracks", sub: "Tech, Finance, Marketing", color: "text-v-blue" },
];

const impactAreas = [
  {
    title: "Digital Access",
    desc: "We build and deploy professional websites for small businesses that could not otherwise afford web development. Our work directly expands each business's reach and legitimacy online.",
    metrics: ["Avg. Google Maps impressions +340% post-SEO", "100% of websites are mobile-optimized and ADA compliant", "Median time to launch: 3 weeks"],
    color: "border-v-blue",
    accentBg: "bg-blue-50",
  },
  {
    title: "Financial Access",
    desc: "Many NYC small business owners are unaware of the grants and public programs they qualify for. Our finance track conducts research, prepares applications, and navigates the process on their behalf.",
    metrics: ["Grant applications submitted (cumulative)", "Average grant amount identified per business", "% of applicants receiving at least 1 award"],
    color: "border-amber-400",
    accentBg: "bg-amber-50",
    placeholder: true,
  },
  {
    title: "Marketing Reach",
    desc: "We create social media content strategies, produce founder video content, and grow audiences for businesses that don't have the time or resources to manage digital marketing themselves.",
    metrics: ["Average follower growth per account managed", "Avg. posts per week across active accounts", "Video content produced per semester"],
    color: "border-v-green",
    accentBg: "bg-lime-50",
    placeholder: true,
  },
];

const testimonials = [
  {
    quote: "They built us a website in three weeks and optimized our Google listing. We're getting calls we never got before.",
    name: "Business Owner",
    business: "Souk Al Shater — Sunnyside, Queens",
    initials: "S",
  },
  {
    quote: "Our Instagram went from zero to consistent content for the first time. The students really understood the brand.",
    name: "Business Owner",
    business: "Anatolico — Park Slope, Brooklyn",
    initials: "A",
  },
  {
    quote: "The grant research they did found opportunities I had no idea existed. It takes time we just don't have.",
    name: "Business Owner",
    business: "Higher Learning — Chinatown, Manhattan",
    initials: "H",
  },
];

const recognition = [
  { org: "NYC Small Business Services", desc: "Recognized as a community asset in outreach to BIDs", placeholder: true },
  { org: "Stuyvesant High School", desc: "Student-run nonprofit founded by and operating with Stuy students", placeholder: false },
  { org: "Media coverage", desc: "Coming soon — documenting our first full semester", placeholder: true },
];

export default function Impact() {
  return (
    <>
      {/* Hero */}
      <section className="bg-v-dark pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="absolute top-0 right-0 w-96 h-96 bg-v-green/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Impact Report</p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Measurable outcomes.<br />
              <span className="text-v-green">Real communities.</span>
            </h1>
            <p className="font-body text-white/70 text-lg max-w-2xl leading-relaxed">
              Volta NYC is not just a student organization — it&apos;s a proof of concept that students can
              deliver professional-grade work to under-resourced businesses at scale. This page documents that work.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Key Stats */}
      <section className="py-20 bg-v-bg border-b border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">By the numbers</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Volta NYC — Spring 2026</h2>
          </AnimatedSection>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {outcomes.map((o, i) => (
              <AnimatedSection key={o.label} delay={i * 0.07}>
                <div className="text-center">
                  <div className={`font-display font-bold text-5xl mb-2 ${o.color}`}>
                    <CountUp end={o.value} suffix={o.suffix} />
                  </div>
                  <p className="font-body text-sm font-semibold text-v-ink">{o.label}</p>
                  <p className="font-body text-xs text-v-muted mt-1 leading-relaxed">{o.sub}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Impact Areas */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">Three tracks of impact</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Where change happens</h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {impactAreas.map((area, i) => (
              <AnimatedSection key={area.title} delay={i * 0.1}>
                <div className={`border-l-4 ${area.color} ${area.accentBg} rounded-r-2xl p-8 h-full`}>
                  <h3 className="font-display font-bold text-v-ink text-2xl mb-3">{area.title}</h3>
                  <p className="font-body text-v-muted text-sm leading-relaxed mb-6">{area.desc}</p>
                  <div className="space-y-2.5">
                    {area.metrics.map((m) => (
                      <div key={m} className="flex items-center gap-2.5 font-body text-sm text-v-ink">
                        <span className="w-1.5 h-1.5 rounded-full bg-v-green flex-shrink-0" />
                        {area.placeholder ? (
                          <span className="text-v-muted/60 italic">{m} — data pending</span>
                        ) : (
                          m
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-v-bg border-y border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">From our partners</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Business owner voices</h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <AnimatedSection key={t.business} delay={i * 0.1}>
                <div className="bg-white border border-v-border rounded-2xl p-8 project-card h-full flex flex-col">
                  <div className="text-v-green text-4xl font-display leading-none mb-5">&ldquo;</div>
                  <p className="font-body text-v-ink text-base leading-relaxed flex-1 italic">{t.quote}</p>
                  <div className="flex items-center gap-3 mt-6 pt-6 border-t border-v-border">
                    <div className="w-10 h-10 rounded-full bg-v-green/20 flex items-center justify-center flex-shrink-0">
                      <span className="font-display font-bold text-v-green">{t.initials}</span>
                    </div>
                    <div>
                      <p className="font-body text-sm font-semibold text-v-ink">{t.name}</p>
                      <p className="font-body text-xs text-v-muted">{t.business}</p>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Geographic reach — links to the interactive map on /showcase */}
      <section className="py-20 bg-v-dark">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
                  Geographic reach
                </p>
                <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
                  9 neighborhoods.<br />4 boroughs.
                </h2>
                <p className="font-body text-white/50 leading-relaxed mb-6">
                  Park Slope, Sunnyside, Chinatown, Long Island City, Cypress Hills,
                  Flatbush, Flushing, Mott Haven, Bayside. Each neighborhood represents
                  an active BID or community organization partnership.
                </p>
                <Link
                  href="/showcase"
                  className="inline-block border border-white/20 text-white font-display font-bold text-sm px-6 py-3 rounded-full hover:border-v-green hover:text-v-green transition-colors"
                >
                  View interactive map →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { borough: "Brooklyn", count: "3 neighborhoods" },
                  { borough: "Queens", count: "4 neighborhoods" },
                  { borough: "Manhattan", count: "1 neighborhood" },
                  { borough: "Bronx", count: "1 neighborhood" },
                ].map((b) => (
                  <div key={b.borough} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <p className="font-display font-bold text-white text-lg">{b.borough}</p>
                    <p className="font-body text-xs text-white/40 mt-1">{b.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Recognition */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">Recognition</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Institutional credibility</h2>
          </AnimatedSection>
          <div className="space-y-4">
            {recognition.map((r, i) => (
              <AnimatedSection key={r.org} delay={i * 0.1}>
                <div className={`bg-white border border-v-border rounded-2xl p-7 flex items-start gap-5 ${r.placeholder ? "opacity-60" : ""}`}>
                  <div className="w-10 h-10 rounded-full bg-v-green/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-v-green text-lg">★</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-v-ink text-lg">{r.org}</h3>
                    <p className="font-body text-sm text-v-muted mt-1">
                      {r.desc}
                      {r.placeholder && <span className="italic text-v-muted/50"> — details to be added</span>}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Future / transparency */}
      <section className="py-14 bg-v-dark text-center">
        <div className="max-w-2xl mx-auto px-5">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Transparency</p>
            <h2 className="font-display font-bold text-white text-2xl mb-4">
              This page is updated each semester.
            </h2>
            <p className="font-body text-white/50 max-w-xl mx-auto">
              We&apos;re a young organization. Not every metric is filled in yet. We believe in showing our work honestly —
              including what we&apos;re still building toward. Check back after each cohort cycle.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
