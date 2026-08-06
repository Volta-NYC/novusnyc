import { syne } from "@/lib/fonts";

/**
 * The NOVUS wordmark.
 *
 * Syne has no width axis, so "narrower letters" has to come from a horizontal
 * scale rather than a condensed cut. `transform` does not affect layout, so the
 * element would still reserve its full unscaled width and push everything after
 * it — visibly off-centring the hero. The negative inline margin gives that
 * width back.
 *
 * "NOVUS" in Syne 700 advances 4.175em, or 4.095em once -0.02em tracking is
 * applied between the five glyphs. The compensation is half the width lost on
 * each side: (1 - SCALE) * 4.095 / 2. Being em-based it holds at every size.
 * Change SCALE and the margin follows.
 */
const SCALE = 0.9;
const WORD_ADVANCE_EM = 4.095;
const SIDE_MARGIN_EM = -((1 - SCALE) * WORD_ADVANCE_EM) / 2;

export default function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`${syne.className} inline-block font-bold ${className}`}
      style={{
        transform: `scaleX(${SCALE})`,
        transformOrigin: "center",
        letterSpacing: "-0.02em",
        marginInline: `${SIDE_MARGIN_EM}em`,
      }}
    >
      NOVUS
    </span>
  );
}
