"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

type CoreValue = {
  title: string;
  desc: string;
};

const mod = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

function shortestTurn(from: number, to: number) {
  return from + mod(to - from + 180, 360) - 180;
}

export default function CoreValuesCompass({ values }: { values: CoreValue[] }) {
  const reducedMotion = useReducedMotion();
  const compassRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerAngle: number; rotation: number } | null>(null);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const activeIndex = mod(-Math.round(rotation / 90), values.length);
  const activeValue = values[activeIndex];

  const pointerAngle = (event: ReactPointerEvent) => {
    const rect = compassRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.atan2(event.clientY - (rect.top + rect.height / 2), event.clientX - (rect.left + rect.width / 2)) * 180 / Math.PI;
  };

  const selectValue = (index: number) => {
    setRotation((current) => shortestTurn(current, -index * 90));
  };

  const step = (direction: -1 | 1) => {
    selectValue(mod(activeIndex + direction, values.length));
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerAngle: pointerAngle(event), rotation };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const delta = mod(pointerAngle(event) - dragRef.current.pointerAngle + 180, 360) - 180;
    setRotation(dragRef.current.rotation + delta);
  };

  const handlePointerEnd = () => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    setRotation((current) => Math.round(current / 90) * 90);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      step(1);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      step(-1);
    } else if (event.key === "Home") {
      event.preventDefault();
      selectValue(0);
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="relative mx-auto w-full max-w-[38rem] pb-10 pt-12 sm:pb-12 sm:pt-14">
        <div className="pointer-events-none absolute left-1/2 top-0 z-20 -translate-x-1/2 text-center">
          <span className="block font-body text-[10px] font-bold uppercase tracking-[0.28em] text-n-orange-ink">North</span>
          <span className="mx-auto mt-2 block h-0 w-0 border-x-[9px] border-b-[14px] border-x-transparent border-b-n-orange" />
        </div>

        <div
          ref={compassRef}
          role="group"
          aria-label="Core values compass. Drag, select a value, or use arrow keys to rotate."
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className={`relative mx-auto aspect-square w-[min(84vw,34rem)] touch-none select-none rounded-full border border-n-purple/35 bg-white/80 shadow-[0_28px_70px_rgba(45,40,46,0.14)] outline-none focus-visible:ring-4 focus-visible:ring-n-purple/35 ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <div className="pointer-events-none absolute inset-[5%] rounded-full border border-n-orange/30" />
          <div className="pointer-events-none absolute inset-[17%] rounded-full border border-dashed border-n-purple/30" />
          <div className="pointer-events-none absolute left-1/2 top-[7%] h-[86%] w-px -translate-x-1/2 bg-n-border/70" />
          <div className="pointer-events-none absolute left-[7%] top-1/2 h-px w-[86%] -translate-y-1/2 bg-n-border/70" />

          <div
            className="absolute inset-0"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: dragging || reducedMotion ? "none" : "transform 520ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {values.map((value, index) => {
              const baseAngle = index * 90;
              const isActive = activeIndex === index && !dragging;
              return (
                <button
                  key={value.title}
                  type="button"
                  aria-pressed={isActive}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => selectValue(index)}
                  className={`absolute left-1/2 top-1/2 z-10 flex h-[4.75rem] w-[8.5rem] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border px-3 text-center font-display text-sm font-bold leading-tight shadow-sm transition-[background-color,border-color,box-shadow] sm:h-[5.5rem] sm:w-[10.5rem] sm:text-base ${isActive ? "border-n-orange bg-n-orange text-n-ink shadow-lg" : "border-n-border bg-white text-n-ink hover:border-n-purple"}`}
                  style={{
                    transform: `translate(-50%, -50%) rotate(${baseAngle}deg) translateY(calc(-1 * min(34vw, 13.25rem))) rotate(${-baseAngle - rotation}deg)`,
                    transitionDuration: reducedMotion ? "0ms" : "300ms",
                  }}
                >
                  <span>
                    <span className="mb-0.5 block font-body text-[9px] font-bold uppercase tracking-[0.16em] opacity-55">{index + 1} of {values.length}</span>
                    {value.title}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="pointer-events-none absolute left-1/2 top-1/2 flex h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-n-purple/40 bg-n-dark shadow-xl">
            <div className="text-center">
              <span className="block font-display text-xl font-bold text-n-orange sm:text-2xl">NOVUS</span>
              <span className="mt-1 block font-body text-[8px] font-bold uppercase tracking-[0.22em] text-white/55">Core values</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center font-body text-xs font-semibold text-n-muted">
          Drag the compass or select a value to bring it north.
        </p>
      </div>

      <div className="relative mx-auto max-w-2xl pt-5">
        <div aria-hidden="true" className="absolute left-1/2 top-0 h-5 w-px -translate-x-1/2 bg-n-orange/60" />
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={activeValue.title}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            aria-live="polite"
            className="rounded-2xl border border-n-purple/30 bg-white px-6 py-7 text-center shadow-[0_18px_50px_rgba(45,40,46,0.09)] sm:px-10 sm:py-9"
          >
            <p className="font-body text-[10px] font-bold uppercase tracking-[0.22em] text-n-orange-ink">Facing north · {activeIndex + 1} of {values.length}</p>
            <h3 className="mt-3 font-display text-2xl font-bold text-n-ink sm:text-3xl">{activeValue.title}</h3>
            <p className="mx-auto mt-3 max-w-xl font-body text-base leading-relaxed text-n-muted">{activeValue.desc}</p>
          </motion.article>
        </AnimatePresence>

        <div className="mt-5 flex items-center justify-center gap-3">
          <button type="button" onClick={() => step(-1)} className="inline-flex min-h-11 items-center rounded-full border border-n-border bg-white px-5 font-body text-sm font-semibold text-n-ink transition-colors hover:border-n-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-purple" aria-label="Show previous value">← Previous</button>
          <button type="button" onClick={() => step(1)} className="inline-flex min-h-11 items-center rounded-full border border-n-border bg-white px-5 font-body text-sm font-semibold text-n-ink transition-colors hover:border-n-purple focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-purple" aria-label="Show next value">Next →</button>
        </div>
      </div>
    </div>
  );
}
