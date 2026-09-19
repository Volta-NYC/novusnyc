"use client";

import { useMemo, useState } from "react";
import { KIND_TONE, SECTOR_ORDER, sectorLabel, type PartnerSector, type PublicPartnership } from "@/data/partnerships";
import PartnerDetail from "./PartnerDetail";

const GROUPS: { title: string; match: (partner: PublicPartnership) => boolean }[] = [
  { title: "Chambers and business organizations", match: (partner) => KIND_TONE[partner.kind] === "purple" },
  { title: "Business Improvement Districts, development and merchant organizations", match: (partner) => KIND_TONE[partner.kind] === "orange" },
];

// Below lg this is the page's list of partners. From lg up the map replaces
// it visually, and it stays in the accessibility tree as the map's text
// equivalent.
export default function PartnerDirectory({ partners }: { partners: PublicPartnership[] }) {
  const [sector, setSector] = useState<PartnerSector | null>(null);
  const byId = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);
  const visible = (partner: PublicPartnership) => !sector || partner.sector === sector;
  const ordered = (members: PublicPartnership[]) =>
    [...members].sort((a, b) => (a.depth === b.depth ? 0 : a.depth === "deep" ? -1 : 1));

  return (
    <section id="organizations" aria-labelledby="organizations-heading" className="bg-n-bg py-12 lg:sr-only">
      <div className="mx-auto max-w-3xl px-4 sm:px-5 md:px-8">
        <h2 id="organizations-heading" className="font-display text-2xl font-bold text-n-ink">The organizations</h2>
        <div className="mt-4 flex flex-wrap gap-2 lg:hidden" role="group" aria-label="Filter by borough">
          {SECTOR_ORDER.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={sector === candidate}
              onClick={() => setSector(sector === candidate ? null : candidate)}
              className={`rounded-full border px-3 py-1.5 font-body text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-orange-ink focus-visible:ring-offset-2 ${sector === candidate ? "border-n-ink bg-n-ink text-white" : "border-n-control-border bg-white text-n-ink"}`}
            >
              {sectorLabel(candidate)}
            </button>
          ))}
        </div>

        {GROUPS.map((group) => {
          const members = ordered(partners.filter(group.match));
          const shown = members.filter(visible);
          return (
            <div key={group.title} className={shown.length === 0 ? "hidden" : "mt-10"}>
              <h3 className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-n-muted">{group.title}</h3>
              <ul className="mt-4 space-y-4">
                {members.map((partner) => (
                  <li
                    key={partner.id}
                    id={partner.id}
                    className={`scroll-mt-24 rounded-2xl border border-n-border bg-white p-5 ${visible(partner) ? "" : "hidden"}`}
                  >
                    <PartnerDetail partner={partner} partnersById={byId} surface="light" headingLevel="h4" />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
