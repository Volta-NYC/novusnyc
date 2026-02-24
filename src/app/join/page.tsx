import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import { joinGains, joinTracks, joinFaqs } from "@/data";

export const metadata: Metadata = {
  title: "Get Involved | Volta NYC",
  description:
    "High school and college students: join Volta NYC and work on real consulting projects for NYC small businesses. Build a portfolio, earn mentorship, and lead real teams.",
  openGraph: {
    title: "Get Involved | Volta NYC",
    description: "Real projects. Real clients. Mentorship from day one.",
  },
};

export default function Join() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is Volta NYC a good extracurricular for high school students?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Volta NYC places high school students on real consulting projects for NYC small businesses, giving you a tangible portfolio piece, mentorship, and leadership experience — all of which stand out on college applications.",
        },
      },
      {
        "@type": "Question",
        name: "Is this paid?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No — Volta is a nonprofit and all positions are volunteer. You gain experience, portfolio work, mentorship, references, and leadership opportunities.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need prior experience to join Volta NYC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It depends on the track. The Digital & Tech track requires some coding experience. Finance and Marketing are more open to students still developing their skills.",
        },
      },
      {
        "@type": "Question",
        name: "Can high school students join Volta NYC?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. Volta NYC was founded by high school students and actively recruits from NYC high schools. College students are also welcome and often move into team lead roles.",
        },
      },
      {
        "@type": "Question",
        name: "Is the work remote?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes. All work is remote-friendly. Some NYC members may choose to do in-person client visits, but it is not required.",
        },
      },
      {
        "@type": "Question",
        name: "How much time does Volta NYC take each week?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "2–4 hours per week, depending on the project phase. Some weeks are lighter, some are heavier around deliverable deadlines.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-v-ink pt-32 pb-24 relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-5 md:px-8 grid md:grid-cols-2 gap-12 items-center">
          <AnimatedSection direction="left">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
              Join Volta NYC
            </p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Real clients.<br />
              <span className="text-v-green">Real work.</span>
            </h1>
            <p className="font-body text-white/70 text-lg leading-relaxed mb-8">
              Volta places student teams on real consulting projects for NYC small
              businesses. You work with an actual client, deliver something they depend
              on, and walk away with a portfolio piece you can point to anywhere.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/apply"
                className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-colors"
              >
                Apply Now →
              </Link>
              <span className="font-body text-sm text-white/40">
                Spring 2026 · Rolling admissions
              </span>
            </div>
          </AnimatedSection>
          <AnimatedSection direction="right">
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "80+", label: "Student members" },
                { value: "20+", label: "Businesses served" },
                { value: "9", label: "NYC neighborhoods" },
                { value: "3", label: "Service tracks" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center"
                >
                  <p className="font-display font-bold text-v-green text-4xl leading-none mb-2">
                    {s.value}
                  </p>
                  <p className="font-body text-xs text-white/40 uppercase tracking-widest">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── WHAT YOU WALK AWAY WITH ──────────────────────────── */}
      <section className="py-20 bg-v-bg border-b border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              This is unpaid. Here&apos;s what you get instead.
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              What you walk away with
            </h2>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {joinGains.map((g, i) => (
              <AnimatedSection key={g.title} delay={i * 0.07}>
                <div className="bg-white border border-v-border rounded-2xl p-6 h-full hover:border-v-green/40 transition-colors project-card">
                  <div className={`w-11 h-11 rounded-xl ${g.bg} flex items-center justify-center mb-4`}>
                    <g.icon className={`w-5 h-5 ${g.color}`} />
                  </div>
                  <h3 className="font-display font-bold text-v-ink text-base mb-2">{g.title}</h3>
                  <p className="font-body text-v-muted text-sm leading-relaxed">{g.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACKS ───────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              Pick your path
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Three tracks</h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              You&apos;ll work with a team lead throughout. Many members contribute across tracks over time.
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
                        <span className="text-v-green mt-0.5 flex-shrink-0">→</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                  <h3 className="font-display font-bold text-v-ink text-sm mb-3 uppercase tracking-wide">
                    We look for
                  </h3>
                  <ul className="space-y-2">
                    {t.skills.map((s) => (
                      <li key={s} className="font-body text-xs text-v-muted flex items-start gap-2">
                        <span className="text-v-muted/50 mt-0.5 flex-shrink-0">·</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPECTATIONS ─────────────────────────────────────── */}
      <section className="py-20 bg-v-bg border-y border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              Before you apply
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              What we expect
            </h2>
          </AnimatedSection>
          <div className="grid md:grid-cols-2 gap-8">
            <AnimatedSection direction="left">
              <div className="space-y-6">
                {[
                  {
                    title: "Show up for your client",
                    desc: "You're working with a real business owner who is counting on your team. Missed deadlines have real consequences for them.",
                  },
                  {
                    title: "Communicate when things come up",
                    desc: "Life happens. If you're swamped with exams or can't meet a deadline, tell your team lead early — don't go quiet.",
                  },
                  {
                    title: "Put in the work, not just the hours",
                    desc: "2–4 hours a week is a rough guide. What matters is whether the deliverable is done and done well.",
                  },
                  {
                    title: "Be open to feedback",
                    desc: "You'll get notes from team leads and directors. Taking that feedback seriously is how you move up.",
                  },
                ].map((item, i) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-v-green flex items-center justify-center mt-0.5">
                      <span className="font-display font-bold text-v-ink text-xs">{i + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-v-ink mb-1">{item.title}</h3>
                      <p className="font-body text-sm text-v-muted leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </AnimatedSection>
            <AnimatedSection direction="right">
              <div className="bg-white border border-v-border rounded-2xl p-8 h-full">
                <h3 className="font-display font-bold text-v-ink text-lg mb-6">Logistics at a glance</h3>
                <div className="space-y-1">
                  {[
                    { label: "Time commitment", value: "2–4 hrs / week", note: "Varies by project phase" },
                    { label: "Location", value: "Remote-first", note: "Optional in-person visits for NYC members" },
                    { label: "Team size", value: "3–5 students", note: "Small, focused pods per project" },
                    { label: "Structure", value: "Project-based", note: "No fixed semester or contract" },
                    { label: "Admissions", value: "Rolling", note: "We review applications year-round" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between items-start gap-4 py-4 border-b border-v-border last:border-0"
                    >
                      <p className="font-body text-xs text-v-muted uppercase tracking-wide">{item.label}</p>
                      <div className="text-right">
                        <p className="font-display font-bold text-v-ink text-sm">{item.value}</p>
                        <p className="font-body text-xs text-v-muted">{item.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl">Questions</h2>
          </AnimatedSection>
          <div className="space-y-4">
            {joinFaqs.map((f, i) => (
              <AnimatedSection key={f.q} delay={i * 0.06}>
                <div className="bg-v-bg border border-v-border rounded-xl p-6">
                  <h3 className="font-display font-bold text-v-ink mb-2">{f.q}</h3>
                  <p className="font-body text-sm text-v-muted leading-relaxed">{f.a}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ────────────────────────────────────────── */}
      <section className="py-20 bg-v-green">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <AnimatedSection>
            <h2 className="font-display font-bold text-v-ink text-4xl md:text-5xl mb-5">
              Ready to apply?
            </h2>
            <p className="font-body text-v-ink/70 text-lg mb-8">
              Answer two short prompts and optionally share your resume. We&apos;ll
              reach out to schedule a conversation and match you with a project.
            </p>
            <Link
              href="/apply"
              className="inline-block bg-v-ink text-white font-display font-bold text-lg px-10 py-5 rounded-full hover:bg-v-ink/80 transition-colors"
            >
              Apply Now →
            </Link>
            <p className="font-body text-sm text-v-ink/50 mt-5">
              Takes 5 minutes · Rolling admissions
            </p>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
