import type { Metadata } from "next";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import { aboutTimeline, aboutValues, teamMembers } from "@/data";
import { formatCounter } from "@/lib/formatCounter";
import { getMemberEducationSnapshot } from "@/lib/server/memberEducation";
import { getPublicLiveStats } from "@/lib/server/publicShowcase";
import brooklynBridgePhoto from "../../../public/brooklyn-bridge.jpg";


export const metadata: Metadata = {
  title: "About Us | Novus NYC",
  description:
    "Novus NYC is a registered 501(c)(3) nonprofit run by students from Stuyvesant High School, Baruch College, Cornell University, Stony Brook University, and other schools. Learn about our history, values, and the team behind the work.",
  openGraph: {
    title: "About Novus NYC",
    description: "A student-run nonprofit built on the belief that digital equity is economic equity.",
    images: ["/api/og"],
  },
};

export default async function About() {
  const education = await getMemberEducationSnapshot();
  const liveStats = await getPublicLiveStats();

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 overflow-hidden" data-home-dark-end="true">
        <Image
          src={brooklynBridgePhoto}
          alt="Brooklyn Bridge"
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
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row gap-16 items-start">
          <div className="flex-1">
            <AnimatedSection>
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">About Novus</p>
              <h1 className="font-display font-bold text-white leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
                Students building<br /><span className="text-v-blue">real skills</span><br />through <span className="text-v-green">real work.</span>
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
      </section>

      {/* ── IMPACT NUMBERS ───────────────────────────────────── */}
      <section className="py-14 bg-white overflow-x-auto">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-10">Our impact</h2>
            <div className="flex min-w-max md:min-w-0 md:grid md:grid-cols-6 divide-x divide-v-border border border-v-border rounded-2xl overflow-hidden">
              {[
                { value: formatCounter(liveStats.totalBusinesses), label: "Total\nbusinesses", color: "text-v-green" },
                { value: formatCounter(liveStats.websiteProjects), label: "Website\nprojects", color: "text-v-blue" },
                { value: formatCounter(liveStats.marketingProjects), label: "Marketing\nprojects", color: "text-v-green-dark" },
                { value: formatCounter(liveStats.caseStudies), label: "Case studies\nby students", color: "text-v-blue-dark" },
                { value: formatCounter(liveStats.educationalReports), label: "Educational guides\nfor merchants", color: "text-amber-600" },
                { value: formatCounter(liveStats.bidPartners, true), label: "Community\norganizations", color: "text-v-ink" },
              ].map((s, i) => (
                <AnimatedSection key={s.label} delay={i * 0.06}>
                  <div className="px-5 py-7 md:px-6 md:py-8 text-center min-w-[130px] md:min-w-0">
                    <p className={`font-display font-bold text-4xl md:text-5xl leading-none mb-3 ${s.color}`}>{s.value}</p>
                    <p className="font-body text-[10px] text-v-muted uppercase tracking-widest whitespace-pre-line leading-relaxed">{s.label}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── MISSION ─────────────────────────────────────────── */}
      <section className="py-16 bg-v-bg">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Our mission</p>
                <blockquote className="font-display font-bold text-v-ink leading-tight mb-6" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)" }}>
                  &ldquo;To close the digital and financial equity gap for small businesses
                  by connecting them with the next generation of tech, finance, and marketing talent.&rdquo;
                </blockquote>
                <p className="font-body text-v-muted text-base leading-relaxed">
                  Most small business owners know what they need. What they lack is time
                  and the right connections. We help them see what is possible,
                  then we do the work.
                </p>
              </div>
              <div className="flex justify-center md:justify-end">
                <div className="rounded-2xl overflow-hidden border border-v-border shadow-xl w-full max-w-sm bg-white">
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
        </div>
      </section>

      {/* ── HISTORY ─────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Our history</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Building Novus, one chapter at a time</h2>
            <p className="font-body text-v-muted mt-3 max-w-2xl leading-relaxed">
              A timeline for the moments, partnerships, and people that shaped our work.
            </p>
          </AnimatedSection>
          <div className="relative ml-3 border-l-2 border-v-green/25 pl-8 md:ml-8 md:pl-12">
            {aboutTimeline.map((milestone, i) => (
              <AnimatedSection key={`${milestone.year}-${milestone.label}`} delay={i * 0.08}>
                <article className="relative pb-10 last:pb-0">
                  <span className={`absolute -left-[2.56rem] top-1 flex h-5 w-5 items-center justify-center rounded-full border-4 border-white md:-left-[3.56rem] ${["bg-v-green", "bg-v-blue", "bg-v-yellow", "bg-v-green-dark", "bg-v-blue-dark"][i] ?? "bg-v-green"}`} aria-hidden="true" />
                  <div className="grid gap-2 md:grid-cols-[7rem_1fr] md:gap-8">
                    <p className="font-body text-xs font-semibold uppercase tracking-widest text-v-green">
                      {milestone.month} {milestone.year}
                    </p>
                    <div>
                      <h3 className="font-display text-xl font-bold text-v-ink">{milestone.label}</h3>
                      <p className="font-body mt-2 leading-relaxed text-v-muted">{milestone.desc}</p>
                    </div>
                  </div>
                </article>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEAM ────────────────────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Our Leadership</h2>
                <p className="font-body text-v-muted mt-3 max-w-2xl leading-relaxed [text-wrap:balance]">
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
                    <p className="font-display font-bold text-v-green text-3xl leading-none">{s.value}</p>
                    <p className="font-body text-xs text-v-muted uppercase tracking-widest mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8 max-w-5xl mx-auto">
            {teamMembers.map((m, i) => (
              <AnimatedSection key={m.name} delay={i * 0.08}>
                <div className="bg-white border border-v-border rounded-xl overflow-hidden h-full flex flex-col">
                  <div className="aspect-[4/5] bg-v-border flex items-center justify-center overflow-hidden">
                    {m.photo ? (
                      <Image src={m.photo} alt={m.name} width={400} height={533} className="w-full h-full object-cover object-center" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-v-green/15 border-2 border-v-green/25 flex items-center justify-center">
                        <span className="font-display font-bold text-v-green text-xl">{m.initial}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2.5 flex flex-col flex-1">
                    <h3 className="font-display font-bold text-v-ink text-xs leading-tight">{m.name}</h3>
                    <p className="font-body text-[10px] text-v-muted mt-0.5 leading-snug">{m.role}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW WE OPERATE ─────────────────────────────────── */}
      <section className="py-16 bg-v-bg">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">How we operate</h2>
          </AnimatedSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
            {aboutValues.map((v, i) => {
              const numColor = ["text-v-green", "text-v-blue", "text-amber-600", "text-v-green-dark"][i] ?? "text-v-green";
              return (
                <AnimatedSection key={v.title} delay={i * 0.1}>
                  <div className="flex flex-col gap-4 bg-white rounded-2xl border border-v-border p-7 hover:shadow-md transition-shadow duration-200 h-full">
                    <div className="flex items-center gap-6">
                      <span
                        className={`font-display font-bold leading-none select-none flex-shrink-0 ${numColor}`}
                        style={{ fontSize: "clamp(3rem, 7vw, 4.5rem)" }}
                        aria-hidden="true"
                      >
                        {i + 1}
                      </span>
                      <h3 className="font-display font-bold text-v-ink text-xl md:text-2xl leading-tight">
                        {v.title}
                      </h3>
                    </div>
                    <p className="font-body text-v-muted leading-relaxed text-base">
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
