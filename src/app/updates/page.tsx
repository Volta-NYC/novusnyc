import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import { progressUpdates } from "@/data/publishing";
import UpdatesGrid from "./UpdatesGrid";

export const metadata: Metadata = {
  title: "Progress Updates | Volta NYC",
  description:
    "Timestamped Volta progress updates covering projects, systems, and team growth.",
  openGraph: {
    title: "Progress Updates | Volta NYC",
    description: "Timestamped Volta progress updates covering projects, systems, and team growth.",
    images: ["/api/og"],
  },
};

export default function ProgressUpdatesPage() {
  const sortedUpdates = [...progressUpdates].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <section className="bg-v-bg pt-32 pb-16">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <AnimatedSection>
            <p className="font-body text-sm font-semibold text-v-blue uppercase tracking-widest mb-3">
              Progress Updates
            </p>
            <h1 className="font-display font-bold text-v-ink text-4xl md:text-5xl leading-tight mb-5">
              What we&apos;re building, week by week.
            </h1>
            <p className="font-body text-v-muted text-lg max-w-3xl">
              This is where we share updates on projects, team milestones, and new systems
              as they roll out. It&apos;s a simple running log of our work and progress.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-14 bg-white">
        <div className="max-w-5xl mx-auto px-5 md:px-8">
          <UpdatesGrid updates={sortedUpdates} />
        </div>
      </section>
    </>
  );
}
