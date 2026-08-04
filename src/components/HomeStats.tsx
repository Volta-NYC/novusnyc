"use client";

import { motion, useReducedMotion } from "framer-motion";

interface Stat {
  value: string;
  label: string;
}

const EASE = [0.22, 1, 0.36, 1] as const;

export default function HomeStats({ stats }: { stats: Stat[] }) {
  const reducedMotion = useReducedMotion();

  return (
    <div className="max-w-6xl mx-auto px-5 md:px-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.45 }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: EASE }}
            className="rounded-2xl border border-white/20 bg-black/35 backdrop-blur-sm px-4 py-5 md:px-6 md:py-6 text-center shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
          >
            <div className="font-display font-bold text-3xl md:text-4xl text-v-green mb-1.5">
              {s.value}
            </div>
            <div className="font-body text-[10px] md:text-xs uppercase tracking-[0.14em] text-white/75">
              {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
