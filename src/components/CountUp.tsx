"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";

interface Props {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export default function CountUp({ end, suffix = "", prefix = "", duration = 1600 }: Props) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!isInView) return;
    if (reduced) {
      setCount(end);
      return;
    }
    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [isInView, end, duration, reduced]);

  return (
    <span ref={ref} aria-label={`${prefix}${end}${suffix}`}>
      {prefix}{count}{suffix}
    </span>
  );
}
