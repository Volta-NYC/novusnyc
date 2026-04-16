import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import HomeStats from "@/components/HomeStats";
import HeroSection from "@/components/HeroSection";
import { MapPinIcon } from "@/components/Icons";
import { currentProjects as fallbackCurrentProjects } from "@/data";
import TracksTabbed from "@/components/TracksTabbed";
import ExpandableDescription from "@/components/ExpandableDescription";
import MasonryGrid from "@/components/MasonryGrid";
import { VOLTA_STATS, formatStat } from "@/data/stats";
import { getPublicShowcaseCards, getPublicLiveStats } from "@/lib/server/publicShowcase";
import { getTotalMemberCount } from "@/lib/server/memberEducation";
import heroSkyline from "../../public/hero-nyc-skyline.jpg";

export const revalidate = 900;

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
    <section className="py-20 bg-v-bg">
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
    <section className="py-20 bg-v-bg">
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
              <div className="flex gap-4 w-max min-w-full snap-x snap-mandatory items-start">
                {homeProjects.map((p, i) => (
                  <AnimatedSection
                    key={`mobile-${p.name}`}
                    delay={i * 0.05}
                    className="snap-start shrink-0 w-[82vw] max-w-[360px]"
                  >
                    <div className="border border-v-border rounded-2xl overflow-hidden project-card bg-v-bg">
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

async function LiveHomeStats() {
  const [liveStats, memberCount] = await Promise.all([
    getPublicLiveStats(),
    getTotalMemberCount(),
  ]);

  const roundDisplayStat = (value: number): number => {
    if (!Number.isFinite(value)) return 0;
    if (value <= 20) return Math.max(0, Math.floor(value));
    return Math.ceil(value / 10) * 10;
  };

  const studentPublicationsAndResearchProjects =
    liveStats.caseStudies + liveStats.educationalReports;

  const liveHomeStats = [
    { value: roundDisplayStat(memberCount), suffix: "+", label: "Student Members" },
    { value: roundDisplayStat(liveStats.totalBusinesses), suffix: "+", label: "Businesses Supported" },
    {
      value: roundDisplayStat(studentPublicationsAndResearchProjects),
      suffix: "+",
      label: "Student Publications and Research Projects",
    },
    { value: roundDisplayStat(liveStats.bidPartners), suffix: "+", label: "Community Organizations" },
  ];

  return <HomeStats stats={liveHomeStats} />;
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
            <LiveHomeStats />
          </section>
        </div>
      </section>

      {/* ── THREE TRACKS ─────────────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">The three tracks</h2>
            <p className="font-body text-v-muted mt-3 max-w-xl">
              Every project is staffed by students across our three tracks. Work ships to production quickly and includes ongoing support after delivery.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <TracksTabbed />
          </AnimatedSection>
        </div>
      </section>

      <Suspense fallback={<CurrentProjectsFallback />}>
        <CurrentProjectsSection />
      </Suspense>

      {/* ── NYC REACH ────────────────────────────────────────── */}
      <section className="py-20 bg-v-dark">
        <div className="max-w-4xl mx-auto px-5 md:px-8 text-center">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
              Across all five boroughs
            </h2>
            <p className="font-body text-white/70 text-lg max-w-xl mx-auto">
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
