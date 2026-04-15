import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import { joinTracks, joinFaqs, joinGains } from "@/data";
import { getMemberEducationSnapshot } from "@/lib/server/memberEducation";
import { UsersIcon } from "@/components/Icons";

export const metadata: Metadata = {
  title: "Get Involved | Volta NYC",
  description:
    "Join Volta NYC to work on real projects for real businesses. All experience levels welcome. 5-minute application and rolling admissions.",
  openGraph: {
    title: "Get Involved | Volta NYC",
    description: "Real projects. Real clients. All experience levels welcome.",
    images: ["/api/og"],
  },
};

const leadershipSteps = [
  {
    role: "Analyst",
    desc: "Contribute on live projects and ship your first client-facing deliverables.",
  },
  {
    role: "Senior Analyst",
    desc: "Take ownership of workstreams and mentor newer analysts on execution quality.",
  },
  {
    role: "Associate",
    desc: "Manage core project pieces, coordinate with teammates, and keep client progress on track.",
  },
  {
    role: "Senior Associate",
    desc: "Lead larger initiatives across teams and help drive standards across active projects.",
  },
  {
    role: "Project Lead",
    desc: "Run projects end to end, lead pods, and serve as the main client-facing owner.",
  },
];

const otherRoles = [
  {
    role: "Neighborhood Liaison",
    desc: "Coordinate between project teams and neighborhood business owners, including BID tours and on-the-ground merchant outreach.",
  },
  {
    role: "School Ambassador",
    desc: "Represent Volta at your school, expand student outreach, and help build a reliable pipeline of project teams.",
  },
  {
    role: "Head of City Expansion",
    desc: "Launch Volta in a new city, build local partnerships, and set up the first student teams and operating structure.",
  },
];

export const revalidate = 3600;

export default async function Join() {
  const education = await getMemberEducationSnapshot();
  const schoolGroups = [
    { category: "High Schools", schools: education.highSchools },
    { category: "Colleges & Universities", schools: education.colleges },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: joinFaqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="bg-v-dark pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-[0.06]" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-v-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-v-green/5 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-4">
              For Students
            </p>
            <h1
              className="font-display font-bold text-white leading-none tracking-tight mb-6"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Build your resume on
              <br />
              <span className="text-v-blue">real projects for real businesses.</span>
            </h1>
            <p className="font-body text-white/70 text-lg max-w-2xl leading-relaxed mb-4">
              Whether you&apos;re a high schooler exploring your first internship or a college student
              looking for portfolio work that holds up in interviews — Volta gives you deliverables
              you can point to, with real clients and measurable outcomes.
            </p>
            <p className="font-body text-white/50 text-sm mb-8">
              High school and college students from {education.highSchoolCount}+ schools across NYC and beyond.
            </p>
            <div className="flex gap-4 flex-wrap mb-3">
              <Link
                href="/apply"
                className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-colors"
              >
                Apply Now →
              </Link>
              <a
                href="#tracks"
                className="border border-white/20 text-white font-display font-bold text-base px-8 py-4 rounded-full hover:border-white/50 transition-colors"
              >
                See tracks
              </a>
            </div>
            <p className="font-body text-sm text-white/50">
              Takes 5 minutes · Apply anytime.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── WHY VOLTA / RESUME VALUE ───────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">Why Volta?</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Built for your resume — and beyond</h2>
            <p className="font-body text-v-muted mt-3 max-w-xl">
              Volta is designed around real outcomes — the kind that hold up in interviews and on applications.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {joinGains.map((g, i) => (
              <AnimatedSection key={g.title} delay={i * 0.06}>
                <div className={`border border-v-border rounded-2xl p-6 h-full ${g.bg}`}>
                  <div className={`w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center mb-4`}>
                    <g.icon className={`w-5 h-5 ${g.color}`} />
                  </div>
                  <h3 className="font-display font-bold text-v-ink text-base mb-2">{g.title}</h3>
                  <p className="font-body text-sm text-v-muted leading-relaxed">{g.desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRACKS ─────────────────────────────────────────── */}
      <section id="tracks" className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-14">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">Choose your track</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">The three tracks</h2>
            <p className="font-body text-v-muted mt-3 max-w-xl">
              Every project is staffed by students across our three tracks. Work is fast-paced, goes live quickly, and includes backend systems alongside frontend execution — with ongoing client support built into every engagement.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {joinTracks.map((t, i) => (
              <AnimatedSection key={t.name} delay={i * 0.1}>
                <div className={`border rounded-2xl p-8 h-full flex flex-col ${t.color}`}>
                  <div className={`w-11 h-11 rounded-xl ${t.iconBg} flex items-center justify-center mb-5`}>
                    <t.icon className={`w-5 h-5 ${t.iconColor}`} />
                  </div>
                  <h3 className="font-display font-bold text-v-ink text-xl mb-5">{t.name}</h3>

                  <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-3">What you&apos;ll do</p>
                  <ul className="space-y-2 mb-6">
                    {t.doWhat.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 font-body text-sm text-v-muted">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5 ${t.iconColor.replace("text-", "bg-")}`} />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-3 mt-auto pt-4 border-t border-black/6">Who fits in</p>
                  <ul className="space-y-2">
                    {t.skills.map((item) => (
                      <li key={item} className="flex items-start gap-2.5 font-body text-sm text-v-muted">
                        <span className="w-1.5 h-1.5 rounded-full bg-v-muted/30 flex-shrink-0 mt-1.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── COLLEGE SECTION ────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <AnimatedSection direction="left">
              <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-4">
                For college students
              </p>
              <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl mb-5">
                Long-term projects,<br />
                <span className="text-v-blue">real portfolio depth.</span>
              </h2>
              <p className="font-body text-v-muted leading-relaxed mb-6">
                College students — including our team at Cornell — take on longer engagements that span
                multiple months. You&apos;ll own workstreams end to end, iterate on live production systems,
                and build the kind of portfolio depth that stands out in technical interviews and grad school applications.
              </p>
              <p className="font-body text-v-muted leading-relaxed">
                Many of our college members move into Project Lead roles within their first semester,
                managing teams and serving as the primary client-facing owner.
              </p>
            </AnimatedSection>
            <AnimatedSection direction="right">
              <div className="bg-v-bg border border-v-border rounded-2xl p-8">
                <div className="space-y-6">
                  <div>
                    <p className="font-display font-bold text-v-ink text-2xl leading-none mb-1">{education.collegeCount}+</p>
                    <p className="font-body text-sm text-v-muted">Colleges & universities represented</p>
                  </div>
                  <div className="pt-6 border-t border-v-border">
                    <p className="font-body text-sm text-v-muted leading-relaxed">
                      College students typically commit 3–5 hours per week and take on leadership roles faster than high school members.
                    </p>
                  </div>
                  <div className="pt-4 border-t border-v-border">
                    <p className="font-body text-sm text-v-muted leading-relaxed">
                      Our Cornell team runs long-term client engagements including full website builds, grant applications, and ongoing social media management.
                    </p>
                  </div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* ── SCHOOL AMBASSADOR CALLOUT ──────────────────────── */}
      <section className="py-16 bg-v-dark">
        <div className="max-w-4xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="rounded-2xl border border-white/15 bg-white/5 backdrop-blur-sm p-8 md:p-10 flex flex-col md:flex-row gap-8 items-start md:items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-v-green/15 flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-v-green" />
                  </div>
                  <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest">School Ambassador Program</p>
                </div>
                <h3 className="font-display font-bold text-white text-2xl mb-3">
                  Represent Volta at your school
                </h3>
                <p className="font-body text-white/65 leading-relaxed">
                  School Ambassadors recruit new members, organize info sessions, and serve as the bridge between
                  Volta leadership and their campus. It&apos;s a leadership role that looks great on applications —
                  and you&apos;ll help build the next wave of student consultants.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Link
                  href="/apply"
                  className="inline-block bg-v-green text-v-ink font-display font-bold text-sm px-6 py-3 rounded-full hover:bg-v-green-dark transition-colors"
                >
                  Apply as Ambassador →
                </Link>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── WHERE MEMBERS COME FROM ────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">Our members</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">Where our members come from</h2>
          </AnimatedSection>
          <div className="space-y-10">
            {schoolGroups.map((group, gi) => (
              <AnimatedSection key={group.category} delay={gi * 0.08}>
                <h3 className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">{group.category}</h3>
                <div className="bg-white border border-v-border rounded-2xl px-5 py-5 md:px-6 md:py-6">
                  <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2 list-disc pl-5">
                    {group.schools.map((school) => (
                      <li key={school} className="font-body text-sm text-v-ink marker:text-v-green">
                        {school}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP TRACK ───────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">How you grow</p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">The leadership track</h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              We promote on merit, not tenure. Strong contributors advance quickly — we&apos;re always building new leaders.
            </p>
          </AnimatedSection>
          <div className="relative">
            <div className="grid md:grid-cols-5 gap-6">
              {leadershipSteps.map((step, i) => (
                <AnimatedSection key={step.role} delay={i * 0.1}>
                  <div className="relative flex flex-col items-start md:items-center">
                    <div className="w-10 h-10 rounded-full bg-v-green flex items-center justify-center mb-4 z-10 flex-shrink-0">
                      <span className="font-display font-bold text-v-ink text-sm">{i + 1}</span>
                    </div>
                    <h3 className="font-display font-bold text-v-ink text-base mb-2 md:text-center">{step.role}</h3>
                    <p className="font-body text-sm text-v-muted leading-relaxed md:text-center">{step.desc}</p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
          <AnimatedSection className="mt-10">
            <h3 className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">Other roles</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {otherRoles.map((role) => (
                <div key={role.role} className="bg-v-bg border border-v-border rounded-2xl p-5">
                  <h4 className="font-display font-bold text-v-ink text-base mb-2">{role.role}</h4>
                  <p className="font-body text-sm text-v-muted leading-relaxed">{role.desc}</p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────── */}
      <section className="py-20 bg-v-bg">
        <div className="max-w-3xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-10">
            <h2 className="font-display font-bold text-v-ink text-3xl">Frequently Asked Questions</h2>
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
    </>
  );
}
