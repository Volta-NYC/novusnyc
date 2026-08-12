"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CoreValuesSceneLayer } from "@/components/CoreValuesEarthScene";

type CoreValue = {
  title: string;
  desc: string;
};

const layers = [
  {
    title: "Student ownership",
    layer: "Inner core",
    reason: "The starting point",
    radius: 31,
    color: "#F6B78D",
    text: "#2D282E",
  },
  {
    title: "Useful work",
    layer: "Outer core",
    reason: "What that ownership produces",
    radius: 54,
    color: "#F3E28D",
    text: "#2D282E",
  },
  {
    title: "Clear communication",
    layer: "Mantle",
    reason: "How the work moves",
    radius: 82,
    color: "#BEA2BA",
    text: "#2D282E",
  },
  {
    title: "Local trust",
    layer: "Crust",
    reason: "Where Novus meets the community",
    radius: 108,
    color: "#75526D",
    text: "#FFFFFF",
  },
] as const satisfies readonly CoreValuesSceneLayer[];

type LayerTitle = (typeof layers)[number]["title"];

const CoreValuesEarthScene = dynamic(() => import("@/components/CoreValuesEarthScene"), {
  ssr: false,
});

function EarthFallback({ highlightedTitle }: { highlightedTitle: LayerTitle | null }) {
  return (
    <svg
      viewBox="0 0 240 240"
      className="h-full w-full drop-shadow-[0_24px_30px_rgba(45,40,46,0.18)]"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="core-values-fallback-light" cx="34%" cy="25%" r="78%">
          <stop offset="0%" stopColor="white" stopOpacity="0.28" />
          <stop offset="67%" stopColor="white" stopOpacity="0" />
          <stop offset="100%" stopColor="#2D282E" stopOpacity="0.12" />
        </radialGradient>
      </defs>
      {[...layers].reverse().map((layer) => (
        <g key={layer.title}>
          <circle
            cx="120"
            cy="120"
            r={layer.radius}
            fill={layer.color}
            stroke={highlightedTitle === layer.title ? "#FFFDF9" : "rgba(255,253,249,0.52)"}
            strokeWidth={highlightedTitle === layer.title ? 3 : 1.1}
          />
          <circle cx="120" cy="120" r={layer.radius} fill="url(#core-values-fallback-light)" />
        </g>
      ))}
    </svg>
  );
}

export default function CoreValuesEarth({ values }: { values: CoreValue[] }) {
  const reducedMotion = useReducedMotion() ?? false;
  const layerRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const detailRef = useRef<HTMLElement | null>(null);
  const [activeTitle, setActiveTitle] = useState<LayerTitle | null>(null);
  const [focusedTitle, setFocusedTitle] = useState<LayerTitle | null>(null);
  const [hoveredTitle, setHoveredTitle] = useState<LayerTitle | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const valuesByTitle = useMemo(() => new Map(values.map((value) => [value.title, value])), [values]);
  const activeIndex = activeTitle ? layers.findIndex((layer) => layer.title === activeTitle) : -1;
  const activeLayer = activeIndex >= 0 ? layers[activeIndex] : null;
  const activeValue = activeTitle ? valuesByTitle.get(activeTitle) : null;
  const highlightedTitle = activeTitle ?? focusedTitle ?? hoveredTitle;
  const layoutTransition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 180, damping: 24 };

  const selectLayer = useCallback((title: string) => {
    if (layers.some((layer) => layer.title === title)) setActiveTitle(title as LayerTitle);
  }, []);

  const closeActiveLayer = useCallback(() => {
    const closingIndex = activeIndex;
    setActiveTitle(null);
    window.requestAnimationFrame(() => layerRefs.current[closingIndex]?.focus({ preventScroll: true }));
  }, [activeIndex]);

  useEffect(() => {
    if (!activeLayer) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeActiveLayer();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [activeLayer, closeActiveLayer]);

  useEffect(() => {
    if (!activeLayer) return;
    const frame = window.requestAnimationFrame(() => detailRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(frame);
  }, [activeLayer]);

  return (
    <div className="mx-auto max-w-7xl">
      <div
        className={`relative mx-auto grid items-center justify-items-center gap-8 md:gap-10 lg:gap-14 ${activeLayer ? "max-w-6xl md:grid-cols-2" : "max-w-[38rem] grid-cols-1"}`}
      >
        <div
          className={`relative aspect-square w-full max-w-[35rem] ${activeLayer ? "md:max-w-[30rem]" : ""}`}
        >
          <div
            aria-hidden="true"
            className={`absolute inset-[10%] translate-y-[7%] rounded-full bg-n-dark/15 blur-3xl transition-opacity duration-200 ${activeLayer ? "opacity-0 md:opacity-100" : "opacity-100"}`}
          />

          <div
            className={`absolute inset-0 transition-opacity duration-200 ${activeLayer ? "pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100" : "opacity-100"}`}
          >
            <div className={`absolute inset-0 transition-opacity duration-300 ${sceneReady && !sceneUnavailable ? "opacity-0" : "opacity-100"}`}>
              <EarthFallback highlightedTitle={highlightedTitle} />
            </div>
            {!sceneUnavailable && (
              <div className={`absolute inset-0 transition-opacity duration-500 ${sceneReady ? "opacity-100" : "opacity-0"}`}>
                <CoreValuesEarthScene
                  layers={layers}
                  activeTitle={activeTitle}
                  highlightedTitle={highlightedTitle}
                  reducedMotion={reducedMotion}
                  onHover={(title) => setHoveredTitle(title as LayerTitle | null)}
                  onReady={() => setSceneReady(true)}
                  onSelect={selectLayer}
                  onUnavailable={() => {
                    setSceneUnavailable(true);
                    setSceneReady(false);
                  }}
                />
              </div>
            )}
          </div>

          <div
            className={`absolute inset-x-[7%] bottom-[-9%] z-10 flex items-center justify-center gap-2.5 transition-opacity ${activeLayer ? "pointer-events-none opacity-0 md:pointer-events-auto md:opacity-100" : "opacity-100"}`}
            role="group"
            aria-label="Choose a Novus core value layer"
          >
            {layers.map((layer, index) => {
              const selected = activeTitle === layer.title;
              const highlighted = highlightedTitle === layer.title;
              return (
                <button
                  key={layer.title}
                  ref={(element) => { layerRefs.current[index] = element; }}
                  type="button"
                  aria-label={`${layer.layer}: ${layer.title}`}
                  aria-pressed={selected}
                  onClick={() => selectLayer(layer.title)}
                  onFocus={() => setFocusedTitle(layer.title)}
                  onBlur={() => setFocusedTitle(null)}
                  onMouseEnter={() => setHoveredTitle(layer.title)}
                  onMouseLeave={() => setHoveredTitle(null)}
                  className={`group relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 font-body text-xs font-bold shadow-sm backdrop-blur-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-purple focus-visible:ring-offset-2 ${highlighted ? "-translate-y-1 border-white bg-white text-n-ink shadow-md" : "border-white/75 bg-white/75 text-n-ink/70 hover:-translate-y-0.5 hover:bg-white"}`}
                >
                  <span
                    className="absolute inset-[5px] rounded-full border border-n-ink/15"
                    style={{ backgroundColor: layer.color }}
                    aria-hidden="true"
                  />
                  <span className="relative z-10" style={{ color: layer.text }}>{index + 1}</span>
                  <span className="pointer-events-none absolute bottom-full left-1/2 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-n-dark px-2.5 py-1 font-body text-[10px] normal-case tracking-normal text-white shadow-md group-hover:block">
                    {layer.layer}: {layer.title}
                  </span>
                </button>
              );
            })}
          </div>

          <p className={`pointer-events-none absolute left-1/2 top-[1%] z-10 -translate-x-1/2 whitespace-nowrap font-body text-[9px] font-bold uppercase tracking-[0.14em] text-n-ink/55 transition-opacity sm:text-[10px] ${activeLayer ? "opacity-0 md:opacity-100" : "opacity-100"}`}>
            Drag gently · Select a layer
          </p>
        </div>

        <AnimatePresence mode="popLayout" initial={false}>
          {activeLayer && activeValue ? (
            <motion.article
              layout
              key={activeLayer.title}
              ref={detailRef}
              tabIndex={-1}
              aria-label={`${activeValue.title} explanation`}
              aria-live="polite"
              onClick={closeActiveLayer}
              initial={reducedMotion ? false : { opacity: 0, scale: 0.72, x: -70 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, scale: 0.78, x: -55 }}
              transition={layoutTransition}
              className="group absolute inset-0 z-20 m-auto flex aspect-square w-[min(calc(100vw-2.5rem),calc(100svh-7.5rem),21rem)] cursor-pointer flex-col items-center justify-center rounded-full border-[8px] border-white/45 px-[11%] text-center shadow-[0_28px_70px_rgba(45,40,46,0.2)] outline-none focus-visible:ring-4 focus-visible:ring-n-purple/45 md:static md:m-0 md:w-full md:max-w-[30rem] md:border-[10px] md:px-[12%]"
              style={{ backgroundColor: activeLayer.color, color: activeLayer.text }}
            >
              <p className="font-body text-[10px] font-bold uppercase tracking-[0.2em] opacity-65 sm:text-xs">
                {activeLayer.layer} · {activeIndex + 1} of 4
              </p>
              <h3 className="mt-2.5 font-display text-[clamp(1.6rem,6.6vw,1.9rem)] font-bold leading-tight md:mt-3 md:text-3xl">
                {activeValue.title}
              </h3>
              <p className="mt-2.5 font-body text-[15px] font-semibold leading-snug opacity-65 min-[360px]:text-base md:mt-3">
                {activeLayer.reason}
              </p>
              <span className="my-3 h-px w-12 bg-current opacity-25 md:my-4" />
              <p className="font-body text-[15px] leading-[1.55] min-[360px]:text-base md:leading-relaxed">
                {activeValue.desc}
              </p>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  closeActiveLayer();
                }}
                className="mt-4 rounded-full border border-current/25 px-3 py-1.5 font-body text-[10px] font-bold uppercase tracking-[0.16em] opacity-65 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current md:mt-5"
              >
                Tap to close
              </button>
            </motion.article>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
