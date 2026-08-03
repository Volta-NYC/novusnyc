"use client";

import { useState, useId, useRef } from "react";
import { joinTracks } from "@/data";

export default function TracksTabbed() {
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const orderedTracks = [...joinTracks].sort((a, b) => {
    const order: Record<string, number> = { "Digital & Tech": 0, Marketing: 1, "Finance & Operations": 2 };
    return order[a.name] - order[b.name];
  });

  const tabId = (i: number) => `${uid}-tab-${i}`;
  const panelId = (i: number) => `${uid}-panel-${i}`;

  const handleKeyDown = (e: React.KeyboardEvent, i: number) => {
    let next = i;
    if (e.key === "ArrowRight") next = (i + 1) % joinTracks.length;
    else if (e.key === "ArrowLeft") next = (i - 1 + orderedTracks.length) % orderedTracks.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = orderedTracks.length - 1;
    else return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      {/* Tab buttons */}
      <div role="tablist" aria-label="Service tracks" className="flex gap-2 mb-6 flex-wrap">
        {orderedTracks.map((track, i) => (
          <button
            key={track.name}
            ref={(el) => { tabRefs.current[i] = el; }}
            role="tab"
            id={tabId(i)}
            aria-selected={active === i}
            aria-controls={panelId(i)}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`px-5 py-2.5 rounded-full font-display font-bold text-sm transition-colors ${
              active === i
                ? track.tagColor
                : "bg-white border border-v-border text-v-muted hover:border-v-ink/40"
            }`}
          >
            {track.name}
          </button>
        ))}
      </div>

      {/* Active track panel */}
      {orderedTracks.map((track, i) => (
        <div
          key={track.name}
          role="tabpanel"
          id={panelId(i)}
          aria-labelledby={tabId(i)}
          hidden={active !== i}
          tabIndex={0}
          className={`rounded-2xl border p-7 md:p-10 ${track.color}`}
        >
          <div className="flex items-center gap-3 mb-8">
            <div className={`w-10 h-10 rounded-xl ${track.iconBg} flex items-center justify-center flex-shrink-0`}>
              <track.icon className={`w-5 h-5 ${track.iconColor}`} aria-hidden="true" />
            </div>
            <div>
              <h3 className="font-display font-bold text-v-ink text-xl md:text-2xl">{track.name}</h3>
              {"description" in track && track.description ? (
                <p className="font-body mt-1 text-sm leading-relaxed text-v-muted">{track.description}</p>
              ) : null}
            </div>
          </div>

          {"subdepartments" in track && track.subdepartments ? (
            <div className="mb-8 border-y border-v-green/20 py-6">
              <p className="font-body text-xs font-semibold uppercase tracking-widest text-v-green mb-4">
                Marketing subdepartments
              </p>
              <div className="grid gap-x-8 gap-y-5 md:grid-cols-2">
                {track.subdepartments.map((department) => (
                  <div key={department.title}>
                    <h4 className="font-display font-bold text-v-ink text-base">{department.title}</h4>
                    <p className="font-body mt-1 text-sm leading-relaxed text-v-muted">{department.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid md:grid-cols-2 gap-8 md:gap-12">
            <div>
              <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">
                What you&apos;ll do
              </p>
              <ul className="space-y-3">
                {track.doWhat.map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-sm text-v-ink/75 leading-relaxed">
                    <span
                      aria-hidden="true"
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[0.4rem] ${track.iconColor.replace("text-", "bg-")}`}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">
                Who fits in
              </p>
              <ul className="space-y-3">
                {track.skills.map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-sm text-v-muted leading-relaxed">
                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-v-muted/40 flex-shrink-0 mt-[0.4rem]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
