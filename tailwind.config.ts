import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/data/**/*.{js,ts}",
  ],
  safelist: [
    "bg-blue-300",
    "bg-blue-500",
    "bg-blue-700",
    "bg-lime-300",
    "bg-lime-500",
    "bg-lime-700",
    "bg-amber-300",
    "bg-amber-500",
    "bg-amber-700",
    "bg-pink-300",
    "bg-pink-500",
    "bg-pink-700",
    "bg-red-300",
    "bg-red-500",
    "bg-red-700",
  ],
  theme: {
    extend: {
      screens: {
        "3xl": "1920px",
      },
      colors: {
        // All v-* colors reference CSS custom properties so the full palette
        // can be updated in one place (globals.css :root). The <alpha-value>
        // placeholder enables Tailwind opacity modifiers: bg-v-green/50, etc.
        "v-green":      "rgb(var(--color-green) / <alpha-value>)",
        "v-green-dark": "rgb(var(--color-green-dark) / <alpha-value>)",
        "v-blue":       "rgb(var(--color-blue) / <alpha-value>)",
        "v-blue-dark":  "rgb(var(--color-blue-dark) / <alpha-value>)",
        "v-bg":         "rgb(var(--color-bg) / <alpha-value>)",
        "v-ink":        "rgb(var(--color-ink) / <alpha-value>)",
        "v-muted":      "rgb(var(--color-muted) / <alpha-value>)",
        "v-border":     "rgb(var(--color-border) / <alpha-value>)",
        "v-card":       "rgb(var(--color-surface) / <alpha-value>)",
        "v-dark":       "rgb(var(--color-dark) / <alpha-value>)",
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
