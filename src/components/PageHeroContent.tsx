import type { ReactNode } from "react";
import Link from "next/link";
import AnimatedSection from "@/components/AnimatedSection";

type HeroAccent = "orange" | "purple" | "yellow";

type HeroAction = {
  href: string;
  label: string;
};

const accentClasses: Record<HeroAccent, { button: string; dot: string; eyebrow: string }> = {
  orange: {
    button: "bg-n-orange text-n-ink hover:bg-n-orange-dark",
    dot: "bg-n-orange",
    eyebrow: "text-n-orange",
  },
  purple: {
    button: "bg-n-purple text-n-ink hover:bg-n-purple-dark",
    dot: "bg-n-purple",
    eyebrow: "text-n-purple",
  },
  yellow: {
    button: "bg-n-yellow text-n-ink hover:bg-n-yellow-dark",
    dot: "bg-n-yellow",
    eyebrow: "text-n-yellow",
  },
};

export default function PageHeroContent({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  highlights = [],
  accent = "orange",
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  highlights?: string[];
  accent?: HeroAccent;
}) {
  const colors = accentClasses[accent];

  return (
    <AnimatedSection className="max-w-5xl">
      <p className={`mb-5 font-body text-xs font-bold uppercase tracking-[0.2em] sm:text-sm ${colors.eyebrow}`}>
        {eyebrow}
      </p>
      <h1 className="max-w-[15ch] font-display text-[clamp(3.1rem,7vw,5.8rem)] font-bold leading-[0.94] tracking-[-0.045em] text-white [text-shadow:0_8px_28px_rgba(0,0,0,0.45)]">
        {title}
      </h1>
      <p className="mt-7 max-w-[56ch] font-body text-lg leading-[1.6] text-white/90 [text-shadow:0_3px_18px_rgba(0,0,0,0.7)] md:text-xl">
        {description}
      </p>

      {(primaryAction || secondaryAction) && (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {primaryAction && (
            <Link
              href={primaryAction.href}
              className={`inline-flex min-h-14 items-center justify-center rounded-full px-8 py-4 font-display text-base font-bold shadow-lg shadow-black/20 transition-[background-color,transform] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80 ${colors.button}`}
            >
              {primaryAction.label}
              <span aria-hidden="true" className="ml-2">→</span>
            </Link>
          )}
          {secondaryAction && (
            <Link
              href={secondaryAction.href}
              className="inline-flex min-h-14 items-center justify-center rounded-full border-2 border-white/55 bg-n-dark/20 px-8 py-4 font-display text-base font-bold text-white transition-[background-color,border-color,transform] hover:-translate-y-0.5 hover:border-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/80"
            >
              {secondaryAction.label}
            </Link>
          )}
        </div>
      )}

      {highlights.length > 0 && (
        <ul className="mt-7 flex max-w-3xl flex-wrap gap-2.5" aria-label="Key details">
          {highlights.map((highlight) => (
            <li
              key={highlight}
              className="inline-flex min-h-10 items-center rounded-full border border-white/20 bg-n-dark/35 px-4 py-2 font-body text-sm font-semibold text-white/90 backdrop-blur-sm"
            >
              <span aria-hidden="true" className={`mr-2 h-1.5 w-1.5 rounded-full ${colors.dot}`} />
              {highlight}
            </li>
          ))}
        </ul>
      )}
    </AnimatedSection>
  );
}
