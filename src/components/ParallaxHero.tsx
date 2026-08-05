"use client";

import Image, { type StaticImageData } from "next/image";
import { motion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useParallax } from "@/hooks/useParallax";

interface ParallaxHeroProps {
  image: StaticImageData;
  alt: string;
  children: ReactNode;
  className: string;
  imageClassName?: string;
  mediaClassName?: string;
  parallaxRange?: [number, number];
}

/** Reuses the homepage hero's scroll-linked image treatment. */
export default function ParallaxHero({
  image,
  alt,
  children,
  className,
  imageClassName = "object-cover",
  mediaClassName = "absolute -inset-y-[34vh] inset-x-0",
  parallaxRange = [-120, 170],
}: ParallaxHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const { y: backgroundY, enabled: parallaxEnabled } = useParallax(sectionRef, {
    range: parallaxRange,
    offset: ["start start", "end start"],
  });

  return (
    <section ref={sectionRef} className={className} data-home-dark-end="true">
      <motion.div
        aria-hidden="true"
        className={mediaClassName}
        style={{ y: backgroundY, willChange: parallaxEnabled ? "transform" : "auto" }}
      >
        <Image
          src={image}
          alt={alt}
          fill
          priority
          fetchPriority="high"
          placeholder="blur"
          quality={75}
          sizes="(max-width: 768px) 1200px, (max-width: 1280px) 1800px, 2400px"
          className={imageClassName}
        />
      </motion.div>
      <div className="absolute inset-0 bg-[#1a1e24]/75" />
      <div className="absolute inset-0 hero-vignette opacity-50 pointer-events-none" />
      {children}
    </section>
  );
}
