import { Sora } from "next/font/google";

/**
 * Wordmark-only face. The site's headings stay on Space Grotesk (`font-display`);
 * Sora is loaded solely for the NOVUS lockup so the logo has its own voice
 * without repainting every heading.
 */
export const sora = Sora({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});
