import type { Metadata } from "next";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import { MailIcon } from "@/components/Icons";
import { aboutValues, aboutTimeline, teamMembers } from "@/data";
import { getMemberEducationSnapshot } from "@/lib/server/memberEducation";
import { getPublicLiveStats } from "@/lib/server/publicShowcase";
import brooklynBridgePhoto from "../../../public/brooklyn-bridge.jpg";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "About Us | Volta NYC",
  description:
    "Volta NYC is a registered 501(c)(3) nonprofit run by students from Stuyvesant High School, Baruch College, Cornell University, Stony Brook University, and other schools. Learn about our history, values, and the team behind the work.",
  openGraph: {
    title: "About Volta NYC",
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
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">About Volta</p>
              <h1 className="font-display font-bold text-white leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
                Students building<br /><span className="text-v-green">real skills</span><br />through real work.
              </h1>
            </AnimatedSection>
          </div>
          <AnimatedSection direction="right" className="flex-1 pt-4 md:pt-16">
            <p className="font-body text-white/70 text-lg leading-relaxed mb-5">
              Volta is a nonprofit run entirely by high school and college students.
              We believe that digital equity is economic equity — and that the family-owned
              restaurants, flower shops, and community businesses that define NYC&apos;s
              neighborhoods deserve the same digital tools and access to grants and financial resources as larger businesses.
            </p>
            <p className="font-body text-white/50 text-base leading-relaxed">
              Our members build websites, grow social media audiences, and win grants for
              businesses across the city. They develop professional skills, earn meaningful
              portfolio work, and contribute directly to the communities around them.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── IMPACT NUMBERS ───────────────────────────────────── */}
      <section className="py-16 bg-v-dark overflow-x-auto">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-10">Our impact</h2>
            <div className="flex min-w-max md:min-w-0 md:grid md:grid-cols-6 divide-x divide-white/10 border border-white/10 rounded-2xl overflow-hidden">
              {[
                { value: liveStats.totalBusinesses, label: "Total\nbusinesses", color: "text-v-green" },
                { value: liveStats.websiteProjects, label: "Website\nprojects", color: "text-blue-400" },
                { value: liveStats.marketingProjects, label: "Marketing\nprojects", color: "text-lime-400" },
                { value: liveStats.caseStudies, label: "Case studies\nby students", color: "text-pink-400" },
                { value: liveStats.educationalReports, label: "Educational guides\nfor merchants", color: "text-amber-400" },
                { value: liveStats.bidPartners, label: "Community\norganizations", color: "text-purple-400" },
              ].map((s, i) => (
                <AnimatedSection key={s.label} delay={i * 0.06}>
                  <div className="px-5 py-7 md:px-6 md:py-8 text-center min-w-[130px] md:min-w-0">
                    <p className={`font-display font-bold text-4xl md:text-5xl leading-none mb-3 ${s.color}`}>{s.value}</p>
                    <p className="font-body text-[10px] text-white/45 uppercase tracking-widest whitespace-pre-line leading-relaxed">{s.label}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── MISSION ─────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
              <div>
                <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Our mission</p>
                <blockquote className="font-display font-bold text-v-ink leading-tight mb-6" style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.5rem)" }}>
                  &ldquo;To close the digital and financial equity gap for small businesses
                  by connecting them with the next generation of tech, finance, and marketing talent.&rdquo;
                </blockquote>
                <p className="font-body text-v-muted text-base leading-relaxed">
                  Most small business owners know what they need. What they lack is the
                  time, bandwidth, and connections to make it happen. We help them see
                  what&apos;s possible — and then we make it happen.
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

      {/* ── TEAM ────────────────────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Our Leadership</h2>
            <p className="font-body text-v-muted mt-3 max-w-2xl leading-relaxed [text-wrap:balance]">
              A team of students from high schools and colleges across NYC and across the country.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            {[
              { label: "High Schools", value: education.highSchoolCount },
              { label: "Colleges", value: education.collegeCount },
              { label: "States Represented", value: education.stateCount },
            ].map((stat, i) => (
              <AnimatedSection key={stat.label} delay={i * 0.08}>
                <div className="rounded-xl border border-v-border bg-white px-6 py-7 text-center">
                  <p className="font-display font-bold text-v-green text-4xl leading-none">{stat.value}</p>
                  <p className="font-body text-xs text-v-muted uppercase tracking-[0.16em] mt-3">{stat.label}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {teamMembers.map((m, i) => (
              <AnimatedSection key={m.email} delay={i * 0.08}>
                <div className="bg-white border border-v-border rounded-xl overflow-hidden project-card h-full flex flex-col">
                  <div className="aspect-[4/5] bg-v-border flex items-center justify-center overflow-hidden">
                    {m.photo ? (
                      <Image src={m.photo} alt={m.name} width={400} height={533} className="w-full h-full object-cover object-top" />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-v-green/15 border-2 border-v-green/25 flex items-center justify-center">
                        <span className="font-display font-bold text-v-green text-3xl">{m.initial}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="font-display font-bold text-v-ink text-base leading-tight">{m.name}</h3>
                    <p className="font-body text-xs text-v-muted mt-1">{m.role}</p>
                    {m.desc && <p className="font-body text-xs text-v-muted/60 italic mt-2 leading-relaxed flex-1">{m.desc}</p>}
                    <a href={`mailto:${m.email}`} className="flex items-center gap-2 mt-3 font-body text-xs text-v-blue hover:underline break-all">
                      <MailIcon className="w-4 h-4 flex-shrink-0" />{m.email}
                    </a>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW WE OPERATE ─────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">How we operate</h2>
          </AnimatedSection>

          <div className="border-t border-v-border">
            {aboutValues.map((v, i) => (
              <AnimatedSection key={v.title} delay={i * 0.08}>
                <div className="group border-b border-v-border py-8 md:py-10 grid grid-cols-[3.5rem_1fr] md:grid-cols-[5rem_18rem_1fr] gap-x-6 md:gap-x-12 gap-y-3 items-center transition-colors duration-200 hover:bg-v-bg/60">
                  <span className="font-display font-bold text-v-green/35 group-hover:text-v-green/55 transition-colors duration-200 leading-none select-none"
                    style={{ fontSize: "clamp(2.6rem, 5vw, 3.8rem)" }}>
                    {i + 1}
                  </span>
                  <h3 className="font-display font-bold text-v-ink text-2xl md:text-3xl leading-tight">
                    {v.title}
                  </h3>
                  <p className="font-body text-v-muted leading-relaxed text-base">
                    {v.desc}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── HISTORY / TIMELINE ─────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">How we started</h2>
          </AnimatedSection>

          {/* Mobile: vertical timeline */}
          <div className="md:hidden">
            {aboutTimeline.map((t, i) => (
              <AnimatedSection key={t.label} delay={i * 0.12}>
                <div className={`relative flex gap-6 ${i < aboutTimeline.length - 1 ? "pb-10" : ""}`}>
                  {i < aboutTimeline.length - 1 && (
                    <div className="absolute left-8 top-16 bottom-0 -translate-x-1/2 w-0.5 bg-v-border" />
                  )}
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-v-green flex flex-col items-center justify-center shadow-sm z-10 flex-shrink-0">
                    <span className="font-display font-bold text-v-green text-xs leading-tight">{t.month}</span>
                    <span className="font-display font-bold text-v-green text-xs leading-tight">{t.year}</span>
                  </div>
                  <div className="flex-1 pt-3 min-w-0">
                    <h3 className="font-display font-bold text-v-ink text-xl mb-2">{t.label}</h3>
                    <p className="font-body text-v-muted text-base leading-relaxed">{t.desc}</p>
                    {t.tentative && (
                      <p className="font-body text-xs text-v-muted/60 italic mt-1">Tentative</p>
                    )}
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>

          {/* Desktop: horizontal timeline */}
          <div className="hidden md:block">
            <div className="relative">
              {/* Connector line */}
              <div className="absolute top-10 left-0 right-0 h-0.5 bg-v-border" />
              <div className="grid grid-cols-4 gap-6">
                {aboutTimeline.map((t, i) => (
                  <AnimatedSection key={t.label} delay={i * 0.1}>
                    <div className="relative flex flex-col items-center text-center pt-0">
                      <div className="w-20 h-20 rounded-full bg-white border-2 border-v-green flex flex-col items-center justify-center shadow-sm z-10 mb-5">
                        <span className="font-display font-bold text-v-green text-xs leading-tight">{t.month}</span>
                        <span className="font-display font-bold text-v-green text-xs leading-tight">{t.year}</span>
                      </div>
                      <h3 className="font-display font-bold text-v-ink text-base mb-2">{t.label}</h3>
                      <p className="font-body text-sm text-v-muted leading-relaxed">{t.desc}</p>
                      {t.tentative && (
                        <p className="font-body text-xs text-v-muted/60 italic mt-1">Tentative</p>
                      )}
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
