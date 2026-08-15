import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Novus NYC",
    short_name: "Novus",
    description:
      "Free student-led consulting support for New York City small businesses.",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFDF9",
    theme_color: "#F6B78D",
    icons: [
      {
        src: "/icon-192.png?v=novus-transparent-20260815",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=novus-transparent-20260815",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
