import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import CountUp from "@/components/CountUp";
import HeroSection from "@/components/HeroSection";
import { BarChartIcon, CodeIcon, MegaphoneIcon, MapPinIcon } from "@/components/Icons";

const stats = [
  { value: 20, suffix: "+", label: "Businesses Supported" },
  { value: 9, suffix: "", label: "NYC Neighborhoods" },
  { value: 80, suffix: "+", label: "Student Members" },
  { value: 3, suffix: "", label: "Service Tracks" },
];

const tracks = [
  {
    icon: BarChartIcon,
    name: "Finance & Operations",
    color: "bg-amber-50 border-amber-100",
    accent: "bg-amber-400",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-100",
    items: ["Grant research & writing", "Revenue & sales analysis", "POS & payment optimization", "Operational consulting"],
  },
  {
    icon: CodeIcon,
    name: "Digital & Tech",
    color: "bg-blue-50 border-blue-100",
    accent: "bg-v-blue",
    iconColor: "text-v-blue",
    iconBg: "bg-blue-100",
    items: ["Website design & development", "SEO & Google Maps visibility", "Web accessibility (ADA)", "Cloud & security basics"],
  },
  {
    icon: MegaphoneIcon,
    name: "Marketing & Strategy",
    color: "bg-lime-50 border-lime-100",
    accent: "bg-v-green",
    iconColor: "text-v-green",
    iconBg: "bg-lime-100",
    items: ["Social media management", "Founder storytelling & video", "Content creation & strategy", "Audience growth analytics"],
  },
];

const currentProjects = [
  { name: "Souk Al Shater", type: "Lebanese Restaurant", neighborhood: "Sunnyside, Queens", service: "Website", color: "bg-orange-400" },
  { name: "Anatolico", type: "Turkish Home Goods", neighborhood: "Park Slope, Brooklyn", service: "Social Media", color: "bg-v-green" },
  { name: "Higher Learning", type: "Tutoring Center", neighborhood: "Chinatown, Manhattan", service: "Website", color: "bg-v-blue" },
];

const marqueeItems = [
  "Stuyvesant High School",
  "Brooklyn Tech",
  "Bronx Science",
  "Staten Island Tech",
  "Binghamton University",
  "Hunter College",
  "Stony Brook University",
  "Baruch College",
];

export default function Home() {
  return (
    <>
      <HeroSection />

      {/* ── MARQUEE ──────────────────────────────────────────── */}
      <div className="bg-white border-y border-v-border py-4 overflow-hidden">
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
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
          {stats.map((s) => (
            <AnimatedSection key={s.label} className="text-center">
              <div className="font-display font-bold text-5xl md:text-6xl text-v-green mb-2">
                <CountUp end={s.value} suffix={s.suffix} />
              </div>
              <div className="font-body text-xs uppercase tracking-widest text-white/40">{s.label}</div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* ── THREE TRACKS ─────────────────────────────────────── */}
      <section className="py-24 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-14">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">What we do</p>
            <h2 className="font-display font-bold text-v-ink" style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Three tracks.
            </h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              Student teams work directly with business owners to deliver work they actually need.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-5">
            {tracks.map((t, i) => (
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
                    <span className="tag bg-v-border text-v-muted mb-4 inline-block">{p.service}</span>
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

      {/* ── DUAL CTA ─────────────────────────────────────────── */}
      <section className="grid md:grid-cols-2 min-h-[400px]">
        <AnimatedSection direction="left" className="bg-v-green flex flex-col justify-center p-12 md:p-16">
          <p className="font-display font-bold text-v-ink/60 text-sm uppercase tracking-widest mb-4">For students</p>
          <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl leading-tight mb-4">
            Build a portfolio<br />on real projects.
          </h2>
          <p className="font-body text-v-ink/70 mb-8 max-w-sm">
            2–4 hours a week. Deployed websites, published content, submitted grants. High school and college students welcome.
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
