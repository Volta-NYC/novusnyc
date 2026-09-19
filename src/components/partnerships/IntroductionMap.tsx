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
import { CENTER, NOVUS_RADIUS, SATELLITE_LABEL_SIZE, VIEW_HEIGHT, VIEW_WIDTH, computeLayout, type EdgeLayout } from "./mapLayout";

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

function monogram(partner: PublicPartnership): string {
  return partner.monogram ?? partner.shortName.split(" ").filter((word) => /^[A-Z]/.test(word)).map((word) => word[0]).join("").slice(0, 4);
}

export default function IntroductionMap({ partners, describedBy }: { partners: PublicPartnership[]; describedBy: string }) {
  const reduced = useReducedMotion() ?? false;
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, { once: true, amount: 0.2 });
  const drawn = reduced || inView;
  const [settled, setSettled] = useState(false);
  // Hovering previews an organization; clicking or tabbing to it keeps it
  // selected so the panel stays put while the reader moves down to it.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const focusedId = hoveredId ?? selectedId;
  const [sheetId, setSheetId] = useState<string | null>(null);
  const compact = useCompact();
  const svgRef = useRef<SVGSVGElement>(null);
  const sceneRef = useRef<SVGGElement>(null);
  const { interacted, zoomedIn, zoomBy, showAll, centreOn, reveal } = usePanZoom({
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
          businessNames: (partner.businesses ?? []).map((business) => business.name),
        })),
      ),
    [partners],
  );
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout]);
  const ringIndex = useMemo(() => new Map(layout.order.map((id, index) => [id, index])), [layout]);

  const drawDelay = (index: number) => (reduced ? 0 : 0.15 + index * 0.03);
  const chordDelay = reduced ? 0 : 0.15 + layout.order.length * 0.03 + 0.1;

  useEffect(() => {
    if (!drawn || reduced) return;
    const timer = window.setTimeout(() => setSettled(true), (chordDelay + 1) * 1000);
    return () => window.clearTimeout(timer);
  }, [drawn, reduced, chordDelay]);

  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.slice(1);
      const node = layout.nodes.find((candidate) => candidate.id === id);
      if (!node) return;
      setSelectedId(id);
      centreOn(node);
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
    const partner = sheetId ? byId.get(sheetId) : undefined;
    setSheetId(null);
    if (!node || !partner) return;
    const box = { x0: node.x - node.r, y0: node.y - node.r, x1: node.x + node.r, y1: node.y + node.r };
    node.satellites.forEach((satellite, index) => {
      const width = (partner.businesses?.[index]?.name.length ?? 0) * SATELLITE_LABEL_SIZE * 0.56;
      const left = satellite.labelAnchor === "start" ? satellite.labelX : satellite.labelX - width;
      box.x0 = Math.min(box.x0, left, satellite.x - 6);
      box.x1 = Math.max(box.x1, left + width, satellite.x + 6);
      box.y0 = Math.min(box.y0, satellite.y - 10);
      box.y1 = Math.max(box.y1, satellite.y + 10);
    });
    reveal(box);
  }, [byId, nodeById, reveal, sheetId]);

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

  const focused = focusedId ? byId.get(focusedId) : undefined;
  const focusedNode = focusedId ? nodeById.get(focusedId) : undefined;

  return (
    <div ref={frameRef}>
      <div
        className="relative overflow-hidden"
        style={compact ? { height: "min(74svh, 760px)" } : { aspectRatio: `${VIEW_WIDTH} / ${VIEW_HEIGHT}` }}
      >
      <svg
        ref={svgRef}
        className={`block h-full w-full touch-none select-none ${zoomedIn ? "cursor-grab active:cursor-grabbing" : ""}`}
        role="group"
        aria-label="Map of the organizations that introduce Novus to small businesses, and who introduced whom"
        aria-describedby={describedBy}
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
          {layout.edges.filter((edge) => edge.type === "intro").map((edge) => (
            <mask key={edge.key} id={`pmap-mask-${edge.key}`} maskUnits="userSpaceOnUse" x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT}>
              <motion.path
                d={edge.d}
                fill="none"
                stroke="white"
                strokeWidth={10}
                initial={{ pathLength: reduced ? 1 : 0 }}
                animate={{ pathLength: drawn ? 1 : 0 }}
                transition={{ duration: reduced ? 0 : 0.9, delay: chordDelay, ease: [0.22, 1, 0.36, 1] }}
              />
            </mask>
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
                  mask={`url(#pmap-mask-${edge.key})`}
                />
                {edge.arrow && (
                  <motion.path
                    d={edge.arrow}
                    fill={PEACH}
                    initial={{ opacity: reduced ? 1 : 0 }}
                    animate={{ opacity: drawn ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : chordDelay + 0.8 }}
                  />
                )}
              </g>
            );
          })}
        </g>

        {settled && (
          <g aria-hidden="true" className="pointer-events-none">
            {layout.edges.filter((edge) => edge.type === "spoke").map((edge) => {
              const index = ringIndex.get(edge.to) ?? 0;
              const duration = 5.5 + (index % 4) * 0.7;
              const begin = `${((index * 0.61) % duration).toFixed(2)}s`;
              const active = !focusedId || edge.to === focusedId;
              return (
                <g key={edge.key} className={fade} style={{ opacity: active ? 0.9 : 0.1 }}>
                  <circle r={2.6} fill={PEACH} opacity={0}>
                    <animateMotion dur={`${duration}s`} begin={begin} repeatCount="indefinite" path={edge.d} />
                    <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.15;0.8;1" dur={`${duration}s`} begin={begin} repeatCount="indefinite" />
                  </circle>
                </g>
              );
            })}
          </g>
        )}

        <g aria-hidden="true" className={`pointer-events-none ${fade}`} style={{ opacity: nodeOpacity("novus") }}>
          {!reduced && (
            <circle cx={CENTER.x} cy={CENTER.y} r={NOVUS_RADIUS + 8} fill="none" stroke={PEACH} strokeWidth={1}>
              <animate attributeName="r" values={`${NOVUS_RADIUS + 8};${NOVUS_RADIUS + 26}`} dur="4.5s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity" values="0.3;0" dur="4.5s" repeatCount="indefinite" />
            </circle>
          )}
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
          const label = isFocused && node.satellites.length > 0 ? node.focusLabel : node.label;
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
                if (event.pointerType === "mouse") setHoveredId(node.id);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === "mouse") setHoveredId(null);
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
              {partner.logo ? (
                <image
                  href={partner.logo}
                  x={node.x - (node.r - 6)}
                  y={node.y - (node.r - 6)}
                  width={(node.r - 6) * 2}
                  height={(node.r - 6) * 2}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#pmap-clip-${node.id})`}
                />
              ) : (
                <text
                  x={node.x}
                  y={node.y + 3}
                  textAnchor="middle"
                  className="fill-n-ink font-display font-bold"
                  style={{ fontSize: monogram(partner).length > 4 ? 7.5 : 10 }}
                >
                  {monogram(partner)}
                </text>
              )}
              {(isFocused || (node.label.visible && (!neighbors || neighbors.has(node.id)))) && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  className={`pmap-halo fill-white font-body ${partner.depth === "deep" ? "font-semibold" : "font-medium"}`}
                  style={{ fontSize: label.fontSize }}
                >
                  {label.lines.map((line, index) => (
                    <tspan key={line} x={label.x} dy={index === 0 ? 0 : label.fontSize * 1.2}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}

        {focused && focusedNode && (
          <g aria-hidden="true" className="pointer-events-none">
            {focusedNode.satellites.map((satellite, index) => {
              const business = focused.businesses?.[index];
              if (!business) return null;
              const tone = TONE_VAR[KIND_TONE[focused.kind]];
              const live = business.status === "live";
              return (
                <motion.g
                  key={business.name}
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduced ? 0 : 0.22, delay: reduced ? 0 : index * 0.03 }}
                >
                  <line x1={satellite.lineStart.x} y1={satellite.lineStart.y} x2={satellite.x} y2={satellite.y} stroke={tone} strokeOpacity={0.55} strokeWidth={1} />
                  <circle cx={satellite.x} cy={satellite.y} r={5} fill={live ? tone : "rgb(var(--color-dark))"} stroke={tone} strokeWidth={1.8} />
                  <text
                    x={satellite.labelX}
                    y={satellite.labelY}
                    textAnchor={satellite.labelAnchor}
                    className="pmap-halo fill-white font-body font-medium"
                    style={{ fontSize: SATELLITE_LABEL_SIZE }}
                  >
                    {business.name}
                  </text>
                </motion.g>
              );
            })}
          </g>
        )}
        </g>
      </svg>

      <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-xl border border-white/15 bg-n-dark/85 backdrop-blur-sm">
        {[
          { label: "Zoom in", onClick: () => zoomBy(1.4), path: "M10 4 V16 M4 10 H16" },
          { label: "Zoom out", onClick: () => zoomBy(1 / 1.4), path: "M4 10 H16" },
          { label: "Show the whole map", onClick: showAll, path: "M4 8 V4 H8 M12 4 H16 V8 M16 12 V16 H12 M8 16 H4 V12" },
        ].map((control, index) => (
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

      {compact && (
        <p
          aria-hidden="true"
          className={`pointer-events-none absolute bottom-3 left-3 max-w-[15rem] rounded-full border border-white/15 bg-n-dark/85 px-3.5 py-2 font-body text-xs text-white/85 backdrop-blur-sm ${fade}`}
          style={{ opacity: interacted ? 0 : 1 }}
        >
          Drag to explore, pinch to zoom, tap an organization
        </p>
      )}
      </div>

      {compact ? (
        <div className="mt-6 border-t border-white/10 px-5 pt-6 md:px-0">
          <MapLegend compact />
        </div>
      ) : (
        <div aria-live="polite" className="mt-6 min-h-[17rem] border-t border-white/10 pt-7">
          {focused ? <PartnerDetail partner={focused} partnersById={byId} surface="dark" /> : <MapLegend compact={false} />}
        </div>
      )}

      {sheetId && byId.get(sheetId) && (
        <PartnerSheet partner={byId.get(sheetId) as PublicPartnership} partnersById={byId} onClose={closeSheet} />
      )}
    </div>
  );
}

function MapLegend({ compact }: { compact: boolean }) {
  const items = [
    { key: "spoke", label: "Works with Novus", icon: <line x1={2} y1={8} x2={30} y2={8} stroke="white" strokeOpacity={0.5} strokeWidth={1.4} /> },
    {
      key: "intro",
      label: "Introduced another organization",
      icon: (
        <>
          <line x1={2} y1={8} x2={23} y2={8} stroke={PEACH} strokeWidth={1.8} strokeDasharray="6 5" />
          <path d="M31,8 L22,3.5 L22,12.5 Z" fill={PEACH} />
        </>
      ),
    },
    { key: "live", label: "Site live", icon: <circle cx={16} cy={8} r={5} fill={PEACH} stroke={PEACH} strokeWidth={1.8} /> },
    { key: "progress", label: "Site in progress", icon: <circle cx={16} cy={8} r={5} fill="none" stroke={PEACH} strokeWidth={1.8} /> },
    { key: "orange", label: "Business Improvement Districts, development and merchant organizations", icon: <circle cx={16} cy={8} r={6} fill="white" stroke={TONE_VAR.orange} strokeWidth={3} /> },
    { key: "purple", label: "Chambers and business organizations", icon: <circle cx={16} cy={8} r={6} fill="white" stroke={TONE_VAR.purple} strokeWidth={3} /> },
  ];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-12">
      <p className="max-w-sm font-body text-base leading-relaxed text-white/75">
        {compact
          ? "Tap an organization to read what it does. Its businesses fan out on the map when you come back."
          : "Hover over an organization to preview it, or click to keep it open. Zoom with the buttons or a pinch, and drag to move around."}
      </p>
      <ul className="grid gap-x-10 gap-y-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-3 font-body text-sm leading-snug text-white/80">
            <svg width={32} height={16} viewBox="0 0 32 16" aria-hidden="true" className="mt-0.5 shrink-0">{item.icon}</svg>
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
