import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import ApplicationForm from "@/components/ApplicationForm";
import { getApplicationsStatus } from "@/lib/server/publicShowcase";

// The pause switch and the chapter list live in the database, so this page
// cannot be built once and cached forever. Five minutes bounds how stale it can
// get; the admin revalidate hook makes an intentional change immediate.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Apply to Join as a Student Volunteer",
  description:
    "Apply to join Novus NYC — a student-led consulting nonprofit placing teams on real projects for NYC small businesses. Takes 5 minutes.",
  openGraph: {
    title: "Apply to Novus NYC",
    description: "Real projects. Real clients. Takes 5 minutes to apply.",
    images: ["/api/og"],
  },
};

export default async function Apply() {
  const { paused, message, chapters } = await getApplicationsStatus();

  return (
    <>
      <section id="application-details" className="section-flush-bottom public-surface public-surface-lavender bg-n-bg pt-32 pb-0">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="grid md:grid-cols-5 gap-12 items-start pb-12">
              {/* Left: what to expect */}
              <div className="md:col-span-2 md:pt-2">
                <p className="mb-4 font-body text-xs font-bold uppercase tracking-[0.2em] text-n-orange sm:text-sm">
                  Student application
                </p>
                <h1 className="mb-5 max-w-[12ch] font-display text-[clamp(2.8rem,5vw,4.4rem)] font-bold leading-[0.98] tracking-[-0.04em] text-n-ink">
                  Start your Novus application.
                </h1>
                <p className="mb-6 font-body text-lg leading-relaxed text-n-muted">
                  Join a student-led team doing real client work. The application takes about five minutes.
                </p>
                <ul className="mb-9 flex flex-wrap gap-2 font-body text-sm font-semibold text-n-ink" aria-label="Program details">
                  {[
                    "High school + college",
                    "2–4 hours a week",
                    "Fully remote",
                  ].map((detail) => (
                    <li key={detail} className="rounded-full border border-n-border bg-white px-3.5 py-2">{detail}</li>
                  ))}
                </ul>

                <div className="space-y-5 border-t border-n-border pt-7">
                  <p className="font-body text-xs font-semibold text-n-muted uppercase tracking-widest">
                    What happens next
                  </p>
                  {[
                    {
                      n: "1",
                      title: "We review your application",
                      desc: "Usually within 2–3 business days.",
                    },
                    {
                      n: "2",
                      title: "We review current openings",
                      desc: "We consider your interests, availability, and the teams that are onboarding.",
                    },
                    {
                      n: "3",
                      title: "Onboarding email",
                      desc: "If there is a fit, we will email your next steps, team, and track.",
                    },
                  ].map((s) => (
                    <div key={s.n} className="flex gap-4">
                      <span className="font-display font-bold text-n-orange text-lg leading-none flex-shrink-0 mt-0.5">
                        {s.n}
                      </span>
                      <div>
                        <p className="font-display font-bold text-n-ink text-sm">{s.title}</p>
                        <p className="font-body text-xs text-n-muted mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: form or paused notice */}
              <div id="application-form" className="md:col-span-3">
                {paused ? (
                  <div className="border border-n-border rounded-2xl bg-white p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-n-bg border border-n-border flex items-center justify-center mx-auto mb-4">
                      <svg className="w-5 h-5 text-n-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                    </div>
                    <h2 className="font-display font-bold text-n-ink text-xl mb-2">Applications Paused</h2>
                    <p className="font-body text-n-muted text-sm leading-relaxed max-w-xs mx-auto">
                      {message}
                    </p>
                  </div>
                ) : (
                  <ApplicationForm chapters={chapters} />
                )}
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
