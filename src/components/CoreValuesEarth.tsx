"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
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

type Connector = {
  color: string;
  path: string;
  title: LayerTitle;
};

const displayLayers = [...layers].reverse();

const CoreValuesEarthScene = dynamic(() => import("@/components/CoreValuesEarthScene"), {
  ssr: false,
});

function EarthFallback({ highlightedTitle }: { highlightedTitle: LayerTitle | null }) {
  const emphasized = (title: LayerTitle) => highlightedTitle === title;
  const fallbackLayers = [
    { title: "Local trust", radius: 108, innerRadius: 82, color: "#75526D" },
    { title: "Clear communication", radius: 82, innerRadius: 54, color: "#BEA2BA" },
    { title: "Useful work", radius: 54, innerRadius: 31, color: "#F3E28D" },
    { title: "Student ownership", radius: 31, innerRadius: 0, color: "#F6B78D" },
  ] as const;

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

      <circle cx="120" cy="120" r="108" fill="#75526D" />
      <circle cx="120" cy="120" r="108" fill="url(#core-values-fallback-light)" />
      <path d="M120 120V12A108 108 0 0 1 228 120Z" fill="#FFFDF9" />

      {fallbackLayers.map((layer) => {
        const outerTop = 120 - layer.radius;
        const outerRight = 120 + layer.radius;
        const innerTop = 120 - layer.innerRadius;
        const innerRight = 120 + layer.innerRadius;
        const path = layer.innerRadius === 0
          ? `M120 120V${outerTop}A${layer.radius} ${layer.radius} 0 0 1 ${outerRight} 120Z`
          : `M120 ${outerTop}A${layer.radius} ${layer.radius} 0 0 1 ${outerRight} 120H${innerRight}A${layer.innerRadius} ${layer.innerRadius} 0 0 0 120 ${innerTop}Z`;
        return (
          <path
            key={layer.title}
            d={path}
            fill={layer.color}
            stroke={emphasized(layer.title) ? "#FFFDF9" : "rgba(255,253,249,0.62)"}
            strokeWidth={emphasized(layer.title) ? 3 : 1.25}
          />
        );
      })}
      <path d="M120 12V120H228" fill="none" stroke="rgba(45,40,46,0.22)" strokeWidth="1.25" />
    </svg>
  );
}

export default function CoreValuesEarth({ values }: { values: CoreValue[] }) {
  const reducedMotion = useReducedMotion() ?? false;
  const instanceId = useId().replace(/:/g, "");
  const layoutRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef(new Map<LayerTitle, HTMLButtonElement>());
  const [activeTitle, setActiveTitle] = useState<LayerTitle | null>(null);
  const [focusedTitle, setFocusedTitle] = useState<LayerTitle | null>(null);
  const [hoveredTitle, setHoveredTitle] = useState<LayerTitle | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneUnavailable, setSceneUnavailable] = useState(false);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const valuesByTitle = useMemo(() => new Map(values.map((value) => [value.title, value])), [values]);
  const highlightedTitle = activeTitle ?? focusedTitle ?? hoveredTitle;

  const toggleLayer = useCallback((title: string) => {
    if (!layers.some((layer) => layer.title === title)) return;
    setActiveTitle((current) => current === title ? null : title as LayerTitle);
  }, []);

  useEffect(() => {
    if (!activeTitle) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setActiveTitle(null);
      buttonRefs.current.get(activeTitle)?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [activeTitle]);

  useLayoutEffect(() => {
    const layout = layoutRef.current;
    const globe = globeRef.current;
    if (!layout || !globe) return;

    let animationFrame = 0;
    const updateConnectors = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(() => {
        if (window.innerWidth < 768) {
          setConnectors([]);
          return;
        }

        const layoutRect = layout.getBoundingClientRect();
        const globeRect = globe.getBoundingClientRect();
        const anchors: Record<LayerTitle, { x: number; y: number }> = {
          "Local trust": { x: 0.81, y: 0.19 },
          "Clear communication": { x: 0.72, y: 0.28 },
          "Useful work": { x: 0.64, y: 0.36 },
          "Student ownership": { x: 0.55, y: 0.45 },
        };

        const nextConnectors = displayLayers.flatMap((layer) => {
          const button = buttonRefs.current.get(layer.title);
          if (!button) return [];
          const buttonRect = button.getBoundingClientRect();
          const anchor = anchors[layer.title];
          const startX = globeRect.left - layoutRect.left + globeRect.width * anchor.x;
          const startY = globeRect.top - layoutRect.top + globeRect.height * anchor.y;
          const endX = buttonRect.left - layoutRect.left - 10;
          const endY = buttonRect.top - layoutRect.top + buttonRect.height / 2;
          const controlX = startX + Math.max(34, (endX - startX) * 0.48);
          const path = `M ${endX} ${endY} C ${endX - 48} ${endY}, ${controlX} ${startY}, ${startX} ${startY}`;
          return [{ color: layer.color, path, title: layer.title }];
        });
        setConnectors(nextConnectors);
      });
    };

    const resizeObserver = new ResizeObserver(updateConnectors);
    resizeObserver.observe(layout);
    resizeObserver.observe(globe);
    buttonRefs.current.forEach((button) => resizeObserver.observe(button));
    updateConnectors();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
    };
  }, [activeTitle]);

  return (
    <div className="mx-auto max-w-6xl">
      <div
        ref={layoutRef}
        className="relative grid items-start gap-8 md:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.82fr)] md:gap-12 lg:gap-16"
      >
        <svg
          className="pointer-events-none absolute inset-0 z-10 hidden h-full w-full overflow-visible md:block"
          aria-hidden="true"
        >
          <defs>
            {connectors.map((connector) => (
              <marker
                key={connector.title}
                id={`${instanceId}-${connector.title.replace(/\s/g, "-")}-arrow`}
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="4"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path d="M0 0L8 4L0 8Z" fill={connector.color} />
              </marker>
            ))}
          </defs>
          {connectors.map((connector) => (
            <g key={connector.title}>
              <path d={connector.path} fill="none" stroke="rgba(255,253,249,0.9)" strokeWidth="5" />
              <path
                d={connector.path}
                fill="none"
                markerEnd={`url(#${instanceId}-${connector.title.replace(/\s/g, "-")}-arrow)`}
                stroke={connector.color}
                strokeLinecap="round"
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>

        <div ref={globeRef} className="relative z-0 mx-auto aspect-square w-[min(88vw,23rem)] md:w-full md:max-w-[34rem]">
          <div aria-hidden="true" className="absolute inset-[12%] translate-y-[12%] rounded-full bg-n-dark/15 blur-3xl" />
          <div className="absolute inset-0">
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
                  onSelect={toggleLayer}
                  onUnavailable={() => {
                    setSceneUnavailable(true);
                    setSceneReady(false);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="relative z-20 flex flex-col gap-3" role="group" aria-label="Novus core values">
          {displayLayers.map((layer) => {
            const value = valuesByTitle.get(layer.title);
            if (!value) return null;
            const expanded = activeTitle === layer.title;
            const highlighted = highlightedTitle === layer.title;
            const panelId = `${instanceId}-${layer.title.replace(/\s/g, "-")}-panel`;
            const buttonId = `${instanceId}-${layer.title.replace(/\s/g, "-")}-button`;

            return (
              <motion.div
                layout
                key={layer.title}
                className={`overflow-hidden rounded-2xl border bg-white/[0.92] shadow-[0_12px_30px_rgba(45,40,46,0.08)] backdrop-blur-sm transition-colors ${expanded ? "border-n-ink/30" : highlighted ? "border-n-purple/55" : "border-n-border"}`}
              >
                <button
                  id={buttonId}
                  ref={(element) => {
                    if (element) buttonRefs.current.set(layer.title, element);
                    else buttonRefs.current.delete(layer.title);
                  }}
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => toggleLayer(layer.title)}
                  onFocus={() => setFocusedTitle(layer.title)}
                  onBlur={() => setFocusedTitle(null)}
                  onMouseEnter={() => setHoveredTitle(layer.title)}
                  onMouseLeave={() => setHoveredTitle(null)}
                  className="group flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-n-purple sm:px-5"
                >
                  <span className="flex shrink-0 items-center" aria-hidden="true">
                    <span className="font-body text-base font-bold leading-none md:hidden" style={{ color: layer.color }}>↑</span>
                    <span className="hidden font-body text-sm font-bold leading-none md:inline" style={{ color: layer.color }}>←</span>
                    <span className="mx-1.5 h-px w-4 md:w-5" style={{ backgroundColor: layer.color }} />
                    <span className="h-3 w-3 rounded-full border border-n-ink/15" style={{ backgroundColor: layer.color }} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="sr-only">{layer.layer}: </span>
                    <span className="block font-display text-lg font-bold leading-tight text-n-ink sm:text-xl">{layer.title}</span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={`relative h-5 w-5 shrink-0 text-n-muted transition-transform duration-200 ${expanded ? "rotate-45" : ""}`}
                  >
                    <span className="absolute left-1/2 top-1/2 h-px w-3 -translate-x-1/2 -translate-y-1/2 bg-current" />
                    <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 bg-current" />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      initial={reducedMotion ? false : { height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={reducedMotion ? undefined : { height: 0, opacity: 0 }}
                      transition={reducedMotion ? { duration: 0 } : { duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="border-t border-n-border px-4 pb-5 pt-4 sm:px-5">
                        <p className="font-body text-xs font-bold uppercase tracking-[0.12em] text-n-orange-ink">{layer.reason}</p>
                        <p className="mt-2 font-body text-sm leading-relaxed text-n-muted sm:text-base">{value.desc}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
