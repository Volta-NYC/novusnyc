"use client";

import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import { useRef } from "react";

interface Milestone {
  month: string;
  year: string;
  label: string;
  desc: string;
}

const milestoneColors = ["bg-v-green", "bg-v-blue", "bg-v-yellow", "bg-v-green-dark", "bg-v-blue-dark"];

export default function HistoryTimeline({ milestones }: { milestones: Milestone[] }) {
  const timelineRef = useRef<HTMLOListElement>(null);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 72%", "end 55%"],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });

  return (
    <ol ref={timelineRef} className="relative ml-3 pl-8 md:ml-8 md:pl-12">
      <span aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-0.5 bg-v-green/20" />
      <motion.span
        aria-hidden="true"
        className="absolute bottom-0 left-0 top-0 w-0.5 origin-top bg-v-green"
        style={{ scaleY: reducedMotion ? 1 : progress }}
      />
      {milestones.map((milestone, index) => (
        <motion.li
          key={`${milestone.year}-${milestone.label}`}
          className="relative pb-12 last:pb-0 md:pb-14"
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.42 }}
          transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            aria-hidden="true"
            className={`absolute -left-[2.38rem] top-1.5 flex h-4 w-4 items-center justify-center rounded-full border-[3px] border-white md:-left-[3.38rem] ${milestoneColors[index] ?? "bg-v-green"}`}
            initial={reducedMotion ? false : { scale: 0.5 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 0.42 }}
            transition={{ type: "spring", stiffness: 360, damping: 20 }}
          />
          <div className="grid gap-3 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-7">
            <p className="timeline-date font-body whitespace-nowrap pt-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-v-green">
              {milestone.month} {milestone.year}
            </p>
            <div className={`timeline-entry-content ${index < milestones.length - 1 ? "border-b border-v-border/70 pb-10" : ""}`}>
              <h3 className="font-display text-xl font-bold text-v-ink">{milestone.label}</h3>
              <p className="font-body mt-2 max-w-3xl leading-relaxed text-v-muted">{milestone.desc}</p>
            </div>
          </div>
        </motion.li>
      ))}
    </ol>
  );
}
