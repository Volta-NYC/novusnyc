import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import ContactForm from "@/components/ContactForm";
import FaqAccordion from "@/components/FaqAccordion";
import {
  GlobeIcon,
  SmartphoneIcon,
  DollarIcon,
  SearchIcon,
  TrendingUpIcon,
  PencilIcon,
} from "@/components/Icons";
import storefrontPhoto from "../../../public/petite-dumpling-storefront.jpg";

export const metadata: Metadata = {
  title: "Free Help for NYC Small Businesses | Novus NYC",
  description:
    "NYC small businesses: get a free website, social media, grant writing, or SEO from a dedicated student team. No cost, no catch. Novus NYC is a registered 501(c)(3) nonprofit.",
  openGraph: {
    title: "Free Help for NYC Small Businesses | Novus NYC",
    description:
      "Student teams build websites, grow social media, write grants, and optimize SEO for NYC small businesses — at no cost. Reach out to get started.",
    images: ["/api/og"],
  },
};

const SERVICES = [
  {
    icon: GlobeIcon,
    title: "Website Design & Development",
    summary: "We build your website from scratch, or fix the one you have.",
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
    summary: "Show up when customers search for you on Google and Maps.",
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
    summary: "A posting plan and real content — not a strategy deck you'll never use.",
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
    summary: "Print and digital materials your customers actually take home.",
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
    title: "Grant Research & Writing",
    summary: "We find the grants, write the application, and hand it to you to sign.",
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
    a: "Yes. Novus NYC is a registered 501(c)(3) nonprofit. There are no fees, no contracts, and no catch. Our student teams do everything at no cost to your business.",
  },
  {
    q: "How long does a project take?",
    a: "Most projects take 4 to 8 weeks from scoping to delivery. Websites tend to take longer than social media or SEO work. We give you a timeline before we start.",
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

export default async function Partners() {
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
      <section className="relative flex min-h-[100svh] items-center overflow-hidden pt-32 pb-24" data-home-dark-end="true">
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
        <div className="absolute inset-0 bg-[#1a1e24]/75" />
        <div className="absolute inset-0 hero-vignette opacity-50 pointer-events-none" />
        <div className="relative w-full max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
              For NYC Small Businesses
            </p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Free, dedicated support for<br />
              <span className="text-v-green">local businesses and entrepreneurs.</span>
            </h1>
            <p className="font-body text-white/70 text-lg max-w-2xl leading-relaxed mb-8">
              Novus NYC partners with small businesses to provide critical digital and strategic infrastructure, from web design to marketing and outreach. Our teams provide clear project planning, consistent communication, and concrete results, entirely free of charge.
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
                className="bg-v-blue text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-blue-dark transition-colors"
              >
                See our work
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── SERVICES 2×3 GRID ──────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
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

      {/* ── CONTACT FORM ─────────────────────────────────────── */}
      <section className="py-16 bg-v-bg" id="contact">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
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
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <h2 className="font-display font-bold text-v-ink text-2xl md:text-3xl">
              Three simple steps
            </h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-4">
            <AnimatedSection>
              <div className="border border-v-border rounded-xl p-5 h-full bg-v-bg">
                <div className="w-8 h-8 rounded-full bg-v-green/15 text-v-green font-display font-bold text-sm flex items-center justify-center mb-3">1</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Apply</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  Fill out the form above and we will follow up by text or email within a few days.
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.06}>
              <div className="border border-v-border rounded-xl p-5 h-full bg-v-bg">
                <div className="w-8 h-8 rounded-full bg-v-blue/15 text-v-blue font-display font-bold text-sm flex items-center justify-center mb-3">2</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Meet</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  We schedule an in-person visit or call to understand your business, priorities, and goals.
                </p>
              </div>
            </AnimatedSection>
            <AnimatedSection delay={0.12}>
              <div className="border border-v-border rounded-xl p-5 h-full bg-v-bg">
                <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 font-display font-bold text-sm flex items-center justify-center mb-3">3</div>
                <p className="font-display font-bold text-v-ink text-lg mb-2">Build</p>
                <p className="font-body text-sm text-v-muted leading-relaxed">
                  A student team is assigned and gets to work. You will have a clear timeline and regular updates throughout.
                </p>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── FAQ ACCORDION ──────────────────────────────────── */}
      <section className="py-16 bg-v-bg">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <h2 className="font-display font-bold text-v-ink text-2xl">Frequently asked questions</h2>
          </AnimatedSection>
          <AnimatedSection>
            <FaqAccordion categories={PARTNER_FAQ_CATEGORIES} />
          </AnimatedSection>
        </div>
      </section>

      {/* ── BOTTOM CTA ─────────────────────────────────────── */}
      <section className="py-16 bg-v-dark text-center">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection>
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
                className="inline-flex items-center justify-center rounded-full bg-v-blue px-8 py-3.5 font-display text-base font-bold text-v-ink transition-colors hover:bg-v-blue-dark"
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
