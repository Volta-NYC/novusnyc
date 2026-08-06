import { Syne } from "next/font/google";

/**
 * Wordmark-only face. The site's headings stay on Space Grotesk (`font-display`);
 * Syne is loaded solely for the NOVUS lockup so the logo has its own voice
 * without repainting every heading.
 */
export const syne = Syne({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});
