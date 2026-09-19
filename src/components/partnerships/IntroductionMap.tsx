"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  KIND_TONE,
  ROLE_META,
  sectorLabel,
  type PartnerTone,
  type PublicPartnership,
} from "@/data/partnerships";
import { CENTER, NOVUS_RADIUS, VIEW_HEIGHT, VIEW_WIDTH, computeLayout, type EdgeLayout } from "./mapLayout";

const TONE_VAR: Record<PartnerTone, string> = {
  purple: "rgb(var(--color-purple))",
  orange: "rgb(var(--color-orange))",
  yellow: "rgb(var(--color-yellow))",
};

const BASE_EDGE_OPACITY: Record<EdgeLayout["type"], number> = { spoke: 0.22, intro: 0.62, alongside: 0.55 };
const ACTIVE_EDGE_OPACITY: Record<EdgeLayout["type"], number> = { spoke: 0.75, intro: 1, alongside: 1 };
const DIM = 0.15;

function initials(partner: PublicPartnership): string {
  return partner.monogram ?? partner.shortName.split(" ").filter((word) => /^[A-Z]/.test(word)).map((word) => word[0]).join("").slice(0, 4);
}

export default function IntroductionMap({ partners, describedBy }: { partners: PublicPartnership[]; describedBy: string }) {
  const reduced = useReducedMotion() ?? false;
  const frameRef = useRef<HTMLDivElement>(null);
  const inView = useInView(frameRef, { once: true, amount: 0.25 });
  const drawn = reduced || inView;
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const byId = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);
  const layout = useMemo(
    () =>
      computeLayout(
        partners.map((partner) => ({
          id: partner.id,
          shortName: partner.shortName,
          kind: partner.kind,
          sector: partner.sector,
          depth: partner.depth,
          introducedBy: partner.introducedBy,
          worksAlongside: partner.worksAlongside,
          businessCount: partner.businesses?.length ?? 0,
        })),
      ),
    [partners],
  );
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout]);
  const ringIndex = useMemo(() => new Map(layout.order.map((id, index) => [id, index])), [layout]);

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

  const clear = useCallback(() => setFocusedId(null), []);

  useEffect(() => {
    if (!focusedId) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setFocusedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusedId]);

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
  const drawDelay = (index: number) => (reduced ? 0 : 0.15 + index * 0.035);
  const chordDelay = reduced ? 0 : 0.15 + layout.order.length * 0.035 + 0.1;

  return (
    <div ref={frameRef} className="relative">
      <svg
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        className="block h-auto w-full select-none"
        role="group"
        aria-label="Map of the organizations that introduce Novus to small businesses, and who introduced whom"
        aria-describedby={describedBy}
      >
        <defs>
          <clipPath id="pmap-novus-clip">
            <circle cx={CENTER.x} cy={CENTER.y} r={NOVUS_RADIUS - 8} />
          </clipPath>
          {layout.nodes.map((node) => (
            <clipPath key={node.id} id={`pmap-clip-${node.id}`}>
              <circle cx={node.x} cy={node.y} r={node.r - 4} />
            </clipPath>
          ))}
          {layout.edges.filter((edge) => edge.type !== "spoke").map((edge) => (
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

        <rect x={0} y={0} width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="transparent" onClick={clear} />

        <g aria-hidden="true" className="pointer-events-none">
          {layout.sectorLabels.map((label) => (
            <text
              key={label.sector}
              x={label.x}
              y={label.y}
              textAnchor={label.anchor}
              transform={label.rotate ? `rotate(${label.rotate} ${label.x} ${label.y})` : undefined}
              className="fill-white/35 font-body text-[11px] font-bold uppercase tracking-[0.2em]"
            >
              {label.sector}
            </text>
          ))}
        </g>

        <g aria-hidden="true" className="pointer-events-none">
          {layout.edges.map((edge) => {
            if (edge.type === "spoke") {
              return (
                <g key={edge.key} className={fade} style={{ opacity: edgeOpacity(edge) }}>
                  <motion.path
                    d={edge.d}
                    fill="none"
                    stroke="white"
                    strokeWidth={1.2}
                    initial={{ pathLength: reduced ? 1 : 0 }}
                    animate={{ pathLength: drawn ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.55, delay: drawDelay(ringIndex.get(edge.to) ?? 0), ease: "easeOut" }}
                  />
                </g>
              );
            }
            const stroke = edge.type === "intro" ? "rgb(var(--color-orange))" : "rgb(var(--color-yellow))";
            const showVia = Boolean(edge.via && focusedId && (edge.from === focusedId || edge.to === focusedId));
            return (
              <g key={edge.key} className={fade} style={{ opacity: edgeOpacity(edge) }}>
                <path
                  d={edge.d}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={edge.via ? 2.4 : 1.8}
                  strokeDasharray={edge.type === "intro" ? "6 5" : "1.5 5"}
                  strokeLinecap="round"
                  mask={`url(#pmap-mask-${edge.key})`}
                />
                {edge.arrow && (
                  <motion.path
                    d={edge.arrow}
                    fill={stroke}
                    initial={{ opacity: reduced ? 1 : 0 }}
                    animate={{ opacity: drawn ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : chordDelay + 0.8 }}
                  />
                )}
                {edge.via && (
                  <motion.g
                    initial={{ opacity: reduced ? 1 : 0 }}
                    animate={{ opacity: drawn ? 1 : 0 }}
                    transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : chordDelay + 0.6 }}
                  >
                    <circle cx={edge.via.point.x} cy={edge.via.point.y} r={5} fill="rgb(var(--color-dark))" stroke={stroke} strokeWidth={2} />
                    <circle cx={edge.via.point.x} cy={edge.via.point.y} r={2} fill={stroke} />
                    <text
                      x={edge.via.labelPoint.x}
                      y={edge.via.labelPoint.y}
                      textAnchor={edge.via.anchor}
                      className={`pmap-halo fill-n-orange font-body text-[12px] font-semibold ${fade}`}
                      style={{ opacity: showVia ? 1 : 0 }}
                    >
                      {edge.via.label}
                    </text>
                  </motion.g>
                )}
              </g>
            );
          })}
        </g>

        <g aria-hidden="true" className={`pointer-events-none ${fade}`} style={{ opacity: nodeOpacity("novus") }}>
          <circle cx={CENTER.x} cy={CENTER.y} r={NOVUS_RADIUS} fill="rgb(var(--color-dark))" stroke="rgba(255,255,255,0.4)" strokeWidth={1.5} />
          <image
            href="/logo.png"
            x={CENTER.x - (NOVUS_RADIUS - 12)}
            y={CENTER.y - (NOVUS_RADIUS - 12)}
            width={(NOVUS_RADIUS - 12) * 2}
            height={(NOVUS_RADIUS - 12) * 2}
            preserveAspectRatio="xMidYMid meet"
            clipPath="url(#pmap-novus-clip)"
          />
          <text x={CENTER.x} y={CENTER.y + NOVUS_RADIUS + 18} textAnchor="middle" className="pmap-halo fill-white font-display text-[14px] font-bold">
            Novus
          </text>
        </g>

        {layout.nodes.map((node) => {
          const partner = byId.get(node.id);
          if (!partner) return null;
          const tone = TONE_VAR[KIND_TONE[partner.kind]];
          const isFocused = node.id === focusedId;
          const showLabel = node.label.visible || isFocused;
          const roles = partner.roles.map((role) => ROLE_META[role].label.toLowerCase()).join(", ");
          return (
            <g
              key={node.id}
              role="button"
              tabIndex={0}
              aria-label={`${partner.name}, ${sectorLabel(partner.sector)}. ${roles}.`}
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
              <circle cx={node.x} cy={node.y} r={node.r + 7} fill="none" stroke="white" strokeWidth={2} className="opacity-0 group-focus-visible:opacity-100" />
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                fill="white"
                stroke={tone}
                strokeWidth={isFocused ? 5 : partner.depth === "deep" ? 4 : 3}
              />
              {partner.logo ? (
                <image
                  href={partner.logo}
                  x={node.x - (node.r - 5)}
                  y={node.y - (node.r - 5)}
                  width={(node.r - 5) * 2}
                  height={(node.r - 5) * 2}
                  preserveAspectRatio="xMidYMid meet"
                  clipPath={`url(#pmap-clip-${node.id})`}
                />
              ) : (
                <text
                  x={node.x}
                  y={node.y + 3}
                  textAnchor="middle"
                  className="fill-n-ink font-display font-bold"
                  style={{ fontSize: initials(partner).length > 4 ? 7.5 : 10 }}
                >
                  {initials(partner)}
                </text>
              )}
              {showLabel && (
                <text
                  x={node.label.x}
                  y={node.label.y}
                  textAnchor={node.label.anchor}
                  className={`pmap-halo fill-white font-body ${partner.depth === "deep" ? "font-semibold" : "font-medium"}`}
                  style={{ fontSize: node.label.fontSize }}
                >
                  {node.label.lines.map((line, index) => (
                    <tspan key={line} x={node.label.x} dy={index === 0 ? 0 : node.label.fontSize * 1.15}>
                      {line}
                    </tspan>
                  ))}
                </text>
              )}
            </g>
          );
        })}

        {focused && focusedNode && focusedNode.satellites.length > 0 && (
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
                  <line
                    x1={focusedNode.x + (satellite.x - focusedNode.x) * (focusedNode.r + 3) / Math.hypot(satellite.x - focusedNode.x, satellite.y - focusedNode.y)}
                    y1={focusedNode.y + (satellite.y - focusedNode.y) * (focusedNode.r + 3) / Math.hypot(satellite.x - focusedNode.x, satellite.y - focusedNode.y)}
                    x2={satellite.x}
                    y2={satellite.y}
                    stroke={tone}
                    strokeOpacity={0.5}
                    strokeWidth={1}
                  />
                  <circle
                    cx={satellite.x}
                    cy={satellite.y}
                    r={5}
                    fill={live ? tone : "rgb(var(--color-dark))"}
                    stroke={tone}
                    strokeWidth={1.8}
                  />
                  <text
                    x={satellite.labelX}
                    y={satellite.y + 4}
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

      <div aria-live="polite" className="mt-4 min-h-[11rem] border-t border-white/10 pt-5">
        {focused ? (
          <FocusedDetail partner={focused} partnersById={byId} />
        ) : (
          <MapLegend />
        )}
      </div>
    </div>
  );
}

function FocusedDetail({ partner, partnersById }: { partner: PublicPartnership; partnersById: Map<string, PublicPartnership> }) {
  const intros = (partner.introducedBy ?? []).flatMap((intro) => {
    const from = partnersById.get(intro.from);
    return from ? [{ from, via: intro.via }] : [];
  });
  return (
    <div className="grid gap-5 md:grid-cols-[auto_minmax(0,1fr)] md:gap-6">
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-2" style={{ boxShadow: `0 0 0 4px ${TONE_VAR[KIND_TONE[partner.kind]]}` }}>
        {partner.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={partner.logo} alt="" className="h-full w-full object-contain" />
        ) : (
          <span className="font-display text-[11px] font-bold text-n-ink">{initials(partner)}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-body text-[11px] font-bold uppercase tracking-[0.18em] text-white/55">{sectorLabel(partner.sector)}</p>
        <h3 className="mt-1 font-display text-xl font-bold leading-tight text-white">{partner.name}</h3>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="What this organization does">
          {partner.roles.map((role) => (
            <li key={role} className="rounded-full border border-white/20 bg-white/5 px-2.5 py-1 font-body text-[11px] font-medium text-white/85">
              {ROLE_META[role].label}
            </li>
          ))}
        </ul>
        <p className="mt-3 max-w-3xl font-body text-sm leading-relaxed text-white/80">{partner.summary}</p>
        {intros.length > 0 && (
          <p className="mt-2 font-body text-sm text-white/65">
            {intros.map(({ from, via }) => (
              <span key={from.id}>
                Introduced by {via ? <>{via}, a {from.shortName} client</> : from.name}.{" "}
              </span>
            ))}
          </p>
        )}
        <a
          href={`#${partner.id}`}
          className="mt-3 inline-flex items-center font-display text-sm font-bold text-n-orange underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          Read more<span className="sr-only"> about {partner.name}</span>
          <span aria-hidden="true" className="ml-1.5">↓</span>
        </a>
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
          <line x1={2} y1={8} x2={24} y2={8} stroke="rgb(var(--color-orange))" strokeWidth={1.8} strokeDasharray="6 5" />
          <path d="M31,8 L23,4 L23,12 Z" fill="rgb(var(--color-orange))" />
        </>
      ),
    },
    {
      key: "client",
      label: "Introduction made by a client",
      icon: (
        <>
          <line x1={2} y1={8} x2={30} y2={8} stroke="rgb(var(--color-orange))" strokeWidth={2.2} strokeDasharray="6 5" />
          <circle cx={16} cy={8} r={5} fill="rgb(var(--color-dark))" stroke="rgb(var(--color-orange))" strokeWidth={2} />
          <circle cx={16} cy={8} r={2} fill="rgb(var(--color-orange))" />
        </>
      ),
    },
    { key: "alongside", label: "Works alongside", icon: <line x1={2} y1={8} x2={30} y2={8} stroke="rgb(var(--color-yellow))" strokeWidth={1.8} strokeDasharray="1.5 5" strokeLinecap="round" /> },
    { key: "live", label: "Site live", icon: <circle cx={16} cy={8} r={5} fill="rgb(var(--color-orange))" stroke="rgb(var(--color-orange))" strokeWidth={1.8} /> },
    { key: "progress", label: "Site in progress", icon: <circle cx={16} cy={8} r={5} fill="none" stroke="rgb(var(--color-orange))" strokeWidth={1.8} /> },
  ];
  const rings: { tone: PartnerTone; label: string }[] = [
    { tone: "purple", label: "Networks and chambers" },
    { tone: "orange", label: "Districts, development and merchant organizations" },
    { tone: "yellow", label: "Community organizations" },
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
      <p className="max-w-md font-body text-sm leading-relaxed text-white/75">
        Hover, tap or tab to an organization to see what it does and the businesses that came to Novus through it. Press Esc to clear.
      </p>
      <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
        {items.map((item) => (
          <p key={item.key} className="flex items-center gap-3 font-body text-[13px] text-white/80">
            <svg width={32} height={16} viewBox="0 0 32 16" aria-hidden="true" className="shrink-0">{item.icon}</svg>
            {item.label}
          </p>
        ))}
        {rings.map((ring) => (
          <p key={ring.tone} className="flex items-center gap-3 font-body text-[13px] text-white/80">
            <svg width={32} height={16} viewBox="0 0 32 16" aria-hidden="true" className="shrink-0">
              <circle cx={16} cy={8} r={6} fill="white" stroke={TONE_VAR[ring.tone]} strokeWidth={3} />
            </svg>
            {ring.label}
          </p>
        ))}
      </div>
    </div>
  );
}
