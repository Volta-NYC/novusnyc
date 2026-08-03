import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import AnimatedSection from "@/components/AnimatedSection";
import HomeStats from "@/components/HomeStats";
import HeroSection from "@/components/HeroSection";
import { MapPinIcon } from "@/components/Icons";
import { communityPartners, currentProjects as fallbackCurrentProjects } from "@/data";
import TracksTabbed from "@/components/TracksTabbed";
import ExpandableDescription from "@/components/ExpandableDescription";
import MasonryGrid from "@/components/MasonryGrid";
import { formatCounter } from "@/lib/formatCounter";
import { getPublicShowcaseCards, getPublicLiveStats } from "@/lib/server/publicShowcase";
import { getTotalMemberCount } from "@/lib/server/memberEducation";
import heroSkyline from "../../public/hero-nyc-skyline.jpg";


export async function generateMetadata(): Promise<Metadata> {
  const [liveStats, memberCount] = await Promise.all([
    getPublicLiveStats(),
    getTotalMemberCount(),
  ]);
  return {
    title: "Novus NYC — Free Consulting for NYC Small Businesses",
    description:
      `Digital equity is economic equity. Novus connects student teams with New York City small businesses to provide free support in technology, marketing, finance, operations, websites, SEO, social media, and grant development. ${formatCounter(memberCount)} students, ${formatCounter(liveStats.totalBusinesses)} businesses served.`,
    openGraph: {
      title: "Novus NYC",
      description: "Digital equity is economic equity. Student teams providing free consulting support for New York City small businesses.",
      images: ["/api/og"],
    },
  };
}

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
  type: string;
  neighborhood: string;
  services: string[];
  status: "Ongoing" | "Upcoming" | "Completed";
  colorClass: string;
  url?: string;
  imageUrl?: string;
  desc?: string;
  quote?: string;
};

type CommunityPartner = (typeof communityPartners)[number];

const FLAGSHIP_PARTNER_ORDER = [
  "NYC Small Business Services",
  "NYC Small Business Resource Network",
  "Queens Chamber of Commerce",
  "Brooklyn Chamber of Commerce",
  "Manhattan Chamber of Commerce",
] as const;

const FLAGSHIP_PARTNER_NAMES = new Set<string>(FLAGSHIP_PARTNER_ORDER);

function getPartnerLogoClass(partner: CommunityPartner, baseClass: string): string {
  if (partner.name === "NYC Small Business Services") {
    return `${baseClass} scale-[1.42]`;
  }
  return baseClass;
}

function getServiceTagClass(service: string): string {
  const key = service.trim().toLowerCase();
  if (key.includes("website") || key.includes("seo") || key.includes("google")) {
    return "bg-v-blue/20 text-v-ink border-v-blue/40";
  }
  if (key.includes("social")) {
    return "bg-v-green/20 text-v-ink border-v-green/40";
  }
  if (key.includes("finance") || key.includes("grant") || key.includes("payment")) {
    return "bg-v-yellow/40 text-v-ink border-v-yellow";
  }
  return "bg-v-border text-v-muted border-v-border";
}

async function getHomeProjects(): Promise<HomeProject[]> {
  const publicShowcase = await getPublicShowcaseCards();
  const featuredHomeCards = publicShowcase
    .filter((card) => card.featuredOnHome);

  const homeProjects = featuredHomeCards.length > 0
    ? featuredHomeCards.map((card) => ({
      name: card.name,
      type: card.type,
      neighborhood: card.neighborhood,
      services: card.services,
      status: card.status,
      colorClass: SHOWCASE_COLOR_CLASS[card.color] ?? "bg-blue-500",
      url: card.url,
      imageUrl: card.imageUrl,
      desc: card.desc,
      quote: undefined as string | undefined,
    }))
    : (publicShowcase.length === 0
      ? fallbackCurrentProjects.slice(0, 6).map((project) => ({
      name: project.name,
      type: "Digital & Tech",
      neighborhood: project.neighborhood,
      services: project.services,
      status: "Ongoing" as const,
      colorClass: project.color,
      url: project.url,
      imageUrl: undefined as string | undefined,
      desc: project.desc,
      quote: project.quote,
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
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Some of our best work</h2>
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
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Some of our best work</h2>
          </div>
          <Link href="/showcase" className="font-body text-sm font-semibold text-v-blue hover:underline">
            See all work →
          </Link>
        </AnimatedSection>
        {homeProjects.length > 0 ? (
          <>
            <div className="sm:hidden -mx-5 px-5 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-4 w-max min-w-full items-start">
                {homeProjects.map((p, i) => (
                  <AnimatedSection
                    key={`mobile-${p.name}`}
                    delay={i * 0.05}
                    className="shrink-0 w-[82vw] max-w-[360px]"
                  >
                    <div className="bg-v-bg border border-v-border rounded-2xl overflow-hidden project-card flex flex-col">
                      <div className={`${p.colorClass} h-2`} />
                      {p.imageUrl ? (
                        <div className="mx-4 mt-5 rounded-xl border border-v-border bg-white overflow-hidden">
                          <Image
                            src={p.imageUrl}
                            alt={`${p.name} project`}
                            width={1600}
                            height={1000}
                            sizes="(max-width: 640px) 82vw, 290px"
                            className="block w-full h-auto"
                            loading="lazy"
                          />
                        </div>
                      ) : (
                        <div className="mx-4 mt-5 rounded-xl border border-v-border bg-white h-36 flex items-center justify-center">
                          <span className="font-body text-xs text-v-muted uppercase tracking-wider">Project photo coming soon</span>
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-start justify-between mb-4 gap-2">
                          <div className="flex gap-2 flex-wrap">
                            {p.services.map((service) => (
                              <span key={`mobile-${p.name}-${service}`} className={`tag border ${getServiceTagClass(service)}`}>{service}</span>
                            ))}
                          </div>
                          <span className={`tag text-xs flex-shrink-0 ${p.status === "Completed" ? "bg-v-green/25 text-v-ink" : p.status === "Ongoing" ? "bg-v-blue/25 text-v-ink" : "bg-v-yellow/35 text-v-ink"}`}>
                            {p.status}
                          </span>
                        </div>
                        <h3 className="font-display font-bold text-v-ink text-lg mb-1">{p.name}</h3>
                        <p className="font-body text-sm text-v-muted mb-3">{p.type}</p>
                        {p.desc && <ExpandableDescription desc={p.desc} className="flex-1" />}
                        {p.quote && (
                          <blockquote className="mt-4 border-l-2 border-v-green pl-3 font-body text-sm text-v-muted italic leading-relaxed">
                            &ldquo;{p.quote}&rdquo;
                          </blockquote>
                        )}
                        <div className="flex items-center justify-between mt-4">
                          <p className="font-body text-xs text-v-muted/70 flex items-center gap-1.5">
                            <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {p.neighborhood}
                          </p>
                          {p.url && (
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-semibold text-v-blue hover:underline">
                              View live site →
                            </a>
                          )}
                        </div>
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
                  <div key={`desktop-${p.name}`} className="bg-v-bg border border-v-border rounded-2xl overflow-hidden project-card flex flex-col">
                    <div className={`${p.colorClass} h-2`} />
                    {p.imageUrl ? (
                      <div className="mx-4 sm:mx-7 mt-7 rounded-xl border border-v-border bg-white overflow-hidden">
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
                      <div className="mx-4 sm:mx-7 mt-7 rounded-xl border border-v-border bg-white h-40 flex items-center justify-center">
                        <span className="font-body text-xs text-v-muted uppercase tracking-wider">Project photo coming soon</span>
                      </div>
                    )}
                    <div className="p-7 flex flex-col">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex gap-2 flex-wrap">
                          {p.services.map((service) => (
                            <span key={`desktop-${p.name}-${service}`} className={`tag border ${getServiceTagClass(service)}`}>{service}</span>
                          ))}
                        </div>
                        <span className={`tag text-xs flex-shrink-0 ${p.status === "Completed" ? "bg-v-green/25 text-v-ink" : p.status === "Ongoing" ? "bg-v-blue/25 text-v-ink" : "bg-v-yellow/35 text-v-ink"}`}>
                          {p.status}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-v-ink text-xl mb-1">{p.name}</h3>
                      <p className="font-body text-sm text-v-muted mb-3">{p.type}</p>
                      {p.desc && <ExpandableDescription desc={p.desc} />}
                      {p.quote && (
                        <blockquote className="mt-4 border-l-2 border-v-green pl-3 font-body text-sm text-v-muted italic leading-relaxed">
                          &ldquo;{p.quote}&rdquo;
                        </blockquote>
                      )}
                      <div className="flex items-center justify-between mt-4">
                        <p className="font-body text-xs text-v-muted/70 flex items-center gap-1.5">
                          <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" /> {p.neighborhood}
                        </p>
                        {p.url && (
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-body text-xs font-semibold text-v-blue hover:underline">
                            View live site →
                          </a>
                        )}
                      </div>
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
  const liveHomeStats = [
    { value: "400+", label: "Student Members" },
    { value: "150+", label: "Businesses Supported" },
    {
      value: "120+",
      label: "Student Publications and Research Projects",
    },
    { value: "30", label: "Community Organizations" },
  ];

  return <HomeStats stats={liveHomeStats} />;
}

function FlagshipPartnerCard({ partner }: { partner: CommunityPartner }) {
  return (
    <a
      href={partner.website}
      target="_blank"
      rel="noreferrer"
      aria-label={`Visit ${partner.name} website`}
      className="bg-white border border-v-green/35 rounded-xl px-5 py-5 min-h-[164px] flex flex-col items-center justify-center text-center shadow-[0_16px_42px_rgba(35,31,36,0.09)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v-green/50 focus-visible:ring-offset-2"
    >
      <div className="relative w-full h-[78px] mb-4">
        <Image
          src={partner.logo}
          alt={`${partner.name} logo`}
          fill
          sizes="(max-width: 640px) 45vw, 180px"
          className={getPartnerLogoClass(partner, "object-contain p-1")}
        />
      </div>
      <p className="font-body text-[9px] uppercase tracking-widest text-v-green font-bold mb-1">
        Flagship partner
      </p>
      <h3 className="font-display font-bold text-v-ink text-sm leading-tight">
        {partner.name}
      </h3>
    </a>
  );
}

function PartnerLogoCard({
  partner,
  important,
  tabIndex,
}: {
  partner: CommunityPartner;
  important: boolean;
  tabIndex?: number;
}) {
  return (
    <a
      href={partner.website}
      target="_blank"
      rel="noreferrer"
      tabIndex={tabIndex}
      aria-label={`Visit ${partner.name} website`}
      className={`partner-logo-card shrink-0 bg-white border flex flex-col items-center justify-center text-center no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-v-green/50 focus-visible:ring-offset-2 ${
        important
          ? "w-[230px] h-[142px] rounded-xl border-v-green/35 shadow-[0_12px_34px_rgba(35,31,36,0.08)] px-4"
          : "w-[230px] h-[142px] rounded-lg border-v-border px-4"
      }`}
    >
      <div className="relative w-full h-[72px] shrink-0">
        <Image
          src={partner.logo}
          alt={`${partner.name} logo`}
          fill
          sizes="190px"
          className={getPartnerLogoClass(partner, "object-contain partner-logo-image p-1")}
        />
      </div>
      <div className="mt-3 min-w-0 w-full">
        {important && (
          <p className="font-body text-[9px] uppercase tracking-widest text-v-green font-bold mb-1">
            Key partner
          </p>
        )}
        <p className="font-display font-bold text-v-ink leading-tight text-xs partner-logo-label">
          {partner.name}
        </p>
      </div>
    </a>
  );
}

function PartnerMarquee({
  partners,
  important = false,
  reverse = false,
}: {
  partners: CommunityPartner[];
  important?: boolean;
  reverse?: boolean;
}) {
  return (
    <div className="partner-marquee -mx-5 md:-mx-8 overflow-hidden py-2">
      <div className={`partner-marquee-track flex gap-3 md:gap-4 ${reverse ? "partner-marquee-track-reverse" : ""}`}>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex gap-3 md:gap-4" aria-hidden={copy === 1}>
            {partners.map((partner) => (
              <PartnerLogoCard
                key={`${copy}-${partner.name}`}
                partner={partner}
                important={important}
                tabIndex={copy === 1 ? -1 : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function CommunityPartnersSection() {
  const partnerByName = new Map(communityPartners.map((partner) => [partner.name, partner]));
  const flagshipPartners = FLAGSHIP_PARTNER_ORDER
    .map((name) => partnerByName.get(name))
    .filter((partner): partner is CommunityPartner => Boolean(partner));
  const scrollingPartners = communityPartners.filter((partner) => !FLAGSHIP_PARTNER_NAMES.has(partner.name));
  const importantPartners = scrollingPartners.filter((partner) => partner.important);
  const neighborhoodPartners = scrollingPartners.filter((partner) => !partner.important);

  return (
    <section className="py-16 md:py-20 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <AnimatedSection className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.22em] text-v-green font-bold mb-3">
              Community partners
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-5xl max-w-3xl leading-tight">
              Powered by the organizations trusted by NYC small businesses.
            </h2>
          </div>
          <p className="font-body text-v-muted text-sm md:text-base max-w-md leading-relaxed">
            Chambers, BIDs, local development corporations, and merchant groups connect Novus teams directly with the businesses that need support.
          </p>
        </AnimatedSection>
        <AnimatedSection>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-8 md:mb-10">
            {flagshipPartners.map((partner) => (
              <FlagshipPartnerCard key={partner.name} partner={partner} />
            ))}
          </div>
          <div className="space-y-3 md:space-y-4">
            <PartnerMarquee partners={importantPartners} important />
            <PartnerMarquee partners={neighborhoodPartners} reverse />
          </div>
        </AnimatedSection>
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
            <LiveHomeStats />
          </section>
        </div>
      </section>

      <CommunityPartnersSection />

      <Suspense fallback={<CurrentProjectsFallback />}>
        <CurrentProjectsSection />
      </Suspense>

      {/* ── THREE TRACKS ─────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
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

    </>
  );
}
