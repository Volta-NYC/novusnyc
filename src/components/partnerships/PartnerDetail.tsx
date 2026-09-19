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

export function PartnerLogo({ partner, size = 56 }: { partner: PublicPartnership; size?: number }) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white p-2 ring-[3px] ${RING[KIND_TONE[partner.kind]]}`}
      style={{ width: size, height: size }}
    >
      {partner.logo ? (
        <Image src={partner.logo} alt="" width={size} height={size} loading="eager" className="h-full w-full object-contain" />
      ) : (
        <span aria-hidden="true" className="font-display text-[10px] font-bold text-n-ink">{partner.monogram}</span>
      )}
    </div>
  );
}

function SiteList({ label, businesses, styles }: { label: string; businesses: PartnerBusiness[]; styles: (typeof STYLES)[Surface] }) {
  if (businesses.length === 0) return null;
  return (
    <p className={`font-body text-sm leading-relaxed ${styles.muted}`}>
      <span className={`font-semibold ${styles.strong}`}>{label}: </span>
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
  const businesses = partner.businesses ?? [];
  const intros = (partner.introducedBy ?? []).flatMap((intro) => {
    const from = partnersById.get(intro.from);
    return from ? [{ from, via: intro.via }] : [];
  });

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:gap-6">
      <PartnerLogo partner={partner} />
      <div className="min-w-0 max-w-3xl">
        <p className={`font-body text-[11px] font-bold uppercase tracking-[0.16em] ${styles.meta}`}>
          {sectorLabel(partner.sector)} · {KIND_LABEL[partner.kind]}
          {partner.since && <> · Since {partner.since}</>}
        </p>
        <Heading className={`mt-1 font-display text-xl font-bold leading-tight md:text-2xl ${styles.name}`}>{partner.name}</Heading>
        <p className={`mt-3 font-body text-base leading-relaxed ${styles.body}`}>{partner.summary}</p>

        {partner.facts && partner.facts.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {partner.facts.map((fact) => (
              <li key={fact} className={`flex gap-3 font-body text-sm leading-relaxed ${styles.muted}`}>
                <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot}`} />
                {fact}
              </li>
            ))}
          </ul>
        )}

        {partner.testimonial && (
          <figure className={`mt-4 border-l-2 pl-4 ${styles.rule}`}>
            <blockquote className={`font-body text-base italic leading-relaxed ${styles.body}`}>{partner.testimonial.quote}</blockquote>
            <figcaption className={`mt-1 font-body text-sm ${styles.muted}`}>{partner.testimonial.name}, {partner.testimonial.business}</figcaption>
          </figure>
        )}

        {(businesses.length > 0 || intros.length > 0) && (
          <div className="mt-4 space-y-1">
            <SiteList label="Sites live" businesses={businesses.filter((business) => business.status === "live")} styles={styles} />
            <SiteList label="In progress" businesses={businesses.filter((business) => business.status === "in-progress")} styles={styles} />
            {intros.map(({ from, via }) => (
              <p key={from.id} className={`font-body text-sm leading-relaxed ${styles.muted}`}>
                <span className={`font-semibold ${styles.strong}`}>Introduced by: </span>
                {via ? <>{via}, a business the {from.name} referred</> : from.name}
              </p>
            ))}
          </div>
        )}

        {partner.image && (
          <Image src={partner.image.src} alt={partner.image.alt} width={720} height={480} className="mt-5 aspect-[3/2] w-full max-w-md rounded-xl object-cover" />
        )}

        {partner.website && (
          <a
            href={partner.website}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-4 inline-flex items-center font-body text-sm font-semibold underline underline-offset-4 ${styles.link}`}
          >
            Visit their website<span className="sr-only"> ({partner.name})</span>
            <span aria-hidden="true" className="ml-1">↗</span>
          </a>
        )}
      </div>
    </div>
  );
}
