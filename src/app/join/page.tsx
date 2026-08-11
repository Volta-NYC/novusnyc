import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import ApplicationJourney from "@/components/ApplicationJourney";
import BrandTexture from "@/components/BrandTexture";
import FaqAccordion from "@/components/FaqAccordion";
import ParallaxHero from "@/components/ParallaxHero";
import SectionBridge from "@/components/SectionBridge";
import SectionProgressNav from "@/components/SectionProgressNav";
import TracksTabbed from "@/components/TracksTabbed";
import TracksParallax from "@/components/TracksParallax";
import { joinFaqs, joinGains, marqueeSchools } from "@/data";
import { getMemberEducationSnapshot, getTotalMemberCount } from "@/lib/server/memberEducation";
import { formatCounter } from "@/lib/formatCounter";
import cornellPhoto from "../../../public/cornell-campus-photo.jpg";

export const metadata: Metadata = {
  title: "Volunteer and Internship Opportunities for NYC Students",
  description:
    "Novus is run entirely by high school and college students. Work on real websites, marketing, and finance projects for NYC small businesses. No experience required, rolling applications, five minutes to apply.",
  openGraph: {
    title: "Volunteer and Internship Opportunities for NYC Students | Novus NYC",
    description: "High school and college students building real websites and marketing work for NYC small businesses. No experience required.",
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
  const [education, memberCount] = await Promise.all([getMemberEducationSnapshot(), getTotalMemberCount()]);
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
        <div className="relative flex flex-1 items-center max-w-7xl mx-auto w-full px-5 md:px-8 pb-16">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-n-purple uppercase tracking-widest mb-4">
              For Students
            </p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Real client work for high school<br />
              <span className="text-n-purple">and college students in NYC.</span>
            </h1>
            <p className="font-body text-white/70 text-lg max-w-2xl leading-relaxed mb-4">
              Novus is run entirely by students. You join a small team and build something a
              real business uses, with a real deadline and a real client on the other end.
              Websites, social media and branding, grants and funding, small business outreach,
              or financial analysis. No experience required, and the application takes about
              five minutes.
            </p>
            <p className="font-body text-white/65 text-sm mb-8">
              Join {formatCounter(memberCount)} students from {education.highSchoolCount} high schools and {education.collegeCount} colleges.
            </p>
            <div className="flex gap-4 flex-wrap mb-3">
              <Link
                href="/apply"
                className="bg-n-purple text-white font-display font-bold text-base px-8 py-4 rounded-full hover:bg-n-purple-dark transition-colors"
              >
                Apply Now →
              </Link>
              <a
                href="#tracks"
                className="border border-white/20 text-white font-display font-bold text-base px-8 py-4 rounded-full hover:border-white/50 transition-colors"
              >
                See tracks
              </a>
            </div>
            <p className="font-body text-sm text-white/60">
              Takes 5 minutes · Apply anytime · ~30% acceptance rate.
            </p>
          </AnimatedSection>
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

      {/* ── WHY NOVUS / RESUME VALUE ───────────────────────── */}
      <section id="benefits" className="public-surface public-surface-grid py-14 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="page-section-heading text-n-ink">Built for your resume</h2>
            <p className="font-body text-n-muted mt-3 max-w-xl">
              Novus is built around outcomes that matter in interviews and on applications.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
            {joinGains.map((g, i) => (
              <AnimatedSection key={g.title} delay={i * 0.04}>
                <div className="flex gap-3 items-start">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[0.4rem] ${g.color.replace("text-", "bg-")}`} />
                  <div>
                    <p className="font-display font-bold text-n-ink text-sm">{g.title}</p>
                    <p className="font-body text-sm text-n-muted mt-0.5 leading-relaxed">{g.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

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

      <SectionBridge tone="lavender" align="right" />

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

      <SectionBridge tone="yellow" />

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
