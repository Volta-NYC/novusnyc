import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import { joinGains, joinTracks, joinFaqs } from "@/data";

export default function Join() {
  return (
    <>
      {/* Hero */}
      <section className="bg-v-bg pt-32 pb-20 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-40" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-v-green/10 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">Join Volta</p>
            <h1 className="font-display font-bold text-v-ink leading-none tracking-tight mb-6" style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}>
              Do real work.<br /><span className="text-v-green">Build real things.</span>
            </h1>
            <p className="font-body text-v-muted text-lg max-w-2xl leading-relaxed mb-8">
              Volta places student teams on real consulting projects for NYC small businesses.
              You get mentorship, experience, and a portfolio. High school and college students both welcome.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/apply"
                className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-all hover:scale-105 shadow-lg shadow-v-green/20">
                Apply Now →
              </Link>
              <span className="font-body text-sm text-v-muted">Spring 2026 cohort · Rolling admissions</span>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* What you gain */}
      <section className="py-20 bg-v-dark">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">This is unpaid. Here&apos;s what you get instead.</p>
            <h2 className="font-display font-bold text-white text-3xl md:text-4xl">What you walk away with</h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {joinGains.map((g, i) => (
              <AnimatedSection key={g.title} delay={i * 0.07}>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-full hover:border-v-green/40 transition-colors">
                  <div className={`w-11 h-11 rounded-xl ${g.bg} flex items-center justify-center mb-4`}>
                    <g.icon className={`w-5 h-5 ${g.color}`} />
                  </div>
                  <h3 className="font-display font-bold text-white text-base mb-2">{g.title}</h3>
                  <p className="font-body text-white/50 text-sm leading-relaxed">{g.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Tracks */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">Pick your path</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Three tracks</h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              You&apos;ll have a mentor and team lead guiding you throughout. Many members contribute across tracks over time.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {joinTracks.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.1}>
                <div className={`border-2 ${t.color} rounded-2xl p-8 h-full`}>
                  <div className={`w-12 h-12 rounded-xl ${t.iconBg} flex items-center justify-center mb-5`}>
                    <t.icon className={`w-6 h-6 ${t.iconColor}`} />
                  </div>
                  <span className={`tag ${t.tagColor} mb-4 inline-block`}>{t.name}</span>
                  <h3 className="font-display font-bold text-v-ink text-lg mb-4">What you&apos;ll do</h3>
                  <ul className="space-y-2 mb-6">
                    {t.doWhat.map((d) => (
                      <li key={d} className="font-body text-sm text-v-muted flex items-start gap-2.5">
                        <span className="text-v-green mt-0.5 flex-shrink-0">→</span> {d}
                      </li>
                    ))}
                  </ul>
                  <h3 className="font-display font-bold text-v-ink text-sm mb-3 uppercase tracking-wide">We look for</h3>
                  <ul className="space-y-2">
                    {t.skills.map((s) => (
                      <li key={s} className="font-body text-xs text-v-muted flex items-start gap-2">
                        <span className="text-v-muted/50 mt-0.5 flex-shrink-0">·</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Commitment */}
      <section className="py-16 bg-white border-y border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8 grid md:grid-cols-3 gap-8 text-center">
          {[
            { label: "Time Commitment", value: "2–4 hrs/week", sub: "Varies by project phase" },
            { label: "Duration", value: "Project-based", sub: "No fixed contract or semester" },
            { label: "Team Size", value: "3–5 students", sub: "Small, focused teams per project" },
          ].map((item, i) => (
            <AnimatedSection key={item.label} delay={i * 0.1}>
              <p className="font-body text-xs uppercase tracking-widest text-v-muted mb-2">{item.label}</p>
              <p className="font-display font-bold text-v-ink text-3xl mb-1">{item.value}</p>
              <p className="font-body text-sm text-v-muted">{item.sub}</p>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl">Questions</h2>
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

      {/* Final CTA */}
      <section className="py-20 bg-v-green">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <AnimatedSection>
            <h2 className="font-display font-bold text-v-ink text-4xl md:text-5xl mb-5">Ready to apply?</h2>
            <p className="font-body text-v-ink/70 text-lg mb-8">
              Submit your resume or answer two short prompts. We&apos;ll reach out to schedule
              a quick conversation and match you with a project and mentor.
            </p>
            <Link href="/apply"
              className="inline-block bg-v-ink text-white font-display font-bold text-lg px-10 py-5 rounded-full hover:bg-v-ink/80 transition-all hover:scale-105 shadow-xl shadow-v-ink/20">
              Apply Now →
            </Link>
            <p className="font-body text-sm text-v-ink/50 mt-5">Takes 5 minutes · Rolling admissions</p>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
