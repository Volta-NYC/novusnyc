"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  desc: string;
  className?: string;
}

export default function ExpandableDescription({ desc, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const measureRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const check = () => {
      // Temporarily make visible to measure if currently hidden
      const wasHidden = el.style.display === "none";
      if (wasHidden) {
        el.style.display = "-webkit-box";
      }
      setIsClamped(el.scrollHeight > el.clientHeight + 2);
      if (wasHidden) {
        el.style.display = "none";
      }
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [desc]);

  return (
    <div className={className}>
      {/* Collapsed view — always clamped, hidden when expanded */}
      <p
        ref={measureRef}
        className="font-body text-sm text-v-ink/70 leading-relaxed"
        style={
          expanded
            ? { display: "none" }
            : ({
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              } as React.CSSProperties)
        }
      >
        {desc}
      </p>

      {/* Expanded view — completely unstyled, no clamping at all */}
      {expanded && (
        <p className="font-body text-sm text-v-ink/70 leading-relaxed">
          {desc}
        </p>
      )}

      {(isClamped || expanded) && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="mt-1.5 font-body text-xs font-semibold text-v-green hover:underline focus:outline-none"
        >
          {expanded ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}
