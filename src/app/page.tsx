import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import HeroSection from "@/components/HeroSection";
import { MapPinIcon } from "@/components/Icons";
import { homeStats, currentProjects as fallbackCurrentProjects, joinTracks } from "@/data";
import { VOLTA_STATS, formatStat } from "@/data/stats";
import { getPublicShowcaseCards } from "@/lib/server/publicShowcase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Volta NYC — Free Consulting for NYC Small Businesses",
  description:
    `Volta NYC places student teams on real consulting projects for NYC small businesses — websites, social media, grant writing, and SEO. Free of charge. ${formatStat(VOLTA_STATS.nycNeighborhoods)} neighborhoods, ${formatStat(VOLTA_STATS.studentMembers)} students.`,
  openGraph: {
    title: "Volta NYC",
    description: "Student consultants. Real deliverables. Free for NYC small businesses.",
    images: ["/hero-nyc-skyline.jpg"],
  },
};

const SHOWCASE_COLOR_CLASS: Record<string, string> = {
  "blue-soft": "bg-blue-300",
  "blue-mid": "bg-blue-500",
  "blue-deep": "bg-blue-700",
  "lime-soft": "bg-lime-300",
  "lime-mid": "bg-lime-500",
  "lime-deep": "bg-lime-700",
  "amber-soft": "bg-amber-300",
  "amber-mid": "bg-amber-500",
  "amber-deep": "bg-amber-700",
  "pink-soft": "bg-pink-300",
  "pink-mid": "bg-pink-500",
  "pink-deep": "bg-pink-700",
  "purple-mid": "bg-purple-500",
  "red-soft": "bg-red-300",
  "red-mid": "bg-red-500",
  "red-deep": "bg-red-700",
  // Safety mapping for older entries.
  green: "bg-lime-500",
  blue: "bg-blue-500",
  orange: "bg-red-500",
  amber: "bg-amber-500",
  pink: "bg-pink-500",
  purple: "bg-purple-500",
  "green-soft": "bg-lime-300",
  "green-mid": "bg-lime-500",
  "green-deep": "bg-lime-700",
};

export default async function Home() {
  const publicShowcase = await getPublicShowcaseCards();
  const featuredHomeCards = publicShowcase
    .filter((card) => card.featuredOnHome)
    .slice(0, 6);
  const homeProjects = featuredHomeCards.length > 0
    ? featuredHomeCards.map((card) => ({
      name: card.name,
      neighborhood: card.neighborhood,
      services: card.services,
      colorClass: SHOWCASE_COLOR_CLASS[card.color] ?? "bg-blue-500",
      url: card.url,
      imageUrl: card.imageUrl,
    }))
    : (publicShowcase.length === 0
      ? fallbackCurrentProjects.slice(0, 6).map((project) => ({
      name: project.name,
      neighborhood: project.neighborhood,
      services: project.services,
      colorClass: project.color,
      url: project.url,
      imageUrl: undefined as string | undefined,
      }))
      : []);

  const getServiceTagClass = (service: string) => {
    const key = service.trim().toLowerCase();
    if (key.includes("website") || key.includes("seo") || key.includes("google")) {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }
    if (key.includes("social")) {
      return "bg-lime-100 text-lime-700 border-lime-200";
    }
    if (key.includes("finance") || key.includes("grant") || key.includes("payment")) {
      return "bg-amber-100 text-amber-700 border-amber-200";
    }
    return "bg-v-border text-v-muted border-v-border";
  };

  return (
    <>
      <section className="relative overflow-hidden">
        <Image
          src="/hero-nyc-skyline.jpg"
          alt=""
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 home-shared-wash" />
        <div className="absolute inset-0 hero-vignette opacity-70 pointer-events-none" />
        <div className="relative">
          <HeroSection />

          {/* ── STATS ─────────────────────────────────────────────── */}
          <section data-home-dark-end="true" className="relative py-14 border-b border-white/10">
            <div className="max-w-6xl mx-auto px-5 md:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                {homeStats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-4 py-5 md:px-6 md:py-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                  >
                    <div className="font-display font-bold text-3xl md:text-4xl text-v-green mb-1.5">
                      {s.value}{s.suffix}
                    </div>
                    <div className="font-body text-[10px] md:text-xs uppercase tracking-[0.14em] text-white/75">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>

      {/* ── THREE TRACKS ─────────────────────────────────────── */}
      <section className="py-24 bg-v-bg border-t border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-14">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">How we work</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">The three tracks</h2>
            <p className="font-body text-v-muted mt-3 max-w-xl">
              Every project is staffed by students across our three tracks. Work is fast-paced, goes live quickly, and includes backend systems in addition to frontend execution, with sustainability and continued support built into how each client project is maintained over time.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {joinTracks.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.1}>
                <div className={`border rounded-2xl p-8 h-full flex flex-col ${t.color}`}>
                  <div className={`w-11 h-11 rounded-xl ${t.iconBg} flex items-center justify-center mb-5`}>
                    <t.icon className={`w-5 h-5 ${t.iconColor}`} />
                  </div>
                  <h3 className="font-display font-bold text-v-ink text-xl mb-5">{t.name}</h3>

                  <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-3">What you&apos;ll do</p>
                  <ul className="space-y-2 mb-6">
                    {t.doWhat.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 font-body text-sm text-v-muted">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${t.iconColor.replace("text-", "bg-")}`} />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-3 mt-auto pt-4 border-t border-black/6">Who fits in</p>
                  <ul className="space-y-2">
                    {t.skills.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 font-body text-sm text-v-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-v-muted/30 flex-shrink-0 mt-1.5" />
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
              <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">In the field right now</h2>
            </div>
            <Link href="/showcase" className="font-body text-sm font-semibold text-v-blue hover:underline">
              See all work →
            </Link>
          </AnimatedSection>
          {homeProjects.length > 0 ? (
            <div className="columns-1 md:columns-2 xl:columns-3 [column-gap:1.25rem]">
              {homeProjects.map((p, i) => (
                <AnimatedSection
                  key={p.name}
                  delay={i * 0.06}
                  className="inline-block w-full break-inside-avoid mb-5 align-top"
                >
                  <div className="border border-v-border rounded-2xl overflow-hidden project-card bg-v-bg">
                    <div className={`${p.colorClass} h-2`} />
                    {p.imageUrl ? (
                      <div className="mx-4 sm:mx-6 mt-6 rounded-xl border border-v-border bg-white overflow-hidden">
                        <img
                          src={p.imageUrl}
                          alt={`${p.name} project`}
                          className="block w-full h-auto"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    ) : (
                      <div className="mx-4 sm:mx-6 mt-6 rounded-xl border border-v-border h-40 flex items-center justify-center bg-white">
                        <span className="font-body text-xs text-v-muted uppercase tracking-wider">Project photo coming soon</span>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {p.services.map((service) => (
                          <span key={`${p.name}-${service}`} className={`tag border ${getServiceTagClass(service)}`}>{service}</span>
                        ))}
                      </div>
                      <h3 className="font-display font-bold text-v-ink text-xl mb-1">{p.name}</h3>
                      <p className="font-body text-xs text-v-muted/70 mt-2 flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {p.neighborhood}
                      </p>
                    </div>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          ) : (
            <div className="border border-v-border rounded-2xl bg-v-bg px-5 py-6">
              <p className="font-body text-sm text-v-muted">
                No home projects selected yet. Enable “show on home” for up to 6 projects in the Projects popup.
              </p>
            </div>
          )}
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
              We operate through trusted neighborhood partners and place teams where businesses are ready to launch and improve quickly.
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
        </div>
      </section>

    </>
  );
}
