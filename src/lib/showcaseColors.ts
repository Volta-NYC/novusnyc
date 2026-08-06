const SHOWCASE_PASTEL_COLOR_CLASS: Record<string, string> = {
  "blue-soft": "bg-sky-200",
  "blue-mid": "bg-sky-300",
  "blue-deep": "bg-blue-300",
  "lime-soft": "bg-lime-200",
  "lime-mid": "bg-lime-300",
  "lime-deep": "bg-green-300",
  "amber-soft": "bg-amber-200",
  "amber-mid": "bg-amber-300",
  "amber-deep": "bg-orange-300",
  "pink-soft": "bg-pink-200",
  "pink-mid": "bg-pink-300",
  "pink-deep": "bg-rose-300",
  "purple-mid": "bg-purple-300",
  "red-soft": "bg-red-200",
  "red-mid": "bg-red-300",
  "red-deep": "bg-rose-300",
  green: "bg-lime-300",
  blue: "bg-sky-300",
  orange: "bg-orange-300",
  amber: "bg-amber-300",
  pink: "bg-pink-300",
  purple: "bg-purple-300",
  "green-soft": "bg-lime-200",
  "green-mid": "bg-lime-300",
  "green-deep": "bg-green-300",
};

const LEGACY_CLASS_TO_PASTEL: Array<[string, string]> = [
  ["bg-v-blue", "bg-sky-300"],
  ["bg-v-green", "bg-lime-300"],
  ["bg-v-yellow", "bg-amber-300"],
  ["blue", "bg-sky-300"],
  ["lime", "bg-lime-300"],
  ["green", "bg-lime-300"],
  ["amber", "bg-amber-300"],
  ["orange", "bg-orange-300"],
  ["pink", "bg-pink-300"],
  ["purple", "bg-purple-300"],
  ["red", "bg-red-300"],
];

const PASTEL_HEX: Record<string, string> = {
  "bg-sky-200": "#BAE6FD",
  "bg-sky-300": "#7DD3FC",
  "bg-blue-200": "#BFDBFE",
  "bg-blue-300": "#93C5FD",
  "bg-lime-200": "#D9F99D",
  "bg-lime-300": "#BEF264",
  "bg-green-200": "#BBF7D0",
  "bg-green-300": "#86EFAC",
  "bg-amber-200": "#FDE68A",
  "bg-amber-300": "#FCD34D",
  "bg-orange-200": "#FED7AA",
  "bg-orange-300": "#FDBA74",
  "bg-pink-200": "#FBCFE8",
  "bg-pink-300": "#F9A8D4",
  "bg-purple-200": "#E9D5FF",
  "bg-purple-300": "#D8B4FE",
  "bg-red-200": "#FECACA",
  "bg-red-300": "#FCA5A5",
  "bg-rose-200": "#FECDD3",
  "bg-rose-300": "#FDA4AF",
};

export function getShowcasePastelColorClass(color: string): string {
  const normalized = color.trim();
  if (PASTEL_HEX[normalized]) return normalized;

  const mappedColor = SHOWCASE_PASTEL_COLOR_CLASS[normalized];
  if (mappedColor) return mappedColor;

  const legacyClass = LEGACY_CLASS_TO_PASTEL.find(([needle]) => normalized.includes(needle));
  return legacyClass?.[1] ?? "bg-sky-200";
}

export function getShowcasePastelHex(colorClass: string): string {
  return PASTEL_HEX[getShowcasePastelColorClass(colorClass)] ?? "#BAE6FD";
}

export const SHOWCASE_PASTEL_COLOR_OPTIONS = Object.values(SHOWCASE_PASTEL_COLOR_CLASS);
