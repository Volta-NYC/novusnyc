"use client";

import { useState } from "react";
import Image from "next/image";
import { LinkedInIcon } from "@/components/Icons";
import type { LeadershipMember } from "@/data";

function GoogleWordmark() {
  return (
    <span aria-label="Google" className="font-semibold tracking-normal">
      <span className="text-[#4285F4]">G</span>
      <span className="text-[#EA4335]">o</span>
      <span className="text-[#FBBC05]">o</span>
      <span className="text-[#4285F4]">g</span>
      <span className="text-[#34A853]">l</span>
      <span className="text-[#EA4335]">e</span>
    </span>
  );
}

function ExperienceTitle({ title }: { title: string }) {
  if (title === "Google Team Edge") {
    return <><GoogleWordmark /> Team Edge</>;
  }

  if (title === "Google Code Next") {
    return <><GoogleWordmark /> Code Next</>;
  }

  return (
    <>{title}</>
  );
}

export default function LeadershipProfiles({ members }: { members: LeadershipMember[] }) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const selected = members.find((member) => member.name === selectedName);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {members.map((member) => {
          const selectedCard = selectedName === member.name;

          return (
            <div key={member.name} className="relative">
              <a
                href={member.linkedin}
                target="_blank"
                rel="noreferrer"
                aria-label={`${member.name}'s LinkedIn profile`}
                title={`${member.name}'s LinkedIn profile`}
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/45 bg-n-ink/75 text-white backdrop-blur-sm transition-colors hover:bg-[#0A66C2] focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                <LinkedInIcon className="h-3.5 w-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setSelectedName(selectedCard ? null : member.name)}
                aria-expanded={selectedCard}
                aria-controls={selectedCard ? "leadership-profile" : undefined}
                className={`group w-full overflow-hidden rounded-xl border bg-white text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-n-orange focus-visible:ring-offset-2 ${
                  selectedCard
                    ? "border-n-orange shadow-[0_10px_24px_rgba(246,183,141,0.2)]"
                    : "border-n-border hover:-translate-y-0.5 hover:border-n-orange/55 hover:shadow-md"
                }`}
              >
                <div className="aspect-[4/5] bg-n-border flex items-center justify-center overflow-hidden">
                  {member.photo ? (
                    <Image src={member.photo} alt={member.name} width={400} height={533} className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.025]" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-n-orange/15 border-2 border-n-orange/25 flex items-center justify-center">
                      <span className="font-display font-bold text-n-orange text-xl">{member.initial}</span>
                    </div>
                  )}
                </div>
                <div className="p-3 flex min-h-[76px] flex-col justify-between">
                  <div>
                    <h3 className="font-display font-bold text-n-ink text-xs leading-tight">{member.name}</h3>
                    <p className="font-body text-[10px] text-n-muted mt-0.5 leading-snug">{member.role}</p>
                  </div>
                  <span className={`mt-2 font-body text-[10px] font-semibold ${selectedCard ? "text-n-orange" : "text-n-purple"}`}>
                    {selectedCard ? "Hide profile -" : "View profile +"}
                  </span>
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {selected && (
        <section id="leadership-profile" className="relative mt-5 overflow-hidden rounded-2xl border border-n-border bg-n-bg shadow-[0_16px_40px_rgba(35,31,36,0.08)]">
          <a
            href={selected.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label={`${selected.name}'s LinkedIn profile`}
            title={`${selected.name}'s LinkedIn profile`}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-n-border bg-white text-[#0A66C2] shadow-sm transition-colors hover:border-[#0A66C2] hover:bg-[#0A66C2] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-n-orange focus-visible:ring-offset-2 sm:right-6 sm:top-6"
          >
            <LinkedInIcon className="h-4 w-4" />
          </a>
          <div className="grid gap-7 p-5 sm:grid-cols-[180px_1fr] sm:p-7">
            <div className="overflow-hidden rounded-xl border border-n-border bg-white aspect-[4/5] max-w-[220px]">
              {selected.photo ? (
                <Image src={selected.photo} alt={selected.name} width={400} height={533} className="w-full h-full object-cover object-center" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display font-bold text-n-orange text-4xl">{selected.initial}</span>
                </div>
              )}
            </div>

            <div>
              <p className="font-body text-xs font-bold uppercase tracking-[0.16em] text-n-orange">Leadership profile</p>
              <h3 className="mt-2 font-display text-3xl font-bold text-n-ink">{selected.name}</h3>
              <p className="mt-1 font-body text-base font-semibold text-n-purple">{selected.role}</p>
              <p className="mt-3 max-w-2xl font-body text-sm leading-relaxed text-n-muted">{selected.roleDetails}</p>

              <dl className="mt-6 grid gap-x-7 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-n-muted">School and grade</dt>
                  <dd className="mt-1 font-body text-sm font-semibold leading-relaxed text-n-ink">{selected.school}<br />{selected.grade}</dd>
                </div>
                <div>
                  <dt className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-n-muted">Focus area</dt>
                  <dd className="mt-1 font-body text-sm leading-relaxed text-n-ink">{selected.focus}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-n-muted">Interests</dt>
                  <dd className="mt-2 flex flex-wrap gap-2">
                    {selected.interests.map((interest) => (
                      <span key={interest} className="rounded-full border border-n-border bg-white px-2.5 py-1 font-body text-xs font-medium text-n-ink">
                        {interest}
                      </span>
                    ))}
                  </dd>
                </div>
                {selected.highlights && (
                  <div className="sm:col-span-2">
                    <dt className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-n-muted">Selected distinctions</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {selected.highlights.map((highlight) => (
                        <span key={highlight} className="rounded-full border border-n-yellow-dark/30 bg-n-yellow/35 px-2.5 py-1 font-body text-xs font-semibold text-n-ink">
                          {highlight}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2 border-t border-n-border pt-5">
                  <dt className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-n-muted">Why Novus</dt>
                  <dd className="mt-1.5 max-w-2xl font-body text-sm leading-relaxed text-n-ink">{selected.whyNovus}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-n-muted">Past experience</dt>
                  <dd className="mt-2 grid gap-3">
                    {selected.experience.map((item) => (
                      <article key={item.title} className="rounded-lg border border-n-border bg-white px-4 py-3">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                          <h4 className="font-body text-sm font-bold text-n-ink"><ExperienceTitle title={item.title} /></h4>
                          {item.role && <p className="font-body text-xs font-semibold text-n-purple">{item.role}</p>}
                        </div>
                        <p className="mt-1.5 font-body text-sm leading-relaxed text-n-muted">{item.description}</p>
                      </article>
                    ))}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
