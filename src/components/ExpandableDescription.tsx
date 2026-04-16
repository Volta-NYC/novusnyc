"use client";

import { useState, useRef, useEffect } from "react";

interface Props {
  desc: string;
  className?: string;
}

export default function ExpandableDescription({ desc, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setIsClamped(el.scrollHeight > el.clientHeight + 2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [desc]);

  return (
    <div className={className}>
      <p
        ref={ref}
        className="font-body text-sm text-v-ink/70 leading-relaxed"
        style={
          expanded
            ? undefined
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
