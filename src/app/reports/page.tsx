import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";

export const metadata: Metadata = {
  title: "Reports & Case Studies | Volta NYC",
  description:
    "Field research reports and business case studies written by Volta student teams across the country, grounded in direct owner interviews and in-person fieldwork.",
  openGraph: {
    title: "Reports & Case Studies | Volta NYC",
    description:
      "A publication library of field research reports and business case studies from Volta student teams across the country.",
    images: ["/hero-nyc-skyline.jpg"],
  },
};

export default function ReportsPage() {
  return (
    <>
      <section className="bg-v-bg pt-32 pb-16 border-b border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              Reports &amp; Case Studies
            </p>
            <h1 className="font-display font-bold text-v-ink text-4xl md:text-5xl leading-tight mb-5">
              Field research on small business realities.
            </h1>
            <p className="font-body text-v-muted text-lg max-w-3xl">
              This is Volta&apos;s publication library of local-market reports and business case studies.
              Each report is written by high school and college students doing direct interviews,
              in-person fieldwork, and firsthand observation in neighborhoods across the country.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8 space-y-8">
          <AnimatedSection>
            <article className="bg-v-bg border border-v-border rounded-2xl p-6 md:p-7">
              <h2 className="font-display font-bold text-v-ink text-2xl mb-3">
                Why this series exists
              </h2>
              <p className="font-body text-v-muted mb-4">
                Most small-business guidance is broad and repetitive. Local business conditions are not.
                A family restaurant in Queens, a retail shop in the Bay Area, and a neighborhood service business
                in Florida can face similar pressures, but the execution details are different.
              </p>
              <p className="font-body text-v-muted">
                These reports document those differences clearly and publicly. They are practical references
                owners and advocates can use, and they also serve as serious portfolio-quality research for
                the students who produce them.
              </p>
            </article>
          </AnimatedSection>

          <AnimatedSection delay={0.06}>
            <article className="bg-v-bg border border-v-border rounded-2xl p-6 md:p-7">
              <h2 className="font-display font-bold text-v-ink text-2xl mb-3">
                What each report covers
              </h2>
              <ul className="space-y-2">
                <li className="font-body text-v-ink flex items-start gap-2">
                  <span className="text-v-green mt-0.5">•</span>
                  A focused city or neighborhood profile based on direct owner interviews
                </li>
                <li className="font-body text-v-ink flex items-start gap-2">
                  <span className="text-v-green mt-0.5">•</span>
                  Findings on digital presence, operations, and financial constraints
                </li>
                <li className="font-body text-v-ink flex items-start gap-2">
                  <span className="text-v-green mt-0.5">•</span>
                  Case-based analysis of what worked, what failed, and why
                </li>
                <li className="font-body text-v-ink flex items-start gap-2">
                  <span className="text-v-green mt-0.5">•</span>
                  Practical recommendations grounded in field evidence
                </li>
              </ul>
            </article>
          </AnimatedSection>

          <AnimatedSection delay={0.12}>
            <article className="bg-v-bg border border-v-border rounded-2xl p-6 md:p-7">
              <h2 className="font-display font-bold text-v-ink text-2xl mb-3">
                Why it matters
              </h2>
              <p className="font-body text-v-muted mb-4">
                For owners and local advocates, this is a practical reference library drawn from real businesses in
                multiple cities, not just NYC. It helps compare local conditions, spot recurring patterns, and make
                stronger decisions with less guesswork.
              </p>
              <p className="font-body text-v-muted">
                For students, this is not simulated work. It is published research with real readers:
                interview design, synthesis, writing, and analysis that can be used in applications, interviews,
                and professional portfolios. It is one part of Volta&apos;s broader mission to advance digital and
                financial equity for small businesses.
              </p>
              <p className="font-body text-v-muted mt-4">
                For practical owner-facing playbooks and tool tutorials, see
                {" "}
                <Link href="/guides" className="text-v-blue hover:underline">Guides for Businesses</Link>.
              </p>
            </article>
          </AnimatedSection>

          <AnimatedSection delay={0.18}>
            <aside className="rounded-2xl border border-v-green/35 bg-v-green/5 p-6 md:p-7">
              <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-2">
                For Students
              </p>
              <h2 className="font-display font-bold text-v-ink text-2xl mb-3">
                Want to publish a report for your own city?
              </h2>
              <p className="font-body text-v-muted mb-5">
                We&apos;re looking for student researchers who want to lead a local report in their community.
                You&apos;ll run interviews, document findings, and publish under this series.
              </p>
              <Link
                href="/apply"
                className="inline-flex items-center rounded-full bg-v-green px-5 py-2.5 font-display font-bold text-sm text-v-ink hover:bg-v-green-dark transition-colors"
              >
                Apply at voltanyc.org/apply
              </Link>
            </aside>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
