import type { Metadata } from "next";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";
import ApplicationForm from "@/components/ApplicationForm";

export const metadata: Metadata = {
  title: "Apply | Volta NYC",
  description:
    "Apply to join Volta NYC — a student-led consulting nonprofit placing teams on real projects for NYC small businesses. Takes 5 minutes.",
  openGraph: {
    title: "Apply to Volta NYC",
    description: "Real projects. Real clients. Takes 5 minutes to apply.",
  },
};

export default function Apply() {
  return (
    <>
      <section className="bg-v-bg pt-32 pb-0 border-b border-v-border">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <div className="grid md:grid-cols-5 gap-12 items-start pb-12">
              {/* Left: what to expect */}
              <div className="md:col-span-2 md:pt-2">
                <p className="font-body text-sm font-semibold text-v-green uppercase tracking-widest mb-4">
                  Apply Now
                </p>
                <h1
                  className="font-display font-bold text-v-ink leading-tight mb-5"
                  style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}
                >
                  Join Volta NYC
                </h1>
                <p className="font-body text-v-muted text-base leading-relaxed mb-8">
                  High school and college students. Real projects for real businesses.
                  2–4 hours a week, fully remote.
                </p>

                <div className="space-y-5">
                  <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest">
                    What happens next
                  </p>
                  {[
                    {
                      n: "1",
                      title: "We review your application",
                      desc: "Usually within a few days.",
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
                      <span className="font-display font-bold text-v-green text-lg leading-none flex-shrink-0 mt-0.5">
                        {s.n}
                      </span>
                      <div>
                        <p className="font-display font-bold text-v-ink text-sm">{s.title}</p>
                        <p className="font-body text-xs text-v-muted mt-0.5">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-v-border">
                  <p className="font-body text-xs text-v-muted">
                    Questions?{" "}
                    <Link href="/partners#contact" className="text-v-blue hover:underline">
                      Contact the team
                    </Link>{" "}
                    or{" "}
                    <Link href="/join" className="text-v-blue hover:underline">
                      read more about how Volta works.
                    </Link>
                  </p>
                </div>
              </div>

              {/* Right: form */}
              <div className="md:col-span-3">
                <ApplicationForm />
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
