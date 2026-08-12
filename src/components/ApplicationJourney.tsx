"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useId, useRef, useState } from "react";
import { AwardIcon, BuildingIcon, CheckIcon, PencilIcon, UsersIcon } from "@/components/Icons";

const steps = [
  {
    label: "Apply",
    eyebrow: "Start here",
    title: "Share your interests and availability.",
    detail: "Start with a short application covering your school, relevant experience, preferred track, and the kind of client work you want to take on. You do not need a perfect resume to apply.",
    note: "The application is a starting point, not a skills test.",
    icon: PencilIcon,
    accent: "bg-n-purple",
    soft: "bg-n-purple/10",
    text: "text-n-purple-dark",
  },
  {
    label: "Interview",
    eyebrow: "Meet the team",
    title: "Meet a Novus lead for a conversation.",
    detail: "We talk through your interests, examples of work you are proud of, and how you like to collaborate. It helps us place you on a team where you can contribute and grow.",
    note: "Expect a conversation about fit, not a formal interrogation.",
    icon: UsersIcon,
    accent: "bg-n-orange",
    soft: "bg-n-orange/10",
    text: "text-n-orange-dark",
  },
  {
    label: "Join a track",
    eyebrow: "Find your fit",
    title: "Start in the track that fits you best.",
    detail: "Choose Digital & Tech, Marketing, or Finance & Operations. Marketing members can focus on social media and branding, grants and funding, ambassadors, small business outreach, or work across all four.",
    note: "You can build depth in one focus while collaborating across teams.",
    icon: CheckIcon,
    accent: "bg-n-yellow",
    soft: "bg-n-yellow/20",
    text: "text-amber-700",
  },
  {
    label: "Work with a business",
    eyebrow: "Make it real",
    title: "Join a team serving a real business.",
    detail: "Work through a live project with clear deliverables: a website, outreach plan, social content, grant research, or an owner-facing recommendation. You will respond to real feedback and project deadlines.",
    note: "The work is practical, collaborative, and client-facing.",
    icon: BuildingIcon,
    accent: "bg-n-orange-dark",
    soft: "bg-n-orange/10",
    text: "text-n-orange-dark",
  },
  {
    label: "Build a portfolio",
    eyebrow: "Carry it forward",
    title: "Document work that is genuinely yours.",
    detail: "Leave with shipped deliverables, clear examples of your contribution, and project stories you can use in college applications, interviews, and future opportunities.",
    note: "Experience that gives interviews and applications real substance.",
    icon: AwardIcon,
    accent: "bg-n-purple-dark",
    soft: "bg-n-purple/10",
    text: "text-n-purple-dark",
  },
] as const;

export default function ApplicationJourney() {
  const [active, setActive] = useState(0);
  const [manualPaused, setManualPaused] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reducedMotion = useReducedMotion();
  const step = steps[active];
  const paused = manualPaused || interactionPaused;

  useEffect(() => {
    if (paused || reducedMotion) return;
    const interval = window.setInterval(() => {
      setActive((current) => (current + 1) % steps.length);
    }, 5500);
    return () => window.clearInterval(interval);
  }, [paused, reducedMotion]);

  const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
    let next = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next = (index + 1) % steps.length;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next = (index - 1 + steps.length) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    else return;

    event.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <section id="journey" className="relative overflow-hidden bg-[#fffbea] py-14" aria-labelledby="application-journey-heading">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mb-9 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-body mb-3 text-xs font-bold uppercase tracking-[0.22em] text-amber-700">Your Novus journey</p>
            <h2 id="application-journey-heading" className="page-section-heading text-n-ink">From application to work you can show.</h2>
          </div>
          <div className="flex max-w-md flex-col items-start gap-3 md:items-end">
            <p className="font-body text-sm leading-relaxed text-n-muted md:text-right">Explore how a student moves from a first conversation to a portfolio of real client work.</p>
            {!reducedMotion && (
              <button
                type="button"
                aria-pressed={manualPaused}
                onClick={() => setManualPaused((value) => !value)}
                className="rounded-full border border-n-control-border bg-white px-3 py-1.5 font-body text-xs font-semibold text-n-purple-ink hover:bg-n-purple/10"
              >
                {manualPaused ? "Resume animation" : "Pause animation"}
              </button>
            )}
          </div>
        </div>

        <div
          className="grid overflow-hidden rounded-lg border border-n-yellow/55 bg-white/70 md:grid-cols-[15rem_minmax(0,1fr)]"
          onPointerEnter={() => setInteractionPaused(true)}
          onPointerLeave={() => setInteractionPaused(false)}
          onFocusCapture={() => setInteractionPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setInteractionPaused(false);
          }}
        >
          <div role="tablist" aria-label="Novus student journey" className="grid border-b border-n-yellow/40 bg-white/45 sm:grid-cols-5 md:block md:border-b-0 md:border-r">
            {steps.map((item, index) => {
              const selected = active === index;
              return (
                <button
                  key={item.label}
                  ref={(element) => { tabRefs.current[index] = element; }}
                  role="tab"
                  id={`${id}-tab-${index}`}
                  aria-selected={selected}
                  aria-controls={`${id}-panel`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setActive(index)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={`relative flex min-h-20 items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-n-purple md:min-h-0 md:px-5 md:py-4 ${selected ? "bg-white text-n-ink" : "text-n-muted hover:bg-white/70"}`}
                >
                  {selected ? <motion.span layoutId={`${id}-active-step`} className={`absolute inset-y-0 left-0 w-1 ${item.accent}`} /> : null}
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${selected ? item.soft : "bg-n-bg"}`}>
                    <item.icon className={`h-4 w-4 ${selected ? item.text : "text-n-muted"}`} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-n-muted">0{index + 1}</span>
                    <span className="mt-0.5 block font-display text-sm font-bold leading-tight">{item.label}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${active}`} tabIndex={0} className="min-h-[250px] p-6 md:p-9">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step.label}
                initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="flex h-full flex-col justify-between"
              >
                <div>
                  <div className="mb-7 flex items-center gap-4">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-lg ${step.soft}`}>
                      <step.icon className={`h-6 w-6 ${step.text}`} aria-hidden="true" />
                    </span>
                    <p className={`font-body text-xs font-bold uppercase tracking-[0.18em] ${step.text}`}>{step.eyebrow}</p>
                  </div>
                  <h3 className="max-w-xl font-display text-2xl font-bold leading-tight text-n-ink md:text-3xl">{step.title}</h3>
                  <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-n-muted">{step.detail}</p>
                </div>
                <p className="mt-8 border-t border-n-border pt-4 font-body text-sm font-semibold text-n-ink">{step.note}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
