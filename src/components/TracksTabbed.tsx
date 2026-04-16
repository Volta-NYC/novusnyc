"use client";

import { useState } from "react";
import { joinTracks } from "@/data";

export default function TracksTabbed() {
  const [active, setActive] = useState(0);
  const t = joinTracks[active];

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {joinTracks.map((track, i) => (
          <button
            key={track.name}
            onClick={() => setActive(i)}
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
      <div className={`rounded-2xl border p-7 md:p-10 ${t.color}`}>
        <div className="flex items-center gap-3 mb-8">
          <div className={`w-10 h-10 rounded-xl ${t.iconBg} flex items-center justify-center flex-shrink-0`}>
            <t.icon className={`w-5 h-5 ${t.iconColor}`} />
          </div>
          <h3 className="font-display font-bold text-v-ink text-xl md:text-2xl">{t.name}</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          <div>
            <p className="font-body text-xs font-semibold text-v-muted uppercase tracking-widest mb-4">
              What you&apos;ll do
            </p>
            <ul className="space-y-3">
              {t.doWhat.map((item) => (
                <li key={item} className="flex items-start gap-3 font-body text-sm text-v-ink/75 leading-relaxed">
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[0.4rem] ${t.iconColor.replace(
                      "text-",
                      "bg-"
                    )}`}
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
              {t.skills.map((item) => (
                <li key={item} className="flex items-start gap-3 font-body text-sm text-v-muted leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-v-muted/40 flex-shrink-0 mt-[0.4rem]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
