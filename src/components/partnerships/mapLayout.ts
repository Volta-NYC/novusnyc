import type { Borough } from "@/data/partnerships";

export const VIEW_WIDTH = 1000;
export const VIEW_HEIGHT = 790;
export const CENTER = { x: 500, y: 385 };
export const NOVUS_RADIUS = 50;
export const NODE_RADIUS = { deep: 28, active: 22 };

const OUTER = { rx: 328, ry: 238 };
const SECTOR_GAP_UNITS = 0.9;
const MIN_SECTOR_UNITS = 2;
const LABEL_SIZE = 12;
const SATELLITE_LABEL_SIZE = 11.5;

// Clockwise from the top, loosely following the city: the Bronx north, Queens
// east, Brooklyn south, Staten Island southwest, Manhattan west.
const RING_SECTORS: Borough[] = ["Bronx", "Queens", "Brooklyn", "Staten Island", "Manhattan"];
const ANCHOR_SECTOR: Borough = "Brooklyn";
const ANCHOR_ANGLE = 88;

// Order within a sector keeps introduction chords long enough to read instead
// of collapsing between neighbors.
const RING_POSITION = [
  "bronx-chamber",
  "queens-chamber", "licp", "sunnyside-shines", "bayside-village-bid", "qedc",
  "bay-ridge-bid", "park-slope-bid", "north-flatbush-bid", "brooklyn-chamber", "chldc", "enyma", "ldceny",
  "si-chamber", "forest-avenue-bid", "camo", "siboc",
  "aaf", "manhattan-chamber", "nyc-sbs", "sbrn",
];

export interface LayoutInput {
  id: string;
  shortName: string;
  sector: Borough;
  depth: "deep" | "active";
  introducedBy?: { from: string; via?: string }[];
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

export interface Satellite {
  x: number;
  y: number;
  lineStart: Point;
  labelX: number;
  labelY: number;
  labelAnchor: "start" | "end";
}

export interface NodeLayout {
  id: string;
  x: number;
  y: number;
  r: number;
  angle: number;
  label: LabelLayout;
  focusLabel: LabelLayout;
  satellites: Satellite[];
}

export interface EdgeLayout {
  key: string;
  type: "spoke" | "intro";
  from: string;
  to: string;
  d: string;
  arrow?: string;
  via?: { label: string; point: Point };
}

export interface SectorLabel { sector: string; x: number; y: number; rotate: number }

export interface MapLayout {
  nodes: NodeLayout[];
  edges: EdgeLayout[];
  sectorLabels: SectorLabel[];
  order: string[];
}

const rad = (degrees: number) => (degrees * Math.PI) / 180;

function onEllipse(angle: number, extra = 0): Point {
  return {
    x: CENTER.x + (OUTER.rx + extra) * Math.cos(rad(angle)),
    y: CENTER.y + (OUTER.ry + extra) * Math.sin(rad(angle)),
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

function placeLabel(node: { x: number; y: number; r: number }, angle: number, text: string): LabelLayout {
  const fontSize = LABEL_SIZE;
  const lines = wrapLabel(text, 13);
  const blockHeight = lines.length * fontSize * 1.2;
  const cos = Math.cos(rad(angle));
  const sin = Math.sin(rad(angle));
  const gap = node.r + 10;
  const ax = node.x + cos * gap;
  const ay = node.y + sin * gap;

  if (Math.abs(cos) > 0.5) {
    return { x: ax, y: ay - blockHeight / 2 + fontSize * 0.85, anchor: cos > 0 ? "start" : "end", lines, fontSize, visible: true };
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
  const width = Math.max(...label.lines.map((line) => line.length)) * label.fontSize * 0.56;
  const top = label.y - label.fontSize * 0.9;
  const height = label.lines.length * label.fontSize * 1.2;
  const x0 = label.anchor === "start" ? label.x : label.anchor === "end" ? label.x - width : label.x - width / 2;
  return { x0: x0 - 2, y0: top - 2, x1: x0 + width + 2, y1: top + height + 2 };
}

function circleBox(node: { x: number; y: number; r: number }): Box {
  return { x0: node.x - node.r - 3, y0: node.y - node.r - 3, x1: node.x + node.r + 3, y1: node.y + node.r + 3 };
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function inBounds(box: Box): boolean {
  return box.x0 >= 6 && box.y0 >= 6 && box.x1 <= VIEW_WIDTH - 6 && box.y1 <= VIEW_HEIGHT - 6;
}

function toward(node: NodeLayout, point: Point, anchor: "start" | "end"): Satellite {
  const dir = unit(node, point);
  return {
    ...point,
    lineStart: { x: node.x + dir.x * (node.r + 4), y: node.y + dir.y * (node.r + 4) },
    labelX: anchor === "start" ? point.x + 9 : point.x - 9,
    labelY: point.y + SATELLITE_LABEL_SIZE * 0.35,
    labelAnchor: anchor,
  };
}

// Top and bottom nodes fan their businesses outward in two wings stepping
// away from the node, so each label gets its own row. Side nodes stack them
// inward, where the ring leaves room for horizontal labels.
function isVertical(node: NodeLayout): boolean {
  return Math.abs(Math.sin(rad(node.angle))) >= 0.7;
}

function satellitesFor(node: NodeLayout, count: number): Satellite[] {
  if (count === 0) return [];

  if (isVertical(node)) {
    const vertical = Math.sin(rad(node.angle)) > 0 ? 1 : -1;
    const rightCount = Math.ceil(count / 2);
    const wing = (size: number, side: 1 | -1) =>
      Array.from({ length: size }, (_, index) => {
        const point = {
          x: node.x + side * (node.r * 0.55 + 30 + index * 18),
          y: node.y + vertical * (node.r + 18 + index * 23),
        };
        return toward(node, point, side === 1 ? "start" : "end");
      });
    return [...wing(rightCount, 1), ...wing(count - rightCount, -1)];
  }

  // The stack sits wholly to one side of the node's spoke so the line to
  // Novus never runs through a business name.
  const inward = unit(node, CENTER);
  const rowGap = 22;
  const reach = node.r + 58;
  const shift = ((count - 1) / 2) * rowGap + 16;
  const anchor = { x: node.x + inward.x * reach, y: node.y + inward.y * reach + (node.y >= CENTER.y ? shift : -shift) };
  const labelsLeft = node.x > CENTER.x;
  return Array.from({ length: count }, (_, index) => {
    const offset = index - (count - 1) / 2;
    const point = { x: anchor.x + Math.abs(offset) * 10 * (labelsLeft ? 1 : -1), y: anchor.y + offset * rowGap };
    return toward(node, point, labelsLeft ? "end" : "start");
  });
}

function quadraticPoint(a: Point, c: Point, b: Point, t: number): Point {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
}

function chord(from: NodeLayout, to: NodeLayout) {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const normal = { x: -(to.y - from.y) / length, y: (to.x - from.x) / length };
  const towardCenter = normal.x * (CENTER.x - mid.x) + normal.y * (CENTER.y - mid.y) > 0 ? 1 : -1;
  const midDistance = Math.hypot(CENTER.x - mid.x, CENTER.y - mid.y);
  const side = midDistance < 160 ? -towardCenter : towardCenter;
  const bend = Math.min(0.28 * length, 150);
  const control = { x: mid.x + normal.x * bend * side, y: mid.y + normal.y * bend * side };

  const startDir = unit(from, control);
  const endDir = unit(to, control);
  const start = { x: from.x + startDir.x * (from.r + 5), y: from.y + startDir.y * (from.r + 5) };
  const tip = { x: to.x + endDir.x * (to.r + 5), y: to.y + endDir.y * (to.r + 5) };
  const heading = unit(control, tip);
  const base = { x: tip.x - heading.x * 10, y: tip.y - heading.y * 10 };
  const perp = { x: -heading.y, y: heading.x };
  const d = `M${start.x.toFixed(1)},${start.y.toFixed(1)} Q${control.x.toFixed(1)},${control.y.toFixed(1)} ${base.x.toFixed(1)},${base.y.toFixed(1)}`;
  const arrow = `M${tip.x.toFixed(1)},${tip.y.toFixed(1)} L${(base.x + perp.x * 5).toFixed(1)},${(base.y + perp.y * 5).toFixed(1)} L${(base.x - perp.x * 5).toFixed(1)},${(base.y - perp.y * 5).toFixed(1)} Z`;

  return { d, arrow, midpoint: quadraticPoint(start, control, base, 0.5), control };
}

export function computeLayout(partners: LayoutInput[]): MapLayout {
  const ring = [...partners].sort((a, b) => {
    const sectorDelta = RING_SECTORS.indexOf(a.sector) - RING_SECTORS.indexOf(b.sector);
    if (sectorDelta !== 0) return sectorDelta;
    const ai = RING_POSITION.indexOf(a.id);
    const bi = RING_POSITION.indexOf(b.id);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const sectorUnits = RING_SECTORS.map((sector) => Math.max(ring.filter((partner) => partner.sector === sector).length, MIN_SECTOR_UNITS));
  const totalUnits = sectorUnits.reduce((sum, units) => sum + units, 0) + SECTOR_GAP_UNITS * RING_SECTORS.length;
  const degreesPerUnit = 360 / totalUnits;

  const anchorIndex = RING_SECTORS.indexOf(ANCHOR_SECTOR);
  let unitsBeforeAnchor = 0;
  for (let index = 0; index < anchorIndex; index += 1) unitsBeforeAnchor += sectorUnits[index] + SECTOR_GAP_UNITS;
  let cursor = ANCHOR_ANGLE - (unitsBeforeAnchor + sectorUnits[anchorIndex] / 2) * degreesPerUnit;

  const nodes: NodeLayout[] = [];
  const sectorLabels: SectorLabel[] = [];

  RING_SECTORS.forEach((sector, sectorIndex) => {
    const members = ring.filter((partner) => partner.sector === sector);
    const span = sectorUnits[sectorIndex] * degreesPerUnit;
    const step = span / Math.max(members.length, 1);
    members.forEach((partner, index) => {
      const angle = cursor + step * (index + 0.5);
      const point = onEllipse(angle);
      const r = NODE_RADIUS[partner.depth];
      const label = placeLabel({ ...point, r }, angle, partner.shortName);
      nodes.push({ id: partner.id, ...point, r, angle, label, focusLabel: label, satellites: [] });
    });

    const middle = cursor + span / 2;
    const cos = Math.cos(rad(middle));
    if (Math.abs(cos) > 0.8) {
      sectorLabels.push({ sector, x: cos > 0 ? VIEW_WIDTH - 14 : 14, y: onEllipse(middle).y, rotate: cos > 0 ? 90 : -90 });
    } else {
      const labelPoint = onEllipse(middle, 104);
      sectorLabels.push({
        sector,
        x: Math.min(Math.max(labelPoint.x, 60), VIEW_WIDTH - 60),
        y: Math.min(Math.max(labelPoint.y, 20), VIEW_HEIGHT - 12),
        rotate: 0,
      });
    }
    cursor += span + SECTOR_GAP_UNITS * degreesPerUnit;
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depthOf = new Map(partners.map((partner) => [partner.id, partner.depth]));
  const countOf = new Map(partners.map((partner) => [partner.id, partner.businessCount]));

  const occupied: { id: string; box: Box }[] = [
    { id: "novus", box: circleBox({ ...CENTER, r: NOVUS_RADIUS + 26 }) },
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

  for (const node of nodes) {
    node.satellites = satellitesFor(node, countOf.get(node.id) ?? 0);
    if (node.satellites.length > 0 && isVertical(node)) {
      const lines = node.label.lines;
      const blockHeight = lines.length * LABEL_SIZE * 1.2;
      const below = Math.sin(rad(node.angle)) < 0;
      node.focusLabel = {
        ...node.label,
        x: node.x,
        anchor: "middle",
        y: below ? node.y + node.r + 10 + LABEL_SIZE * 0.9 : node.y - node.r - 10 - blockHeight + LABEL_SIZE * 0.85,
      };
    }
  }

  const edges: EdgeLayout[] = nodes.map((node) => {
    const dir = unit(CENTER, node);
    const start = { x: CENTER.x + dir.x * (NOVUS_RADIUS + 8), y: CENTER.y + dir.y * (NOVUS_RADIUS + 8) };
    const end = { x: node.x - dir.x * (node.r + 4), y: node.y - dir.y * (node.r + 4) };
    return { key: `spoke-${node.id}`, type: "spoke", from: "novus", to: node.id, d: `M${start.x.toFixed(1)},${start.y.toFixed(1)} L${end.x.toFixed(1)},${end.y.toFixed(1)}` };
  });

  for (const partner of partners) {
    const to = byId.get(partner.id);
    if (!to) continue;
    for (const intro of partner.introducedBy ?? []) {
      const from = byId.get(intro.from);
      if (!from) continue;
      const { d, arrow, midpoint, control } = chord(from, to);
      const edge: EdgeLayout = { key: `intro-${intro.from}-${partner.id}`, type: "intro", from: intro.from, to: partner.id, d, arrow };
      if (intro.via) {
        const outward = unit(midpoint, control);
        edge.via = {
          label: `via ${intro.via}`,
          point: { x: midpoint.x + outward.x * 13, y: midpoint.y + outward.y * 13 + (outward.y > 0 ? 9 : 0) },
        };
      }
      edges.push(edge);
    }
  }

  return { nodes, edges, sectorLabels, order: nodes.map((node) => node.id) };
}
