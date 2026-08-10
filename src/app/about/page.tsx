import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import HistoryTimeline from "@/components/HistoryTimeline";
import LeadershipProfiles from "@/components/LeadershipProfiles";
import ParallaxHero from "@/components/ParallaxHero";
import SectionProgressNav from "@/components/SectionProgressNav";
import { aboutTimeline, aboutValues, teamMembers } from "@/data";
import { formatCounter } from "@/lib/formatCounter";
import { getMemberEducationSnapshot } from "@/lib/server/memberEducation";
import { getPublicLiveStats } from "@/lib/server/publicShowcase";
import brooklynBridgePhoto from "../../../public/brooklyn-bridge.jpg";


export const metadata: Metadata = {
  title: "About Our Student-Run Nonprofit",
  description:
    "Novus NYC is a nonprofit corporation incorporated in New York State, run by students from Stuyvesant High School, Baruch College, Cornell University, Stony Brook University, and other schools. Learn about our history, values, and the team behind the work.",
  openGraph: {
    title: "About Novus NYC | Student-Run Nonprofit",
    description: "A student-run nonprofit built on the belief that digital equity is economic equity.",
    images: ["/api/og"],
  },
};

export default async function About() {
  const education = await getMemberEducationSnapshot();
  const liveStats = await getPublicLiveStats();

  return (
    <>
      <SectionProgressNav sections={[
        { id: "impact", label: "Impact" },
        { id: "mission", label: "Mission" },
        { id: "history", label: "History" },
        { id: "leadership", label: "Leadership" },
        { id: "values", label: "How we operate" },
      ]} />
      {/* ── HERO ─────────────────────────────────────────────── */}
      <ParallaxHero
        image={brooklynBridgePhoto}
        alt="Brooklyn Bridge"
        className="relative flex min-h-[100svh] items-center overflow-hidden pt-32 pb-20"
        imageClassName="object-cover object-[58%_center] md:object-center"
        parallaxRange={[0, 290]}
      >
        <div className="relative w-full max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row gap-16 items-start">
          <div className="flex-1">
            <AnimatedSection>
              <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-4">About Novus</p>
              <h1 className="font-display font-bold text-white leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
                Students building<br /><span className="text-n-purple">real skills</span><br />through <span className="text-n-orange">real work.</span>
              </h1>
            </AnimatedSection>
          </div>
          <AnimatedSection direction="right" className="flex-1 pt-4 md:pt-16">
            <p className="font-body text-white/70 text-lg leading-relaxed mb-5">
              Novus is a nonprofit run entirely by high school and college students.
              We believe digital access and economic opportunity are inseparable, and that the family-owned
              restaurants, flower shops, and community businesses that make up NYC&apos;s neighborhoods
              deserve the same tools and resources as larger ones.
            </p>
            <p className="font-body text-white/65 text-base leading-relaxed">
              Our members build websites, grow social media audiences, and write grants for
              businesses across the city. In the process, they build real professional skills
              and portfolios they can stand behind.
            </p>
          </AnimatedSection>
        </div>
      </ParallaxHero>

      {/* ── IMPACT NUMBERS ───────────────────────────────────── */}
      <section id="impact" className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <h2 className="page-section-heading text-n-ink mb-10">Our impact</h2>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-n-border bg-n-border md:grid-cols-6 md:gap-0 md:divide-x md:divide-n-border">
              {[
                { value: "150+", label: "Total\nbusinesses", color: "text-n-orange" },
                { value: formatCounter(liveStats.websiteProjects), label: "Website\nprojects", color: "text-n-purple" },
                { value: formatCounter(liveStats.marketingProjects), label: "Marketing\nprojects", color: "text-n-orange-dark" },
                { value: formatCounter(liveStats.caseStudies), label: "Case studies\nby students", color: "text-n-purple-dark" },
                { value: formatCounter(liveStats.educationalReports), label: "Educational guides\nfor merchants", color: "text-amber-600" },
                { value: formatCounter(liveStats.bidPartners, true), label: "Community\norganizations", color: "text-n-ink" },
              ].map((s, i) => (
                <AnimatedSection key={s.label} delay={i * 0.06} className="flex min-h-28 flex-col justify-center bg-white px-3 py-5 text-center sm:px-5 sm:py-7 md:min-h-0 md:px-6 md:py-8">
                  <div>
                    <p className={`mb-2 font-display text-3xl font-bold leading-none sm:text-4xl md:mb-3 md:text-5xl ${s.color}`}>{s.value}</p>
                    <p className="whitespace-pre-line font-body text-[10px] uppercase leading-relaxed tracking-[0.12em] text-n-muted">{s.label}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── MISSION ─────────────────────────────────────────── */}
      <section id="mission" className="py-16 bg-n-bg">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-4">Our mission</p>
                <blockquote className="font-display font-bold text-n-ink leading-tight mb-6" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)" }}>
                  &ldquo;To close the digital and financial equity gap for small businesses
                  by connecting them with the next generation of tech, finance, and marketing talent.&rdquo;
                </blockquote>
                <p className="font-body text-n-muted text-base leading-relaxed">
                  Most small business owners know what they need. What they lack is time
                  and the right connections. We help them see what is possible,
                  then we do the work.
                </p>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="rounded-2xl overflow-hidden border border-n-border shadow-xl w-full max-w-sm bg-white">
                  <iframe
                    src="https://www.instagram.com/p/DVBS-6LDvk9/embed/"
                    width="400"
                    height="505"
                    frameBorder="0"
                    scrolling="no"
                    loading="lazy"
                    style={{ display: "block", width: "100%", height: 505 }}
                  />
                </div>
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection>
            <div className="mt-14 rounded-2xl border border-n-purple/45 bg-n-purple/10 p-7 md:p-9">
              <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-3">
                What our name means
              </p>
              <h3 className="font-display font-bold text-n-ink text-2xl md:text-3xl leading-tight mb-5">
                Novus is Latin for &ldquo;new.&rdquo;
              </h3>
              <div className="font-body text-n-muted text-base leading-relaxed space-y-4">
                <p>
                  It describes both halves of what we actually do. For a family-owned
                  restaurant, a flower shop, or a corner bakery, it means a genuinely new
                  footing online — a real website, an audience that grows, a grant
                  application that actually gets submitted. For the high school and
                  college students who build it, it means a first real body of
                  professional work: shipped for an actual client, with their name on it.
                </p>
                <p>
                  We believe digital access and economic opportunity are inseparable. The
                  family-owned restaurants, flower shops, and community businesses that
                  make up NYC&apos;s neighborhoods deserve the same tools and resources as
                  larger ones — and the students who build those tools deserve work that
                  counts for something before anyone will hire them.
                </p>
                <p>
                  Our members build websites, grow social media audiences, and write
                  grants for businesses across the city. In the process, they build real
                  professional skills and portfolios they can stand behind. It is also a
                  name built to travel: New York is where we started and where most of
                  our work still happens, but nothing about the model is specific to one
                  city.
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── HISTORY ─────────────────────────────────────────── */}
      <section id="history" className="timeline-parallax relative isolate overflow-hidden py-16">
        <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="timeline-heading mb-10">
            <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-4">Our history</p>
            <h2 className="page-section-heading text-n-ink">Building Novus, one chapter at a time</h2>
            <p className="font-body text-n-muted mt-3 max-w-2xl leading-relaxed">
              A timeline for the moments, partnerships, and people that shaped our work.
            </p>
          </AnimatedSection>
          <HistoryTimeline milestones={aboutTimeline} />
        </div>
      </section>

      {/* ── TEAM ────────────────────────────────────────────── */}
      <section id="leadership" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h2 className="page-section-heading text-n-ink">Our Leadership</h2>
                <p className="font-body text-n-muted mt-3 max-w-2xl leading-relaxed [text-wrap:balance]">
                  A team of students from high schools and colleges across NYC and across the country.
                </p>
              </div>
              <div className="flex gap-8 md:pb-1 shrink-0">
                {[
                  { label: "High Schools", value: education.highSchoolCount },
                  { label: "Colleges", value: education.collegeCount },
                  { label: "States", value: education.stateCount },
                ].map((s) => (
                  <div key={s.label} className="text-center">
                    <p className="font-display font-bold text-n-orange text-3xl leading-none">{s.value}</p>
                    <p className="font-body text-xs text-n-muted uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
          <AnimatedSection>
            <LeadershipProfiles members={teamMembers} />
          </AnimatedSection>
        </div>
      </section>

      {/* ── HOW WE OPERATE ─────────────────────────────────── */}
      <section id="values" className="py-16 bg-n-bg">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="page-section-heading text-n-ink">How we operate</h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            {aboutValues.map((v, i) => {
              const numColor = ["text-n-orange", "text-n-purple", "text-amber-600", "text-n-orange-dark"][i] ?? "text-n-orange";
              return (
                <AnimatedSection key={v.title} delay={i * 0.1}>
                  <div className="flex flex-col gap-4 bg-white rounded-2xl border border-n-border p-7 hover:shadow-md transition-shadow duration-200 h-full">
                    <div className="flex items-center gap-6">
                      <span
                        className={`font-display font-bold leading-none select-none flex-shrink-0 ${numColor}`}
                        style={{ fontSize: "clamp(3rem, 7vw, 4.5rem)" }}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <h3 className="font-display font-bold text-n-ink text-xl md:text-2xl leading-tight">
                        {v.title}
                      </h3>
                    </div>
                    <p className="font-body text-n-muted leading-relaxed text-base">
                      {v.desc}
                    </p>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
