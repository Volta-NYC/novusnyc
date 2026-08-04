"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useRef, useState } from "react";
import { joinTracks } from "@/data";

const TRACK_ORDER: Record<string, number> = {
  "Digital & Tech": 0,
  Marketing: 1,
  "Finance & Operations": 2,
};

const TRACK_PREVIEWS = {
  "Digital & Tech": {
    label: "Sample project",
    title: "Launch a neighborhood business site",
    detail: "Turn a local business story into a fast, clear, customer-ready web experience.",
    accent: "bg-v-blue",
    mutedAccent: "bg-v-blue/15",
    border: "border-v-blue/30",
    text: "text-v-blue-dark",
  },
  Marketing: {
    label: "Sample project",
    title: "Build a campaign people notice",
    detail: "Shape the story, content, and outreach that help a neighborhood business reach more people.",
    accent: "bg-v-green",
    mutedAccent: "bg-v-green/15",
    border: "border-v-green/30",
    text: "text-v-green-dark",
  },
  "Finance & Operations": {
    label: "Sample project",
    title: "Find the next practical move",
    detail: "Translate research and financial information into a plan an owner can use right away.",
    accent: "bg-amber-400",
    mutedAccent: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-700",
  },
} as const;

function ProjectPreview({ trackName }: { trackName: keyof typeof TRACK_PREVIEWS }) {
  const preview = TRACK_PREVIEWS[trackName];

  return (
    <div className={`border ${preview.border} bg-white/85 rounded-lg p-5 md:p-6 h-full`}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <p className={`font-body text-xs font-semibold uppercase tracking-widest ${preview.text}`}>{preview.label}</p>
          <h4 className="font-display font-bold text-v-ink text-lg mt-2 leading-tight">{preview.title}</h4>
        </div>
        <span aria-hidden="true" className={`h-3 w-3 rounded-full ${preview.accent} shadow-[0_0_0_6px_rgba(255,255,255,0.7)]`} />
      </div>

      <p className="font-body text-sm text-v-ink/75 leading-relaxed mb-6">{preview.detail}</p>

      {trackName === "Digital & Tech" ? (
        <div className="border border-v-blue/20 bg-v-blue/5 rounded-lg overflow-hidden">
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-v-blue/15">
            <span className="h-1.5 w-1.5 rounded-full bg-v-blue/50" />
            <span className="h-1.5 w-1.5 rounded-full bg-v-blue/35" />
            <span className="h-1.5 w-1.5 rounded-full bg-v-blue/20" />
          </div>
          <div className="p-4">
            <div className="h-2.5 w-20 bg-v-blue/60 rounded-full mb-4" />
            <div className="h-5 w-4/5 bg-v-blue/25 rounded-md mb-2" />
            <div className="h-2.5 w-3/5 bg-v-blue/15 rounded-full mb-5" />
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map((item) => <span key={item} className="h-12 rounded-md bg-v-blue/15" />)}
            </div>
          </div>
        </div>
      ) : null}

      {trackName === "Marketing" ? (
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-3">
          <div className="border border-v-green/20 bg-v-green/5 rounded-lg p-3">
            <div className="h-16 bg-v-green/25 rounded-md mb-3" />
            <div className="h-2 w-4/5 bg-v-green/45 rounded-full mb-2" />
            <div className="h-2 w-3/5 bg-v-green/20 rounded-full" />
          </div>
          <div className="space-y-3">
            {["Content", "Outreach", "Review"].map((label, item) => (
              <div key={label} className="flex items-center gap-2 border border-v-green/20 bg-white rounded-md px-2.5 py-2">
                <span className={`h-2 w-2 rounded-full ${item === 0 ? "bg-v-green" : "bg-v-green/35"}`} />
                <span className="font-body text-[10px] font-semibold text-v-ink">{label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {trackName === "Finance & Operations" ? (
        <div className="border border-amber-300 bg-amber-50 rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1.2fr_0.8fr] gap-px bg-amber-200/70">
            {[["Grant research", "Ready"], ["Budget plan", "Review"], ["Owner report", "Draft"]].flatMap(([label, status]) => [
              <div key={label} className="bg-white px-3 py-2.5 font-body text-xs text-v-ink">{label}</div>,
              <div key={status} className="bg-amber-50 px-3 py-2.5 font-body text-xs font-semibold text-amber-700">{status}</div>,
            ])}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function TracksTabbed() {
  const [active, setActive] = useState(0);
  const uid = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reducedMotion = useReducedMotion();
  const orderedTracks = [...joinTracks].sort((a, b) => TRACK_ORDER[a.name] - TRACK_ORDER[b.name]);
  const track = orderedTracks[active];
  const preview = TRACK_PREVIEWS[track.name as keyof typeof TRACK_PREVIEWS];

  const tabId = (index: number) => `${uid}-tab-${index}`;
  const panelId = `${uid}-panel`;

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % orderedTracks.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + orderedTracks.length) % orderedTracks.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = orderedTracks.length - 1;
    else return;

    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div>
      <div role="tablist" aria-label="Student tracks" className="grid gap-2 sm:grid-cols-3 mb-6">
        {orderedTracks.map((item, index) => {
          const itemPreview = TRACK_PREVIEWS[item.name as keyof typeof TRACK_PREVIEWS];
          const selected = active === index;

          return (
            <div key={item.name}>
              <button
                ref={(element) => { tabRefs.current[index] = element; }}
                role="tab"
                id={tabId(index)}
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
                className={`relative w-full overflow-hidden border rounded-lg px-4 py-4 text-left transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_18px_rgba(31,36,42,0.06)] ${
                  selected ? `${item.color} ${itemPreview.border}` : "border-v-border bg-white text-v-ink/70 hover:border-v-ink/30"
                }`}
              >
                {selected ? <motion.span layoutId={`${uid}-active-track`} className={`absolute inset-x-0 top-0 h-1 ${itemPreview.accent}`} /> : null}
                <span className="flex items-center gap-3">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-md ${item.iconBg}`}>
                    <item.icon className={`h-4 w-4 ${item.iconColor}`} aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-display font-bold text-v-ink text-sm leading-tight">{item.name}</span>
                    <span className="block font-body text-xs text-v-ink/65 mt-1">Explore the work</span>
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={panelId}
        aria-labelledby={tabId(active)}
        tabIndex={0}
        className={`border ${preview.border} ${track.color} rounded-lg overflow-hidden`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={track.name}
            initial={reducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="p-5 md:p-8"
          >
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div>
                <div className="flex items-start gap-4 mb-7">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-lg ${track.iconBg} shrink-0`}>
                    <track.icon className={`h-5 w-5 ${track.iconColor}`} aria-hidden="true" />
                  </span>
                  <div>
                    <p className={`font-body text-xs font-semibold uppercase tracking-widest ${preview.text}`}>Your track</p>
                    <h3 className="font-display font-bold text-v-ink text-2xl mt-1">{track.name}</h3>
                    {"description" in track && track.description ? (
                      <p className="font-body mt-2 text-sm leading-relaxed text-v-ink/75">{track.description}</p>
                    ) : null}
                  </div>
                </div>

                {"subdepartments" in track && track.subdepartments ? (
                  <div className={`mb-7 border-y ${preview.border} py-5`}>
                    <p className={`font-body text-xs font-semibold uppercase tracking-widest ${preview.text} mb-4`}>
                      Choose a focus, or work across all four
                    </p>
                    <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                      {track.subdepartments.map((department) => (
                        <div key={department.title}>
                          <h4 className="font-display font-bold text-v-ink text-sm">{department.title}</h4>
                          <p className="font-body mt-1 text-sm leading-relaxed text-v-ink/75">{department.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-7 sm:grid-cols-2">
                  <div>
                    <p className="font-body text-xs font-semibold text-v-ink/70 uppercase tracking-widest mb-3">Responsibilities</p>
                    <ul className="space-y-2.5">
                      {track.doWhat.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 font-body text-sm text-v-ink/75 leading-relaxed">
                          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[0.4rem] ${preview.accent}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="font-body text-xs font-semibold text-v-ink/70 uppercase tracking-widest mb-3">Who fits in</p>
                    <ul className="space-y-2.5">
                      {track.skills.map((item) => (
                        <li key={item} className="flex items-start gap-2.5 font-body text-sm text-v-ink/70 leading-relaxed">
                          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-v-ink/35 flex-shrink-0 mt-[0.4rem]" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <ProjectPreview trackName={track.name as keyof typeof TRACK_PREVIEWS} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
