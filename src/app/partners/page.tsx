import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import BrandTexture from "@/components/BrandTexture";
import ParallaxHero from "@/components/ParallaxHero";
import SectionProgressNav from "@/components/SectionProgressNav";
import BusinessProcessTimeline from "@/components/BusinessProcessTimeline";
import ContactForm from "@/components/ContactForm";
import FaqAccordion from "@/components/FaqAccordion";
import PageHeroContent from "@/components/PageHeroContent";
import { getPublicCommunityPartners } from "@/lib/server/publicPartners";
import {
  GlobeIcon,
  SmartphoneIcon,
  DollarIcon,
  SearchIcon,
  TrendingUpIcon,
  PencilIcon,
} from "@/components/Icons";
import petiteDumplingStorefront from "../../../public/petite-dumpling-storefront.jpg";

export const metadata: Metadata = {
  title: "Free Help for NYC Small Businesses",
  description:
    "NYC small businesses: get a free website, social media, grant writing, or SEO from a dedicated student team. No cost, no catch. Novus NYC is a nonprofit corporation incorporated in New York State.",
  openGraph: {
    title: "Free Help for NYC Small Businesses | Novus NYC",
    description:
      "Student teams build websites, grow social media, write grants, and optimize SEO for NYC small businesses at no cost. Reach out to get started.",
    images: ["/api/og"],
  },
};

const SERVICES = [
  {
    icon: GlobeIcon,
    title: "Website design and development",
    summary: "We build your website from scratch, or fix the one you have.",
    color: "text-n-purple",
    bg: "bg-blue-50",
    details: [
      "Custom website built or redesigned from scratch",
      "Mobile-friendly, fast-loading pages with clear service and contact sections",
      "Ongoing updates and maintenance after launch",
    ],
  },
  {
    icon: SearchIcon,
    title: "Google Search and Maps visibility",
    summary: "Show up when customers search for you on Google and Maps.",
    color: "text-n-purple",
    bg: "bg-blue-50",
    details: [
      "Google Business Profile setup and optimization",
      "Yelp and Apple Maps listing cleanup",
      "Website improvements for search ranking",
    ],
  },
  {
    icon: SmartphoneIcon,
    title: "Social media and content",
    summary: "A posting plan and real content, not a strategy deck you'll never use.",
    color: "text-n-orange",
    bg: "bg-orange-50",
    details: [
      "Weekly posting plan based on your goals",
      "Original short videos and graphics using your story",
      "Simple tracking so you know what's working",
    ],
  },
  {
    icon: PencilIcon,
    title: "Graphic design",
    summary: "Print and digital materials your customers actually take home.",
    color: "text-n-orange",
    bg: "bg-orange-50",
    details: [
      "Menu design and layout for restaurants and cafés",
      "Flyers, signage, and promotional materials",
      "Business cards, loyalty cards, and branded templates",
    ],
  },
  {
    icon: TrendingUpIcon,
    title: "Sales and financial analysis",
    summary: "We go through your numbers and tell you what they actually mean.",
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
    title: "Grant research and writing",
    summary: "We find the grants, write the application, and hand it to you to sign.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    details: [
      "Grant eligibility research for your business",
      "Full application drafting, including writing, budget, and materials",
      "Deadline tracking and final submission prep",
    ],
  },
] as const;

const PARTNER_FAQS = [
  {
    q: "Is this really free?",
    a: "Yes. Novus NYC is a nonprofit corporation incorporated in New York State. There are no fees, no contracts, and no catch. Our student teams do everything at no cost to your business.",
  },
  {
    q: "How long does a project take?",
    a: "Most projects take around 2 to 4 months from the first conversation to launch, depending on the business and project scope. Simpler projects can move much faster. We give you a timeline before we start.",
  },
  {
    q: "What do I need to provide?",
    a: "Just 30 minutes for an initial conversation to go over your needs. After that, we handle the work and keep you updated along the way.",
  },
  {
    q: "Who will be working on my project?",
    a: "A team of high school and college students from across NYC, led by a project director. You will know who is on your team and what they are working on.",
  },
  {
    q: "Do I need to be tech-savvy?",
    a: "Not at all. We handle the technical work and walk you through how to use and maintain what we build.",
  },
  {
    q: "What types of businesses do you work with?",
    a: "We support small, independently owned businesses across NYC, including restaurants, retailers, professional services, and neighborhood organizations. Tell us about your needs and we will let you know whether we are a fit.",
  },
  {
    q: "Can you help if I already have a website?",
    a: "Yes. We can review and improve an existing site, help update its content, or recommend a focused next step such as search visibility, mobile usability, or clearer customer information.",
  },
  {
    q: "Will I own the work after the project ends?",
    a: "Yes. We build projects for your business and make sure you have the access and information you need to continue using them after handoff.",
  },
  {
    q: "How often will I hear from my team?",
    a: "Your team will agree on a communication schedule at the start of the project. You can expect regular progress updates and a clear point of contact for questions.",
  },
  {
    q: "Can you work in languages other than English?",
    a: "We will do our best to match your needs and can discuss language preferences during the initial conversation. Let us know what would make communication most comfortable for you.",
  },
  {
    q: "What happens when the project is complete?",
    a: "We walk you through the finished work, share any needed access, and provide simple next-step guidance. Some projects may also be eligible for continued support, depending on team capacity.",
  },
  {
    q: "Can a BID or community organization refer a business?",
    a: "Yes. We welcome referrals from BIDs, community groups, schools, and local partners. Include the business name and a little context in the contact form so we can follow up.",
  },
  {
    q: "What if I need help that is not listed here?",
    a: "Reach out anyway. We will listen to what you need and let you know whether a Novus student team can help, or whether another local resource may be a better fit.",
  },
];

const PARTNER_FAQ_CATEGORIES = [
  { title: "Working with Novus", items: PARTNER_FAQS.slice(0, 6) },
  { title: "Your project", items: PARTNER_FAQS.slice(6, 10) },
  { title: "Support and referrals", items: PARTNER_FAQS.slice(10) },
];

const TRUSTED_PARTNER_NAMES = new Set([
  "NYC Small Business Services",
  "NYC Small Business Resource Network",
  "Manhattan Chamber of Commerce",
  "Brooklyn Chamber of Commerce",
  "Bronx Chamber of Commerce",
  "Queens Chamber of Commerce",
  "Staten Island Chamber of Commerce",
]);

export default async function Partners() {
  const trustedPartners = (await getPublicCommunityPartners()).filter((partner) =>
    TRUSTED_PARTNER_NAMES.has(partner.name),
  );
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
      <SectionProgressNav accent="orange" sections={[
        { id: "contact", label: "Get support" },
        { id: "process", label: "Our process" },
        { id: "services", label: "Services" },
        { id: "community", label: "Partners" },
        { id: "faq", label: "FAQ" },
      ]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* ── HERO ─────────────────────────────────────────────── */}
      <ParallaxHero
        image={petiteDumplingStorefront}
        alt="Petite Dumpling storefront in Park Slope, Brooklyn"
        className="home-initial-viewport relative flex min-h-[100svh] items-center overflow-hidden pt-32 pb-24"
        imageClassName="object-cover object-[60%_center] md:object-center"
        mediaClassName="absolute -inset-y-[16vh] inset-x-0"
        parallaxRange={[160, -40]}
      >
        <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8">
          <PageHeroContent
            eyebrow="For NYC small businesses"
            title={<>Free websites, tools, and marketing for <span className="text-n-orange">your small business.</span></>}
            description="Novus is a student-run nonprofit helping small businesses across NYC. Tell us what you need, and we’ll connect you with a team that can help."
            primaryAction={{ href: "#contact", label: "Request free support" }}
            secondaryAction={{ href: "/showcase", label: "See our work" }}
          />
        </div>
      </ParallaxHero>

      {/* ── CONTACT FORM ─────────────────────────────────────── */}
      <section className="public-surface public-surface-lavender py-16 bg-n-bg" id="contact">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <h2 className="page-section-heading text-n-ink mb-4">
              Tell us what you need
            </h2>
            <p className="font-body text-n-muted max-w-xl">
              Share a few details about your business and the support you are looking for.
              The form is available in English, Spanish, Chinese, Korean, Arabic, and French.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <ContactForm />
          </AnimatedSection>
        </div>
      </section>

      {/* ── PROCESS ─────────────────────────────────────────── */}
      <BusinessProcessTimeline />

      {/* ── SERVICES 2×3 GRID ──────────────────────────────── */}
      <section id="services" className="public-surface public-surface-grid py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="page-section-heading text-n-ink">
              What we build for small businesses
            </h2>
            <p className="font-body text-n-muted mt-3 max-w-xl">
              Your student team scopes the work with you, shares regular updates, and hands over clear, usable deliverables at the end of the project.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((service, i) => (
              <AnimatedSection key={service.title} delay={i * 0.06}>
                <details className="group h-full rounded-2xl border border-n-border bg-n-bg px-5 py-5 transition duration-200 hover:-translate-y-0.5 hover:border-n-orange/60 hover:shadow-[0_8px_20px_rgba(31,36,42,0.08)]">
                  <summary className="list-none cursor-pointer">
                    <div className="flex items-start gap-3">
                      <span className={`w-10 h-10 rounded-xl ${service.bg} flex items-center justify-center shrink-0`}>
                        <service.icon className={`w-4 h-4 ${service.color}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="block font-display font-bold text-n-ink text-base leading-tight">
                          {service.title}
                        </span>
                        <span className="block font-body text-sm text-n-muted mt-1 leading-relaxed">
                          {service.summary}
                        </span>
                      </div>
                      <svg className="w-4 h-4 text-n-muted mt-1.5 shrink-0 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </summary>
                  <div className="accordion-body mt-4 pl-[3.25rem]">
                    <ul className="list-disc pl-5 space-y-1.5 font-body text-sm text-n-muted">
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

      {/* ── TRUST SIGNALS ──────────────────────────────────── */}
      <section id="community" className="relative isolate overflow-hidden py-16 bg-[#fef6f0]">
        <BrandTexture tone="peach" />
        <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8 md:mb-10 text-center">
            <p className="font-body text-xs uppercase tracking-[0.22em] text-n-orange font-bold mb-3">
              Community connections
            </p>
            <h2 className="page-section-heading text-n-ink">
              Connected to the organizations that serve NYC businesses.
            </h2>
          </AnimatedSection>
          <AnimatedSection>
            <div className="mobile-logo-row grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 md:gap-4">
              {trustedPartners.map((partner) => (
                <a
                  key={partner.name}
                  href={partner.website}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex min-h-32 flex-col items-center justify-center border border-n-border bg-n-bg px-3 py-5 rounded-lg transition duration-200 hover:-translate-y-0.5 hover:border-n-orange/60 hover:bg-white hover:shadow-[0_8px_18px_rgba(31,36,42,0.06)]"
                  aria-label={`Visit ${partner.name}`}
                >
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={180}
                    height={90}
                    className="max-h-12 w-full object-contain transition duration-200 group-hover:brightness-110"
                  />
                  <span className="mt-3 flex min-h-[2.35em] items-center text-center font-body text-[11px] font-semibold leading-snug text-n-ink">
                    {partner.name}
                  </span>
                </a>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FAQ ACCORDION ──────────────────────────────────── */}
      <section id="faq" className="relative isolate overflow-hidden py-16 bg-[#f9f5f8]">
        <BrandTexture tone="lavender" />
        <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <h2 className="page-section-heading text-n-ink">Frequently asked questions</h2>
          </AnimatedSection>
          <AnimatedSection>
            <FaqAccordion categories={PARTNER_FAQ_CATEGORIES} />
          </AnimatedSection>
        </div>
      </section>

      {/* ── BOTTOM CTA ─────────────────────────────────────── */}
      <section className="py-16 bg-n-dark text-center">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <h2 className="page-section-heading text-white mb-4">
              Looking for support for your business?
            </h2>
            <p className="font-body text-white/65 text-base md:text-lg mb-8 max-w-lg mx-auto">
              We&apos;re taking on new projects across New York City. Tell us about your business and the support you need, and we&apos;ll follow up within a few business days.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <a
                href="#contact"
                className="inline-flex items-center justify-center rounded-full border-2 border-transparent bg-n-orange px-8 py-3.5 font-display text-base font-bold text-n-ink transition-colors hover:bg-n-orange-dark"
              >
                Request support →
              </a>
              <Link
                href="/showcase"
                className="inline-flex items-center justify-center rounded-full border-2 border-white/55 px-8 py-3.5 font-display text-base font-bold text-white transition-colors hover:border-white hover:bg-white/10"
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
