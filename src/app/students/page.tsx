import type { Metadata } from "next";
import fs from "fs";
import path from "path";
import Image from "next/image";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import { teamMembers, branches, trackHighlights } from "@/data";

export const metadata: Metadata = {
  title: "For Students | Volta NYC",
  description:
    "Volta NYC is run by students, top to bottom. Meet the team, see where our members come from, and learn how students grow from contributor to director.",
  openGraph: {
    title: "For Students | Volta NYC",
    description: "Run by students. Built for NYC.",
  },
};

interface SchoolGroup {
  category: string;
  schools: string[];
}

function dedupeSchools(schools: string[]): string[] {
  const seen = new Set<string>();
  return schools.filter((school) => {
    const key = school.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseSchools(markdown: string): SchoolGroup[] {
  const sections: SchoolGroup[] = [];
  let current: SchoolGroup | null = null;
  for (const line of markdown.split("\n")) {
    const t = line.trim();
    if (t.startsWith("## ")) {
      if (current) {
        sections.push({ ...current, schools: dedupeSchools(current.schools) });
      }
      current = { category: t.slice(3), schools: [] };
    } else if (t.startsWith("- ") && current) {
      current.schools.push(t.slice(2));
    }
  }
  if (current) sections.push({ ...current, schools: dedupeSchools(current.schools) });
  return sections;
}

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

export default function Students() {
  const schoolsRaw = fs.readFileSync(
    path.join(process.cwd(), "src/data/schools.md"),
    "utf-8"
  );
  const schoolGroups = parseSchools(schoolsRaw);

  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="bg-v-bg pt-32 pb-20 border-b border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
              For Students
            </p>
            <h1
              className="font-display font-bold text-v-ink leading-none tracking-tight mb-6 max-w-3xl"
              style={{ fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
            >
              Students building<br />
              <span className="text-v-green">something real.</span>
            </h1>
            <p className="font-body text-v-muted text-lg leading-relaxed max-w-2xl mb-8">
              Volta is run by students, top to bottom. Every project is led by a student
              team. Every decision is made by student directors. The businesses are real,
              the clients are real, and the work ships.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/join"
                className="bg-v-green text-v-ink font-display font-bold text-base px-8 py-4 rounded-full hover:bg-v-green-dark transition-colors"
              >
                See how it works →
              </Link>
              <Link
                href="/apply"
                className="font-body text-sm text-v-muted hover:text-v-ink transition-colors border border-v-border px-6 py-4 rounded-full"
              >
                Apply Now
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── LEADERSHIP TEAM ──────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              Who runs things
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              The leadership team
            </h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              All current students. All started exactly where you would.
            </p>
          </AnimatedSection>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((m, i) => (
              <AnimatedSection key={m.name} delay={i * 0.08}>
                <div className="bg-v-bg border border-v-border rounded-2xl p-6 flex flex-col items-center text-center hover:border-v-green/40 transition-colors project-card">
                  {m.photo ? (
                    <div className="w-20 h-20 rounded-full overflow-hidden mb-4 ring-2 ring-v-border">
                      <Image
                        src={m.photo}
                        alt={m.name}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-v-green flex items-center justify-center mb-4">
                      <span className="font-display font-bold text-v-ink text-2xl">{m.initial}</span>
                    </div>
                  )}
                  <h3 className="font-display font-bold text-v-ink text-base mb-1">{m.name}</h3>
                  <p className="font-body text-xs text-v-muted uppercase tracking-widest">{m.role}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHERE WE COME FROM ───────────────────────────────── */}
      <section className="py-20 bg-v-bg border-y border-v-border">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              Our members
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              Where we come from
            </h2>
          </AnimatedSection>
          <div className="space-y-10">
            {schoolGroups.map((group, gi) => (
              <AnimatedSection key={group.category} delay={gi * 0.1}>
                <h3 className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">
                  {group.category}
                </h3>
                <div className="flex flex-wrap gap-3">
                  {group.schools.map((school, index) => (
                    <span
                      key={school}
                      className={`font-body text-sm font-medium text-v-ink border rounded-full px-4 py-2 ${
                        index % 2 === 0
                          ? "bg-lime-50 border-lime-200"
                          : "bg-lime-100 border-lime-300"
                      }`}
                    >
                      {school}
                    </span>
                  ))}
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection>
            <p className="font-body text-sm text-v-muted mt-8">
              We recruit from all NYC high schools and colleges — if your school isn&apos;t listed, you&apos;d just be the first.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ── WHAT STUDENTS HAVE BUILT ─────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              Track record
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              What our teams have done
            </h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              Three tracks, one goal: ship something real for a real business.
            </p>
          </AnimatedSection>
          <div className="grid md:grid-cols-3 gap-6">
            {trackHighlights.map((track, i) => (
              <AnimatedSection key={track.name} delay={i * 0.1}>
                <div className="bg-v-bg border border-v-border rounded-2xl p-8 h-full">
                  <span className={`tag ${track.tagColor} mb-5 inline-block`}>{track.name}</span>
                  <ul className="space-y-3">
                    {track.outputs.map((output) => (
                      <li key={output} className="font-body text-sm text-v-muted flex items-start gap-2.5">
                        <span className="text-v-green mt-0.5 flex-shrink-0">→</span>
                        {output}
                      </li>
                    ))}
                  </ul>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CHAPTERS ─────────────────────────────────────────── */}
      <section className="py-20 bg-v-dark">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-3">
              Beyond NYC
            </p>
            <h2
              className="font-display font-bold text-white leading-tight"
              style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
            >
              Volta is growing.
            </h2>
            <p className="font-body text-white/60 text-lg mt-3 max-w-xl">
              What started in New York City now has chapters forming across the country.
              Each one is student-run from the ground up.
            </p>
          </AnimatedSection>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {branches.map((b, i) => (
              <AnimatedSection key={b.city} delay={i * 0.06}>
                <div className={`rounded-2xl p-5 text-center border ${b.city === "New York City" ? "bg-v-green border-v-green" : "bg-white/5 border-white/10"}`}>
                  <p className={`font-display font-bold text-base mb-0.5 ${b.city === "New York City" ? "text-v-ink" : "text-white"}`}>
                    {b.city}
                  </p>
                  <p className={`font-body text-xs ${b.city === "New York City" ? "text-v-ink/60" : "text-white/40"}`}>
                    {b.state}
                  </p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── LEADERSHIP PROGRESSION ───────────────────────────── */}
      <section className="py-20 bg-v-bg border-t border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection className="mb-12">
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              How you grow
            </p>
            <h2 className="font-display font-bold text-v-ink text-3xl md:text-4xl">
              The leadership track
            </h2>
            <p className="font-body text-v-muted text-lg mt-3 max-w-xl">
              There&apos;s no ceiling. Strong contributors move up fast because we always need more leaders.
            </p>
          </AnimatedSection>
          <div className="relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-5 left-[10%] right-[10%] h-px bg-v-border" />
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
            <h3 className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">
              Other roles
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              {otherRoles.map((role) => (
                <div
                  key={role.role}
                  className="bg-white border border-v-border rounded-2xl p-5"
                >
                  <h4 className="font-display font-bold text-v-ink text-base mb-2">
                    {role.role}
                  </h4>
                  <p className="font-body text-sm text-v-muted leading-relaxed">
                    {role.desc}
                  </p>
                </div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 bg-v-green">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <AnimatedSection>
            <h2 className="font-display font-bold text-v-ink text-4xl md:text-5xl mb-5">
              Sound like your kind of place?
            </h2>
            <p className="font-body text-v-ink/70 text-lg mb-8">
              Learn what you&apos;d actually be doing — then apply.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/join"
                className="inline-block bg-v-ink text-white font-display font-bold text-lg px-10 py-5 rounded-full hover:bg-v-ink/80 transition-colors"
              >
                How it works →
              </Link>
              <Link
                href="/apply"
                className="inline-block bg-white/20 text-v-ink font-display font-bold text-lg px-10 py-5 rounded-full hover:bg-white/30 transition-colors border border-v-ink/10"
              >
                Apply Now
              </Link>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
