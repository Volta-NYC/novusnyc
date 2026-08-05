"use client";

import { useEffect, useState, type RefObject } from "react";
import { useReducedMotion, useScroll, useTransform, type MotionValue } from "framer-motion";

interface UseParallaxOptions {
  range: [number, number];
  offset?: [ScrollEdge, ScrollEdge];
}

interface ParallaxValue {
  y: MotionValue<number>;
  enabled: boolean;
}

type ScrollEdge = "start start" | "start end" | "end start" | "end end";

export function useParallax<T extends HTMLElement>(
  target: RefObject<T>,
  { range, offset = ["start end", "end start"] }: UseParallaxOptions,
): ParallaxValue {
  const reducedMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);
  const { scrollYProgress } = useScroll({ target, offset });
  const parallaxY = useTransform(scrollYProgress, [0, 1], range);
  const staticY = useTransform(scrollYProgress, [0, 1], [0, 0]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");
    const updateViewport = () => setIsDesktop(mediaQuery.matches);

    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  const enabled = isDesktop && !reducedMotion;

  return { y: enabled ? parallaxY : staticY, enabled };
}
