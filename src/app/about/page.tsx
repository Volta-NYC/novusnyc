import type { Metadata } from "next";
import Link from "next/link";
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
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-4">Our mission</p>
                <h2 className="font-display font-bold text-n-ink leading-tight mb-6" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)" }}>
                  “To close the digital and financial equity gap for small businesses by connecting them with the next generation of tech, finance, and marketing talent.”
                </h2>
                <p className="font-body text-n-muted text-base leading-relaxed">
                  Students build websites, marketing materials, grant applications, and operational tools. Businesses receive work they can use, and students gain experience they can explain with confidence.
                </p>
                <p className="mt-4 font-body text-n-muted text-base leading-relaxed">
                  Novus means new. It reflects a new resource for neighborhood businesses and a first chance for students to do real client work. For businesses, that can mean a clearer website, better marketing materials, or support with a grant application. For students, it means taking responsibility for work that matters to a real client.
                </p>
                <p className="mt-5 font-body text-sm leading-relaxed text-n-muted">
                  See that model in practice in our{" "}
                  <Link href="/showcase" className="font-semibold text-violet-700 hover:underline">
                    NYC project portfolio
                  </Link>, or learn how students can{" "}
                  <Link href="/join" className="font-semibold text-violet-700 hover:underline">
                    join the Novus team
                  </Link>.
                </p>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="grid w-full max-w-md grid-cols-2 gap-3">
                  <Image src="/novus1.jpg" alt="Novus students working together" width={640} height={800} className="h-full min-h-64 w-full rounded-2xl border border-n-border object-cover shadow-lg" />
                  <Image src="/novus2.jpeg" alt="Four Novus students and a community partner at a community event" width={1280} height={853} className="mt-10 h-auto w-full self-start rounded-2xl border border-n-border shadow-lg" />
                </div>
              </div>
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
