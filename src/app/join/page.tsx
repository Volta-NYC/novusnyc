import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import ApplicationJourney from "@/components/ApplicationJourney";
import BrandTexture from "@/components/BrandTexture";
import FaqAccordion from "@/components/FaqAccordion";
import PageHeroContent from "@/components/PageHeroContent";
import ParallaxHero from "@/components/ParallaxHero";
import SectionProgressNav from "@/components/SectionProgressNav";
import TracksTabbed from "@/components/TracksTabbed";
import TracksParallax from "@/components/TracksParallax";
import { joinFaqs, marqueeSchools } from "@/data";
import cornellPhoto from "../../../public/cornell-campus-photo.jpg";

export const metadata: Metadata = {
  title: "Volunteer and Internship Opportunities for NYC Students",
  description:
    "Novus is run entirely by high school and college students. Build websites, marketing, grant research, and financial projects for NYC small businesses.",
  openGraph: {
    title: "Volunteer and Internship Opportunities for NYC Students | Novus NYC",
    description: "High school and college students building real websites, marketing, grant research, and financial work for NYC small businesses.",
    images: ["/api/og"],
  },
};

const leadershipSteps = [
  {
    role: "Analyst",
    desc: "Contribute to live projects and ship your first client-facing work.",
  },
  {
    role: "Senior Analyst",
    desc: "Own your workstream and mentor newer analysts on execution quality.",
  },
  {
    role: "Associate",
    desc: "Coordinate with your team, manage key project pieces, and keep client deadlines on track.",
  },
  {
    role: "Senior Associate",
    desc: "Lead work across multiple teams and help set the standard for how projects get done.",
  },
  {
    role: "Project Lead",
    desc: "Run a project from start to finish. You lead the team and own the client relationship.",
  },
];

const otherRoles = [
  {
    role: "Neighborhood Liaison",
    desc: "Bridge our project teams and local business owners. You do outreach, join BID visits, and build the on-the-ground relationships that make our work possible.",
  },
  {
    role: "School Ambassador",
    desc: "Represent Novus at your school. You recruit new members, run info sessions, and serve as the main point of contact between your campus and Novus leadership.",
  },
  {
    role: "Head of City Expansion",
    desc: "Launch Novus in a new city. You build local partnerships and establish the first student teams and operating structure from scratch.",
  },
];

export const revalidate = 3600;

const JOIN_FAQ_CATEGORIES = [
  { title: "Getting started", items: joinFaqs.slice(0, 6) },
  { title: "Tracks and projects", items: joinFaqs.slice(6, 11) },
  { title: "Experience and growth", items: joinFaqs.slice(11) },
];

export default async function Join() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: joinFaqs.map((f) => ({
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
      <SectionProgressNav sections={[
        { id: "benefits", label: "Why Novus" },
        { id: "tracks", label: "Tracks" },
        { id: "leadership", label: "Leadership" },
        { id: "journey", label: "Your journey" },
        { id: "faq", label: "FAQ" },
      ]} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── HERO + MARQUEE ─────────────────────────────────── */}
      <ParallaxHero
        image={cornellPhoto}
        alt="Cornell University campus, one of the schools represented in Novus"
        className="relative flex min-h-[100svh] flex-col overflow-hidden pt-32"
        imageClassName="object-cover object-[54%_center] md:object-center"
        parallaxRange={[0, 290]}
      >
        <div className="relative mx-auto flex w-full max-w-7xl flex-1 items-center px-5 pb-16 md:px-8">
          <PageHeroContent
            eyebrow="For students"
            title={<>Build real work. <span className="text-n-purple">Grow real skills.</span></>}
            description="Join a student team doing real client work for NYC small businesses. Build experience you can show in applications, portfolios, and interviews."
            primaryAction={{ href: "/apply", label: "Start your application" }}
            secondaryAction={{ href: "#tracks", label: "Explore the tracks" }}
            accent="purple"
          />
        </div>
        {/* Marquee sits over photo, separated by a subtle top border */}
        <div className="relative border-t border-white/10 overflow-hidden py-3">
          <div className="marquee-track">
            {[...marqueeSchools, ...marqueeSchools].map((school, i) => (
              <span
                key={`${school}-${i}`}
                className="inline-flex items-center gap-4 font-body text-xs text-white/75 whitespace-nowrap px-2 select-none"
              >
                {school}
                <span className="w-1.5 h-1.5 rounded-full bg-n-purple opacity-80 flex-shrink-0" />
              </span>
            ))}
          </div>
        </div>
      </ParallaxHero>

      {/* ── TRACKS ─────────────────────────────────────────── */}
      <TracksParallax>
          <AnimatedSection className="mb-8">
            <h2 className="page-section-heading text-white">The three tracks</h2>
            <p className="font-body text-white/80 mt-3 max-w-xl">
              Every project is staffed by students across our three tracks. Pick the one that fits your skills and interests.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <TracksTabbed />
          </AnimatedSection>
      </TracksParallax>

      {/* ── LEADERSHIP TRACK ───────────────────────────────── */}
      <section id="leadership" className="relative isolate overflow-hidden py-14 bg-[#f9f5f8]">
        <BrandTexture tone="lavender" />
        <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="page-section-heading text-n-ink">The leadership track</h2>
            <p className="font-body text-n-muted text-lg mt-3 max-w-xl">
              We promote based on the work you do, not how long you have been here. Strong contributors move up quickly.
            </p>
          </AnimatedSection>
          <div className="relative">
            {/* Single connecting line behind all circles */}
            <div className="hidden md:block absolute top-5 left-[10%] right-[10%] h-0.5 bg-n-purple/30 z-0" />
            <div className="grid md:grid-cols-5 gap-6">
              {leadershipSteps.map((step, i) => (
                <AnimatedSection key={step.role} delay={i * 0.1}>
                  <div className="relative flex flex-col items-start md:items-center">
                    <div className="w-10 h-10 rounded-full bg-n-purple flex items-center justify-center mb-4 z-10 flex-shrink-0">
                      <span className="font-display font-bold text-white text-sm">{i + 1}</span>
                    </div>
                    <h3 className="font-display font-bold text-n-ink text-base mb-2 md:text-center">{step.role}</h3>
                    <p className="font-body text-sm text-n-muted leading-relaxed md:text-center">{step.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
          <AnimatedSection className="mt-10">
            <h3 className="font-body text-xs font-semibold text-n-muted uppercase tracking-widest mb-4">Other roles</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {otherRoles.map((role) => (
                <div key={role.role} className="bg-n-bg border border-n-border rounded-2xl p-5">
                  <h4 className="font-display font-bold text-n-ink text-base mb-2">{role.role}</h4>
                  <p className="font-body text-sm text-n-muted leading-relaxed">{role.desc}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      <ApplicationJourney />

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section id="faq" className="relative isolate overflow-hidden py-14 bg-[#fffbea]">
        <BrandTexture tone="yellow" />
        <div className="relative z-10 max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="page-section-heading text-n-ink">Frequently Asked Questions</h2>
          </AnimatedSection>
          <AnimatedSection>
            <FaqAccordion categories={JOIN_FAQ_CATEGORIES} />
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
