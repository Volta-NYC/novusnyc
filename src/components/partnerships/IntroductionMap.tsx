"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  KIND_TONE,
  ROLE_LABEL,
  sectorLabel,
  type PartnerTone,
  type PublicPartnership,
} from "@/data/partnerships";
import PartnerDetail from "./PartnerDetail";
import { CENTER, NOVUS_RADIUS, VIEW_HEIGHT, VIEW_WIDTH, computeLayout, type EdgeLayout } from "./mapLayout";

const TONE_VAR: Record<PartnerTone, string> = {
  purple: "rgb(var(--color-purple))",
  orange: "rgb(var(--color-orange))",
};
const PEACH = "rgb(var(--color-orange))";

const BASE_EDGE_OPACITY: Record<EdgeLayout["type"], number> = { spoke: 0.2, intro: 0.7 };
const ACTIVE_EDGE_OPACITY: Record<EdgeLayout["type"], number> = { spoke: 0.7, intro: 1 };
const DIM = 0.15;

function monogram(partner: PublicPartnership): string {
  return partner.monogram ?? partner.shortName.split(" ").filter((word) => /^[A-Z]/.test(word)).map((word) => word[0]).join("").slice(0, 4);
}

export default function IntroductionMap({ partners, describedBy }: { partners: PublicPartnership[]; describedBy: string }) {
  const reduced = useReducedMotion() ?? false;
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, { once: true, amount: 0.25 });
  const drawn = reduced || inView;
  const [settled, setSettled] = useState(false);
  const [focusedId, setFocusedId] = useState<string | null>(null);

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
          businessCount: partner.businesses?.length ?? 0,
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
      if (byId.has(id)) setFocusedId(id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [byId]);

  useEffect(() => {
    if (!focusedId) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setFocusedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedId]);

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

  const onNodeKey = (id: string) => (event: KeyboardEvent<SVGGElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setFocusedId(id);
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
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="block h-auto w-full select-none"
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

        <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="transparent" onClick={() => setFocusedId(null)} />

        <g aria-hidden="true" className={`pointer-events-none ${fade}`} style={{ opacity: focusedId ? 0.4 : 1 }}>
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
            const showVia = Boolean(edge.via && focusedId && (edge.from === focusedId || edge.to === focusedId));
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
                {edge.via && (
                  <text
                    x={edge.via.point.x}
                    y={edge.via.point.y}
                    textAnchor="middle"
                    className={`pmap-halo fill-n-orange font-body text-[12px] font-semibold ${fade}`}
                    style={{ opacity: showVia ? 1 : 0 }}
                  >
                    {edge.via.label}
                  </text>
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
          <text x={CENTER.x} y={CENTER.y + NOVUS_RADIUS + 22} textAnchor="middle" className="pmap-halo fill-white font-display text-[14px] font-bold">
            Novus
          </text>
        </g>

        {layout.nodes.map((node) => {
          const partner = byId.get(node.id);
          if (!partner) return null;
          const tone = TONE_VAR[KIND_TONE[partner.kind]];
          const isFocused = node.id === focusedId;
          const label = isFocused ? node.focusLabel : node.label;
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
              onMouseEnter={() => setFocusedId(node.id)}
              onFocus={() => setFocusedId(node.id)}
              onClick={(event) => {
                event.stopPropagation();
                setFocusedId(node.id);
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
                    className="pmap-halo fill-white font-body text-[11.5px] font-medium"
                  >
                    {business.name}
                  </text>
                </motion.g>
              );
            })}
          </g>
        )}
      </svg>

      <div aria-live="polite" className="mt-6 min-h-[17rem] border-t border-white/10 pt-7">
        {focused ? <PartnerDetail partner={focused} partnersById={byId} surface="dark" /> : <MapLegend />}
      </div>
    </div>
  );
}

function MapLegend() {
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
        Hover, tap or tab to an organization to read what it does and see the businesses that came to Novus through it.
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
