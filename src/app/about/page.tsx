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

const team = [
  { name: "Ethan Zhang", role: "Director", email: "ethan@voltanpo.org", initial: "E" },
  { name: "Andrew Chin", role: "Director", email: "andrew@voltanpo.org", initial: "A" },
  { name: "Joseph Long", role: "Assistant Director", email: "joseph.long.nyc@gmail.com", initial: "J" },
  { name: "Tahmid Islam", role: "Tech Lead", email: "islamtahmidd@gmail.com", initial: "T" },
];

const branches = [
  { city: "Jacksonville", state: "FL" },
  { city: "Bay Area", state: "CA" },
  { city: "Atlanta", state: "GA" },
  { city: "Virginia", state: "VA" },
  { city: "Dallas", state: "TX" },
  { city: "New York City", state: "NY" },
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
              &ldquo;To close the digital and financial equity gap for small businesses
              by connecting them with the next generation of tech, finance, and marketing talent.&rdquo;
            </blockquote>
          </AnimatedSection>
          <AnimatedSection className="mt-14">
            <div className="relative rounded-2xl overflow-hidden bg-white/5 border border-white/10 h-64 flex items-center justify-center">
              <div className="text-center">
                <Image src="/logo.png" alt="Volta" width={60} height={60} className="object-contain mx-auto mb-4" />
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

      {/* Timeline */}
      <section className="py-20 bg-white border-y border-v-border">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">How we got here</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Our history</h2>
          </AnimatedSection>
          <div className="relative">
            {/* Single continuous line from first circle center to last circle center */}
            <div className="absolute left-[31px] top-8 w-0.5 bg-v-border" style={{ height: "calc(100% - 4rem)" }} />
            {timeline.map((t, i) => (
              <AnimatedSection key={t.label} delay={i * 0.1}>
                <div className="flex gap-8 pb-14 last:pb-0">
                  {/* Circle */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-full bg-white border-2 border-v-green flex flex-col items-center justify-center z-10 shadow-sm relative">
                    <span className="font-display font-bold text-v-green text-xs leading-tight">{t.month}</span>
                    <span className="font-display font-bold text-v-green text-xs leading-tight">{t.year}</span>
                  </div>
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

      {/* Team */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">The team</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Who runs Volta NYC</h2>
            <p className="font-body text-v-muted mt-3 max-w-lg">
              A team of students from Stuyvesant High School, CUNY institutions, and other NYC schools.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {team.map((m, i) => (
              <AnimatedSection key={m.email} delay={i * 0.08}>
                <div className="bg-white border border-v-border rounded-2xl p-7 project-card h-full">
                  <div className="w-12 h-12 rounded-full bg-v-green/20 flex items-center justify-center mb-4">
                    <span className="font-display font-bold text-v-green text-lg">{m.initial}</span>
                  </div>
                  <h3 className="font-display font-bold text-v-ink text-lg">{m.name}</h3>
                  <p className="font-body text-sm text-v-muted mt-1">{m.role}</p>
                  <a href={`mailto:${m.email}`} className="flex items-center gap-2 mt-4 font-body text-sm text-v-blue hover:underline break-all">
                    <MailIcon className="w-4 h-4 flex-shrink-0" />{m.email}
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* National reach */}
      <section className="py-20 bg-v-dark">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10 text-center">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">National reach</p>
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl mb-4">
              Volta operates across the country.
            </h2>
            <p className="font-body text-white/50 max-w-2xl mx-auto mb-10">
              Our Florida branch has partnered with 30+ businesses including OPA Behavioral Health,
              Persis Indian Grill, Sun City Sustenance, and 30+ food trucks and local stores.
              Volta now has operations across six cities.
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {branches.map((b, i) => (
              <AnimatedSection key={b.city} delay={i * 0.07}>
                <div className={`rounded-xl border p-4 text-center ${b.state === "NY" ? "border-v-green/50 bg-v-green/10" : "border-white/10 bg-white/5"}`}>
                  <p className="font-display font-bold text-white text-base leading-tight">{b.city}</p>
                  <p className="font-body text-xs text-white/40 mt-1">{b.state}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
