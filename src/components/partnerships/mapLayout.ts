import type { Borough } from "@/data/partnerships";

export const VIEW_WIDTH = 1360;
export const VIEW_HEIGHT = 930;
export const CENTER = { x: 680, y: 420 };
export const NOVUS_RADIUS = 52;
export const NODE_RADIUS = 33;
export const LABEL_SIZE = 14;

const OUTER = { rx: 470, ry: 320 };
const SECTOR_GAP_UNITS = 1;
const MIN_SECTOR_UNITS = 2;
// Advance widths of DM Sans at weight 600, in ems, measured from the loaded
// font and rounded up. Summed along a line they predict its rendered length to
// within a few units and never short. The flat 0.56 per character this replaced
// over-counted most names by 10 to 20 units, so labels that fit side by side
// were judged to collide and got pushed out of line, which is what made the
// Brooklyn run uneven. Labels use 500 and 600; the heavier weight keeps the
// estimate safe.
const GLYPH_EM: Record<string, number> = {
  A: 0.7, B: 0.63, C: 0.74, D: 0.71, E: 0.58, F: 0.55, G: 0.78, H: 0.71, I: 0.27, J: 0.53, K: 0.64, L: 0.55, M: 0.88, N: 0.72, O: 0.79, P: 0.61, Q: 0.79, R: 0.62, S: 0.6, T: 0.59, U: 0.68, V: 0.7, W: 1.01, X: 0.66, Y: 0.62, Z: 0.57,
  a: 0.58, b: 0.65, c: 0.6, d: 0.65, e: 0.6, f: 0.37, g: 0.59, h: 0.61, i: 0.27, j: 0.27, k: 0.56, l: 0.26, m: 0.93, n: 0.61, o: 0.61, p: 0.65, q: 0.65, r: 0.4, s: 0.53, t: 0.43, u: 0.61, v: 0.56, w: 0.81, x: 0.55, y: 0.59, z: 0.49,
  "0": 0.7, "1": 0.35, "2": 0.58, "3": 0.6, "4": 0.64, "5": 0.62, "6": 0.64, "7": 0.54, "8": 0.63, "9": 0.64,
  " ": 0.25, "&": 0.77, "'": 0.19, "’": 0.25, "-": 0.57, ".": 0.24, ",": 0.23, "/": 0.42, "(": 0.4, ")": 0.4,
};
// Wider than any measured glyph, so a character the table has not seen can
// only make a label look bigger than it is, never smaller.
const UNKNOWN_GLYPH_EM = 1.1;
// Space held between two labels on top of their own padding. The old width
// estimate supplied this by accident; with accurate widths it has to be asked for.
const LABEL_CLEARANCE = 4;
const SECTOR_LABEL_SIZE = 11;

// Clockwise from the top, loosely following the city: the Bronx north, Queens
// east, Brooklyn south, Staten Island southwest, Manhattan west.
const RING_SECTORS: Borough[] = ["Bronx", "Queens", "Brooklyn", "Staten Island", "Manhattan"];
const ANCHOR_SECTOR: Borough = "Brooklyn";
const ANCHOR_ANGLE = 90;

// Order within a sector keeps introduction chords long enough to read instead
// of collapsing between neighbors.
const RING_POSITION = [
  "bronx-chamber", "third-avenue-bid",
  "queens-chamber", "licp", "sunnyside-shines", "bayside-village-bid", "qedc",
  "bay-ridge-bid", "atlantic-avenue-bid", "park-slope-bid", "north-flatbush-bid", "brooklyn-chamber",
  "chldc", "cypress-hills-fulton-bid", "enyma", "ldceny",
  "si-chamber", "forest-avenue-bid", "siboc", "camo",
  "aaf", "lower-east-side-partnership", "manhattan-chamber", "nyc-sbs", "sbrn",
];

export interface LayoutInput {
  id: string;
  shortName: string;
  sector: Borough;
  depth: "deep" | "active";
  introducedBy?: { from: string }[];
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
  label: LabelLayout;
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

function placeLabel(node: Circle, angle: number, text: string, stagger = 0): LabelLayout {
  const fontSize = LABEL_SIZE;
  const lines = wrapLabel(text, 13);
  const blockHeight = lines.length * fontSize * 1.2;
  const cos = Math.cos(rad(angle));
  const sin = Math.sin(rad(angle));
  const gap = node.r + 10 + stagger;
  const ax = node.x + cos * gap;
  const ay = node.y + sin * gap;

  // The offset the text reads away from has to be the full gap, not its
  // projection: a circle at 45 degrees would otherwise set its label only
  // 0.7 of a radius out and the first line would sit on the logo.
  if (Math.abs(cos) > 0.5) {
    return {
      x: node.x + Math.sign(cos) * gap,
      y: ay - blockHeight / 2 + fontSize * 0.85,
      anchor: cos > 0 ? "start" : "end",
      lines,
      fontSize,
      visible: true,
    };
  }
  const below = node.y + Math.sign(sin) * gap;
  return {
    x: ax,
    y: sin > 0 ? below + fontSize * 0.9 : below - blockHeight + fontSize * 0.85,
    anchor: "middle",
    lines,
    fontSize,
    visible: true,
  };
}

function textBox(x: number, baseline: number, anchor: "start" | "middle" | "end", lines: string[], fontSize: number, pad = 2): Box {
  const width = Math.max(...lines.map((line) =>
    [...line].reduce((em, ch) => em + (GLYPH_EM[ch] ?? UNKNOWN_GLYPH_EM), 0) * fontSize));
  const top = baseline - fontSize * 0.9;
  const height = lines.length * fontSize * 1.2;
  const x0 = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
  return { x0: x0 - pad, y0: top - pad, x1: x0 + width + pad, y1: top + height + pad };
}

function labelBox(label: LabelLayout): Box {
  return textBox(label.x, label.y, label.anchor, label.lines, label.fontSize);
}

function inflate(box: Box, by: number): Box {
  return { x0: box.x0 - by, y0: box.y0 - by, x1: box.x1 + by, y1: box.y1 + by };
}

// Sector names are text too. Without boxes of their own, a label dropped a row
// could land on "BROOKLYN". Bold uppercase at 0.2em tracking runs about 0.95em
// a character; the two edge sectors are turned a quarter and run vertically.
function sectorBox(label: SectorLabel): Box {
  const half = (label.sector.length * SECTOR_LABEL_SIZE * 0.95) / 2;
  return label.rotate
    ? { x0: label.x - SECTOR_LABEL_SIZE, y0: label.y - half, x1: label.x + SECTOR_LABEL_SIZE, y1: label.y + half }
    : { x0: label.x - half, y0: label.y - SECTOR_LABEL_SIZE, x1: label.x + half, y1: label.y + 4 };
}

function circleBox(circle: Circle): Box {
  return { x0: circle.x - circle.r - 6, y0: circle.y - circle.r - 6, x1: circle.x + circle.r + 6, y1: circle.y + circle.r + 6 };
}

function boxHitsCircle(box: Box, circle: Circle, pad: number): boolean {
  const nearestX = Math.max(box.x0, Math.min(circle.x, box.x1));
  const nearestY = Math.max(box.y0, Math.min(circle.y, box.y1));
  return Math.hypot(circle.x - nearestX, circle.y - nearestY) < circle.r + pad;
}

function overlaps(a: Box, b: Box): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

function inBounds(box: Box): boolean {
  return box.x0 >= 6 && box.y0 >= 6 && box.x1 <= VIEW_WIDTH - 6 && box.y1 <= VIEW_HEIGHT - 6;
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
  // The curve runs the whole way to the tip. It used to stop at the arrowhead's
  // base, which only looked right while every head was drawn.
  const d = `M${start.x.toFixed(1)},${start.y.toFixed(1)} Q${control.x.toFixed(1)},${control.y.toFixed(1)} ${tip.x.toFixed(1)},${tip.y.toFixed(1)}`;
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
      const r = NODE_RADIUS;
      const label = placeLabel({ ...point, r }, angle, partner.shortName);
      nodes.push({ id: partner.id, ...point, r, angle, label });
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
  const sectorOf = new Map(partners.map((partner) => [partner.id, partner.sector]));

  const occupied: { id: string; box: Box }[] = [
    { id: "novus", box: circleBox({ ...CENTER, r: NOVUS_RADIUS + 26 }) },
    ...nodes.map((node) => ({ id: node.id, box: circleBox(node) })),
    ...sectorLabels.map((label) => ({ id: `sector-${label.sector}`, box: sectorBox(label) })),
  ];
  const labelOrder = [...nodes].sort((a, b) => (depthOf.get(a.id) === "deep" ? 0 : 1) - (depthOf.get(b.id) === "deep" ? 0 : 1));
  const nameOf = new Map(partners.map((partner) => [partner.id, partner.shortName]));
  for (const node of labelOrder) {
    const fits = (label: LabelLayout) => {
      const box = labelBox(label);
      return inBounds(box)
        && !boxHitsCircle(box, node, 5)
        && !occupied.some((other) => other.id !== node.id && overlaps(box, other.box));
    };
    const deep = depthOf.get(node.id) === "deep";
    // Crowded labels try a slight turn first, then dropping a row below their
    // neighbors' labels.
    const name = nameOf.get(node.id) ?? "";
    const belowBrooklyn = placeLabel(node, 90, name);
    const placed = [
      // Brooklyn is the bottom arc of the ring. Keeping this run underneath
      // its circles makes the gaps between the labels feel deliberate instead
      // of switching from side labels to underneath labels midway through it.
      ...(sectorOf.get(node.id) === "Brooklyn"
        ? [
            belowBrooklyn,
            // Smallest nudge first, so a label moves only as far off its circle
            // as it has to. Trying 40 first sent labels the full distance
            // whenever that slot happened to be free.
            ...[-8, 8, -16, 16, -24, 24, -40, 40].map((offset) => ({ ...belowBrooklyn, x: belowBrooklyn.x + offset })),
            ...[22, 44].map((offset) => ({ ...belowBrooklyn, y: belowBrooklyn.y + offset })),
          ]
        : []),
      node.label,
      ...[-22, 22, -40, 40].map((turn) => placeLabel(node, node.angle + turn, name)),
      ...[0, -8, 8].map((turn) => placeLabel(node, node.angle + turn, name, LABEL_SIZE * 2.6)),
    ].find(fits);
    if (placed) node.label = placed;
    node.label.visible = deep || Boolean(placed);
    if (node.label.visible) occupied.push({ id: `${node.id}-label`, box: inflate(labelBox(node.label), LABEL_CLEARANCE) });
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
