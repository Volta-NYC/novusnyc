import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts}",
    // src/lib holds shared class tables (members/constants.ts). Without this the
    // scanner never sees them and their utilities are stripped from the build,
    // which shows up as invisible dots rather than an obvious error.
    "./src/lib/**/*.{js,ts}",
  ],
  // Classes here are constructed dynamically via a color-name→class lookup map in
  // src/app/page.tsx (COLOR_CLASS_MAP). Tailwind can't see them at scan time.
  safelist: [
    // Pastel soft/mid/deep shades resolved through SHOWCASE_COLOR_CLASS in
    // app/page.tsx and showcase/page.tsx (DB-driven card colours)
    "bg-violet-200",  "bg-violet-300",  "bg-violet-400",
    "bg-orange-200",  "bg-orange-300",  "bg-orange-400",
    "bg-amber-200",   "bg-amber-300",   "bg-amber-400",
    "bg-fuchsia-200", "bg-fuchsia-300", "bg-fuchsia-400",
    "bg-rose-200",    "bg-rose-300",    "bg-rose-400",
    "bg-purple-300",
    // TRACK_META.Tech.chipClass applied dynamically in members/projects/page.tsx
    "border-violet-300",
  ],
  theme: {
    extend: {
      screens: {
        "3xl": "1920px",
      },
      colors: {
        // Novus palette. All n-* colors reference CSS custom properties so the
        // full palette can be updated in one place (globals.css :root). The
        // <alpha-value> placeholder enables Tailwind opacity modifiers:
        // bg-n-orange/50, etc.
        //
        // The three brand hues are pastel yellow / orange / purple. Token names
        // describe the actual hue — do not reintroduce colour-neutral or
        // inherited names, they drift from the values and mislead.
        "n-orange":      "rgb(var(--color-orange) / <alpha-value>)",      // peach #F6B78D
        "n-orange-dark": "rgb(var(--color-orange-dark) / <alpha-value>)",
        "n-yellow":      "rgb(var(--color-yellow) / <alpha-value>)",      // #F3E28D
        "n-yellow-dark": "rgb(var(--color-yellow-dark) / <alpha-value>)",
        "n-purple":      "rgb(var(--color-purple) / <alpha-value>)",      // lavender #BEA2BA
        "n-purple-dark": "rgb(var(--color-purple-dark) / <alpha-value>)",
        "n-orange-ink":  "rgb(var(--color-orange-ink) / <alpha-value>)",
        "n-purple-ink":  "rgb(var(--color-purple-ink) / <alpha-value>)",
        "n-on-accent":   "rgb(var(--color-on-accent) / <alpha-value>)",
        "n-control-border": "rgb(var(--color-control-border) / <alpha-value>)",
        "n-error":       "rgb(var(--color-error) / <alpha-value>)",
        "n-bg":          "rgb(var(--color-bg) / <alpha-value>)",
        "n-ink":         "rgb(var(--color-ink) / <alpha-value>)",
        "n-muted":       "rgb(var(--color-muted) / <alpha-value>)",
        "n-border":      "rgb(var(--color-border) / <alpha-value>)",
        "n-card":        "rgb(var(--color-surface) / <alpha-value>)",
        "n-dark":        "rgb(var(--color-dark) / <alpha-value>)",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        marquee: "marquee 35s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
