"use client";

import { useEffect, useRef } from "react";

const tones = {
  peach: "rgba(246, 183, 141, 0.13)",
  lavender: "rgba(190, 162, 186, 0.13)",
  yellow: "rgba(243, 226, 141, 0.16)",
} as const;

export default function BrandTexture({ tone }: { tone: keyof typeof tones }) {
  const textureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const texture = textureRef.current;
    const surface = texture?.parentElement;
    if (!texture || !surface || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const setPosition = (event: PointerEvent) => {
      const bounds = surface.getBoundingClientRect();
      texture.style.setProperty("--texture-x", `${((event.clientX - bounds.left) / bounds.width) * 100}%`);
      texture.style.setProperty("--texture-y", `${((event.clientY - bounds.top) / bounds.height) * 100}%`);
    };
    const resetPosition = () => {
      texture.style.setProperty("--texture-x", "50%");
      texture.style.setProperty("--texture-y", "50%");
    };

    surface.addEventListener("pointermove", setPosition);
    surface.addEventListener("pointerleave", resetPosition);
    return () => {
      surface.removeEventListener("pointermove", setPosition);
      surface.removeEventListener("pointerleave", resetPosition);
    };
  }, []);

  return (
    <div
      ref={textureRef}
      aria-hidden="true"
      className="brand-texture pointer-events-none absolute inset-0 opacity-90 transition-[background-position] duration-500 ease-out"
      style={{
        background: `radial-gradient(30rem circle at var(--texture-x, 50%) var(--texture-y, 50%), ${tones[tone]} 0%, transparent 68%)`,
      }}
    />
  );
}
