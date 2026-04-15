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

  // After the paragraph renders with line-clamp-3 applied, check whether the
  // text actually overflows. scrollHeight > clientHeight means content is cut.
  // Only re-run when desc changes (not on expand/collapse — expanded is handled
  // by the (isClamped || expanded) guard below).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight + 2);
  }, [desc]);

  return (
    <div className={className}>
      <p
        ref={ref}
        className={`font-body text-sm text-v-ink/70 leading-relaxed${expanded ? "" : " line-clamp-3"}`}
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
