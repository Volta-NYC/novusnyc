"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  KIND_TONE,
  ROLE_LABEL,
  sectorLabel,
  type PartnerTone,
  type PublicPartnership,
} from "@/data/partnerships";
import PartnerDetail from "./PartnerDetail";
import PartnerSheet from "./PartnerSheet";
import { usePanZoom } from "./usePanZoom";
import { CENTER, NOVUS_RADIUS, VIEW_HEIGHT, VIEW_WIDTH, computeLayout, type EdgeLayout, type NodeLayout } from "./mapLayout";

const TONE_VAR: Record<PartnerTone, string> = {
  purple: "rgb(var(--color-purple))",
  orange: "rgb(var(--color-orange))",
};
const PEACH = "rgb(var(--color-orange))";

const BASE_EDGE_OPACITY: Record<EdgeLayout["type"], number> = { spoke: 0.2, intro: 0.7 };
const ACTIVE_EDGE_OPACITY: Record<EdgeLayout["type"], number> = { spoke: 0.7, intro: 1 };
const DIM = 0.15;

// Phones and tablets open an organization in a full-screen sheet; mouse
// screens keep the hover preview and the panel under the map.
const COMPACT_QUERY = "(max-width: 767px), (pointer: coarse)";

function useCompact(): boolean {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(COMPACT_QUERY);
    const onChange = () => setCompact(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return compact;
}

// Zoomed in far enough that labels read at phone size, but never past the
// point where the whole ring height stops fitting.
function initialScale({ h, fit }: { w: number; h: number; fit: number }): number {
  return window.matchMedia(COMPACT_QUERY).matches ? Math.max(fit, Math.min(0.8, h / (VIEW_HEIGHT * 0.85))) : fit;
}

// Logos are drawn about 54px wide; the optimizer serves them at that size
// instead of the multi-hundred-kilobyte originals. The quality has to be one
// of next.config's images.qualities, or the optimizer answers 400 and every
// logo on the map breaks at once.
function optimizedLogo(src: string): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=128&q=75`;
}

function monogram(partner: PublicPartnership): string {
  return partner.monogram ?? partner.shortName.split(" ").filter((word) => /^[A-Z]/.test(word)).map((word) => word[0]).join("").slice(0, 4);
}

export default function IntroductionMap({ partners }: { partners: PublicPartnership[] }) {
  const reduced = useReducedMotion() ?? false;
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, { once: true, amount: 0.2 });
  const drawn = reduced || inView;
  // Hovering previews an organization; clicking or tabbing to it keeps it
  // selected so the panel stays put while the reader moves down to it.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const focusedId = hoveredId ?? selectedId;
  // A cursor crossing the ring passes over several circles. Settling for a
  // moment before the panel changes keeps a fast pass from flashing through
  // half the roster, and the longer grace on the way out stops the gap
  // between a circle and its label from closing the panel.
  const hoverTarget = useRef<string | null>(null);
  const hoverTimer = useRef<number | undefined>(undefined);
  const hover = useCallback((id: string | null) => {
    if (hoverTarget.current === id) return;
    hoverTarget.current = id;
    window.clearTimeout(hoverTimer.current);
    hoverTimer.current = window.setTimeout(() => setHoveredId(id), id ? 70 : 260);
  }, []);
  useEffect(() => () => window.clearTimeout(hoverTimer.current), []);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const compact = useCompact();
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<SVGGElement>(null);
  const { zoomedIn, zoomBy, showAll, centreOn, reveal } = usePanZoom({
    svgRef,
    sceneRef,
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    maxScale: 2,
    initialScale,
    focus: CENTER,
    reduced,
  });

  const byId = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);
  const layout = useMemo(
    () =>
      computeLayout(
        partners.map((partner) => ({
          id: partner.id,
          shortName: partner.shortName,
          sector: partner.mapSector ?? (partner.sector === "citywide" ? "Manhattan" : partner.sector),
          depth: partner.depth,
          introducedBy: partner.introducedBy,
        })),
      ),
    [partners],
  );
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout]);
  const ringIndex = useMemo(() => new Map(layout.order.map((id, index) => [id, index])), [layout]);

  const drawDelay = (index: number) => (reduced ? 0 : 0.15 + index * 0.03);
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      const node = layout.nodes.find((candidate) => candidate.id === id);
      if (!node) return;
      setSelectedId(id);
      centreOn(node);
      frameRef.current?.scrollIntoView({ block: "start" });
      if (window.matchMedia(COMPACT_QUERY).matches) setSheetId(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [layout, centreOn]);

  useEffect(() => {
    if (!focusedId || sheetId) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setHoveredId(null);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedId, sheetId]);

  const neighbors = useMemo(() => {
    if (!focusedId) return null;
    const set = new Set<string>([focusedId, "novus"]);
    for (const edge of layout.edges) {
      if (edge.type === "spoke") continue;
      if (edge.from === focusedId) set.add(edge.to);
      if (edge.to === focusedId) set.add(edge.from);
    }
    return set;
  }, [focusedId, layout]);

  const selectNode = (id: string) => {
    setSelectedId(id);
    if (compact) setSheetId(id);
  };
  const closeSheet = useCallback(() => {
    const node = sheetId ? nodeById.get(sheetId) : undefined;
    setSheetId(null);
    if (!node) return;
    reveal({ x0: node.x - node.r, y0: node.y - node.r, x1: node.x + node.r, y1: node.y + node.r });
  }, [nodeById, reveal, sheetId]);

  const onNodeKey = (id: string) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectNode(id);
    }
  };

  const edgeOpacity = (edge: EdgeLayout) => {
    if (!focusedId) return BASE_EDGE_OPACITY[edge.type];
    const active = edge.from === focusedId || edge.to === focusedId;
    return active ? ACTIVE_EDGE_OPACITY[edge.type] : BASE_EDGE_OPACITY[edge.type] * DIM;
  };
  const nodeOpacity = (id: string) => (!neighbors || neighbors.has(id) ? 1 : DIM);
  const fade = reduced ? "" : "transition-opacity duration-[250ms] ease-out";
  const mapControls = [
    { label: "Zoom in", onClick: () => zoomBy(1.4), path: "M10 4 V16 M4 10 H16" },
    { label: "Zoom out", onClick: () => zoomBy(1 / 1.4), path: "M4 10 H16" },
    { label: "Show the whole map", onClick: showAll, path: "M4 8 V4 H8 M12 4 H16 V8 M16 12 V16 H12 M8 16 H4 V12" },
  ];

  const focused = focusedId ? byId.get(focusedId) : undefined;
  // The panel keeps the organization it last showed while it fades out, so
  // letting go of a circle never empties the page under the cursor.
  const [shown, setShown] = useState<PublicPartnership | null>(null);
  useEffect(() => {
    if (focused) setShown(focused);
  }, [focused]);

  return (
    <div ref={frameRef} className="scroll-mt-20">
      <div
        className="relative overflow-hidden"
        style={compact ? { height: "min(74svh, 760px)" } : { aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
      >
      <svg
        ref={svgRef}
        className={`block h-full w-full touch-none select-none ${zoomedIn ? "cursor-grab active:cursor-grabbing" : ""}`}
        role="group"
        aria-label="Map of the organizations that introduce Novus to small businesses, and who introduced whom"
      >
        <defs>
          <radialGradient id="pmap-glow">
            <stop offset="0%" style={{ stopColor: PEACH, stopOpacity: 0.2 }} />
            <stop offset="55%" style={{ stopColor: PEACH, stopOpacity: 0.07 }} />
            <stop offset="100%" style={{ stopColor: PEACH, stopOpacity: 0 }} />
          </radialGradient>
          <clipPath id="pmap-novus-clip">
            <circle cx={CENTER.x} cy={CENTER.y} r={NOVUS_RADIUS - 8} />
          </clipPath>
          {layout.nodes.map((node) => (
            <clipPath key={node.id} id={`pmap-clip-${node.id}`}>
              <circle cx={node.x} cy={node.y} r={node.r - 4} />
            </clipPath>
          ))}
        </defs>

        <rect x={0} y={0} width="100%" height="100%" fill="transparent" onClick={() => setSelectedId(null)} />

        <g ref={sceneRef}>

        <g aria-hidden="true" className={`pointer-events-none ${fade}`} style={{ opacity: focusedId ? 0 : 1 }}>
          {layout.sectorLabels.map((label) => (
            <text
              key={label.sector}
              x={label.x}
              y={label.y}
              textAnchor="middle"
              transform={label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined}
              className="fill-white/35 font-body text-[11px] font-bold uppercase tracking-[0.2em]"
            >
              {label.sector}
            </text>
          ))}
        </g>

        <g aria-hidden="true" className="pointer-events-none">
          <circle cx={CENTER.x} cy={CENTER.y} r={NOVUS_RADIUS + 46} fill="url(#pmap-glow)" />
          {layout.edges.map((edge) => {
            if (edge.type === "spoke") {
              const index = ringIndex.get(edge.to) ?? 0;
              return (
                <g key={edge.key} className={fade} style={{ opacity: edgeOpacity(edge) }}>
                  <motion.path
                    d={edge.d}
                    fill="none"
                    stroke="white"
                    strokeWidth={1.2}
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    animate={{ pathLength: drawn ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.55, delay: drawDelay(index), ease: "easeOut" }}
                  />
                </g>
              );
            }
            return (
              <g key={edge.key} className={fade} style={{ opacity: edgeOpacity(edge) }}>
                <path
                  d={edge.d}
                  fill="none"
                  stroke={PEACH}
                  strokeWidth={1.8}
                  strokeDasharray="6 5"
                  strokeLinecap="round"
                />
                {edge.arrow && (
                  <path
                    d={edge.arrow}
                    fill={PEACH}
                  />
                )}
              </g>
            );
          })}
        </g>

        <MapFlowDots nodes={layout.nodes} drawn={drawn} reduced={reduced} focusedId={focusedId} />

        <g aria-hidden="true" className={`pointer-events-none ${fade}`} style={{ opacity: nodeOpacity("novus") }}>
          <circle cx={CENTER.x} cy={CENTER.y} r={NOVUS_RADIUS + 8} fill="none" stroke={PEACH} strokeOpacity={0.22} strokeWidth={1} />
          <circle cx={CENTER.x} cy={CENTER.y} r={NOVUS_RADIUS} fill="rgb(var(--color-dark))" stroke={PEACH} strokeOpacity={0.85} strokeWidth={2} />
          <image
            href="/logo.png"
            x={CENTER.x - (NOVUS_RADIUS - 13)}
            y={CENTER.y - (NOVUS_RADIUS - 13)}
            width={(NOVUS_RADIUS - 13) * 2}
            height={(NOVUS_RADIUS - 13) * 2}
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#pmap-novus-clip)"
          />
          <text x={CENTER.x} y={CENTER.y + NOVUS_RADIUS + 22} textAnchor="middle" className="pmap-halo fill-white font-display text-[15px] font-bold">
            Novus
          </text>
        </g>

        {layout.nodes.map((node) => {
          const partner = byId.get(node.id);
          if (!partner) return null;
          const tone = TONE_VAR[KIND_TONE[partner.kind]];
          const isFocused = node.id === focusedId;
          const roles = partner.roles.map((role) => ROLE_LABEL[role]).join(", ");
          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${partner.name}, ${sectorLabel(partner.sector)}.${roles ? ` ${roles}.` : ""}`}
              aria-pressed={isFocused}
              className={`group cursor-pointer outline-none ${fade}`}
              style={{ opacity: nodeOpacity(node.id) }}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") hover(node.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") hover(null);
              }}
              onFocus={() => {
                setSelectedId(node.id);
                centreOn(node, true);
              }}
              onClick={(event) => {
                event.stopPropagation();
                selectNode(node.id);
              }}
              onKeyDown={onNodeKey(node.id)}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r + 7}
                fill="none"
                stroke="white"
                strokeWidth={1.5}
                className={isFocused ? "opacity-80" : "opacity-0 group-focus-visible:opacity-100"}
              />
              <circle cx={node.x} cy={node.y} r={node.r} fill="white" stroke={tone} strokeWidth={3} />
              <NodeMark partner={partner} node={node} />
              {(isFocused || (node.label.visible && (!neighbors || neighbors.has(node.id)))) && (
                <text
                  x={node.label.x}
                  y={node.label.y}
                  textAnchor={node.label.anchor}
                  className={`pmap-halo fill-white font-body ${partner.depth === "deep" ? "font-semibold" : "font-medium"}`}
                  style={{ fontSize: node.label.fontSize }}
                >
                  {node.label.lines.map((line, index) => (
                    <tspan key={line} x={node.label.x} dy={index === 0 ? 0 : node.label.fontSize * 1.2}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}

        </g>
      </svg>

      {!compact && (
        <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl border border-white/15 bg-n-dark/85 backdrop-blur-sm">
          {mapControls.map((control, index) => (
            <button
              key={control.label}
              type="button"
              onClick={control.onClick}
              aria-label={control.label}
              title={control.label}
              className={`flex h-11 w-11 items-center justify-center text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 ${index > 0 ? "border-t border-white/10" : ""}`}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                <path d={control.path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      )}
      </div>

      {/* On a phone the ring is zoomed until its full height fills the frame,
          which puts the bottom row of labels right at the edge. Anything laid
          over the frame there covers names, so the hint and controls sit in a
          bar underneath instead. */}
      {compact && (
        <div className="mt-3 flex items-center justify-between gap-3 px-4">
          <p className="font-body text-xs text-white/60">Drag to explore, pinch to zoom, tap an organization</p>
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-white/15 bg-n-dark/85">
            {mapControls.map((control, index) => (
              <button
                key={control.label}
                type="button"
                onClick={control.onClick}
                aria-label={control.label}
                title={control.label}
                className={`flex h-11 w-11 items-center justify-center text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70 ${index > 0 ? "border-l border-white/10" : ""}`}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
                  <path d={control.path} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      )}

      {compact ? null : (
        <div aria-live="polite" className="mt-6 grid min-h-[25rem] border-t border-white/10 pt-7 lg:min-h-[22rem] xl:min-h-[19.5rem] [&>*]:col-start-1 [&>*]:row-start-1">
          <div aria-hidden={Boolean(focused)} className={`self-start ${fade} ${focused ? "pointer-events-none opacity-0" : "opacity-100 delay-100"}`}>
            <p className="font-body text-sm text-white/45">Hover over an organization to see more</p>
          </div>
          {shown && (
            <div aria-hidden={!focused} className={`self-start ${fade} ${focused ? "opacity-100 delay-100" : "pointer-events-none opacity-0"}`}>
              <PartnerDetail partner={shown} partnersById={byId} surface="dark" />
            </div>
          )}
        </div>
      )}

      {sheetId && byId.get(sheetId) && (
        <PartnerSheet partner={byId.get(sheetId) as PublicPartnership} partnersById={byId} onClose={closeSheet} />
      )}
    </div>
  );
}

// The globe uses a few travelling pulses to show movement through the network.
// Keeping this to eight dots and advancing them from one requestAnimationFrame
// loop preserves that cue without asking the browser to animate every spoke.
function MapFlowDots({
  nodes,
  drawn,
  reduced,
  focusedId,
}: {
  nodes: NodeLayout[];
  drawn: boolean;
  reduced: boolean;
  focusedId: string | null;
}) {
  const dotRefs = useRef<Array<SVGCircleElement | null>>([]);
  const routes = useMemo(() => {
    const candidates = focusedId ? nodes.filter((node) => node.id === focusedId) : nodes;
    const stride = Math.max(1, Math.ceil(candidates.length / 8));
    return candidates.filter((_, index) => index % stride === 0).slice(0, 8);
  }, [focusedId, nodes]);

  useEffect(() => {
    if (!drawn || reduced || routes.length === 0) return;
    let frame = 0;
    let running = !document.hidden;
    const duration = 5600;

    const draw = (now: number) => {
      if (!running) return;
      routes.forEach((node, index) => {
        const dot = dotRefs.current[index];
        if (!dot) return;
        const progress = ((now + index * (duration / routes.length)) % duration) / duration;
        const dx = node.x - CENTER.x;
        const dy = node.y - CENTER.y;
        const distance = Math.hypot(dx, dy) || 1;
        const start = NOVUS_RADIUS + 8;
        const end = distance - node.r - 4;
        const traveled = start + (end - start) * progress;
        const x = CENTER.x + (dx / distance) * traveled;
        const y = CENTER.y + (dy / distance) * traveled;
        dot.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
        dot.setAttribute("opacity", `${Math.sin(Math.PI * progress).toFixed(2)}`);
      });
      frame = requestAnimationFrame(draw);
    };

    const onVisibilityChange = () => {
      running = !document.hidden;
      if (running) frame = requestAnimationFrame(draw);
      else cancelAnimationFrame(frame);
    };

    frame = requestAnimationFrame(draw);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [drawn, reduced, routes]);

  return (
    <g aria-hidden="true" className="pointer-events-none">
      {routes.map((node, index) => (
        <circle key={node.id} ref={(element) => { dotRefs.current[index] = element; }} r={2.6} fill={PEACH} opacity={0} />
      ))}
    </g>
  );
}

function NodeMark({ partner, node }: { partner: PublicPartnership; node: NodeLayout }) {
  const src = partner.logo ? optimizedLogo(partner.logo) : null;
  const text = monogram(partner);
  return (
    <>
      <text
        x={node.x}
        y={node.y + 3}
        textAnchor="middle"
        className="fill-n-ink font-display font-bold"
        style={{ fontSize: text.length > 4 ? 7.5 : 10 }}
      >
        {text}
      </text>
      {src && (
        <image
          href={src}
          x={node.x - (node.r - 6)}
          y={node.y - (node.r - 6)}
          width={(node.r - 6) * 2}
          height={(node.r - 6) * 2}
          preserveAspectRatio="xMidYMid meet"
          clipPath={`url(#pmap-clip-${node.id})`}
        />
      )}
    </>
  );
}
