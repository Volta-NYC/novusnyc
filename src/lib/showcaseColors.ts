const SHOWCASE_PASTEL_COLOR_CLASS: Record<string, string> = {
  "blue-soft": "bg-sky-100",
  "blue-mid": "bg-sky-200",
  "blue-deep": "bg-blue-200",
  "lime-soft": "bg-lime-100",
  "lime-mid": "bg-lime-200",
  "lime-deep": "bg-green-200",
  "amber-soft": "bg-amber-100",
  "amber-mid": "bg-amber-200",
  "amber-deep": "bg-orange-200",
  "pink-soft": "bg-pink-100",
  "pink-mid": "bg-pink-200",
  "pink-deep": "bg-rose-200",
  "purple-mid": "bg-purple-200",
  "red-soft": "bg-red-100",
  "red-mid": "bg-red-200",
  "red-deep": "bg-rose-200",
  green: "bg-lime-200",
  blue: "bg-sky-200",
  orange: "bg-orange-200",
  amber: "bg-amber-200",
  pink: "bg-pink-200",
  purple: "bg-purple-200",
  "green-soft": "bg-lime-100",
  "green-mid": "bg-lime-200",
  "green-deep": "bg-green-200",
};

const LEGACY_CLASS_TO_PASTEL: Array<[string, string]> = [
  ["bg-v-blue", "bg-sky-200"],
  ["bg-v-green", "bg-lime-200"],
  ["bg-v-yellow", "bg-amber-200"],
  ["blue", "bg-sky-200"],
  ["lime", "bg-lime-200"],
  ["green", "bg-lime-200"],
  ["amber", "bg-amber-200"],
  ["orange", "bg-orange-200"],
  ["pink", "bg-pink-200"],
  ["purple", "bg-purple-200"],
  ["red", "bg-red-200"],
];

const PASTEL_HEX: Record<string, string> = {
  "bg-sky-100": "#E0F2FE",
  "bg-sky-200": "#BAE6FD",
  "bg-blue-200": "#BFDBFE",
  "bg-lime-100": "#ECFCCB",
  "bg-lime-200": "#D9F99D",
  "bg-green-200": "#BBF7D0",
  "bg-amber-100": "#FEF3C7",
  "bg-amber-200": "#FDE68A",
  "bg-orange-200": "#FED7AA",
  "bg-pink-100": "#FCE7F3",
  "bg-pink-200": "#FBCFE8",
  "bg-purple-200": "#E9D5FF",
  "bg-red-100": "#FEE2E2",
  "bg-red-200": "#FECACA",
  "bg-rose-200": "#FECDD3",
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
