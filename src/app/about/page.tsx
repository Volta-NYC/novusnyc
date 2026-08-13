import type { Metadata } from "next";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import CoreValuesEarth from "@/components/CoreValuesEarth";
import HistoryTimeline from "@/components/HistoryTimeline";
import LeadershipProfiles from "@/components/LeadershipProfiles";
import PageHeroContent from "@/components/PageHeroContent";
import ParallaxHero from "@/components/ParallaxHero";
import SectionProgressNav from "@/components/SectionProgressNav";
import { aboutTimeline, aboutValues, teamMembers } from "@/data";
import { formatCounter } from "@/lib/formatCounter";
import { getMemberEducationSnapshot } from "@/lib/server/memberEducation";
import { getPublicLiveStats } from "@/lib/server/publicShowcase";
import { getPublicStatOverrides, publicStat } from "@/lib/server/publicStats";
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
  const [liveStats, overrides] = await Promise.all([getPublicLiveStats(), getPublicStatOverrides()]);

  return (
    <>
      <SectionProgressNav sections={[
        { id: "mission", label: "Mission" },
        { id: "impact", label: "Impact" },
        { id: "leadership", label: "Leadership" },
        { id: "history", label: "History" },
        { id: "values", label: "Core values" },
      ]} />
      {/* ── HERO ─────────────────────────────────────────────── */}
      <ParallaxHero
        image={brooklynBridgePhoto}
        alt="Brooklyn Bridge spanning the East River in New York City"
        className="relative flex min-h-[100svh] items-center overflow-hidden pt-32 pb-20"
        imageClassName="object-cover object-[58%_center] md:object-center"
        parallaxRange={[0, 290]}
      >
        <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8">
          <PageHeroContent
            eyebrow="About Novus"
            title={<>Students doing work that <span className="text-n-purple">matters.</span></>}
            description="Novus connects high school and college students with real projects for NYC small businesses. Businesses get useful support; students build experience they can show."
            primaryAction={{ href: "/showcase", label: "See our work" }}
            secondaryAction={{ href: "#leadership", label: "Meet the team" }}
            highlights={["Student-run", "Real client projects", "Built for NYC"]}
            accent="purple"
          />
        </div>
      </ParallaxHero>

      {/* ── MISSION ─────────────────────────────────────────── */}
      <section id="mission" className="public-surface public-surface-lavender py-16 bg-n-bg">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <AnimatedSection>
            <div className="grid gap-7 md:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] md:items-end md:gap-14 lg:gap-20">
              <div className="max-w-4xl">
                <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-4">Our mission</p>
                <h2 className="font-display font-bold text-n-ink leading-tight" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)" }}>
                  “To close the digital and financial equity gap for small businesses by connecting them with the next generation of tech, finance, and marketing talent.”
                </h2>
              </div>
              <p className="max-w-xl font-body text-base leading-relaxed text-n-muted md:pb-1">
                Students build websites, marketing materials, grant applications, and operational tools that neighborhood businesses can put to use. Along the way, they gain practical client experience and learn to take responsibility for work they can explain with confidence. Novus means “new”: a new resource for businesses and a first opportunity for students to contribute work that matters to a client.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-12 items-center pb-5 sm:mt-14 md:mt-16 md:pb-8">
              <figure className="relative z-10 col-[1/span_10] row-start-1 w-full -rotate-[3deg] rounded-[1.15rem] bg-white ring-4 ring-white outline outline-1 outline-offset-4 outline-n-border/70 shadow-[0_24px_65px_rgba(42,35,43,0.18)] sm:col-[1/span_9] md:col-[1/span_7] md:max-w-[36rem] md:-rotate-[4deg]">
                <Image
                  src="/novus1.jpg"
                  alt="Two Novus students with a local restaurant owner"
                  width={640}
                  height={800}
                  sizes="(max-width: 767px) 78vw, 43vw"
                  className="aspect-[4/5] w-full rounded-[1.15rem] object-cover"
                />
              </figure>

              <figure className="relative z-20 col-[2/span_11] row-start-2 -mt-12 w-full rotate-[2.5deg] rounded-[1.15rem] bg-white ring-4 ring-white outline outline-1 outline-offset-4 outline-n-border/70 shadow-[0_28px_70px_rgba(42,35,43,0.22)] sm:col-[3/span_10] sm:-mt-20 md:col-[6/span_7] md:row-start-1 md:mt-20 md:max-w-[44rem] md:rotate-[3deg]">
                <Image
                  src="/novus2.jpeg"
                  alt="Three Novus students with a community partner at a neighborhood event"
                  width={1280}
                  height={853}
                  sizes="(max-width: 767px) 86vw, 55vw"
                  className="aspect-[3/2] w-full rounded-[1.15rem] object-cover"
                />
              </figure>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── IMPACT NUMBERS ───────────────────────────────────── */}
      <section id="impact" className="public-surface public-surface-grid py-14 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <h2 className="page-section-heading text-n-ink mb-10">Our impact</h2>
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-n-border bg-n-border md:grid-cols-4 md:gap-0 md:divide-x md:divide-n-border">
              {[
                { value: publicStat(overrides, "aboutBusinesses", "150+"), label: "Total\nbusinesses", color: "text-n-orange-ink" },
                { value: publicStat(overrides, "aboutWebsiteProjects", formatCounter(liveStats.websiteProjects)), label: "Website\nprojects", color: "text-n-purple-ink" },
                { value: publicStat(overrides, "aboutMarketingProjects", formatCounter(liveStats.marketingProjects)), label: "Marketing\nprojects", color: "text-amber-700" },
                { value: publicStat(overrides, "aboutCommunityPartners", formatCounter(liveStats.bidPartners, true)), label: "Community\norganizations", color: "text-amber-700" },
              ].map((s, i) => (
                <AnimatedSection key={s.label} delay={i * 0.06} className="flex min-h-28 flex-col justify-center bg-white px-3 py-5 text-center sm:px-5 sm:py-7 md:min-h-0 md:px-6 md:py-8">
                  <div><p className={`mb-2 font-display text-3xl font-bold leading-none sm:text-4xl md:mb-3 md:text-5xl ${s.color}`}>{s.value}</p><p className="whitespace-pre-line font-body text-[10px] uppercase leading-relaxed tracking-[0.12em] text-n-muted">{s.label}</p></div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── LEADERSHIP ─────────────────────────────────────── */}
      <section id="leadership" className="public-surface public-surface-peach py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h2 className="page-section-heading text-n-ink">Our leadership</h2>
                <p className="font-body text-n-muted mt-3 max-w-2xl leading-relaxed">Students from high schools and colleges who lead teams, build projects, and keep the organization moving.</p>
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
          <AnimatedSection><LeadershipProfiles members={teamMembers} /></AnimatedSection>
        </div>
      </section>

      {/* ── HISTORY ─────────────────────────────────────────── */}
      <section id="history" className="timeline-parallax relative isolate overflow-hidden py-16">
        <div className="relative z-10 max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="timeline-heading mb-10">
            <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-4">Our history</p>
            <h2 className="page-section-heading text-n-ink">Building Novus, one step at a time</h2>
            <p className="font-body text-n-muted mt-3 max-w-2xl leading-relaxed">
              A timeline for the moments, partnerships, and people that shaped our work.
            </p>
          </AnimatedSection>
          <HistoryTimeline milestones={aboutTimeline} />
        </div>
      </section>

      {/* ── CORE VALUES ────────────────────────────────────── */}
      <section id="values" className="public-surface public-surface-sand py-16 bg-n-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="page-section-heading text-n-ink">Our core values</h2>
            <p className="mt-3 max-w-xl font-body leading-relaxed text-n-muted">The standards we use to decide what to take on and how to do the work.</p>
          </AnimatedSection>

          <AnimatedSection>
            <CoreValuesEarth values={aboutValues} />
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
