"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useRef, useState } from "react";
import { AwardIcon, BuildingIcon, CheckIcon, PencilIcon, UsersIcon } from "@/components/Icons";

const steps = [
  {
    label: "Apply",
    eyebrow: "Start here",
    title: "Share your interests and availability.",
    detail: "Start with a short application covering your school, preferred track, and availability.",
    note: "Tell us what you want to work on and when you can contribute.",
    icon: PencilIcon,
    accent: "bg-n-purple",
    soft: "bg-n-purple/10",
    text: "text-n-purple-dark",
  },
  {
    label: "Application review",
    eyebrow: "We review applications",
    title: "We review applications for current openings.",
    detail: "We look at your interests, availability, and the teams that are currently onboarding. Not every applicant will have a call.",
    note: "We will contact you if there is an opening that fits.",
    icon: UsersIcon,
    accent: "bg-n-orange",
    soft: "bg-n-orange/10",
    text: "text-n-orange-dark",
  },
  {
    label: "Onboarding email",
    eyebrow: "If there is a fit",
    title: "Receive your next steps by email.",
    detail: "When there is an opening that matches your interests and availability, we will send an onboarding email with your track, team, and what to do next.",
    note: "Applicants are onboarded as teams have room to grow.",
    icon: CheckIcon,
    accent: "bg-n-yellow",
    soft: "bg-n-yellow/20",
    text: "text-amber-700",
  },
  {
    label: "Work with a business",
    eyebrow: "Make it real",
    title: "Join a team serving a real business.",
    detail: "Work with a business on a website, marketing plan, social content, grant research, or another practical project. You will receive feedback, meet deadlines, and contribute to deliverables that go live.",
    note: "You can point to the work when you apply for future opportunities.",
    icon: BuildingIcon,
    accent: "bg-n-orange-dark",
    soft: "bg-n-orange/10",
    text: "text-n-orange-dark",
  },
  {
    label: "Show your work",
    eyebrow: "Carry it forward",
    title: "Leave with work you can explain clearly.",
    detail: "Keep examples of what you built, what you owned, and what changed for the business. Team leads can speak to your contribution, and strong contributors can move into leadership roles.",
    note: "Your portfolio grows from real projects, not practice exercises.",
    icon: AwardIcon,
    accent: "bg-n-purple-dark",
    soft: "bg-n-purple/10",
    text: "text-n-purple-dark",
  },
] as const;

export default function ApplicationJourney() {
  const [active, setActive] = useState(0);
  const id = useId();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const reducedMotion = useReducedMotion();
  const step = steps[active];

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
            <h2 id="application-journey-heading" className="page-section-heading text-n-ink">Work you can put on your resume.</h2>
          </div>
          <p className="max-w-md font-body text-sm leading-relaxed text-n-muted md:text-right">Follow the steps from application to work you can use in college applications, interviews, and future roles.</p>
        </div>

        <div
          className="grid overflow-hidden rounded-lg border border-n-yellow/55 bg-white/70 md:grid-cols-[15rem_minmax(0,1fr)]"
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
                    <span className="block font-body text-[10px] font-semibold uppercase tracking-[0.14em] text-n-muted">{index + 1}</span>
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
