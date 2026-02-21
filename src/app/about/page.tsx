import type { Metadata } from "next";
import Image from "next/image";
import AnimatedSection from "@/components/AnimatedSection";
import { MailIcon } from "@/components/Icons";
import { aboutValues, aboutTimeline, teamMembers, branches } from "@/data";

export const metadata: Metadata = {
  title: "About | Volta NYC",
  description:
    "Volta NYC is a registered 501(c)(3) nonprofit run by students at Stuyvesant High School and CUNY institutions. Learn about our history, values, and the team behind the work.",
  openGraph: {
    title: "About Volta NYC",
    description: "A student-run nonprofit built on the belief that digital equity is economic equity.",
  },
};

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
              Our members build websites, grow social media audiences, and win grants for
              businesses across the city. They develop professional skills, earn meaningful
              portfolio work, and contribute directly to the communities around them.
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
            <p className="font-body text-white/60 text-lg leading-relaxed mt-8 max-w-2xl">
              Most small business owners know what they need. What they lack is the
              time, bandwidth, and connections to make it happen. We help them see
              what&apos;s possible — and then we make it happen.
            </p>
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
            {aboutValues.map((v, i) => (
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
          <div>
            {aboutTimeline.map((t, i) => (
              <AnimatedSection key={t.label} delay={i * 0.12}>
                <div className="flex gap-10">
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className="w-16 h-16 rounded-full bg-white border-2 border-v-green flex flex-col items-center justify-center shadow-sm">
                      <span className="font-display font-bold text-v-green text-xs leading-tight">{t.month}</span>
                      <span className="font-display font-bold text-v-green text-xs leading-tight">{t.year}</span>
                    </div>
                    {i < aboutTimeline.length - 1 && (
                      <div className="w-0.5 bg-v-border flex-1 min-h-8" />
                    )}
                  </div>
                  <div className={`flex-1 pt-3${i < aboutTimeline.length - 1 ? " pb-14" : ""}`}>
                    <h3 className="font-display font-bold text-v-ink text-xl mb-2">{t.label}</h3>
                    <p className="font-body text-v-muted text-base leading-relaxed">{t.desc}</p>
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
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">Leadership</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Who runs Volta NYC</h2>
            <p className="font-body text-v-muted mt-3 max-w-lg">
              A team of students from Stuyvesant High School, CUNY institutions, and other NYC schools.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {teamMembers.map((m, i) => (
              <AnimatedSection key={m.email} delay={i * 0.08}>
                <div className="bg-white border border-v-border rounded-2xl overflow-hidden project-card h-full flex flex-col">
                  <div className="aspect-[3/4] bg-v-border flex items-center justify-center overflow-hidden">
                    {m.photo ? (
                      <Image src={m.photo} alt={m.name} width={400} height={533} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="font-display font-bold text-v-muted/40 text-6xl">{m.initial}</span>
                    )}
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-display font-bold text-v-ink text-lg leading-tight">{m.name}</h3>
                    <p className="font-body text-sm text-v-muted mt-1">{m.role}</p>
                    {m.desc && <p className="font-body text-sm text-v-muted/60 italic mt-3 leading-relaxed flex-1">{m.desc}</p>}
                    <a href={`mailto:${m.email}`} className="flex items-center gap-2 mt-4 font-body text-sm text-v-blue hover:underline break-all">
                      <MailIcon className="w-4 h-4 flex-shrink-0" />{m.email}
                    </a>
                  </div>
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
