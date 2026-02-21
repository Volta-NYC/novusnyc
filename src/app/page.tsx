import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import CountUp from "@/components/CountUp";
import HeroSection from "@/components/HeroSection";
import { MapPinIcon } from "@/components/Icons";
import { homeStats, homeTracks, marqueeSchools, currentProjects } from "@/data";

export const metadata: Metadata = {
  title: "Volta NYC — Student-Led Consulting for NYC Small Businesses",
  description:
    "Volta NYC places student teams on real consulting projects for NYC small businesses — websites, social media, grant writing, and SEO. Free of charge. 9 neighborhoods, 80+ students.",
  openGraph: {
    title: "Volta NYC",
    description: "Student consultants. Real deliverables. Free for NYC small businesses.",
  },
};

export default function Home() {
  return (
    <>
      <HeroSection />

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <div className="bg-white border-y border-v-border py-4 overflow-hidden">
        <div className="marquee-track">
          {[...marqueeSchools, ...marqueeSchools].map((item, i) => (
            <span key={i} className="font-body text-sm text-v-muted font-medium whitespace-nowrap inline-flex items-center">
              <span className="px-8">{item}</span>
              <span className="w-2 h-2 rounded-full bg-v-green flex-shrink-0" />
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ────────────────────────────────────────────── */}
      <section className="bg-v-dark py-20">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-10">
          {homeStats.map((s) => (
            <AnimatedSection key={s.label} className="text-center">
              <div className="font-display font-bold text-5xl md:text-6xl text-v-green mb-2">
                <CountUp end={s.value} suffix={s.suffix} />
              </div>
              <div className="font-body text-xs uppercase tracking-widest text-white/40">{s.label}</div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── WHO WE SERVE ─────────────────────────────────────── */}
      <section className="py-20 bg-white border-b border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-muted uppercase tracking-widest mb-3">Who we serve</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Built for two audiences.</h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-2 gap-6">

            {/* Students */}
            <AnimatedSection direction="left">
              <div className="bg-lime-50 border border-lime-100 rounded-2xl p-10 h-full flex flex-col">
                <p className="font-body text-xs font-semibold text-v-green uppercase tracking-widest mb-4">For students</p>
                <h3 className="font-display font-bold text-v-ink text-2xl md:text-3xl leading-tight mb-5">
                  Build a portfolio<br />of real work.
                </h3>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Deployed websites, live social campaigns, submitted grants",
                    "2–4 hours a week — fully remote-friendly",
                    "References from directors who watched you work",
                    "High school and college students welcome",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 font-body text-sm text-v-muted">
                      <span className="w-1.5 h-1.5 rounded-full bg-v-green flex-shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/join"
                  className="inline-block bg-v-ink text-white font-display font-bold text-sm px-7 py-3.5 rounded-full hover:bg-v-ink/80 transition-colors self-start"
                >
                  Apply Now →
                </Link>
              </div>
            </AnimatedSection>

            {/* Businesses */}
            <AnimatedSection direction="right">
              <div className="bg-v-dark border border-white/5 rounded-2xl p-10 h-full flex flex-col">
                <p className="font-body text-xs font-semibold text-v-blue uppercase tracking-widest mb-4">For businesses</p>
                <h3 className="font-display font-bold text-white text-2xl md:text-3xl leading-tight mb-5">
                  Professional help.<br />No cost, ever.
                </h3>
                <ul className="space-y-3 mb-8 flex-1">
                  {[
                    "Custom websites, built and deployed",
                    "Social media strategy and account management",
                    "Grant research and full application writing",
                    "Google Maps, Yelp, and SEO optimization",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5 font-body text-sm text-white/60">
                      <span className="w-1.5 h-1.5 rounded-full bg-v-blue flex-shrink-0 mt-1.5" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/partners"
                  className="inline-block bg-v-blue text-white font-display font-bold text-sm px-7 py-3.5 rounded-full hover:bg-v-blue-dark transition-colors self-start"
                >
                  Get Started →
                </Link>
              </div>
            </AnimatedSection>

          </div>
        </div>
      </section>

      {/* ── THREE TRACKS ─────────────────────────────────────── */}
      <section className="py-24 bg-v-bg border-t border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-14">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">What we do</p>
            <h2 className="font-display font-bold text-v-ink" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Three tracks.
            </h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              Student teams work directly with business owners on what they can benefit most from.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-5">
            {homeTracks.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.1}>
                <div className={`${t.color} border rounded-2xl p-8 h-full project-card`}>
                  <div className={`w-12 h-12 rounded-xl ${t.iconBg} flex items-center justify-center mb-5`}>
                    <t.icon className={`w-6 h-6 ${t.iconColor}`} />
                  </div>
                  <h3 className="font-display font-bold text-v-ink text-lg mb-4">{t.name}</h3>
                  <ul className="space-y-2.5">
                    {t.items.map((item) => (
                      <li key={item} className="flex items-center gap-2.5 font-body text-sm text-v-muted">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.accent}`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section className="py-20 bg-v-green">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-14 text-center">
            <p className="font-body text-xs font-semibold text-v-ink/40 uppercase tracking-widest mb-3">For businesses</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              Working with us is simple.
            </h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                n: "1",
                title: "Tell us what you need",
                desc: "Fill out a short form or get referred by your local BID. We follow up within a few days.",
              },
              {
                n: "2",
                title: "We scope the work",
                desc: "A quick call or visit to understand your business, your goals, and what's realistic.",
              },
              {
                n: "3",
                title: "Your team gets to work",
                desc: "A dedicated student pod delivers your project — one point of contact throughout.",
              },
            ].map((s, i) => (
              <AnimatedSection key={s.n} delay={i * 0.1} className="text-center">
                <p className="font-display font-bold text-v-ink/15 text-8xl leading-none mb-3 select-none">{s.n}</p>
                <h3 className="font-display font-bold text-v-ink text-lg mb-2">{s.title}</h3>
                <p className="font-body text-sm text-v-ink/70 leading-relaxed">{s.desc}</p>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection className="text-center mt-12">
            <Link
              href="/partners"
              className="inline-block bg-v-ink text-white font-display font-bold text-sm px-8 py-4 rounded-full hover:bg-v-ink/80 transition-colors"
            >
              Work with us →
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CURRENT PROJECTS ─────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10 flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-2">Currently active</p>
              <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">In the field right now</h2>
            </div>
            <Link href="/showcase" className="font-body text-sm font-semibold text-v-blue hover:underline">
              See all work →
            </Link>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-5">
            {currentProjects.map((p, i) => (
              <AnimatedSection key={p.name} delay={i * 0.1}>
                <div className="border border-v-border rounded-2xl overflow-hidden project-card bg-v-bg">
                  <div className={`${p.color} h-2`} />
                  <div className="p-6">
                    <span className="tag bg-v-border text-v-muted mb-4 inline-block">{p.services[0]}</span>
                    <h3 className="font-display font-bold text-v-ink text-xl mb-1">{p.name}</h3>
                    <p className="font-body text-sm text-v-muted">{p.type}</p>
                    <p className="font-body text-xs text-v-muted/70 mt-2 flex items-center gap-1.5">
                      <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {p.neighborhood}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── NYC REACH ────────────────────────────────────────── */}
      <section className="py-20 bg-v-dark">
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <AnimatedSection className="mb-10">
            <p className="font-body text-xs font-semibold text-v-green uppercase tracking-widest mb-3">Our reach</p>
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
              Across all five boroughs.
            </h2>
            <p className="font-body text-white/50 text-lg max-w-xl mx-auto">
              9 active neighborhoods and growing — we go where NYC&apos;s small businesses are.
            </p>
          </AnimatedSection>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { name: "Brooklyn", cls: "border-lime-500/30 text-lime-400 bg-lime-500/10" },
              { name: "Queens", cls: "border-blue-400/30 text-blue-300 bg-blue-400/10" },
              { name: "Manhattan", cls: "border-amber-400/30 text-amber-400 bg-amber-400/10" },
              { name: "The Bronx", cls: "border-purple-400/30 text-purple-400 bg-purple-400/10" },
              { name: "Staten Island", cls: "border-rose-400/30 text-rose-400 bg-rose-400/10" },
            ].map((b, i) => (
              <AnimatedSection key={b.name} delay={i * 0.08}>
                <span className={`inline-block border rounded-full px-6 py-2.5 font-display font-bold text-base ${b.cls}`}>
                  {b.name}
                </span>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection>
            <div className="mt-14 pt-10 border-t border-white/10 flex flex-wrap justify-center gap-10">
              {[
                { value: "501(c)(3)", label: "Registered nonprofit" },
                { value: "Free", label: "For every business" },
                { value: "NYC", label: "Born and raised" },
              ].map((f) => (
                <div key={f.label} className="text-center">
                  <p className="font-display font-bold text-white text-xl mb-1">{f.value}</p>
                  <p className="font-body text-xs text-white/40 uppercase tracking-widest">{f.label}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── DUAL CTA ─────────────────────────────────────────── */}
      <section className="grid md:grid-cols-2 min-h-[400px]">
        <AnimatedSection direction="left" className="bg-v-green flex flex-col justify-center p-12 md:p-16">
          <p className="font-display font-bold text-v-ink/60 text-sm uppercase tracking-widest mb-4">For students</p>
          <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl leading-tight mb-4">
            Build a portfolio<br />of real projects.
          </h2>
          <p className="font-body text-v-ink/70 mb-8 max-w-sm">
            2–4 hours a week. Deploy websites, build social communities, win grants. High school and college students welcome.
          </p>
          <Link href="/join" className="inline-block bg-v-ink text-white font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-ink/80 transition-colors self-start">
            Apply Now →
          </Link>
        </AnimatedSection>
        <AnimatedSection direction="right" className="bg-v-blue flex flex-col justify-center p-12 md:p-16">
          <p className="font-display font-bold text-white/60 text-sm uppercase tracking-widest mb-4">For businesses</p>
          <h2 className="font-display font-bold text-white text-3xl md:text-4xl leading-tight mb-4">
            Get real help.<br />At no cost.
          </h2>
          <p className="font-body text-white/70 mb-8 max-w-sm">
            We work with small businesses across NYC on websites, social media, grants, and more.
          </p>
          <Link href="/partners" className="inline-block bg-white text-v-blue font-display font-bold text-base px-8 py-4 rounded-full hover:bg-white/90 transition-colors self-start">
            Get Started →
          </Link>
        </AnimatedSection>
      </section>
    </>
  );
}
