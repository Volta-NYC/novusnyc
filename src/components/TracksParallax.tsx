"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useParallax } from "@/hooks/useParallax";

export default function TracksParallax({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { y: imageY, enabled: imageParallaxEnabled } = useParallax(sectionRef, {
    range: [-224, 224],
  });
  const { y: copyY, enabled: copyParallaxEnabled } = useParallax(sectionRef, {
    range: [56, -56],
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const updateViewport = () => setIsMobile(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  return (
    <section
      ref={sectionRef}
      id="tracks"
      className="tracks-parallax relative isolate overflow-hidden py-14"
      style={{ backgroundImage: "url(/trackbackground.jpg)" }}
    >
      <motion.div
        aria-hidden="true"
        className="tracks-parallax-mobile-media"
        style={isMobile
          ? {
            backgroundImage: "url(/trackbackground.jpg)",
            y: imageY,
            willChange: imageParallaxEnabled ? "transform" : "auto",
          }
          : { backgroundImage: "url(/trackbackground.jpg)" }}
      />
      <motion.div
        className="relative z-10 max-w-5xl mx-auto px-5 md:px-8"
        style={isMobile
          ? {
            y: copyY,
            willChange: copyParallaxEnabled ? "transform" : "auto",
          }
          : undefined}
      >
        {children}
      </motion.div>
    </section>
  );
}
