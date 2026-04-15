import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import ContactForm from "@/components/ContactForm";
import ExpandableDescription from "@/components/ExpandableDescription";
import {
  GlobeIcon,
  SmartphoneIcon,
  DollarIcon,
  SearchIcon,
  TrendingUpIcon,
  PencilIcon,
  MapPinIcon,
} from "@/components/Icons";
import { getPublicShowcaseCards } from "@/lib/server/publicShowcase";
import { projects as fallbackProjects } from "@/data";
import storefrontPhoto from "../../../public/petite-dumpling-storefront.jpg";

export const metadata: Metadata = {
  title: "Free Help for NYC Small Businesses | Volta NYC",
  description:
    "NYC small businesses: get a free website, social media, grant writing, or SEO from a dedicated student team. No cost, no catch. Volta NYC is a registered 501(c)(3) nonprofit.",
  openGraph: {
    title: "Free Help for NYC Small Businesses | Volta NYC",
    description:
      "Student teams build websites, grow social media, write grants, and optimize SEO for NYC small businesses — at no cost. Reach out to get started.",
    images: ["/api/og"],
  },
};

const SERVICES = [
  {
    icon: GlobeIcon,
    title: "Website Design & Development",
    summary: "Custom, mobile-friendly websites built from scratch or redesigned from the ground up — fast, accessible, and maintained after launch.",
    color: "text-v-blue",
    bg: "bg-blue-50",
    details: [
      "Custom website built or redesigned from scratch",
      "Mobile-friendly, fast-loading pages with clear service and contact sections",
      "Ongoing updates and maintenance after launch",
    ],
  },
  {
    icon: SearchIcon,
    title: "SEO & Online Visibility",
    summary: "Get found on Google, Maps, and local listings — so customers can actually find you when they search.",
    color: "text-v-blue",
    bg: "bg-blue-50",
    details: [
      "Google Business Profile setup and optimization",
      "Yelp and Apple Maps listing cleanup",
      "Website improvements for search ranking",
    ],
  },
  {
    icon: SmartphoneIcon,
    title: "Social Media & Content",
    summary: "A practical posting plan, original video content, and a strategy your team can actually sustain week to week.",
    color: "text-v-green",
    bg: "bg-lime-50",
    details: [
      "Weekly posting plan based on your goals",
      "Original short videos and graphics using your story",
      "Simple tracking so you know what's working",
    ],
  },
  {
    icon: PencilIcon,
    title: "Graphic Design",
    summary: "Print-ready and digital design for the materials your business actually hands to customers.",
    color: "text-v-green",
    bg: "bg-lime-50",
    details: [
      "Menu design and layout for restaurants and cafés",
      "Flyers, signage, and promotional materials",
      "Business cards, loyalty cards, and branded templates",
    ],
  },
  {
    icon: TrendingUpIcon,
    title: "Sales & Financial Analysis",
    summary: "Owner-facing analysis that turns raw sales numbers into clear pricing and operations decisions.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    details: [
      "Sales and revenue trend breakdowns",
      "Nearby competitor and pricing comparison",
      "Clear recommendations for pricing and operations",
    ],
  },
  {
    icon: DollarIcon,
    title: "Grant Research & Writing",
    summary: "We find eligible grants, draft the full application, and prepare submission materials — you just sign off.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    details: [
      "Grant eligibility research for your business",
      "Full application drafting — writing, budget, materials",
      "Deadline tracking and final submission prep",
    ],
  },
] as const;

const PARTNER_FAQS = [
  {
    q: "Is this really free?",
    a: "Yes, completely free. Volta NYC is a registered 501(c)(3) nonprofit. There is no cost, no hidden fees, and no catch. Our student teams do all the work at no charge to your business.",
  },
  {
    q: "How long does a project take?",
    a: "Most projects run 4–8 weeks from scoping to delivery, depending on complexity. Websites typically take longer than social media or SEO projects. We give you a clear timeline upfront.",
  },
  {
    q: "What do I need to provide?",
    a: "Just your time — about 30 minutes for an initial conversation to discuss your needs and goals. After that, our student team handles the heavy lifting and keeps you updated along the way.",
  },
  {
    q: "Who will be working on my project?",
    a: "A dedicated team of high school and college students from across NYC, led by an experienced project director. You'll know exactly who's on your team and what they're working on.",
  },
  {
    q: "Do I need to be tech-savvy?",
    a: "Not at all. We handle all the technical work and train you on how to use and maintain everything we build. Our goal is to make this as easy as possible for you.",
  },
];

type ShowcaseProject = {
  name: string;
  neighborhood: string;
  services: string[];
  colorClass: string;
  url?: string;
  imageUrl?: string;
  desc: string;
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

async function getShowcaseProjects(): Promise<ShowcaseProject[]> {
  const publicShowcase = await getPublicShowcaseCards();
  const cards = publicShowcase.length > 0
    ? publicShowcase.slice(0, 4)
    : fallbackProjects.filter((p) => p.status !== "Upcoming").slice(0, 4);

  return cards.map((card) => ({
    name: card.name,
    neighborhood: card.neighborhood,
    services: card.services,
    colorClass: SHOWCASE_COLOR_CLASS[(card as { color?: string }).color ?? ""] ?? "bg-blue-500",
    url: (card as { url?: string }).url,
    imageUrl: (card as { imageUrl?: string }).imageUrl,
    desc: card.desc,
  }));
}

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

export default async function Partners() {
  const showcaseProjects = await getShowcaseProjects();

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: PARTNER_FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        <Image
          src={storefrontPhoto}
          alt="Petite Dumpling restaurant storefront in Park Slope, Brooklyn"
          fill
          priority
          fetchPriority="high"
          placeholder="blur"
          quality={75}
          sizes="(max-width: 768px) 100vw, 1920px"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[#1a1e24]/70" />
        <div className="absolute inset-0 hero-vignette opacity-50 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
              For NYC Small Businesses
            </p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Free student consulting<br />
              <span className="text-v-green">for your business.</span>
            </h1>
            <p className="font-body text-white/70 text-lg max-w-2xl leading-relaxed mb-8">
              Volta NYC places student teams on real projects for NYC small businesses —
              websites, social media, grant writing, SEO, and financial operations.
              We scope with you first, then execute with clear deliverables, timelines,
              and regular updates. Professional-grade work, no cost to you.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href="#contact"
                className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-colors"
              >
                Get started →
              </a>
              <Link
                href="/showcase"
                className="border border-white/20 text-white font-display font-bold text-base px-8 py-4 rounded-full hover:border-white/50 transition-colors"
              >
                See our work
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SERVICES 2×3 GRID ──────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              Six ways we can help
            </h2>
            <p className="font-body text-v-muted mt-3 max-w-xl">
              Every project is led by students, scoped with you, and delivered with clear timelines and regular updates. Pick what your business needs most.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((service, i) => (
              <AnimatedSection key={service.title} delay={i * 0.06}>
                <details className="group bg-v-bg border border-v-border rounded-2xl px-5 py-5 h-full">
                  <summary className="list-none cursor-pointer">
                    <div className="flex items-start gap-3">
                      <span className={`w-10 h-10 rounded-xl ${service.bg} flex items-center justify-center shrink-0`}>
                        <service.icon className={`w-4 h-4 ${service.color}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="block font-display font-bold text-v-ink text-base leading-tight">
                          {service.title}
                        </span>
                        <span className="block font-body text-sm text-v-muted mt-1 leading-relaxed">
                          {service.summary}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-v-muted mt-1.5 shrink-0 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </summary>
                  <div className="accordion-body mt-4 pl-[3.25rem]">
                    <ul className="list-disc pl-5 space-y-1.5 font-body text-sm text-v-muted">
                      {service.details.map((detail) => (
                        <li key={detail}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                </details>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOWCASE STRIP ─────────────────────────────────── */}
      <section className="py-16 bg-v-bg border-y border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8 flex items-end justify-between flex-wrap gap-3">
            <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl">Businesses we&apos;ve helped</h2>
            <Link href="/showcase" className="font-body text-sm font-semibold text-v-blue hover:underline">
              See all projects →
            </Link>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {showcaseProjects.map((p, i) => (
              <AnimatedSection key={p.name} delay={i * 0.06}>
                <div className="bg-white border border-v-border rounded-2xl overflow-hidden project-card h-full flex flex-col">
                  <div className={`${p.colorClass} h-1.5`} />
                  {p.imageUrl ? (
                    <div className="mx-3 mt-3 rounded-lg border border-v-border bg-v-bg overflow-hidden">
                      <Image
                        src={p.imageUrl}
                        alt={`${p.name} project`}
                        width={800}
                        height={500}
                        unoptimized
                        className="block w-full h-auto"
                        loading="lazy"
                      />
                    </div>
                  ) : (
                    <div className="mx-3 mt-3 rounded-lg border border-v-border bg-v-bg h-24 flex items-center justify-center">
                      <span className="font-body text-[10px] text-v-muted uppercase tracking-wider">Photo coming soon</span>
                    </div>
                  )}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex flex-wrap gap-1 mb-3">
                      {p.services.slice(0, 2).map((s) => (
                        <span key={`${p.name}-${s}`} className={`tag border text-[10px] px-1.5 py-0.5 ${getServiceTagClass(s)}`}>{s}</span>
                      ))}
                    </div>
                    <h3 className="font-display font-bold text-v-ink text-base mb-0.5">{p.name}</h3>
                    <p className="font-body text-xs text-v-muted/70 flex items-center gap-1.5 mb-2">
                      <MapPinIcon className="w-3 h-3 flex-shrink-0" /> {p.neighborhood}
                    </p>
                    {p.desc && <ExpandableDescription desc={p.desc} className="flex-1" />}
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-body text-xs font-semibold text-v-blue hover:underline mt-3 inline-block"
                      >
                        View live site →
                      </a>
                    )}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESS ─────────────────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl">
              Three simple steps
            </h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-4">
            <AnimatedSection>
              <div className="border border-v-border rounded-xl p-5 h-full bg-white">
                <div className="w-8 h-8 rounded-full bg-v-green/15 text-v-green font-display font-bold text-sm flex items-center justify-center mb-3">1</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Apply</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  Leave your contact information, and we&apos;ll get back to you via text or email within a few days.
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.06}>
              <div className="border border-v-border rounded-xl p-5 h-full bg-white">
                <div className="w-8 h-8 rounded-full bg-v-blue/15 text-v-blue font-display font-bold text-sm flex items-center justify-center mb-3">2</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Meet</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  We schedule an in-person visit or call to understand your business, priorities, and goals.
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.12}>
              <div className="border border-v-border rounded-xl p-5 h-full bg-white">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 font-display font-bold text-sm flex items-center justify-center mb-3">3</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Build</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  A dedicated student team is assigned within a few days and starts work with clear timelines and regular progress updates.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── CONTACT FORM ─────────────────────────────────────── */}
      <section className="py-20 bg-v-bg" id="contact">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-4">
              Work with us
            </h2>
            <p className="font-body text-v-muted max-w-xl">
              Tell us about your business and what you need. Switch the form to your
              preferred language using the toggle below. If you were referred by a BID,
              mention that in your message. We&apos;re also open to a quick Zoom chat.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <ContactForm />
          </AnimatedSection>
        </div>
      </section>

      {/* ── FAQ ACCORDION ──────────────────────────────────── */}
      <section className="py-16 bg-v-bg">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <h2 className="font-display font-bold text-v-ink text-2xl">Frequently asked questions</h2>
          </AnimatedSection>
          <div className="space-y-2">
            {PARTNER_FAQS.map((f, i) => (
              <AnimatedSection key={f.q} delay={i * 0.04}>
                <details className="group bg-white border border-v-border rounded-xl px-5 py-4">
                  <summary className="list-none cursor-pointer font-display font-bold text-v-ink text-sm flex items-center justify-between gap-3">
                    {f.q}
                    <svg className="w-4 h-4 text-v-muted shrink-0 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="font-body text-sm text-v-muted leading-relaxed mt-3">{f.a}</p>
                </details>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ─────────────────────────────────────── */}
      <section className="py-20 bg-v-dark text-center">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-xs font-semibold text-v-green uppercase tracking-widest mb-3">
              Ready to get started?
            </p>
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
              Your business could be next.
            </h2>
            <p className="font-body text-white/65 text-base md:text-lg mb-8 max-w-lg mx-auto">
              We&apos;re actively taking on projects across all five boroughs. Fill out the form above or reach out directly — we&apos;ll get back to you within a few days.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-full bg-v-green px-8 py-3.5 font-display text-base font-bold text-v-ink transition-colors hover:bg-v-green-dark"
              >
                Request support →
              </a>
              <Link
                href="/showcase"
                className="inline-flex items-center justify-center rounded-full border border-white/20 px-8 py-3.5 font-display text-base font-bold text-white transition-colors hover:border-white/50"
              >
                See our work
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
