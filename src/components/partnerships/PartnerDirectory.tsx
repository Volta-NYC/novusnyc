"use client";

import Image from "next/image";
import { useMemo, useState, type ReactNode } from "react";
import {
  KIND_LABEL,
  KIND_TONE,
  ROLE_META,
  ROLE_ORDER,
  SECTOR_ORDER,
  sectorLabel,
  type PartnerRole,
  type PartnerSector,
  type PartnerTone,
  type PublicPartnership,
} from "@/data/partnerships";

const GROUPS: { id: string; title: string; intro: string; match: (partner: PublicPartnership) => boolean }[] = [
  {
    id: "citywide-networks",
    title: "Citywide networks",
    intro: "The Small Business Resource Network and the borough chambers of commerce, whose specialists refer owners from across the city.",
    match: (partner) => partner.kind === "network" || partner.kind === "chamber",
  },
  {
    id: "neighborhood-organizations",
    title: "Neighborhood organizations",
    intro: "Business improvement districts, development corporations and merchant associations that know the owners on their blocks.",
    match: (partner) => partner.kind === "bid" || partner.kind === "ldc" || partner.kind === "merchant-association" || partner.kind === "program",
  },
  {
    id: "community-organizations",
    title: "Community organizations",
    intro: "Organizations that serve a community across the city and bring its business owners to Novus.",
    match: (partner) => partner.kind === "community-org",
  },
];

const TONE_BAR: Record<PartnerTone, string> = {
  purple: "bg-n-purple",
  orange: "bg-n-orange",
  yellow: "bg-n-yellow",
};

const TONE_RING: Record<PartnerTone, string> = {
  purple: "ring-n-purple",
  orange: "ring-n-orange",
  yellow: "ring-n-yellow",
};

function PartnerLogo({ partner, size }: { partner: PublicPartnership; size: "lg" | "sm" }) {
  const box = size === "lg" ? "h-16 w-16 p-2" : "h-11 w-11 p-1.5";
  const pixels = size === "lg" ? 64 : 44;
  return (
    <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white ring-[3px] ${TONE_RING[KIND_TONE[partner.kind]]} ${box}`}>
      {partner.logo ? (
        <Image src={partner.logo} alt={`${partner.name} logo`} width={pixels} height={pixels} className="h-full w-full object-contain" />
      ) : (
        <span aria-hidden="true" className="font-display text-[10px] font-bold text-n-ink">{partner.monogram}</span>
      )}
    </div>
  );
}

function RoleChips({ roles, small = false }: { roles: PartnerRole[]; small?: boolean }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="What this organization does">
      {roles.map((role) => (
        <li
          key={role}
          className={`rounded-full border border-n-border bg-n-bg font-body font-medium text-n-ink ${small ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs"}`}
        >
          {ROLE_META[role].label}
        </li>
      ))}
    </ul>
  );
}

function BusinessList({ partner }: { partner: PublicPartnership }) {
  const businesses = partner.businesses ?? [];
  if (businesses.length === 0) return null;
  return (
    <ul className="space-y-2">
      {businesses.map((business) => (
        <li key={business.name} className="flex items-start gap-2.5 font-body text-sm text-n-ink">
          <span
            aria-hidden="true"
            className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-n-orange-ink ${business.status === "live" ? "bg-n-orange-ink" : "bg-transparent"}`}
          />
          <span className="min-w-0">
            {business.url ? (
              <a href={business.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline decoration-n-border underline-offset-4 hover:decoration-n-orange-ink">
                {business.name}
              </a>
            ) : (
              <span className="font-semibold">{business.name}</span>
            )}
            <span className="ml-2 text-xs text-n-muted">{business.status === "live" ? "Site live" : "In progress"}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Connections({ partner, byId, introducedTo }: { partner: PublicPartnership; byId: Map<string, PublicPartnership>; introducedTo: PublicPartnership[] }) {
  const lines: ReactNode[] = [];
  for (const intro of partner.introducedBy ?? []) {
    const from = byId.get(intro.from);
    if (!from) continue;
    lines.push(
      intro.via ? (
        <>Introduced to Novus by {intro.via}, a business referred by the <a href={`#${from.id}`} className="font-semibold text-n-ink underline decoration-n-border underline-offset-4 hover:decoration-n-orange-ink">{from.name}</a>.</>
      ) : (
        <>Introduced to Novus by the <a href={`#${from.id}`} className="font-semibold text-n-ink underline decoration-n-border underline-offset-4 hover:decoration-n-orange-ink">{from.name}</a>.</>
      ),
    );
  }
  if (introducedTo.length > 0) {
    lines.push(
      <>
        Introduced Novus to{" "}
        {introducedTo.map((other, index) => {
          const viaClient = other.introducedBy?.find((intro) => intro.from === partner.id)?.via;
          return (
            <span key={other.id}>
              {index > 0 && (index === introducedTo.length - 1 ? " and " : ", ")}
              the <a href={`#${other.id}`} className="font-semibold text-n-ink underline decoration-n-border underline-offset-4 hover:decoration-n-orange-ink">{other.name}</a>
              {viaClient && <> (through its client {viaClient})</>}
            </span>
          );
        })}
        .
      </>,
    );
  }
  const alongside = (partner.worksAlongside ?? []).flatMap((id) => {
    const other = byId.get(id);
    return other ? [other] : [];
  });
  for (const other of alongside) {
    lines.push(
      <>Works alongside the <a href={`#${other.id}`} className="font-semibold text-n-ink underline decoration-n-border underline-offset-4 hover:decoration-n-orange-ink">{other.name}</a>.</>,
    );
  }
  if (lines.length === 0) return null;
  return (
    <div className="space-y-1.5 font-body text-sm leading-relaxed text-n-muted">
      {lines.map((line, index) => <p key={index}>{line}</p>)}
    </div>
  );
}

function MetaLine({ partner }: { partner: PublicPartnership }) {
  return (
    <p className="font-body text-[11px] font-bold uppercase tracking-[0.16em] text-n-muted">
      {sectorLabel(partner.sector)} · {KIND_LABEL[partner.kind]}
      {partner.since && <> · Since {partner.since}</>}
    </p>
  );
}

function WebsiteLink({ partner }: { partner: PublicPartnership }) {
  if (!partner.website) return null;
  return (
    <a
      href={partner.website}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center font-body text-sm font-semibold text-n-orange-ink underline-offset-4 hover:underline"
    >
      Visit their website<span className="sr-only"> ({partner.name})</span>
      <span aria-hidden="true" className="ml-1">↗</span>
    </a>
  );
}

function DeepPartner({ partner, byId, introducedTo, hiddenOnMobile }: { partner: PublicPartnership; byId: Map<string, PublicPartnership>; introducedTo: PublicPartnership[]; hiddenOnMobile: boolean }) {
  const tone = KIND_TONE[partner.kind];
  const hasSide = (partner.businesses?.length ?? 0) > 0;
  return (
    <article id={partner.id} className={`relative scroll-mt-28 overflow-hidden rounded-2xl border border-n-border bg-white ${hiddenOnMobile ? "max-md:hidden" : ""}`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1.5 ${TONE_BAR[tone]}`} />
      <div className={`grid gap-8 p-6 pl-8 md:p-8 md:pl-10 ${hasSide ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-12" : ""}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <PartnerLogo partner={partner} size="lg" />
            <div className="min-w-0">
              <MetaLine partner={partner} />
              <h3 className="mt-1 font-display text-2xl font-bold leading-tight text-n-ink">{partner.name}</h3>
            </div>
          </div>
          <div className="mt-5"><RoleChips roles={partner.roles} /></div>
          <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-n-ink">{partner.summary}</p>
          {partner.facts && partner.facts.length > 0 && (
            <ul className="mt-5 max-w-2xl space-y-2">
              {partner.facts.map((fact) => (
                <li key={fact} className="flex gap-3 font-body text-sm leading-relaxed text-n-muted">
                  <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BAR[tone]}`} />
                  {fact}
                </li>
              ))}
            </ul>
          )}
          {partner.testimonial && (
            <figure className="mt-6 max-w-2xl border-l-2 border-n-border pl-4">
              <blockquote className="font-body text-base italic leading-relaxed text-n-ink">{partner.testimonial.quote}</blockquote>
              <figcaption className="mt-2 font-body text-sm text-n-muted">{partner.testimonial.name}, {partner.testimonial.business}</figcaption>
            </figure>
          )}
          <div className="mt-5 space-y-3">
            <Connections partner={partner} byId={byId} introducedTo={introducedTo} />
            <WebsiteLink partner={partner} />
          </div>
        </div>
        {hasSide && (
          <div className="min-w-0 lg:border-l lg:border-n-border lg:pl-10">
            <h4 className="mb-4 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-n-muted">Websites through this relationship</h4>
            <BusinessList partner={partner} />
            {partner.image && (
              <Image src={partner.image.src} alt={partner.image.alt} width={640} height={420} className="mt-6 aspect-[3/2] w-full rounded-xl object-cover" />
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function ActivePartner({ partner, byId, introducedTo, hiddenOnMobile }: { partner: PublicPartnership; byId: Map<string, PublicPartnership>; introducedTo: PublicPartnership[]; hiddenOnMobile: boolean }) {
  const tone = KIND_TONE[partner.kind];
  return (
    <article id={partner.id} className={`relative flex scroll-mt-28 flex-col overflow-hidden rounded-2xl border border-n-border bg-white p-5 pl-7 ${hiddenOnMobile ? "max-md:hidden" : ""}`}>
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${TONE_BAR[tone]}`} />
      <div className="flex items-center gap-3">
        <PartnerLogo partner={partner} size="sm" />
        <div className="min-w-0">
          <MetaLine partner={partner} />
          <h3 className="mt-0.5 font-display text-lg font-bold leading-snug text-n-ink">{partner.name}</h3>
        </div>
      </div>
      <div className="mt-4"><RoleChips roles={partner.roles} small /></div>
      <p className="mt-4 font-body text-sm leading-relaxed text-n-ink">{partner.summary}</p>
      {partner.facts && partner.facts.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {partner.facts.map((fact) => (
            <li key={fact} className="flex gap-2.5 font-body text-[13px] leading-relaxed text-n-muted">
              <span aria-hidden="true" className={`mt-[0.45rem] h-1.5 w-1.5 shrink-0 rounded-full ${TONE_BAR[tone]}`} />
              {fact}
            </li>
          ))}
        </ul>
      )}
      {(partner.businesses?.length ?? 0) > 0 && (
        <div className="mt-4 border-t border-n-border pt-4"><BusinessList partner={partner} /></div>
      )}
      <div className="mt-4 space-y-3">
        <Connections partner={partner} byId={byId} introducedTo={introducedTo} />
        <WebsiteLink partner={partner} />
      </div>
    </article>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 font-body text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-n-orange-ink focus-visible:ring-offset-2 ${active ? "border-n-ink bg-n-ink text-white" : "border-n-control-border bg-white text-n-ink"}`}
    >
      {children}
    </button>
  );
}

export default function PartnerDirectory({ partners }: { partners: PublicPartnership[] }) {
  const [sector, setSector] = useState<PartnerSector | null>(null);
  const [role, setRole] = useState<PartnerRole | null>(null);

  const byId = useMemo(() => new Map(partners.map((partner) => [partner.id, partner])), [partners]);
  const introducedTo = useMemo(() => {
    const map = new Map<string, PublicPartnership[]>();
    for (const partner of partners) {
      for (const intro of partner.introducedBy ?? []) {
        map.set(intro.from, [...(map.get(intro.from) ?? []), partner]);
      }
    }
    return map;
  }, [partners]);
  const usedRoles = ROLE_ORDER.filter((candidate) => partners.some((partner) => partner.roles.includes(candidate)));
  const matches = (partner: PublicPartnership) => (!sector || partner.sector === sector) && (!role || partner.roles.includes(role));
  const matchCount = partners.filter(matches).length;

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-12 md:hidden">
        <h2 className="font-display text-2xl font-bold text-n-ink">The organizations</h2>
        <p className="mt-2 font-body text-sm leading-relaxed text-n-muted">Filter by borough or by what an organization did.</p>
        <div className="mt-5 space-y-4">
          <div>
            <p className="mb-2 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-n-muted">Borough</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by borough">
              {SECTOR_ORDER.map((candidate) => (
                <FilterChip key={candidate} active={sector === candidate} onClick={() => setSector(sector === candidate ? null : candidate)}>
                  {sectorLabel(candidate)}
                </FilterChip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-body text-[11px] font-bold uppercase tracking-[0.16em] text-n-muted">What they did</p>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Filter by what the organization did">
              {usedRoles.map((candidate) => (
                <FilterChip key={candidate} active={role === candidate} onClick={() => setRole(role === candidate ? null : candidate)}>
                  {ROLE_META[candidate].label}
                </FilterChip>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-4 font-body text-sm text-n-muted" aria-live="polite">
          Showing {matchCount} of {partners.length} organizations.
          {(sector || role) && (
            <button
              type="button"
              onClick={() => {
                setSector(null);
                setRole(null);
              }}
              className="ml-2 font-semibold text-n-orange-ink underline underline-offset-4"
            >
              Clear filters
            </button>
          )}
        </p>
      </div>

      {GROUPS.map((group, groupIndex) => {
        const members = partners
          .filter(group.match)
          .sort((a, b) => (a.depth === b.depth ? 0 : a.depth === "deep" ? -1 : 1));
        if (members.length === 0) return null;
        const deep = members.filter((partner) => partner.depth === "deep");
        const active = members.filter((partner) => partner.depth === "active");
        const groupVisibleOnMobile = members.some(matches);
        return (
          <section
            key={group.id}
            id={group.id}
            className={`public-surface scroll-mt-24 py-12 md:py-16 ${groupIndex % 2 === 0 ? "bg-n-bg" : "bg-white"} ${groupVisibleOnMobile ? "" : "max-md:hidden"}`}
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8">
              <h2 className="page-section-heading text-n-ink">{group.title}</h2>
              <p className="mt-3 max-w-2xl font-body leading-relaxed text-n-muted">{group.intro}</p>
              {deep.length > 0 && (
                <div className="mt-8 space-y-5">
                  {deep.map((partner) => (
                    <DeepPartner key={partner.id} partner={partner} byId={byId} introducedTo={introducedTo.get(partner.id) ?? []} hiddenOnMobile={!matches(partner)} />
                  ))}
                </div>
              )}
              {active.length > 0 && (
                <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {active.map((partner) => (
                    <ActivePartner key={partner.id} partner={partner} byId={byId} introducedTo={introducedTo.get(partner.id) ?? []} hiddenOnMobile={!matches(partner)} />
                  ))}
                </div>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
