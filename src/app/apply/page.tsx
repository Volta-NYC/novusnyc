import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import ApplicationForm from "@/components/ApplicationForm";
import { getApplicationsStatus } from "@/lib/server/publicShowcase";

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
                <p className="font-body text-sm font-semibold text-n-orange uppercase tracking-widest mb-4">
                  Apply Now
                </p>
                <h1
                  className="font-display font-bold text-n-ink leading-tight mb-5"
                  style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
                >
                  Apply to join Novus
                </h1>
                <p className="font-body text-n-muted text-base leading-relaxed mb-3">
                  High school and college students. Real projects for real businesses.
                  2–4 hours a week, fully remote.
                </p>
                <p className="font-body text-sm text-n-muted mb-8">
                  ~30% acceptance rate.
                </p>

                <div className="space-y-5">
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
                      title: "Quick conversation",
                      desc: "A 15-minute call to learn more about you.",
                    },
                    {
                      n: "3",
                      title: "Project match",
                      desc: "We assign you to a team and project based on your track and availability.",
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
