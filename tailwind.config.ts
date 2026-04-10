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
        "v-green": "#85CC17",
        "v-green-dark": "#6aaa10",
        "v-blue": "#3B74ED",
        "v-blue-dark": "#2B62D9",
        "v-bg": "#F7F7F2",
        "v-ink": "#0D0D0D",
        "v-muted": "#6B7280",
        "v-border": "#E5E5DF",
        "v-card": "#FFFFFF",
        "v-dark": "#111110",
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
