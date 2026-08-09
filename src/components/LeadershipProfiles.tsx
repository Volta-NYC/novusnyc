"use client";

import { useState } from "react";
import Image from "next/image";
import type { LeadershipMember } from "@/data";

export default function LeadershipProfiles({ members }: { members: LeadershipMember[] }) {
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const selected = members.find((member) => member.name === selectedName);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {members.map((member) => {
          const selectedCard = selectedName === member.name;

          return (
            <button
              key={member.name}
              type="button"
              onClick={() => setSelectedName(selectedCard ? null : member.name)}
              aria-expanded={selectedCard}
              aria-controls="leadership-profile"
              className={`group overflow-hidden rounded-xl border bg-white text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-n-orange focus-visible:ring-offset-2 ${
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
          );
        })}
      </div>

      {selected && (
        <section id="leadership-profile" className="mt-5 overflow-hidden rounded-2xl border border-n-border bg-n-bg shadow-[0_16px_40px_rgba(35,31,36,0.08)]">
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
                <div className="sm:col-span-2 border-t border-n-border pt-5">
                  <dt className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-n-muted">Why Novus</dt>
                  <dd className="mt-1.5 max-w-2xl font-body text-sm leading-relaxed text-n-ink">{selected.whyNovus}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-body text-[10px] font-bold uppercase tracking-[0.16em] text-n-muted">Past experience</dt>
                  <dd className="mt-2 grid gap-2 sm:grid-cols-2">
                    {selected.experience.map((item) => (
                      <span key={item} className="flex items-start gap-2 rounded-lg border border-n-border bg-white px-3 py-2 font-body text-sm leading-snug text-n-ink">
                        <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-n-orange" />
                        {item}
                      </span>
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
