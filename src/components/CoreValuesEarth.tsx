"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

type CoreValue = {
  title: string;
  desc: string;
};

const layers = [
  {
    title: "Student ownership",
    layer: "Inner core",
    reason: "The starting point",
    radius: 22,
    color: "#F6B78D",
    text: "#2D282E",
  },
  {
    title: "Useful work",
    layer: "Outer core",
    reason: "What that ownership produces",
    radius: 39,
    color: "#F3E28D",
    text: "#2D282E",
  },
  {
    title: "Clear communication",
    layer: "Mantle",
    reason: "How the work moves",
    radius: 63,
    color: "#BEA2BA",
    text: "#2D282E",
  },
  {
    title: "Local trust",
    layer: "Crust",
    reason: "Where Novus meets the community",
    radius: 82,
    color: "#75526D",
    text: "#FFFFFF",
  },
] as const;

export default function CoreValuesEarth({ values }: { values: CoreValue[] }) {
  const reducedMotion = useReducedMotion();
  const [activeTitle, setActiveTitle] = useState<(typeof layers)[number]["title"]>("Student ownership");
  const valuesByTitle = useMemo(() => new Map(values.map((value) => [value.title, value])), [values]);
  const activeIndex = layers.findIndex((layer) => layer.title === activeTitle);
  const activeLayer = layers[activeIndex];
  const activeValue = valuesByTitle.get(activeTitle) ?? values[0];

  const selectAdjacent = (direction: -1 | 1) => {
    const next = (activeIndex + direction + layers.length) % layers.length;
    setActiveTitle(layers[next].title);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.9fr)] lg:gap-16">
        <div>
          <div className="relative mx-auto aspect-square w-[min(88vw,35rem)]">
            <div aria-hidden="true" className="absolute inset-[4%] rounded-full bg-n-dark/10 blur-2xl" />
            <svg
              viewBox="0 0 200 200"
              className="relative h-full w-full overflow-visible drop-shadow-[0_24px_30px_rgba(45,40,46,0.18)]"
              role="group"
              aria-label="The four layers of Novus's core values"
            >
              <defs>
                <radialGradient id="earth-light" cx="36%" cy="28%" r="72%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.3" />
                  <stop offset="70%" stopColor="white" stopOpacity="0" />
                  <stop offset="100%" stopColor="#2D282E" stopOpacity="0.12" />
                </radialGradient>
              </defs>

              {[...layers].reverse().map((layer) => {
                const selected = layer.title === activeTitle;
                return (
                  <g
                    key={layer.title}
                    role="button"
                    tabIndex={0}
                    aria-label={`${layer.layer}: ${layer.title}. ${selected ? "Selected." : "Select to read more."}`}
                    onClick={() => setActiveTitle(layer.title)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveTitle(layer.title);
                      }
                    }}
                    className="cursor-pointer outline-none"
                  >
                    <motion.circle
                      cx="100"
                      cy="100"
                      r={layer.radius}
                      fill={layer.color}
                      stroke={selected ? "#FFFDF9" : "rgba(255,253,249,0.55)"}
                      strokeWidth={selected ? 3 : 1.2}
                      animate={{ scale: selected ? 1.035 : 1 }}
                      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 24 }}
                      style={{ transformOrigin: "100px 100px" }}
                      className="focus-visible:stroke-[4]"
                    />
                    <circle cx="100" cy="100" r={layer.radius} fill="url(#earth-light)" pointerEvents="none" />
                  </g>
                );
              })}

              <path d="M29 72C42 46 67 27 98 20" fill="none" stroke="rgba(255,255,255,.42)" strokeWidth="2" strokeLinecap="round" pointerEvents="none" />
              <path d="M153 158C166 146 176 128 181 108" fill="none" stroke="rgba(45,40,46,.18)" strokeWidth="2" strokeLinecap="round" pointerEvents="none" />
            </svg>

            <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center">
              <div className="max-w-[7rem] sm:max-w-[8rem]">
                <span className="block font-body text-[8px] font-bold uppercase tracking-[0.2em] text-n-ink/55 sm:text-[9px]">Inner core</span>
                <span className="mt-1 block font-display text-xs font-bold leading-tight text-n-ink sm:text-sm">Student ownership</span>
              </div>
            </div>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Select a core value layer">
            {layers.map((layer, index) => {
              const selected = activeTitle === layer.title;
              return (
                <button
                  key={layer.title}
                  type="button"
                  onClick={() => setActiveTitle(layer.title)}
                  aria-pressed={selected}
                  className={`min-h-20 rounded-xl border px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-purple ${selected ? "-translate-y-1 border-transparent shadow-lg" : "border-n-border bg-white/70 hover:-translate-y-0.5 hover:border-n-purple/45"}`}
                  style={selected ? { backgroundColor: layer.color, color: layer.text } : undefined}
                >
                  <span className="block font-body text-[9px] font-bold uppercase tracking-[0.15em] opacity-65">{index + 1} · {layer.layer}</span>
                  <span className="mt-1 block font-display text-sm font-bold leading-tight">{layer.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col items-center">
          <p className="mb-4 text-center font-body text-xs font-semibold text-n-muted lg:text-left">
            Select a layer to open it.
          </p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={activeLayer.title}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.72, x: -24 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, scale: 0.82, x: 20 }}
              transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 190, damping: 21 }}
              aria-live="polite"
              className="flex aspect-square w-[min(82vw,27rem)] flex-col items-center justify-center rounded-full border-[10px] border-white/45 px-[12%] text-center shadow-[0_28px_70px_rgba(45,40,46,0.2)]"
              style={{ backgroundColor: activeLayer.color, color: activeLayer.text }}
            >
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] opacity-65">{activeLayer.layer} · {activeIndex + 1} of 4</p>
              <h3 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">{activeValue.title}</h3>
              <p className="mt-3 font-body text-sm font-semibold leading-relaxed opacity-65">{activeLayer.reason}</p>
              <span className="my-4 h-px w-12 bg-current opacity-25" />
              <p className="font-body text-sm leading-relaxed sm:text-base">{activeValue.desc}</p>
            </motion.article>
          </AnimatePresence>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button type="button" onClick={() => selectAdjacent(-1)} className="inline-flex min-h-11 items-center rounded-full border border-n-border bg-white px-5 font-body text-sm font-semibold text-n-ink transition-colors hover:border-n-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-purple" aria-label="Show the previous layer">← Inward</button>
            <button type="button" onClick={() => selectAdjacent(1)} className="inline-flex min-h-11 items-center rounded-full border border-n-border bg-white px-5 font-body text-sm font-semibold text-n-ink transition-colors hover:border-n-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-purple" aria-label="Show the next layer">Outward →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
