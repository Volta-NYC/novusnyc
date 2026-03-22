import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import ContactForm from "@/components/ContactForm";
import {
  GlobeIcon,
  SmartphoneIcon,
  DollarIcon,
  SearchIcon,
  TrendingUpIcon,
  CreditCardIcon,
} from "@/components/Icons";
import { VOLTA_STATS, formatStat } from "@/data/stats";

export const metadata: Metadata = {
  title: "Free Help for NYC Small Businesses | Volta NYC",
  description:
    "NYC small businesses: get a free website, social media strategy, grant writing, or SEO from a dedicated student team. No cost, no catch. Volta NYC is a registered 501(c)(3) nonprofit.",
  openGraph: {
    title: "Free Help for NYC Small Businesses | Volta NYC",
    description:
      "Student teams build websites, grow social media, write grants, and optimize SEO for NYC small businesses — at no cost. Reach out to get started.",
    images: ["/api/og"],
  },
};

const SERVICE_AREAS = [
  {
    icon: GlobeIcon,
    title: "Website Design & Development",
    summary: "Custom websites that are mobile-friendly, fast, and built for real business goals.",
    color: "text-v-blue",
    bg: "bg-blue-50",
    details: [
      "New builds or full redesigns using modern frameworks and clean CMS handoff",
      "Mobile performance, accessibility, and conversion-focused page structure",
      "Deployment support, analytics setup, and ongoing iteration with your team",
    ],
  },
  {
    icon: SearchIcon,
    title: "SEO & Online Visibility",
    summary: "Better discoverability across search, maps, and local listing platforms.",
    color: "text-v-blue",
    bg: "bg-blue-50",
    details: [
      "Google Business Profile optimization and listing consistency",
      "Yelp and Apple Maps cleanup with stronger search relevance signals",
      "On-site SEO updates to improve rankings and local discovery",
    ],
  },
  {
    icon: SmartphoneIcon,
    title: "Social Media & Content",
    summary: "Practical social strategy with content systems your team can actually sustain.",
    color: "text-v-green",
    bg: "bg-lime-50",
    details: [
      "Posting calendars, content pillars, and weekly execution planning",
      "Founder interview clips, short-form edits, and reusable media templates",
      "Audience growth tracking with clear performance feedback loops",
    ],
  },
  {
    icon: TrendingUpIcon,
    title: "Sales & Financial Analysis",
    summary: "Owner-facing analysis that turns raw sales numbers into decisions.",
    color: "text-v-green",
    bg: "bg-lime-50",
    details: [
      "Sales and revenue trend analysis by period, category, and seasonality",
      "Competitor benchmarking and positioning insights",
      "Pricing and operations recommendations with clear reporting takeaways",
    ],
  },
  {
    icon: DollarIcon,
    title: "Grant Research & Writing",
    summary: "We identify eligible grants and draft complete application-ready materials.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    details: [
      "Grant discovery based on your business type, location, and stage",
      "Narrative drafting, budget support, and checklist completion",
      "Submission prep and timeline tracking through deadlines",
    ],
  },
  {
    icon: CreditCardIcon,
    title: "Digital Payment Setup",
    summary: "Support moving from cash-heavy workflows to modern payment options.",
    color: "text-amber-500",
    bg: "bg-amber-50",
    details: [
      "Payment platform setup and checkout flow recommendations",
      "Online ordering and loyalty program configuration support",
      "Practical setup guidance so staff can run systems confidently",
    ],
  },
] as const;

export default function Partners() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "How can I get free website help for my NYC small business?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Volta NYC pairs NYC small businesses with student consulting teams at no cost. Fill out the interest form on this page and a team lead will follow up within a few days to discuss your project.",
        },
      },
      {
        "@type": "Question",
        name: "Is Volta NYC's consulting really free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, completely free. Volta NYC is a registered 501(c)(3) nonprofit. There is no cost, no hidden fees, and no catch.",
        },
      },
      {
        "@type": "Question",
        name: "What services does Volta NYC provide for small businesses?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Volta NYC student teams offer website design and development, social media strategy and content creation, grant research and writing, and SEO and Google Maps optimization — all at no cost to the business.",
        },
      },
      {
        "@type": "Question",
        name: "Which NYC neighborhoods does Volta NYC serve?",
        acceptedAnswer: {
          "@type": "Answer",
          text: `Volta NYC currently serves small businesses across ${formatStat(VOLTA_STATS.nycNeighborhoods)} NYC neighborhoods, with active projects in areas including Brooklyn, Queens, Manhattan, and the Bronx.`,
        },
      },
      {
        "@type": "Question",
        name: "How does the student consulting process work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "After you reach out, Volta NYC matches your business with a student team based on your needs. The team works with you to scope a project, then delivers the work — a website, social media strategy, grant application, or SEO improvements — over several weeks.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-v-dark pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-[0.06]" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
              For Businesses & BIDs
            </p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              A dedicated team<br />
              <span className="text-v-green">for your business.</span>
            </h1>
            <p className="font-body text-white/70 text-lg max-w-2xl leading-relaxed mb-8">
              Volta places student teams on real projects for NYC small businesses —
              websites, social media, grant writing, SEO, and financial operations.
              We scope with you first, then execute with clear deliverables, timelines,
              and regular updates. Professional-grade work, no cost to you.
            </p>
            <div className="flex gap-4 flex-wrap">
              <a
                href="#contact"
                className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-colors"
              >
                Work with us →
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

      {/* ── SERVICES ─────────────────────────────────────────── */}
      <section className="py-14 bg-v-bg border-b border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              What we deliver
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              Six service areas.
            </h2>
          </AnimatedSection>
          <div className="space-y-3">
            {SERVICE_AREAS.map((service, i) => (
              <AnimatedSection key={service.title} delay={i * 0.06}>
                <details className="group bg-white border border-v-border rounded-2xl px-4 py-3">
                  <summary className="list-none cursor-pointer flex items-start gap-3">
                    <span className={`w-10 h-10 rounded-xl ${service.bg} flex items-center justify-center shrink-0`}>
                      <service.icon className={`w-4 h-4 ${service.color}`} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-display font-bold text-v-ink text-base leading-tight">
                        {service.title}
                      </span>
                      <span className="block font-body text-sm text-v-muted mt-1">
                        {service.summary}
                      </span>
                    </span>
                    <span className="text-v-muted text-xs mt-2 group-open:rotate-180 transition-transform">⌄</span>
                  </summary>
                  <div className="mt-3 pl-[3.25rem]">
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

      {/* ── CONTACT FORM ─────────────────────────────────────── */}
      <section className="py-16 bg-v-bg" id="contact">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              Request support
            </p>
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

      {/* ── PROCESS ─────────────────────────────────────────── */}
      <section className="py-12 bg-white border-y border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-6">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-2">
              How engagement works
            </p>
            <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl">
              Clear steps from intake to execution.
            </h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-4">
            <AnimatedSection>
              <div className="border border-v-border rounded-xl p-5 h-full">
                <div className="w-8 h-8 rounded-full bg-v-green/15 text-v-green font-display font-bold text-sm flex items-center justify-center mb-3">1</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Apply</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  Leave your contact information, and we&apos;ll get back to you via text or email within a few days.
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.06}>
              <div className="border border-v-border rounded-xl p-5 h-full">
                <div className="w-8 h-8 rounded-full bg-v-blue/15 text-v-blue font-display font-bold text-sm flex items-center justify-center mb-3">2</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Meet</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  We schedule an in-person visit or call to understand your business, priorities, and goals.
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.12}>
              <div className="border border-v-border rounded-xl p-5 h-full">
                <div className="w-8 h-8 rounded-full bg-amber-200 text-amber-700 font-display font-bold text-sm flex items-center justify-center mb-3">3</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Build</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  A dedicated student team is assigned and starts work right away, with clear timelines and regular updates.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── GUIDES / NEWSLETTER ─────────────────────────────── */}
      <section className="py-12 bg-white border-b border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-2">
              Practical resources
            </p>
            <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl mb-3">
              Owner guides, case studies, and practical references.
            </h2>
            <p className="font-body text-v-muted leading-relaxed mb-5 max-w-3xl">
              We publish concise resources on websites, marketing, operations, and real field learnings from business work across neighborhoods.
              You can use them whether or not you work with us directly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/guides"
                className="inline-block text-v-blue font-display font-bold text-sm hover:text-v-blue-dark transition-colors"
              >
                Read Business Guides →
              </Link>
              <Link
                href="/reports"
                className="inline-block text-v-ink font-display font-bold text-sm hover:text-v-blue-dark transition-colors"
              >
                Read Reports & Case Studies →
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── BID SECTION ──────────────────────────────────────── */}
      <section className="py-20 bg-white border-t border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection direction="left">
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
                For BIDs & district organizations
              </p>
              <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-5">
                We coordinate<br />through your district.
              </h2>
              <p className="font-body text-v-muted leading-relaxed mb-6">
                We partner with Business Improvement Districts to coordinate
                neighborhood-level operations — identifying businesses that need
                support, making introductions, and ensuring follow-through on every
                project. We&apos;re also open to a quick Zoom chat to discuss fit.
              </p>
              <a
                href="mailto:ethan@voltanyc.org?subject=BID%20Partnership%20Inquiry"
                className="inline-block bg-v-ink text-white font-display font-bold text-sm px-7 py-3 rounded-full hover:bg-v-ink/80 transition-colors"
              >
                Email Ethan about BID partnerships →
              </a>
            </AnimatedSection>
            <AnimatedSection direction="right">
              <div className="bg-v-bg border border-v-border rounded-2xl p-8">
                <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">
                  Currently active
                </p>
                <p className="font-display font-bold text-v-ink text-6xl leading-none mb-1">{formatStat(VOLTA_STATS.bidPartners)}</p>
                <p className="font-body text-v-muted mb-6">BID partnerships across NYC</p>
                <div className="pt-6 border-t border-v-border">
                  <p className="font-body text-sm text-v-muted">
                    Active across {formatStat(VOLTA_STATS.bidPartners)} neighborhoods in Brooklyn, Queens, Manhattan, the Bronx, and Staten Island.
                  </p>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </>
  );
}
