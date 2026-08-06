"use client";

import { motion, useReducedMotion } from "framer-motion";

const stages = [
  {
    title: "Initial reply",
    detail: "Within a few days of your inquiry.",
    accent: "bg-n-orange",
    ring: "ring-n-orange/25",
  },
  {
    title: "First draft",
    detail: "Usually within 2–3 weeks, often sooner.",
    accent: "bg-n-purple",
    ring: "ring-n-purple/25",
  },
  {
    title: "Review and feedback",
    detail: "We refine the work with you through feedback rounds.",
    accent: "bg-amber-400",
    ring: "ring-amber-300/35",
  },
  {
    title: "Launch and hosting",
    detail: "We prepare the final version, set up hosting as needed, and hand it over.",
    accent: "bg-n-orange-dark",
    ring: "ring-n-orange/25",
  },
];

export default function BusinessProcessTimeline() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="process" className="py-16 bg-white" aria-labelledby="business-process-heading">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-10">
          <div>
            <p className="font-body text-xs uppercase tracking-[0.22em] text-n-orange font-bold mb-3">
              A clear path forward
            </p>
            <h2 id="business-process-heading" className="page-section-heading text-n-ink">
              From first conversation to launch.
            </h2>
          </div>
          <p className="font-body text-sm md:text-base text-n-muted max-w-md leading-relaxed">
            Most projects take around 2–4 months depending on your business and project scope. Simpler projects can move much faster.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-stretch">
          <div className="relative border border-n-border bg-n-bg rounded-lg p-5 md:p-7">
            <motion.div
              aria-hidden="true"
              className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-px bg-n-border origin-left"
              initial={reducedMotion ? false : { scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
            <ol className="grid gap-8 md:grid-cols-4 md:gap-5">
              {stages.map((stage, index) => (
                <motion.li
                  key={stage.title}
                  className="relative grid grid-cols-[2.75rem_1fr] gap-4 md:block"
                  initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.45 }}
                  transition={{ duration: 0.45, delay: reducedMotion ? 0 : index * 0.13, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="relative flex justify-center md:mb-5">
                    {index < stages.length - 1 ? (
                      <span aria-hidden="true" className="md:hidden absolute top-10 bottom-[-2rem] w-px bg-n-border" />
                    ) : null}
                    <motion.span
                      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${stage.accent} ring-8 ${stage.ring} font-display font-bold text-sm text-n-ink`}
                      initial={reducedMotion ? false : { scale: 0.75 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true, amount: 0.45 }}
                      transition={{ duration: 0.35, delay: reducedMotion ? 0 : index * 0.13 + 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      {index + 1}
                    </motion.span>
                  </div>
                  <div className="pb-1 md:text-center">
                    <h3 className="font-display font-bold text-n-ink text-lg leading-tight">{stage.title}</h3>
                    <p className="font-body text-sm text-n-muted leading-relaxed mt-2">{stage.detail}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>

          <aside className="flex flex-col justify-between rounded-lg bg-n-dark px-6 py-7 text-white">
            <div>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.18em] text-n-orange mb-3">What stays simple</p>
              <h3 className="font-display font-bold text-2xl leading-tight">No cost. No contract. No technical guesswork.</h3>
            </div>
            <div className="mt-8 border-t border-white/15 pt-5 space-y-4">
              <p className="font-body text-sm leading-relaxed text-white/70">You&apos;ll have a clear point of contact and regular updates from the team working with you.</p>
              <p className="font-body text-sm font-semibold text-n-orange">Built with your business, not just for it.</p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
