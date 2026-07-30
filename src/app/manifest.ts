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
        src: "/icon.png",
        sizes: "1024x1024",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
