"use client";

import { useState } from "react";

interface Props {
  desc: string;
  className?: string;
}

export default function ExpandableDescription({ desc, className = "" }: Props) {
  const [expanded, setExpanded] = useState(false);

  const raw = desc.trim();
  const parts = raw.split(/(?<=\. )/);
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
            className="font-semibold text-v-blue hover:underline focus:outline-none"
          >
            {expanded ? "Less" : "More"}
          </button>
        </>
      )}
    </p>
  );
}
