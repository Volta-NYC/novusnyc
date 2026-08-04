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
  const [canAnimate, setCanAnimate] = useState(false);
  const { scrollYProgress } = useScroll({ target, offset });
  const parallaxY = useTransform(scrollYProgress, [0, 1], range);
  const staticY = useTransform(scrollYProgress, [0, 1], [0, 0]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const updateMotionPreference = () => setCanAnimate(mediaQuery.matches);

    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  const enabled = canAnimate && !reducedMotion;

  return { y: enabled ? parallaxY : staticY, enabled };
}
