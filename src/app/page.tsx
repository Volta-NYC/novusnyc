import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import HeroSection from "@/components/HeroSection";
import { MapPinIcon } from "@/components/Icons";
import { homeStats, currentProjects as fallbackCurrentProjects, joinTracks } from "@/data";
import ExpandableDescription from "@/components/ExpandableDescription";
import MasonryGrid from "@/components/MasonryGrid";
import { VOLTA_STATS, formatStat } from "@/data/stats";
import { getPublicShowcaseCards, getPublicMapEntries } from "@/lib/server/publicShowcase";
import heroSkyline from "../../public/hero-nyc-skyline.jpg";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Volta NYC — Free Consulting for NYC Small Businesses",
  description:
    `Volta NYC places student teams on real consulting projects for NYC small businesses — websites, social media, grant writing, and SEO. Free of charge. ${formatStat(VOLTA_STATS.nycNeighborhoods)} neighborhoods, ${formatStat(VOLTA_STATS.studentMembers)} students.`,
  openGraph: {
    title: "Volta NYC",
    description: "Student consultants. Real deliverables. Free for NYC small businesses.",
    images: ["/api/og"],
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

type HomeProject = {
  name: string;
  neighborhood: string;
  services: string[];
  colorClass: string;
  url?: string;
  imageUrl?: string;
  desc?: string;
};

function getServiceTagClass(service: string): string {
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
}

async function getHomeProjects(): Promise<HomeProject[]> {
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
      desc: card.desc,
    }))
    : (publicShowcase.length === 0
      ? fallbackCurrentProjects.slice(0, 6).map((project) => ({
      name: project.name,
      neighborhood: project.neighborhood,
      services: project.services,
      colorClass: project.color,
      url: project.url,
      imageUrl: undefined as string | undefined,
      desc: project.desc,
      }))
      : []);

  return homeProjects;
}

function CurrentProjectsFallback() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <AnimatedSection className="mb-10 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">In the field right now</h2>
          </div>
          <Link href="/showcase" className="font-body text-sm font-semibold text-v-blue hover:underline">
            See all work →
          </Link>
        </AnimatedSection>
        <div className="border border-v-border rounded-2xl bg-v-bg px-5 py-6 animate-pulse">
          <p className="font-body text-sm text-v-muted">Loading featured projects…</p>
        </div>
      </div>
    </section>
  );
}

async function CurrentProjectsSection() {
  const homeProjects = await getHomeProjects();

  return (
    <section className="py-20 bg-white">
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
          <>
            <div className="sm:hidden -mx-5 px-5 overflow-x-auto pb-2">
              <div className="flex gap-4 w-max min-w-full snap-x snap-mandatory">
                {homeProjects.map((p, i) => (
                  <AnimatedSection
                    key={`mobile-${p.name}`}
                    delay={i * 0.05}
                    className="snap-start shrink-0 w-[82vw] max-w-[360px]"
                  >
                    <div className="border border-v-border rounded-2xl overflow-hidden project-card bg-v-bg h-full">
                      <div className={`${p.colorClass} h-2`} />
                      {p.imageUrl ? (
                        <div className="mx-4 mt-5 rounded-xl border border-v-border bg-white overflow-hidden">
                          <Image
                            src={p.imageUrl}
                            alt={`${p.name} project`}
                            width={1600}
                            height={1000}
                            unoptimized
                            className="block w-full h-auto"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="mx-4 mt-5 rounded-xl border border-v-border h-36 flex items-center justify-center bg-white">
                          <span className="font-body text-xs text-v-muted uppercase tracking-wider">Project photo coming soon</span>
                        </div>
                      )}
                      <div className="p-5">
                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {p.services.map((service) => (
                            <span key={`mobile-${p.name}-${service}`} className={`tag border ${getServiceTagClass(service)}`}>{service}</span>
                          ))}
                        </div>
                        <h3 className="font-display font-bold text-v-ink text-lg mb-1">{p.name}</h3>
                        <p className="font-body text-xs text-v-muted/70 mt-2 flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {p.neighborhood}
                        </p>
                        {p.desc && <ExpandableDescription desc={p.desc} className="mt-3" />}
                      </div>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>

            <div className="hidden sm:block">
              <MasonryGrid
                itemIds={homeProjects.map((p) => p.name)}
                itemWidth={290}
                gap={20}
              >
                {homeProjects.map((p) => (
                  <div key={`desktop-${p.name}`} className="border border-v-border rounded-2xl overflow-hidden project-card bg-v-bg">
                    <div className={`${p.colorClass} h-2`} />
                    {p.imageUrl ? (
                      <div className="mx-4 sm:mx-6 mt-6 rounded-xl border border-v-border bg-white overflow-hidden">
                        <Image
                          src={p.imageUrl}
                          alt={`${p.name} project`}
                          width={1600}
                          height={1000}
                          unoptimized
                          className="block w-full h-auto"
                          loading="lazy"
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
                          <span key={`desktop-${p.name}-${service}`} className={`tag border ${getServiceTagClass(service)}`}>{service}</span>
                        ))}
                      </div>
                      <h3 className="font-display font-bold text-v-ink text-xl mb-1">{p.name}</h3>
                      <p className="font-body text-xs text-v-muted/70 mt-2 flex items-center gap-1.5">
                        <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {p.neighborhood}
                      </p>
                      {p.desc && <ExpandableDescription desc={p.desc} className="mt-3" />}
                    </div>
                  </div>
                ))}
              </MasonryGrid>
            </div>
          </>
        ) : (
          <div className="border border-v-border rounded-2xl bg-v-bg px-5 py-6">
            <p className="font-body text-sm text-v-muted">
              No home projects selected yet. Enable “show on home” for up to 6 projects in the Projects popup.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

async function HomeBidSection() {
  const mapEntries = await getPublicMapEntries();
  const bidPartners = mapEntries
    .filter((e) => e.source === "bid")
    .sort((a, b) => a.name.localeCompare(b.name));

  if (bidPartners.length === 0) return null;

  return (
    <section className="py-14 bg-white border-b border-v-border">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <AnimatedSection className="mb-6">
          <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-2">Trusted partners</p>
          <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl">
            {formatStat(VOLTA_STATS.bidPartners)} BID partnerships across NYC
          </h2>
          <p className="font-body text-v-muted mt-2 max-w-xl">
            We coordinate through Business Improvement Districts to reach the businesses that need us most.
          </p>
        </AnimatedSection>
        <div className="flex flex-wrap gap-2">
          {bidPartners.slice(0, 12).map((bid) => (
            <div
              key={bid.id}
              className="px-3 py-2 border rounded-xl bg-v-bg border-v-border"
            >
              <p className="font-display font-bold text-[11px] uppercase tracking-wide leading-tight text-v-ink">
                {bid.name}
              </p>
              {bid.borough && (
                <p className="font-body text-[10px] text-v-muted mt-0.5">{bid.borough}</p>
              )}
            </div>
          ))}
          {bidPartners.length > 12 && (
            <Link href="/showcase" className="px-3 py-2 border rounded-xl bg-v-bg border-v-border font-body text-xs text-v-blue hover:underline self-center">
              +{bidPartners.length - 12} more →
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

export default function Home() {

  return (
    <>
      <section className="relative overflow-hidden">
        <Image
          src={heroSkyline}
          alt=""
          fill
          priority
          fetchPriority="high"
          placeholder="blur"
          quality={72}
          sizes="(max-width: 768px) 1200px, (max-width: 1280px) 1800px, 2400px"
          className="object-cover"
        />
        <div className="absolute inset-0 home-shared-wash" />
        <div className="absolute inset-0 hero-vignette opacity-70 pointer-events-none" />
        <div className="relative">
          <HeroSection />

          {/* ── STATS ─────────────────────────────────────────────── */}
          <section data-home-dark-end="true" className="relative py-14">
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

      <Suspense fallback={null}>
        <HomeBidSection />
      </Suspense>

      {/* ── THREE TRACKS ─────────────────────────────────────── */}
      <section className="py-24 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-14">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">How we work</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">The three tracks</h2>
            <p className="font-body text-v-muted mt-3 max-w-xl">
              Every project is staffed by students across our three tracks. Work is fast-paced, goes live quickly, and includes backend systems alongside frontend execution — with ongoing client support built into every engagement.
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

      <Suspense fallback={<CurrentProjectsFallback />}>
        <CurrentProjectsSection />
      </Suspense>

      {/* ── NYC REACH ────────────────────────────────────────── */}
      <section className="py-20 bg-v-dark">
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <AnimatedSection className="mb-10">
            <p className="font-body text-xs font-semibold text-v-green uppercase tracking-widest mb-3">Our reach</p>
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
              Across all five boroughs
            </h2>
            <p className="font-body text-white/50 text-lg max-w-xl mx-auto">
              We operate through trusted neighborhood partners and place teams where businesses are ready to launch and improve quickly.
            </p>
          </AnimatedSection>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { name: "Brooklyn", href: "/showcase?borough=Brooklyn", cls: "border-lime-500/30 text-lime-400 bg-lime-500/10 hover:bg-lime-500/20" },
              { name: "Queens", href: "/showcase?borough=Queens", cls: "border-blue-400/30 text-blue-300 bg-blue-400/10 hover:bg-blue-400/20" },
              { name: "Manhattan", href: "/showcase?borough=Manhattan", cls: "border-amber-400/30 text-amber-400 bg-amber-400/10 hover:bg-amber-400/20" },
              { name: "The Bronx", href: "/showcase?borough=Bronx", cls: "border-purple-400/30 text-purple-400 bg-purple-400/10 hover:bg-purple-400/20" },
              { name: "Staten Island", href: "/showcase?borough=Staten Island", cls: "border-rose-400/30 text-rose-400 bg-rose-400/10 hover:bg-rose-400/20" },
            ].map((b, i) => (
              <AnimatedSection key={b.name} delay={i * 0.08}>
                <Link href={b.href} className={`inline-block border rounded-full px-6 py-2.5 font-display font-bold text-base transition-colors ${b.cls}`}>
                  {b.name}
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
