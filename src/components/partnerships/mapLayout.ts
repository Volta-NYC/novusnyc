import type { PartnerKind, PartnerSector } from "@/data/partnerships";

export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 680;
export const CENTER = { x: 500, y: 340 };
export const NOVUS_RADIUS = 46;

const OUTER = { rx: 350, ry: 228 };
const INNER = { rx: 172, ry: 118 };
const NODE_RADIUS = { deep: 27, active: 19 };
const SECTOR_GAP_UNITS = 0.9;
const MIN_SECTOR_UNITS = 2;

// Clockwise from the top, loosely following the city: the Bronx north, Queens
// east, Brooklyn south, Staten Island southwest, Manhattan west.
const RING_SECTORS: Exclude<PartnerSector, "citywide">[] = ["Bronx", "Queens", "Brooklyn", "Staten Island", "Manhattan"];

// Order within a sector keeps introduction chords long enough to read instead
// of collapsing between neighbors.
const RING_POSITION = [
  "bronx-chamber",
  "queens-chamber", "licp", "sunnyside-shines", "bayside-village-bid", "qedc",
  "bay-ridge-bid", "park-slope-bid", "north-flatbush-bid", "brooklyn-chamber", "chldc", "enyma", "ldceny",
  "si-chamber", "forest-avenue-bid", "camo", "siboc",
  "manhattan-chamber",
];

const CITYWIDE_ANGLE: Record<string, number> = { sbrn: -58, aaf: 128 };

export interface LayoutInput {
  id: string;
  shortName: string;
  kind: PartnerKind;
  sector: PartnerSector;
  depth: "deep" | "active";
  introducedBy?: { from: string; via?: string }[];
  worksAlongside?: string[];
  businessCount: number;
}

export interface Point { x: number; y: number }

export interface LabelLayout {
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  lines: string[];
  fontSize: number;
  visible: boolean;
}

export interface NodeLayout {
  id: string;
  x: number;
  y: number;
  r: number;
  angle: number;
  ring: "inner" | "outer";
  label: LabelLayout;
  satellites: { x: number; y: number; labelX: number; labelAnchor: "start" | "end" }[];
}

export interface EdgeLayout {
  key: string;
  type: "spoke" | "intro" | "alongside";
  from: string;
  to: string;
  d: string;
  arrow?: string;
  via?: { label: string; point: Point; labelPoint: Point; anchor: "start" | "middle" | "end" };
}

export interface SectorLabel { sector: string; x: number; y: number; anchor: "start" | "middle" | "end"; rotate: number }

export interface MapLayout {
  nodes: NodeLayout[];
  edges: EdgeLayout[];
  sectorLabels: SectorLabel[];
  order: string[];
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;

function onEllipse(angle: number, ellipse: { rx: number; ry: number }, extra = 0): Point {
  return {
    x: CENTER.x + (ellipse.rx + extra) * Math.cos(rad(angle)),
    y: CENTER.y + (ellipse.ry + extra) * Math.sin(rad(angle)),
  };
}

function unit(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function wrapLabel(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const words = text.split(" ");
  let best: string[] = [text];
  let bestWidth = Infinity;
  for (let split = 1; split < words.length; split += 1) {
    const lines = [words.slice(0, split).join(" "), words.slice(split).join(" ")];
    const width = Math.max(...lines.map((line) => line.length));
    if (width < bestWidth) {
      best = lines;
      bestWidth = width;
    }
  }
  return best;
}

function placeLabel(node: { x: number; y: number; r: number }, angle: number, text: string, fontSize: number): LabelLayout {
  const lines = wrapLabel(text, 13);
  const lineHeight = fontSize * 1.15;
  const blockHeight = lines.length * lineHeight;
  const cos = Math.cos(rad(angle));
  const sin = Math.sin(rad(angle));
  const gap = node.r + 9;
  const ax = node.x + cos * gap;
  const ay = node.y + sin * gap;

  if (Math.abs(cos) > 0.5) {
    return {
      x: ax,
      y: ay - blockHeight / 2 + fontSize * 0.85,
      anchor: cos > 0 ? "start" : "end",
      lines,
      fontSize,
      visible: true,
    };
  }
  return {
    x: ax,
    y: sin > 0 ? ay + fontSize * 0.9 : ay - blockHeight + fontSize * 0.85,
    anchor: "middle",
    lines,
    fontSize,
    visible: true,
  };
}

interface Box { x0: number; y0: number; x1: number; y1: number }

function labelBox(label: LabelLayout): Box {
  const width = Math.max(...label.lines.map((line) => line.length)) * label.fontSize * 0.57;
  const top = label.y - label.fontSize * 0.9;
  const height = label.lines.length * label.fontSize * 1.15;
  const x0 = label.anchor === "start" ? label.x : label.anchor === "end" ? label.x - width : label.x - width / 2;
  return { x0: x0 - 3, y0: top - 2, x1: x0 + width + 3, y1: top + height + 2 };
}

function circleBox(node: { x: number; y: number; r: number }): Box {
  return { x0: node.x - node.r, y0: node.y - node.r, x1: node.x + node.r, y1: node.y + node.r };
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function inBounds(box: Box): boolean {
  return box.x0 >= 4 && box.y0 >= 4 && box.x1 <= VIEW_WIDTH - 4 && box.y1 <= VIEW_HEIGHT - 4;
}

function satellitesFor(node: { x: number; y: number; r: number }, count: number, labelsLeft: boolean) {
  if (count === 0) return [];
  const inward = unit(node, CENTER);
  const rowGap = 17;
  const span = ((count - 1) / 2) * rowGap;
  const reach = node.r + 42 + Math.abs(inward.y) * span;
  const anchor = { x: node.x + inward.x * reach, y: node.y + inward.y * reach };
  return Array.from({ length: count }, (_, index) => {
    const offset = index - (count - 1) / 2;
    const x = anchor.x - Math.abs(offset) * 9 * (labelsLeft ? -1 : 1) * Math.abs(inward.x);
    const y = anchor.y + offset * rowGap;
    return { x, y, labelX: labelsLeft ? x - 9 : x + 9, labelAnchor: labelsLeft ? "end" as const : "start" as const };
  });
}

function quadraticPoint(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function chord(from: NodeLayout, to: NodeLayout, arrowGap: number) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const normal = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
  const towardCenter = normal.x * (CENTER.x - mid.x) + normal.y * (CENTER.y - mid.y) > 0 ? 1 : -1;
  const midDistance = Math.hypot(CENTER.x - mid.x, CENTER.y - mid.y);
  const side = midDistance < 150 ? -towardCenter : towardCenter;
  const bend = Math.min(0.3 * length, 150);
  const control = { x: mid.x + normal.x * bend * side, y: mid.y + normal.y * bend * side };

  const startDir = unit(from, control);
  const endDir = unit(to, control);
  const start = { x: from.x + startDir.x * (from.r + 4), y: from.y + startDir.y * (from.r + 4) };
  const end = { x: to.x + endDir.x * (to.r + arrowGap), y: to.y + endDir.y * (to.r + arrowGap) };
  const d = `M${start.x.toFixed(1)},${start.y.toFixed(1)} Q${control.x.toFixed(1)},${control.y.toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`;

  const tip = { x: to.x + endDir.x * (to.r + 3), y: to.y + endDir.y * (to.r + 3) };
  const back = { x: -endDir.x, y: -endDir.y };
  const perp = { x: -back.y, y: back.x };
  const baseX = tip.x - back.x * 9;
  const baseY = tip.y - back.y * 9;
  const arrow = `M${tip.x.toFixed(1)},${tip.y.toFixed(1)} L${(baseX + perp.x * 4.5).toFixed(1)},${(baseY + perp.y * 4.5).toFixed(1)} L${(baseX - perp.x * 4.5).toFixed(1)},${(baseY - perp.y * 4.5).toFixed(1)} Z`;

  return { d, arrow, midpoint: quadraticPoint(start, control, end, 0.5), control };
}

export function computeLayout(partners: LayoutInput[]): MapLayout {
  const citywide = partners.filter((partner) => partner.sector === "citywide");
  const ring = partners
    .filter((partner) => partner.sector !== "citywide")
    .sort((a, b) => {
      const sectorDelta = RING_SECTORS.indexOf(a.sector as Exclude<PartnerSector, "citywide">) - RING_SECTORS.indexOf(b.sector as Exclude<PartnerSector, "citywide">);
      if (sectorDelta !== 0) return sectorDelta;
      const ai = RING_POSITION.indexOf(a.id);
      const bi = RING_POSITION.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  const sectorCounts = RING_SECTORS.map((sector) => ring.filter((partner) => partner.sector === sector).length);
  const sectorUnits = sectorCounts.map((count) => Math.max(count, MIN_SECTOR_UNITS));
  const totalUnits = sectorUnits.reduce((sum, units) => sum + units, 0) + SECTOR_GAP_UNITS * RING_SECTORS.length;
  const degreesPerUnit = 360 / totalUnits;

  const nodes: NodeLayout[] = [];
  const sectorLabels: SectorLabel[] = [];
  let cursor = -90 - (sectorUnits[0] * degreesPerUnit) / 2;

  RING_SECTORS.forEach((sector, sectorIndex) => {
    const members = ring.filter((partner) => partner.sector === sector);
    const span = sectorUnits[sectorIndex] * degreesPerUnit;
    const step = span / Math.max(members.length, 1);
    members.forEach((partner, index) => {
      const angle = cursor + step * (index + 0.5);
      const point = onEllipse(angle, OUTER);
      const r = NODE_RADIUS[partner.depth];
      nodes.push({ id: partner.id, ...point, r, angle, ring: "outer", label: placeLabel({ ...point, r }, angle, partner.shortName, partner.depth === "deep" ? 12.5 : 11.5), satellites: [] });
    });

    const middle = cursor + span / 2;
    const cos = Math.cos(rad(middle));
    if (Math.abs(cos) > 0.8) {
      const y = onEllipse(middle, OUTER).y;
      sectorLabels.push({ sector, x: cos > 0 ? VIEW_WIDTH - 14 : 14, y, anchor: "middle", rotate: cos > 0 ? 90 : -90 });
    } else {
      const labelPoint = onEllipse(middle, OUTER, 92);
      sectorLabels.push({
        sector,
        x: Math.min(Math.max(labelPoint.x, 16), VIEW_WIDTH - 16),
        y: Math.min(Math.max(labelPoint.y, 18), VIEW_HEIGHT - 10),
        anchor: Math.abs(cos) < 0.35 ? "middle" : cos > 0 ? "end" : "start",
        rotate: 0,
      });
    }
    cursor += span + SECTOR_GAP_UNITS * degreesPerUnit;
  });

  citywide.forEach((partner, index) => {
    const angle = CITYWIDE_ANGLE[partner.id] ?? -90 + index * (360 / Math.max(citywide.length, 1));
    const point = onEllipse(angle, INNER);
    const r = NODE_RADIUS[partner.depth];
    nodes.unshift({ id: partner.id, ...point, r, angle, ring: "inner", label: placeLabel({ ...point, r }, angle, partner.shortName, 12.5), satellites: [] });
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depthOf = new Map(partners.map((partner) => [partner.id, partner.depth]));

  const occupied: { id: string; box: Box }[] = [
    { id: "novus", box: circleBox({ ...CENTER, r: NOVUS_RADIUS }) },
    ...nodes.map((node) => ({ id: node.id, box: circleBox(node) })),
  ];
  const labelOrder = [...nodes].sort((a, b) => (depthOf.get(a.id) === "deep" ? 0 : 1) - (depthOf.get(b.id) === "deep" ? 0 : 1));
  for (const node of labelOrder) {
    const box = labelBox(node.label);
    const collides = occupied.some((other) => other.id !== node.id && overlaps(box, other.box));
    const keep = depthOf.get(node.id) === "deep" || (!collides && inBounds(box));
    node.label.visible = keep;
    if (keep) occupied.push({ id: `${node.id}-label`, box });
  }

  // Top and bottom nodes stack their businesses beside the inward direction;
  // put the labels on the side their introduction chords leave free.
  const introEnds = new Map<string, NodeLayout[]>();
  for (const partner of partners) {
    for (const intro of partner.introducedBy ?? []) {
      const a = byId.get(partner.id);
      const b = byId.get(intro.from);
      if (!a || !b) continue;
      introEnds.set(a.id, [...(introEnds.get(a.id) ?? []), b]);
      introEnds.set(b.id, [...(introEnds.get(b.id) ?? []), a]);
    }
  }
  const countById = new Map(partners.map((partner) => [partner.id, partner.businessCount]));
  for (const node of nodes) {
    const inward = unit(node, CENTER);
    let labelsLeft = node.x > CENTER.x;
    if (Math.abs(inward.x) < 0.6) {
      const ends = introEnds.get(node.id) ?? [];
      const left = ends.filter((other) => other.x < node.x - 10).length;
      const right = ends.filter((other) => other.x > node.x + 10).length;
      if (left !== right) labelsLeft = left < right;
    }
    node.satellites = satellitesFor(node, countById.get(node.id) ?? 0, labelsLeft);
  }

  const edges: EdgeLayout[] = nodes.map((node) => {
    const dir = unit(CENTER, node);
    const start = { x: CENTER.x + dir.x * (NOVUS_RADIUS + 3), y: CENTER.y + dir.y * (NOVUS_RADIUS + 3) };
    const end = { x: node.x - dir.x * (node.r + 3), y: node.y - dir.y * (node.r + 3) };
    return { key: `spoke-${node.id}`, type: "spoke", from: "novus", to: node.id, d: `M${start.x.toFixed(1)},${start.y.toFixed(1)} L${end.x.toFixed(1)},${end.y.toFixed(1)}` };
  });

  for (const partner of partners) {
    const to = byId.get(partner.id);
    if (!to) continue;
    for (const intro of partner.introducedBy ?? []) {
      const from = byId.get(intro.from);
      if (!from) continue;
      const { d, arrow, midpoint, control } = chord(from, to, 8);
      const edge: EdgeLayout = { key: `intro-${intro.from}-${partner.id}`, type: "intro", from: intro.from, to: partner.id, d, arrow };
      if (intro.via) {
        const outward = unit(control, midpoint);
        const labelPoint = { x: midpoint.x + outward.x * 14, y: midpoint.y + outward.y * 14 + 4 };
        edge.via = {
          label: `via ${intro.via}`,
          point: midpoint,
          labelPoint,
          anchor: outward.x > 0.3 ? "start" : outward.x < -0.3 ? "end" : "middle",
        };
      }
      edges.push(edge);
    }
    for (const otherId of partner.worksAlongside ?? []) {
      if (otherId < partner.id) continue;
      const other = byId.get(otherId);
      if (!other) continue;
      const { d } = chord(to, other, 4);
      edges.push({ key: `alongside-${partner.id}-${otherId}`, type: "alongside", from: partner.id, to: otherId, d });
    }
  }

  return { nodes, edges, sectorLabels, order: nodes.map((node) => node.id) };
}
