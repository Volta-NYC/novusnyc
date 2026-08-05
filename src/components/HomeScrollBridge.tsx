"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useParallax } from "@/hooks/useParallax";

interface HomeScrollBridgeProps {
  eyebrow: string;
  title: string;
  detail: string;
  imageSrc: string;
  index: number;
}

export default function HomeScrollBridge({
  eyebrow,
  title,
  detail,
  imageSrc,
  index,
}: HomeScrollBridgeProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { y: imageY, enabled: imageParallaxEnabled } = useParallax(sectionRef, {
    range: [-72, 72],
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
      className={`home-scroll-bridge home-scroll-bridge-${index}`}
      style={{ backgroundImage: `url(${imageSrc})` }}
    >
      <motion.div
        aria-hidden="true"
        className="home-scroll-bridge-mobile-media"
        style={isMobile
          ? {
            backgroundImage: `url(${imageSrc})`,
            y: imageY,
            willChange: imageParallaxEnabled ? "transform" : "auto",
          }
          : { backgroundImage: `url(${imageSrc})` }}
      />
      <motion.div
        className="home-scroll-bridge-copy"
        style={isMobile
          ? {
            y: copyY,
            willChange: copyParallaxEnabled ? "transform" : "auto",
          }
          : undefined}
      >
        <p className="home-scroll-bridge-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p>{detail}</p>
      </motion.div>
    </section>
  );
}
