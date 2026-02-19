import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import ApplicationForm from "@/components/ApplicationForm";
import { MonitorIcon, FolderIcon, AwardIcon, ArrowUpRightIcon, BuildingIcon, MentorIcon, BarChartIcon, CodeIcon, MegaphoneIcon } from "@/components/Icons";

const gains = [
  { icon: MonitorIcon, title: "Real deliverables", desc: "Deployed websites, live social media campaigns, submitted grant applications — work you can point to.", color: "text-v-blue", bg: "bg-blue-50" },
  { icon: FolderIcon, title: "A portfolio that holds up", desc: "Tell interviewers exactly what you built, for which business, and what the result was.", color: "text-v-green", bg: "bg-lime-50" },
  { icon: AwardIcon, title: "References that count", desc: "Work directly with project directors and team leads who can speak to your specific contributions.", color: "text-amber-500", bg: "bg-amber-50" },
  { icon: MentorIcon, title: "Mentorship", desc: "Get guidance from experienced team leads and project directors throughout your time at Volta.", color: "text-purple-500", bg: "bg-purple-50" },
  { icon: ArrowUpRightIcon, title: "Fast path to leadership", desc: "Strong contributors move into team lead and pod manager roles quickly — we always need more of them.", color: "text-v-blue", bg: "bg-blue-50" },
  { icon: BuildingIcon, title: "Real community impact", desc: "The businesses you help are real — family-owned restaurants, flower shops, tutoring centers across NYC.", color: "text-v-green", bg: "bg-lime-50" },
];

const tracks = [
  {
    icon: BarChartIcon,
    name: "Finance & Operations",
    color: "border-amber-300 bg-amber-50",
    tagColor: "bg-amber-100 text-amber-800",
    iconColor: "text-amber-500",
    iconBg: "bg-amber-100",
    skills: ["Comfort reading financial and tax documents", "Grant writing or research experience (preferred, not required)", "Interest in finance, accounting, or nonprofit work"],
    doWhat: ["Research and write grant applications for small businesses", "Analyze sales data and POS systems", "Help businesses reduce transaction fees and optimize operations", "Support nonprofit financial filings and documentation"],
  },
  {
    icon: CodeIcon,
    name: "Digital & Tech",
    color: "border-blue-300 bg-blue-50",
    tagColor: "bg-blue-100 text-blue-800",
    iconColor: "text-v-blue",
    iconBg: "bg-blue-100",
    skills: ["React.js and/or TypeScript experience", "Familiarity with GitHub", "Interest in full-stack or frontend development"],
    doWhat: ["Build and launch websites for client businesses", "Set up and optimize Google Maps and Yelp listings", "Implement SEO improvements and web accessibility", "Deploy and manage code in a shared GitHub repo"],
  },
  {
    icon: MegaphoneIcon,
    name: "Marketing & Strategy",
    color: "border-lime-300 bg-lime-50",
    tagColor: "bg-lime-100 text-lime-800",
    iconColor: "text-v-green",
    iconBg: "bg-lime-100",
    skills: ["Social media or content creation experience", "Design skills (Canva, Adobe, Figma)", "Strong writing and communication"],
    doWhat: ["Manage Instagram accounts for real businesses", "Develop content strategies and posting calendars", "Film and edit founder interview content", "Run analytics and audience growth campaigns"],
  },
];

const faqs = [
  { q: "Is this paid?", a: "No — Volta is a nonprofit and all positions are volunteer. You gain experience, portfolio work, mentorship, references, and leadership opportunities." },
  { q: "Do I need prior experience?", a: "It depends on the track. Tech requires some coding experience. Finance and marketing are more open to students still developing their skills." },
  { q: "Is it remote?", a: "Yes. All work is remote-friendly. Some NYC members may choose to do in-person client visits, but it's not required." },
  { q: "How much time does it take?", a: "2–4 hours per week, depending on the project phase. Some weeks are lighter, some are heavier around deliverable deadlines." },
  { q: "How long is a project?", a: "Projects are ongoing and vary in scope. There's no fixed contract or semester commitment. You work on a project until it's delivered." },
  { q: "Can college students apply?", a: "Yes. We actively recruit from CUNY schools and other NYC colleges. College students often move into team lead roles." },
];

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
            <p className="font-body text-v-muted text-lg max-w-2xl leading-relaxed">
              Volta places student teams on real consulting projects for NYC small businesses.
              You get mentorship, experience, and a portfolio. High school and college students both welcome.
            </p>
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
            {gains.map((g, i) => (
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

      {/* Three tracks */}
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
            {tracks.map((t, i) => (
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

      {/* Commitment stats */}
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
            {faqs.map((f, i) => (
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

      {/* Application form */}
      <section className="py-20 bg-v-bg border-t border-v-border" id="apply">
        <div className="max-w-2xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10 text-center">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">Apply now</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-3">
              Ready to join?
            </h2>
            <p className="font-body text-v-muted">
              Takes about 5 minutes. Rolling admissions — we&apos;ll follow up within a few days.
            </p>
          </AnimatedSection>
          <AnimatedSection>
            <ApplicationForm />
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
