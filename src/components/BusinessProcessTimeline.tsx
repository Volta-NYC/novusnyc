"use client";

import { motion, useReducedMotion } from "framer-motion";

const stages = [
  {
    title: "Tell us what you need",
    detail: "Share a little about your business and the support you are looking for.",
    accent: "bg-n-orange",
    ring: "ring-n-orange/25",
  },
  {
    title: "Plan the project",
    detail: "We meet with you, confirm the scope, and set a realistic timeline.",
    accent: "bg-n-purple",
    ring: "ring-n-purple/25",
  },
  {
    title: "Build and review",
    detail: "Your student team shares progress and revises the work with your feedback.",
    accent: "bg-amber-400",
    ring: "ring-amber-300/35",
  },
  {
    title: "Launch and handoff",
    detail: "We finish the work, share access, and walk you through the next steps.",
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
              Working with Novus
            </p>
            <h2 id="business-process-heading" className="page-section-heading text-n-ink">
              Clear steps, regular updates, and work you can use.
            </h2>
          </div>
          <p className="font-body text-sm md:text-base text-n-muted max-w-md leading-relaxed">
            Most projects take 2 to 4 months, depending on the scope. Smaller projects may move faster.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-n-border bg-n-bg px-5 py-8 md:px-8 md:py-10">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,rgb(var(--color-orange)),rgb(var(--color-purple)),rgb(var(--color-yellow)),rgb(var(--color-orange))]" />
          <div className="relative">
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
                      className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full ${stage.accent} ring-8 ${stage.ring} font-display font-bold text-sm text-n-ink shadow-sm`}
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
          <div className="mt-8 grid gap-4 border-t border-n-border pt-6 sm:grid-cols-3">
            {["No cost", "No contract", "Regular updates"].map((item) => (
              <p key={item} className="font-display text-base font-bold text-n-ink">{item}</p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
