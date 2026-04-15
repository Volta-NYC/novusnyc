import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import { MailIcon } from "@/components/Icons";
import { aboutValues, aboutTimeline, teamMembers } from "@/data";
import { getMemberEducationSnapshot } from "@/lib/server/memberEducation";
import { getPublicImpactStats } from "@/lib/server/publicShowcase";

export const revalidate = 3600;

const ABOUT_VALUE_BADGE_STYLES = [
  { bg: "bg-lime-100", text: "text-lime-700" }, // Brooklyn
  { bg: "bg-blue-100", text: "text-blue-700" }, // Queens
  { bg: "bg-amber-100", text: "text-amber-700" }, // Manhattan
  { bg: "bg-purple-100", text: "text-purple-700" }, // Bronx
  { bg: "bg-rose-100", text: "text-rose-700" }, // Staten Island
] as const;

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
  const impact = await getPublicImpactStats();

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-v-bg pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-v-green/8 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row gap-16 items-start">
          <div className="flex-1">
            <AnimatedSection>
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">About Volta</p>
              <h1 className="font-display font-bold text-v-ink leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
                Students building<br /><span className="text-v-green">real skills</span><br />through real work.
              </h1>
            </AnimatedSection>
          </div>
          <AnimatedSection direction="right" className="flex-1 pt-4 md:pt-16">
            <p className="font-body text-v-ink text-lg leading-relaxed mb-5">
              Volta is a nonprofit run entirely by high school and college students.
              We believe that digital equity is economic equity — and that the family-owned
              restaurants, flower shops, and community businesses that define NYC&apos;s
              neighborhoods deserve the same digital tools and access to grants and financial resources as larger businesses.
            </p>
            <p className="font-body text-v-muted text-base leading-relaxed">
              Our members build websites, grow social media audiences, and win grants for
              businesses across the city. They develop professional skills, earn meaningful
              portfolio work, and contribute directly to the communities around them.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── IMPACT NUMBERS ───────────────────────────────────── */}
      <section className="py-14 bg-v-dark">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-6 text-center">Our impact</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-5 py-6 text-center">
                <p className="font-display font-bold text-v-green text-4xl md:text-5xl leading-none mb-1">{impact.totalProjects}+</p>
                <p className="font-body text-xs text-white/60 uppercase tracking-widest mt-2">Total projects</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-5 py-6 text-center">
                <p className="font-display font-bold text-blue-400 text-4xl md:text-5xl leading-none mb-1">{impact.websiteProjects}+</p>
                <p className="font-body text-xs text-white/60 uppercase tracking-widest mt-2">Websites built</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-5 py-6 text-center">
                <p className="font-display font-bold text-lime-400 text-4xl md:text-5xl leading-none mb-1">{impact.socialMediaProjects}+</p>
                <p className="font-body text-xs text-white/60 uppercase tracking-widest mt-2">Social media campaigns</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-5 py-6 text-center">
                <p className="font-display font-bold text-amber-400 text-4xl md:text-5xl leading-none mb-1">{impact.seoProjects}+</p>
                <p className="font-body text-xs text-white/60 uppercase tracking-widest mt-2">SEO & visibility</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-5 py-6 text-center">
                <p className="font-display font-bold text-pink-400 text-4xl md:text-5xl leading-none mb-1">{impact.grantProjects}+</p>
                <p className="font-body text-xs text-white/60 uppercase tracking-widest mt-2">Grant applications</p>
              </div>
              <div className="rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-5 py-6 text-center">
                <p className="font-display font-bold text-purple-400 text-4xl md:text-5xl leading-none mb-1">{impact.financeProjects}+</p>
                <p className="font-body text-xs text-white/60 uppercase tracking-widest mt-2">Finance & operations</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── MISSION ─────────────────────────────────────────── */}
      <section className="py-20 bg-v-dark border-t border-white/5">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-6">Our mission</p>
            <blockquote className="font-display font-bold text-white leading-tight" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
              &ldquo;To close the digital and financial equity gap for small businesses
              by connecting them with the next generation of tech, finance, and marketing talent.&rdquo;
            </blockquote>
            <p className="font-body text-white/60 text-lg leading-relaxed mt-8 max-w-2xl">
              Most small business owners know what they need. What they lack is the
              time, bandwidth, and connections to make it happen. We help them see
              what&apos;s possible — and then we make it happen.
            </p>
          </AnimatedSection>
          <AnimatedSection className="mt-14 flex justify-center">
            <div className="rounded-2xl overflow-hidden border border-white/10 shadow-xl w-full max-w-sm">
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
          </AnimatedSection>
        </div>
      </section>

      {/* ── TEAM ────────────────────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">Leadership</p>
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
          <AnimatedSection>
            <Link href="/join" className="inline-block font-body text-sm font-semibold text-v-green hover:underline">
              Join our team →
            </Link>
          </AnimatedSection>
        </div>
      </section>

      {/* ── HOW WE OPERATE ─────────────────────────────────── */}
      <section className="py-20 bg-v-bg overflow-hidden">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-14">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">What drives us</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">How we operate</h2>
          </AnimatedSection>

          <div className="relative">
            <div className="hidden lg:block absolute left-[8%] right-[8%] top-8 border-t-2 border-dashed border-v-green/45" />
            <div className="relative grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-5">
              {aboutValues.map((v, i) => (
                <AnimatedSection key={v.title} delay={i * 0.1}>
                  <div className="h-full bg-white border border-v-border rounded-2xl p-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      {(() => {
                        const style = ABOUT_VALUE_BADGE_STYLES[i % ABOUT_VALUE_BADGE_STYLES.length];
                        return (
                          <span
                            className={`w-9 h-9 rounded-full ${style.bg} ${style.text} font-display font-bold text-sm flex items-center justify-center flex-shrink-0`}
                          >
                            {i + 1}
                          </span>
                        );
                      })()}
                      <h3 className="font-display font-bold text-v-ink text-xl leading-snug">
                        {v.title}
                      </h3>
                    </div>
                    <p className="font-body text-v-muted leading-relaxed text-sm md:text-base">{v.desc}</p>
                  </div>
                  {i < aboutValues.length - 1 && (
                    <div className="lg:hidden flex justify-center py-2">
                      <span className="h-6 w-0 border-l-2 border-dashed border-v-green/45" />
                    </div>
                  )}
                </AnimatedSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── HISTORY / TIMELINE ─────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">How we got here</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">How we started</h2>
          </AnimatedSection>
          <div>
            {aboutTimeline.map((t, i) => (
              <AnimatedSection key={t.label} delay={i * 0.12}>
                <div className={`relative flex gap-6 md:gap-10 ${i < aboutTimeline.length - 1 ? "pb-10 md:pb-12" : ""}`}>
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
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
