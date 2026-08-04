"use client";

import { motion, useReducedMotion } from "framer-motion";
import { AwardIcon, BuildingIcon, CheckIcon, PencilIcon, UsersIcon } from "@/components/Icons";

const steps = [
  { label: "Apply", detail: "Tell us where you want to contribute.", icon: PencilIcon, accent: "bg-v-blue", ring: "ring-v-blue/20" },
  { label: "Interview", detail: "Meet the team and talk through your interests.", icon: UsersIcon, accent: "bg-v-green", ring: "ring-v-green/20" },
  { label: "Join a track", detail: "Find your place in Tech, Marketing, or Finance.", icon: CheckIcon, accent: "bg-v-yellow", ring: "ring-v-yellow/35" },
  { label: "Work with a business", detail: "Build work that reaches a real client.", icon: BuildingIcon, accent: "bg-v-green-dark", ring: "ring-v-green/20" },
  { label: "Build a portfolio", detail: "Leave with outcomes you can stand behind.", icon: AwardIcon, accent: "bg-v-blue-dark", ring: "ring-v-blue/20" },
];

export default function ApplicationJourney() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden bg-[#fffbea] py-14" aria-labelledby="application-journey-heading">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-body mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-700">Your Novus journey</p>
            <h2 id="application-journey-heading" className="font-display text-3xl font-bold text-v-ink md:text-4xl">From application to work you can show.</h2>
          </div>
          <p className="max-w-md font-body text-sm leading-relaxed text-v-muted">Each step builds toward client-facing experience and a body of work that is unmistakably yours.</p>
        </div>

        <div className="relative border border-v-yellow/55 bg-white/70 px-5 py-7 md:px-7 md:py-8 rounded-lg">
          <motion.div
            aria-hidden="true"
            className="absolute left-[10%] right-[10%] top-12 hidden h-px origin-left bg-v-yellow-dark/55 md:block"
            initial={reducedMotion ? false : { scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
          <ol className="grid gap-7 md:grid-cols-5 md:gap-4">
            {steps.map((step, index) => (
              <motion.li
                key={step.label}
                className="relative grid grid-cols-[2.8rem_1fr] gap-4 md:block"
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ duration: 0.4, delay: reducedMotion ? 0 : index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative flex justify-center md:mb-5">
                  {index < steps.length - 1 ? <span aria-hidden="true" className="absolute bottom-[-1.75rem] top-10 w-px bg-v-yellow/45 md:hidden" /> : null}
                  <span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full ${step.accent} ${step.ring} ring-8`}>
                    <step.icon className="h-4 w-4 text-v-ink" />
                  </span>
                </div>
                <div className="pb-1 md:text-center">
                  <h3 className="font-display text-base font-bold text-v-ink">{step.label}</h3>
                  <p className="mt-1.5 font-body text-sm leading-relaxed text-v-muted">{step.detail}</p>
                </div>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
