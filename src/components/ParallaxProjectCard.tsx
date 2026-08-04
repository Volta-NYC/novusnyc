"use client";

import { motion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useParallax } from "@/hooks/useParallax";

export default function ParallaxProjectCard({
  children,
  index,
}: {
  children: ReactNode;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const range: [number, number] = index % 2 === 0 ? [14, -12] : [-10, 16];
  const { y, enabled } = useParallax(cardRef, { range });

  return (
    <motion.div
      ref={cardRef}
      style={{ y, willChange: enabled ? "transform" : "auto" }}
    >
      {children}
    </motion.div>
  );
}
