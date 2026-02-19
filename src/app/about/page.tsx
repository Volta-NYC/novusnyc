import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import { MailIcon } from "@/components/Icons";

const values = [
  { title: "Equity first", desc: "We focus on neighborhoods and businesses that don't have easy access to consultants or agencies." },
  { title: "Students lead", desc: "High school and college students run every project. We learn by doing." },
  { title: "Community-rooted", desc: "We work through local BIDs and community organizations because trust in a neighborhood takes time to build." },
  { title: "Transparent", desc: "Our members gain real experience and portfolio work. Businesses get the labor. We're upfront about that exchange." },
];

const timeline = [
  { month: "Apr", year: "2025", label: "Florida branch founded", desc: "Volta begins working with local businesses, food trucks, and nonprofits in the Jacksonville area." },
  { month: "Nov", year: "2025", label: "NYC branch launched", desc: "Volta NYC is established, beginning outreach to Business Improvement Districts across Brooklyn and Queens." },
  { month: "Dec", year: "2025", label: "First NYC projects", desc: "First website and social media projects kick off — Souk Al Shater, Higher Learning, and Anatolico." },
  { month: "Spring", year: "2026", label: "Spring Cohort — NYC", desc: "Cohort expands to 80+ students across 9 NYC neighborhoods, with active projects in Park Slope, Sunnyside, Chinatown, and Long Island City." },
];

const directors = [
  { name: "Ethan Zhang", role: "Director", email: "ethan@voltanpo.org", school: "Stuyvesant High School" },
  { name: "Andrew Chin", role: "Director", email: "andrew@voltanpo.org", school: "Stuyvesant High School" },
];

export default function About() {
  return (
    <>
      <section className="bg-v-bg pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-v-green/8 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row gap-16 items-start">
          <div className="flex-1">
            <AnimatedSection>
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">About Volta</p>
              <h1 className="font-display font-bold text-v-ink leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
                Students who<br /><span className="text-v-green">give back</span><br />by doing real work.
              </h1>
            </AnimatedSection>
          </div>
          <AnimatedSection direction="right" className="flex-1 pt-4 md:pt-16">
            <p className="font-body text-v-ink text-lg leading-relaxed mb-5">
              Volta is a nonprofit run entirely by high school and college students.
              We believe that digital equity is economic equity — and that the family-owned
              restaurants, flower shops, and community businesses that define NYC&apos;s
              neighborhoods deserve the same digital tools and funding access as larger businesses.
            </p>
            <p className="font-body text-v-muted text-base leading-relaxed">
              Our members build actual websites, run actual social media accounts, and submit
              actual grant applications for businesses that need them. They practice real skills,
              build real portfolios, and create something that matters in the process.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-20 bg-v-dark">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-6">Our mission</p>
            <blockquote className="font-display font-bold text-white leading-tight" style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)" }}>
              &ldquo;To close the digital and financial equity gap for NYC&apos;s small businesses
              by connecting them with the next generation of tech, finance, and marketing talent.&rdquo;
            </blockquote>
          </AnimatedSection>
          <AnimatedSection className="mt-14">
            <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 h-64 flex items-center justify-center">
              <div className="text-center">
                <Image src="/logo.png" alt="Volta" width={60} height={60} className="object-contain mx-auto mb-4 brightness-200" />
                <p className="font-body text-white/30 text-sm">Team photo coming soon</p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">What drives us</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">How we operate</h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5">
            {values.map((v, i) => (
              <AnimatedSection key={v.title} delay={i * 0.1}>
                <div className="bg-white border border-v-border rounded-2xl p-8 project-card">
                  <h3 className="font-display font-bold text-v-ink text-xl mb-3 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-v-green flex-shrink-0" />
                    {v.title}
                  </h3>
                  <p className="font-body text-v-muted leading-relaxed">{v.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline — fixed circles and line */}
      <section className="py-20 bg-white border-y border-v-border">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">How we got here</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Our history</h2>
          </AnimatedSection>
          <div className="space-y-0">
            {timeline.map((t, i) => (
              <AnimatedSection key={t.label} delay={i * 0.1}>
                <div className="flex gap-8 pb-12 relative">
                  {/* Vertical line — starts below the circle, not through it */}
                  {i < timeline.length - 1 && (
                    <div className="absolute left-[31px] top-[72px] bottom-0 w-px bg-v-border" />
                  )}
                  {/* Circle — bigger to fit two-line text */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-v-green/15 border-2 border-v-green flex flex-col items-center justify-center z-10">
                    <span className="font-display font-bold text-v-green text-xs leading-none">{t.month}</span>
                    <span className="font-display font-bold text-v-green text-xs leading-none">{t.year}</span>
                  </div>
                  {/* Content */}
                  <div className="pt-3">
                    <h3 className="font-display font-bold text-v-ink text-lg mb-1">{t.label}</h3>
                    <p className="font-body text-v-muted text-sm leading-relaxed">{t.desc}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">The team</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Who runs Volta NYC</h2>
            <p className="font-body text-v-muted mt-3 max-w-lg">
              A team of students from Stuyvesant High School, CUNY institutions, and other NYC schools.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 gap-5 max-w-2xl">
            {directors.map((d, i) => (
              <AnimatedSection key={d.email} delay={i * 0.1}>
                <div className="bg-white border border-v-border rounded-2xl p-7 project-card">
                  <div className="w-12 h-12 rounded-full bg-v-green/20 flex items-center justify-center mb-4">
                    <span className="font-display font-bold text-v-green text-lg">{d.name[0]}</span>
                  </div>
                  <h3 className="font-display font-bold text-v-ink text-lg">{d.name}</h3>
                  <p className="font-body text-sm text-v-muted mt-1">{d.role}</p>
                  <p className="font-body text-xs text-v-muted/60 mt-0.5">{d.school}</p>
                  <a href={`mailto:${d.email}`} className="flex items-center gap-2 mt-4 font-body text-sm text-v-blue hover:underline">
                    <MailIcon className="w-4 h-4" />{d.email}
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 bg-v-dark text-center">
        <div className="max-w-2xl mx-auto px-5">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">National reach</p>
            <h2 className="font-display font-bold text-white text-2xl md:text-3xl mb-4">
              Our Florida branch has served 30+ businesses.
            </h2>
            <p className="font-body text-white/50">
              Including OPA Behavioral Health, Persis Indian Grill, Sun City Sustenance,
              and 30+ food trucks and local stores. NYC is our second branch.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
