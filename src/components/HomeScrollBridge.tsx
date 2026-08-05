"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useParallax } from "@/hooks/useParallax";

interface HomeScrollBridgeProps {
  eyebrow: string;
  title: string;
  detail: string;
  imageSrc: string;
  index: number;
}

const MOBILE_MOTION = [
  {
    imageY: [-72, 72] as [number, number],
    imageX: [0, 0] as [number, number],
    imageScale: [1.08, 1, 1.08] as [number, number, number],
    copyY: [56, -56] as [number, number],
  },
  {
    imageY: [-168, 168] as [number, number],
    imageX: [42, -42] as [number, number],
    imageScale: [1.3, 1.12, 1.3] as [number, number, number],
    copyY: [78, -78] as [number, number],
  },
  {
    imageY: [-188, 188] as [number, number],
    imageX: [-48, 48] as [number, number],
    imageScale: [1.34, 1.14, 1.34] as [number, number, number],
    copyY: [86, -86] as [number, number],
  },
] as const;

export default function HomeScrollBridge({
  eyebrow,
  title,
  detail,
  imageSrc,
  index,
}: HomeScrollBridgeProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const motionProfile = MOBILE_MOTION[index] ?? MOBILE_MOTION[0];
  const { y: imageY, enabled: imageParallaxEnabled } = useParallax(sectionRef, {
    range: motionProfile.imageY,
  });
  const { y: copyY, enabled: copyParallaxEnabled } = useParallax(sectionRef, {
    range: motionProfile.copyY,
  });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const imageX = useTransform(scrollYProgress, [0, 1], motionProfile.imageX);
  const imageScale = useTransform(scrollYProgress, [0, 0.5, 1], motionProfile.imageScale);

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
            x: imageParallaxEnabled ? imageX : 0,
            y: imageY,
            scale: imageParallaxEnabled ? imageScale : 1,
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
