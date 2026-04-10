"use client";

import { useState } from "react";

interface Props {
  desc: string;
  className?: string;
}

export default function ExpandableDescription({ desc, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);

  const raw = desc.trim();
  // Avoid lookbehind regex (no Safari <16.4 support): split on ". " then re-attach period
  const tokens = raw.split(". ");
  const parts = tokens.map((t, i) => (i < tokens.length - 1 ? t + ". " : t));
  const LIMIT = 2;
  const needsToggle = parts.length > LIMIT;
  const visible = needsToggle && !expanded ? parts.slice(0, LIMIT).join("") : raw;

  return (
    <p className={`font-body text-sm text-v-ink/70 leading-relaxed ${className}`}>
      {visible}
      {needsToggle && (
        <>
          {" "}
          <button
            onClick={() => setExpanded((e) => !e)}
            className="font-semibold text-v-green hover:underline focus:outline-none"
          >
            {expanded ? "Less" : "More"}
          </button>
        </>
      )}
    </p>
  );
}
