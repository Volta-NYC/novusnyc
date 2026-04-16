import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import TracksTabbed from "@/components/TracksTabbed";
import { joinFaqs, joinGains, marqueeSchools } from "@/data";
import { getMemberEducationSnapshot } from "@/lib/server/memberEducation";
import cornellPhoto from "../../../public/cornell-campus-photo.jpg";

export const metadata: Metadata = {
  title: "Get Involved | Volta NYC",
  description:
    "Join Volta NYC to work on real projects for real businesses. All experience levels welcome. 5-minute application and rolling admissions.",
  openGraph: {
    title: "Get Involved | Volta NYC",
    description: "Real projects. Real clients. All experience levels welcome.",
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
    desc: "Represent Volta at your school. You recruit new members, run info sessions, and serve as the main point of contact between your campus and Volta leadership.",
  },
  {
    role: "Head of City Expansion",
    desc: "Launch Volta in a new city. You build local partnerships and establish the first student teams and operating structure from scratch.",
  },
];

export const revalidate = 3600;

export default async function Join() {
  const education = await getMemberEducationSnapshot();
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── HERO + MARQUEE ─────────────────────────────────── */}
      <section className="relative pt-32 overflow-hidden" data-home-dark-end="true">
        <Image
          src={cornellPhoto}
          alt="Cornell University campus"
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
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pb-16">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-4">
              For Students
            </p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Build your resume with
              <br />
              <span className="text-v-blue">real projects for real businesses.</span>
            </h1>
            <p className="font-body text-white/70 text-lg max-w-2xl leading-relaxed mb-4">
              Whether you are a high schooler looking for your first real project or a college student building your portfolio, Volta gives you work you can talk about in an interview. Real clients. Real deliverables.
            </p>
            <p className="font-body text-white/65 text-sm mb-8">
              Join {education.memberCount}+ students from {education.highSchoolCount} high schools and {education.collegeCount} colleges.
            </p>
            <div className="flex gap-4 flex-wrap mb-3">
              <Link
                href="/apply"
                className="bg-v-blue text-white font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-blue-dark transition-colors"
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
              Takes 5 minutes · Apply anytime.
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
                <span className="w-1.5 h-1.5 rounded-full bg-v-blue opacity-80 flex-shrink-0" />
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY VOLTA / RESUME VALUE ───────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Built for your resume — and beyond</h2>
            <p className="font-body text-v-muted mt-3 max-w-xl">
              Volta is built around outcomes that matter in interviews and on applications.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
            {joinGains.map((g, i) => (
              <AnimatedSection key={g.title} delay={i * 0.04}>
                <div className="flex gap-3 items-start">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[0.4rem] ${g.color.replace("text-", "bg-")}`} />
                  <div>
                    <p className="font-display font-bold text-v-ink text-sm">{g.title}</p>
                    <p className="font-body text-sm text-v-muted mt-0.5 leading-relaxed">{g.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACKS ─────────────────────────────────────────── */}
      <section id="tracks" className="py-14 bg-v-bg">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-8">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">The three tracks</h2>
            <p className="font-body text-v-muted mt-3 max-w-xl">
              Every project is staffed by students across our three tracks. Pick the one that fits your skills and interests.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <TracksTabbed />
          </AnimatedSection>
        </div>
      </section>

      {/* ── LEADERSHIP TRACK ───────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">The leadership track</h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              We promote based on the work you do, not how long you have been here. Strong contributors move up quickly.
            </p>
          </AnimatedSection>
          <div className="relative">
            {/* Single connecting line behind all circles */}
            <div className="hidden md:block absolute top-5 left-[10%] right-[10%] h-0.5 bg-v-green/30 z-0" />
            <div className="grid md:grid-cols-5 gap-6">
              {leadershipSteps.map((step, i) => (
                <AnimatedSection key={step.role} delay={i * 0.1}>
                  <div className="relative flex flex-col items-start md:items-center">
                    <div className="w-10 h-10 rounded-full bg-v-green flex items-center justify-center mb-4 z-10 flex-shrink-0">
                      <span className="font-display font-bold text-v-ink text-sm">{i + 1}</span>
                    </div>
                    <h3 className="font-display font-bold text-v-ink text-base mb-2 md:text-center">{step.role}</h3>
                    <p className="font-body text-sm text-v-muted leading-relaxed md:text-center">{step.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
          <AnimatedSection className="mt-10">
            <h3 className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">Other roles</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {otherRoles.map((role) => (
                <div key={role.role} className="bg-v-bg border border-v-border rounded-2xl p-5">
                  <h4 className="font-display font-bold text-v-ink text-base mb-2">{role.role}</h4>
                  <p className="font-body text-sm text-v-muted leading-relaxed">{role.desc}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="py-14 bg-v-bg">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl">Frequently Asked Questions</h2>
          </AnimatedSection>
          <div className="space-y-4">
            {joinFaqs.map((f, i) => (
              <AnimatedSection key={f.q} delay={i * 0.06}>
                <div className="bg-white border border-v-border rounded-xl p-6">
                  <h3 className="font-display font-bold text-v-ink mb-2">{f.q}</h3>
                  <p className="font-body text-sm text-v-muted leading-relaxed">{f.a}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
