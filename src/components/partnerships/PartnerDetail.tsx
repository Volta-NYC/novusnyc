import Image from "next/image";
import { Fragment } from "react";
import { KIND_LABEL, KIND_TONE, sectorLabel, type PartnerBusiness, type PublicPartnership } from "@/data/partnerships";

type Surface = "dark" | "light";

const STYLES: Record<Surface, { meta: string; name: string; body: string; muted: string; strong: string; link: string; dot: string; rule: string }> = {
  dark: {
    meta: "text-white/55",
    name: "text-white",
    body: "text-white/85",
    muted: "text-white/65",
    strong: "text-white",
    link: "text-n-orange decoration-n-orange/40 hover:decoration-n-orange",
    dot: "bg-white/40",
    rule: "border-white/20",
  },
  light: {
    meta: "text-n-muted",
    name: "text-n-ink",
    body: "text-n-ink",
    muted: "text-n-muted",
    strong: "text-n-ink",
    link: "text-n-orange-ink decoration-n-border hover:decoration-n-orange-ink",
    dot: "bg-n-muted/50",
    rule: "border-n-border",
  },
};

const RING: Record<"purple" | "orange", string> = {
  purple: "ring-n-purple",
  orange: "ring-n-orange",
};

export function PartnerLogo({ partner, size = 84 }: { partner: PublicPartnership; size?: number }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-3 ring-[3px] ${RING[KIND_TONE[partner.kind]]}`}
      style={{ width: size, height: size }}
    >
      {partner.logo ? (
        <Image src={partner.logo} alt="" width={size} height={size} loading="eager" className="h-full w-full object-contain" />
      ) : (
        <span aria-hidden="true" className="font-display text-sm font-bold text-n-ink">{partner.monogram}</span>
      )}
    </div>
  );
}

// Named sites are a sample, never the full list, so the label promises no more
// than it shows and Our Work carries the rest.
function Spotlights({ businesses, styles }: { businesses: PartnerBusiness[]; styles: (typeof STYLES)[Surface] }) {
  if (businesses.length === 0) return null;
  return (
    <div>
      <p className={`font-body text-sm leading-relaxed ${styles.muted}`}>
        <span className={`font-semibold ${styles.strong}`}>{businesses.length === 1 ? "Spotlight" : "Spotlights"}: </span>
        {businesses.map((business, index) => (
          <Fragment key={business.name}>
            {index > 0 && ", "}
            {business.url ? (
              <a href={business.url} target="_blank" rel="noopener noreferrer" className={`underline underline-offset-4 ${styles.link}`}>
                {business.name}
              </a>
            ) : (
              business.name
            )}
          </Fragment>
        ))}
      </p>
      <a href="/showcase" className={`mt-1.5 inline-flex items-center font-body text-sm font-semibold underline underline-offset-4 ${styles.link}`}>
        See more of our work<span aria-hidden="true" className="ml-1">→</span>
      </a>
    </div>
  );
}

export default function PartnerDetail({
  partner,
  partnersById,
  surface,
  headingLevel = "h3",
}: {
  partner: PublicPartnership;
  partnersById: Map<string, PublicPartnership>;
  surface: Surface;
  headingLevel?: "h2" | "h3" | "h4";
}) {
  const styles = STYLES[surface];
  const Heading = headingLevel;
  const facts = partner.facts ?? [];
  const spotlights = (partner.businesses ?? []).filter((business) => business.status === "live");
  const parent = partner.formedWith ? partnersById.get(partner.formedWith) : undefined;
  const intros = (partner.introducedBy ?? []).flatMap((intro) => {
    const from = partnersById.get(intro.from);
    return from ? [{ from, via: intro.via }] : [];
  });
  const aside = spotlights.length > 0 || intros.length > 0 || Boolean(partner.testimonial);

  return (
    <div className="grid gap-x-10 gap-y-6 sm:grid-cols-[auto_minmax(0,1fr)]">
      <PartnerLogo partner={partner} />
      <div className="min-w-0">
        <p className={`font-body text-[11px] font-bold uppercase tracking-[0.16em] ${styles.meta}`}>
          {sectorLabel(partner.sector)} · {KIND_LABEL[partner.kind]}
          {parent && <> · Formed with {parent.shortName}</>}
          {partner.since && <> · Since {partner.since}</>}
        </p>
        <Heading className={`mt-1.5 font-display text-xl font-bold leading-tight ${styles.name} md:text-2xl`}>{partner.name}</Heading>
        <p className={`mt-3 max-w-3xl font-body text-base leading-relaxed ${styles.body}`}>{partner.summary}</p>
      </div>

      {(facts.length > 0 || aside) && (
        <div className="grid gap-x-10 gap-y-5 sm:col-start-2 md:grid-cols-2">
          {facts.length > 0 && (
            <ul className="space-y-1.5">
              {facts.map((fact) => (
                <li key={fact} className={`flex gap-3 font-body text-sm leading-relaxed ${styles.muted}`}>
                  <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
                  {fact}
                </li>
              ))}
            </ul>
          )}

          {aside && (
            <div className="space-y-3">
              <Spotlights businesses={spotlights} styles={styles} />
              {intros.map(({ from, via }) => (
                <p key={from.id} className={`font-body text-sm leading-relaxed ${styles.muted}`}>
                  <span className={`font-semibold ${styles.strong}`}>Introduced by: </span>
                  {via ? <>{via}, a business the {from.name} referred</> : from.name}
                </p>
              ))}
              {partner.testimonial && (
                <figure className={`border-l-2 pl-4 ${styles.rule}`}>
                  <blockquote className={`font-body text-sm italic leading-relaxed ${styles.body}`}>{partner.testimonial.quote}</blockquote>
                  <figcaption className={`mt-1 font-body text-sm ${styles.muted}`}>{partner.testimonial.name}, {partner.testimonial.business}</figcaption>
                </figure>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
