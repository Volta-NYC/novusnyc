import type { Borough } from "@/data/partnerships";

export const VIEW_WIDTH = 1290;
export const VIEW_HEIGHT = 920;
export const CENTER = { x: 645, y: 416 };
export const NOVUS_RADIUS = 52;
export const NODE_RADIUS = { deep: 27, active: 21 };
export const LABEL_SIZE = 14;
export const SATELLITE_LABEL_SIZE = 13.5;

const OUTER = { rx: 396, ry: 296 };
const SECTOR_GAP_UNITS = 1;
const MIN_SECTOR_UNITS = 2;
const ROW_GAP = 25;
const CHAR_WIDTH = 0.56;

// Clockwise from the top, loosely following the city: the Bronx north, Queens
// east, Brooklyn south, Staten Island southwest, Manhattan west.
const RING_SECTORS: Borough[] = ["Bronx", "Queens", "Brooklyn", "Staten Island", "Manhattan"];
const ANCHOR_SECTOR: Borough = "Brooklyn";
const ANCHOR_ANGLE = 90;

// Order within a sector keeps introduction chords long enough to read instead
// of collapsing between neighbors.
const RING_POSITION = [
  "bronx-chamber",
  "queens-chamber", "licp", "sunnyside-shines", "bayside-village-bid", "qedc",
  "bay-ridge-bid", "park-slope-bid", "north-flatbush-bid", "brooklyn-chamber", "chldc", "enyma", "ldceny",
  "si-chamber", "forest-avenue-bid", "siboc", "camo",
  "aaf", "manhattan-chamber", "nyc-sbs", "sbrn",
];

export interface LayoutInput {
  id: string;
  shortName: string;
  sector: Borough;
  depth: "deep" | "active";
  introducedBy?: { from: string }[];
  businessNames: string[];
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
}

export interface SectorLabel { sector: string; x: number; y: number; rotate: number }

export interface MapLayout {
  nodes: NodeLayout[];
  edges: EdgeLayout[];
  sectorLabels: SectorLabel[];
  order: string[];
}

interface Box { x0: number; y0: number; x1: number; y1: number }
interface Circle { x: number; y: number; r: number }

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

// Nodes are spaced by distance along the ellipse, not by angle. Equal angles
// crowd the flatter east and west sides, where Queens and Staten Island sit.
const ARC_STEPS = 1440;
const ARC_TABLE = (() => {
  const table = [0];
  let previous = onEllipse(0);
  for (let step = 1; step <= ARC_STEPS; step += 1) {
    const point = onEllipse((step * 360) / ARC_STEPS);
    table.push(table[step - 1] + Math.hypot(point.x - previous.x, point.y - previous.y));
    previous = point;
  }
  return table;
})();
const PERIMETER = ARC_TABLE[ARC_STEPS];

function arcAt(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360;
  const position = (normalized / 360) * ARC_STEPS;
  const index = Math.floor(position);
  const next = Math.min(index + 1, ARC_STEPS);
  return ARC_TABLE[index] + (ARC_TABLE[next] - ARC_TABLE[index]) * (position - index);
}

function angleAt(arc: number): number {
  const target = ((arc % PERIMETER) + PERIMETER) % PERIMETER;
  let low = 0;
  let high = ARC_STEPS;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (ARC_TABLE[middle] <= target) low = middle;
    else high = middle;
  }
  const fraction = (target - ARC_TABLE[low]) / (ARC_TABLE[high] - ARC_TABLE[low] || 1);
  return ((low + fraction) * 360) / ARC_STEPS;
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

function placeLabel(node: Circle, angle: number, text: string): LabelLayout {
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

function textBox(x: number, baseline: number, anchor: "start" | "middle" | "end", lines: string[], fontSize: number, pad = 2): Box {
  const width = Math.max(...lines.map((line) => line.length)) * fontSize * CHAR_WIDTH;
  const top = baseline - fontSize * 0.9;
  const height = lines.length * fontSize * 1.2;
  const x0 = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return { x0: x0 - pad, y0: top - pad, x1: x0 + width + pad, y1: top + height + pad };
}

function labelBox(label: LabelLayout): Box {
  return textBox(label.x, label.y, label.anchor, label.lines, label.fontSize);
}

function circleBox(circle: Circle): Box {
  return { x0: circle.x - circle.r - 3, y0: circle.y - circle.r - 3, x1: circle.x + circle.r + 3, y1: circle.y + circle.r + 3 };
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function inBounds(box: Box): boolean {
  return box.x0 >= 6 && box.y0 >= 6 && box.x1 <= VIEW_WIDTH - 6 && box.y1 <= VIEW_HEIGHT - 6;
}

function boxHitsCircle(box: Box, circle: Circle, pad: number): boolean {
  const nearestX = Math.max(box.x0, Math.min(circle.x, box.x1));
  const nearestY = Math.max(box.y0, Math.min(circle.y, box.y1));
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) < circle.r + pad;
}

function segmentDistance(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy));
}

function segmentHitsBox(a: Point, b: Point, box: Box): boolean {
  for (let step = 0; step <= 12; step += 1) {
    const x = a.x + ((b.x - a.x) * step) / 12;
    const y = a.y + ((b.y - a.y) * step) / 12;
    if (x > box.x0 && x < box.x1 && y > box.y0 && y < box.y1) return true;
  }
  return false;
}

function makeSatellite(node: Circle, point: Point, anchor: "start" | "end"): Satellite {
  const dir = unit(node, point);
  return {
    ...point,
    lineStart: { x: node.x + dir.x * (node.r + 4), y: node.y + dir.y * (node.r + 4) },
    labelX: anchor === "start" ? point.x + 10 : point.x - 10,
    labelY: point.y + SATELLITE_LABEL_SIZE * 0.35,
    labelAnchor: anchor,
  };
}

// Businesses list outward from the ring, one line each, where nothing else
// is drawn. Side nodes get a column beside them; top and bottom nodes get a
// column stepping away from the ring. The column's distance (and, for top
// and bottom nodes, its side) is searched until no line, dot or name touches
// another circle or a visible label.
function satellitesFor(node: NodeLayout, names: string[], circles: Circle[], labels: Box[]): Satellite[] {
  const count = names.length;
  if (count === 0) return [];
  const out = unit(CENTER, node);
  const vertical = Math.abs(out.y) > 0.75;
  const sides: (1 | -1)[] = vertical
    ? node.x >= CENTER.x ? [1, -1] : [-1, 1]
    : [out.x >= 0 ? 1 : -1];

  const build = (side: 1 | -1, reach: number) =>
    names.map((_, index) => {
      if (vertical) {
        const point = {
          x: node.x + side * (node.r + 22 + reach * 0.5),
          y: node.y + Math.sign(out.y) * (node.r * 0.5 + 8 + reach * 0.4 + index * ROW_GAP),
        };
        return makeSatellite(node, point, side === 1 ? "start" : "end");
      }
      const offset = index - (count - 1) / 2;
      const bulge = ((count - 1) / 2 - Math.abs(offset)) * 7;
      const point = {
        x: node.x + side * (node.r + reach + bulge),
        y: node.y + offset * ROW_GAP + out.y * reach * 0.6,
      };
      return makeSatellite(node, point, side === 1 ? "start" : "end");
    });

  const collisions = (satellites: Satellite[]) => {
    let hits = 0;
    satellites.forEach((satellite, index) => {
      const box = textBox(satellite.labelX, satellite.labelY, satellite.labelAnchor, [names[index]], SATELLITE_LABEL_SIZE, 3);
      if (!inBounds(box)) hits += 1;
      for (const circle of circles) {
        if (segmentDistance(circle, satellite.lineStart, satellite) < circle.r + 5) hits += 1;
        if (Math.hypot(circle.x - satellite.x, circle.y - satellite.y) < circle.r + 10) hits += 1;
        if (boxHitsCircle(box, circle, 4)) hits += 1;
      }
      for (const label of labels) {
        if (overlaps(box, label)) hits += 1;
        if (segmentHitsBox(satellite.lineStart, satellite, label)) hits += 1;
      }
    });
    return hits;
  };

  let best: { satellites: Satellite[]; hits: number } | null = null;
  for (const side of sides) {
    for (let reach = 30; reach <= 150; reach += 8) {
      const satellites = build(side, reach);
      const hits = collisions(satellites);
      if (!best || hits < best.hits) best = { satellites, hits };
      if (hits === 0) return satellites;
    }
  }
  return best?.satellites ?? [];
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
  const side = midDistance < 170 ? -towardCenter : towardCenter;
  const bend = Math.max(Math.min(0.28 * length, 160), 40);
  const control = { x: mid.x + normal.x * bend * side, y: mid.y + normal.y * bend * side };

  const startDir = unit(from, control);
  const endDir = unit(to, control);
  const start = { x: from.x + startDir.x * (from.r + 6), y: from.y + startDir.y * (from.r + 6) };
  const tip = { x: to.x + endDir.x * (to.r + 6), y: to.y + endDir.y * (to.r + 6) };
  const heading = unit(quadraticPoint(start, control, tip, 0.9), tip);
  const base = { x: tip.x - heading.x * 15, y: tip.y - heading.y * 15 };
  const perp = { x: -heading.y, y: heading.x };
  const d = `M${start.x.toFixed(1)},${start.y.toFixed(1)} Q${control.x.toFixed(1)},${control.y.toFixed(1)} ${base.x.toFixed(1)},${base.y.toFixed(1)}`;
  const arrow = `M${tip.x.toFixed(1)},${tip.y.toFixed(1)} L${(base.x + perp.x * 7).toFixed(1)},${(base.y + perp.y * 7).toFixed(1)} L${(base.x - perp.x * 7).toFixed(1)},${(base.y - perp.y * 7).toFixed(1)} Z`;
  return { d, arrow };
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
  const unitLength = PERIMETER / totalUnits;

  const anchorIndex = RING_SECTORS.indexOf(ANCHOR_SECTOR);
  let unitsBeforeAnchor = 0;
  for (let index = 0; index < anchorIndex; index += 1) unitsBeforeAnchor += sectorUnits[index] + SECTOR_GAP_UNITS;
  let cursor = arcAt(ANCHOR_ANGLE) - (unitsBeforeAnchor + sectorUnits[anchorIndex] / 2) * unitLength;

  const nodes: NodeLayout[] = [];
  const sectorLabels: SectorLabel[] = [];

  RING_SECTORS.forEach((sector, sectorIndex) => {
    const members = ring.filter((partner) => partner.sector === sector);
    const span = sectorUnits[sectorIndex] * unitLength;
    const step = span / Math.max(members.length, 1);
    members.forEach((partner, index) => {
      const angle = angleAt(cursor + step * (index + 0.5));
      const point = onEllipse(angle);
      const r = NODE_RADIUS[partner.depth];
      const label = placeLabel({ ...point, r }, angle, partner.shortName);
      nodes.push({ id: partner.id, ...point, r, angle, label, focusLabel: placeLabel({ ...point, r }, angle + 180, partner.shortName), satellites: [] });
    });

    const middle = angleAt(cursor + span / 2);
    const cos = Math.cos(rad(middle));
    if (Math.abs(cos) > 0.8) {
      sectorLabels.push({ sector, x: cos > 0 ? VIEW_WIDTH - 16 : 16, y: onEllipse(middle).y, rotate: cos > 0 ? 90 : -90 });
    } else {
      const labelPoint = onEllipse(middle, 110);
      sectorLabels.push({
        sector,
        x: Math.min(Math.max(labelPoint.x, 70), VIEW_WIDTH - 70),
        y: Math.min(Math.max(labelPoint.y, 22), VIEW_HEIGHT - 14),
        rotate: 0,
      });
    }
    cursor += span + SECTOR_GAP_UNITS * unitLength;
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const depthOf = new Map(partners.map((partner) => [partner.id, partner.depth]));
  const novus = { ...CENTER, r: NOVUS_RADIUS + 12 };

  const occupied: { id: string; box: Box }[] = [
    { id: "novus", box: circleBox({ ...CENTER, r: NOVUS_RADIUS + 26 }) },
    ...nodes.map((node) => ({ id: node.id, box: circleBox(node) })),
  ];
  const labelOrder = [...nodes].sort((a, b) => (depthOf.get(a.id) === "deep" ? 0 : 1) - (depthOf.get(b.id) === "deep" ? 0 : 1));
  const nameOf = new Map(partners.map((partner) => [partner.id, partner.shortName]));
  for (const node of labelOrder) {
    const fits = (label: LabelLayout) => {
      const box = labelBox(label);
      return inBounds(box) && !occupied.some((other) => other.id !== node.id && overlaps(box, other.box));
    };
    const deep = depthOf.get(node.id) === "deep";
    const placed = [0, -22, 22, -40, 40]
      .map((turn) => (turn === 0 ? node.label : placeLabel(node, node.angle + turn, nameOf.get(node.id) ?? "")))
      .find(fits);
    if (placed) node.label = placed;
    node.label.visible = deep || Boolean(placed);
    if (node.label.visible) occupied.push({ id: `${node.id}-label`, box: labelBox(node.label) });
  }

  const neighbors = new Map<string, Set<string>>();
  for (const partner of partners) {
    for (const intro of partner.introducedBy ?? []) {
      neighbors.set(partner.id, (neighbors.get(partner.id) ?? new Set<string>()).add(intro.from));
      neighbors.set(intro.from, (neighbors.get(intro.from) ?? new Set<string>()).add(partner.id));
    }
  }

  for (const partner of partners) {
    const node = byId.get(partner.id);
    if (!node) continue;
    const circles: Circle[] = [novus, ...nodes.filter((other) => other.id !== node.id)];
    // While a node is focused, only its own label and its neighbors' labels are drawn.
    const labels = [
      labelBox(node.focusLabel),
      textBox(CENTER.x, CENTER.y + NOVUS_RADIUS + 22, "middle", ["Novus"], 15),
      ...[...(neighbors.get(node.id) ?? [])].flatMap((id) => {
        const other = byId.get(id);
        return other ? [labelBox(other.label)] : [];
      }),
    ];
    node.satellites = satellitesFor(node, partner.businessNames, circles, labels);
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
      const { d, arrow } = chord(from, to);
      edges.push({ key: `intro-${intro.from}-${partner.id}`, type: "intro", from: intro.from, to: partner.id, d, arrow });
    }
  }

  return { nodes, edges, sectorLabels, order: nodes.map((node) => node.id) };
}
