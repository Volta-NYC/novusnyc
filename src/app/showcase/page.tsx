import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import CountUp from "@/components/CountUp";
import { MapPinIcon } from "@/components/Icons";

const bigNumbers = [
  { value: 12, suffix: "+", label: "Businesses helped" },
  { value: 8, suffix: "", label: "NYC neighborhoods" },
  { value: 40, suffix: "+", label: "Student contributors" },
];

const projects = [
  {
    name: "Souk Al Shater",
    type: "Lebanese Restaurant",
    neighborhood: "Sunnyside, Queens",
    services: ["Website Build"],
    status: "In Progress",
    color: "bg-orange-400",
    desc: "Full website build from scratch for a Sunnyside Lebanese restaurant with no prior online presence.",
  },
  {
    name: "Anatolico",
    type: "Turkish Home Goods",
    neighborhood: "Park Slope, Brooklyn",
    services: ["Social Media"],
    status: "Active",
    color: "bg-v-green",
    desc: "Social media strategy, Founder Stories content series, and Instagram account management.",
  },
  {
    name: "Higher Learning",
    type: "Tutoring Center",
    neighborhood: "Chinatown, Manhattan",
    services: ["Website", "SEO"],
    status: "In Progress",
    color: "bg-v-blue",
    desc: "Website build and SEO setup with Cantonese/Mandarin language support for a Chinatown tutoring center.",
  },
  {
    name: "The Painted Pot",
    type: "Pottery Studio",
    neighborhood: "Park Slope, Brooklyn",
    services: ["SEO", "Google Visibility"],
    status: "Active",
    color: "bg-amber-400",
    desc: "Google Maps optimization, SEO audit, and social media strategy for a Park Slope pottery studio.",
  },
  {
    name: "Juliette Floral Design",
    type: "Flower Shop",
    neighborhood: "Park Slope, Brooklyn",
    services: ["Website"],
    status: "Upcoming",
    color: "bg-pink-400",
    desc: "Website redesign and online ordering setup for a 5th Avenue floral boutique.",
  },
  {
    name: "Bayaal",
    type: "African Home Goods",
    neighborhood: "Park Slope, Brooklyn",
    services: ["Website", "Social Media"],
    status: "Upcoming",
    color: "bg-purple-400",
    desc: "Website clarity improvements and Founder Stories social media content.",
  },
];

export default function Showcase() {
  return (
    <>
      <section className="bg-v-bg pt-32 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Our work</p>
            <h1
              className="font-display font-bold text-v-ink leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Projects across<br />
              <span className="text-v-green">NYC.</span>
            </h1>
          </AnimatedSection>
        </div>
      </section>

      <section className="bg-v-dark py-16">
        <div className="max-w-5xl mx-auto px-5 grid grid-cols-3 gap-10 text-center">
          {bigNumbers.map((n) => (
            <AnimatedSection key={n.label}>
              <div className="font-display font-bold text-4xl md:text-5xl text-v-green mb-1">
                <CountUp end={n.value} suffix={n.suffix} />
              </div>
              <div className="font-body text-xs uppercase tracking-widest text-white/40">{n.label}</div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p, i) => (
              <AnimatedSection key={p.name} delay={i * 0.08}>
                <div className="bg-white border border-v-border rounded-2xl overflow-hidden project-card h-full flex flex-col">
                  <div className={`${p.color} h-2`} />
                  <div className="p-7 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex gap-2 flex-wrap">
                        {p.services.map((s) => (
                          <span key={s} className="tag bg-v-border text-v-muted">{s}</span>
                        ))}
                      </div>
                      <span className={`tag text-xs ${p.status === "Active" ? "bg-lime-100 text-lime-700" : p.status === "In Progress" ? "bg-blue-100 text-blue-700" : "bg-v-border text-v-muted"}`}>
                        {p.status}
                      </span>
                    </div>
                    <h3 className="font-display font-bold text-v-ink text-xl mb-1">{p.name}</h3>
                    <p className="font-body text-sm text-v-muted mb-3">{p.type}</p>
                    <p className="font-body text-sm text-v-ink/70 leading-relaxed flex-1">{p.desc}</p>
                    <p className="font-body text-xs text-v-muted/70 mt-4 flex items-center gap-1.5">
                      <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {p.neighborhood}
                    </p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-v-green text-center">
        <div className="max-w-2xl mx-auto px-5">
          <AnimatedSection>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-4">
              Your business could be next.
            </h2>
            <p className="font-body text-v-ink/70 mb-8">
              We&apos;re actively taking on new projects in Brooklyn, Queens, and Manhattan.
            </p>
            <Link
              href="/partners#contact"
              className="inline-block bg-v-ink text-white font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-ink/80 transition-colors"
            >
              Get in touch →
            </Link>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
