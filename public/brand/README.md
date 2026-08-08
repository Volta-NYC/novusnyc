# Novus brand assets

Generated from `public/logo.png` (the master mark). All PNGs are RGBA with a
transparent background, so "dark bg" / "light bg" refers to the **surface the
file is designed to sit on**, not a baked-in background.

Lockups use the same treatment as the site: Syne 700 at 90% horizontal scale
with -0.02em tracking, mark height at 2.0x the wordmark cap height, and a 7%
optical lift on the mark (its visual mass sits low, so geometric centring reads
too low). See `src/components/Wordmark.tsx`.

| File | Use |
|---|---|
| `novus-horizontal-dark-bg.png` | Primary lockup on dark surfaces |
| `novus-horizontal-light-bg.png` | Primary lockup on light surfaces |
| `novus-stacked-dark-bg.png` | Square-ish spaces on dark |
| `novus-stacked-light-bg.png` | Square-ish spaces on light |
| `novus-horizontal-white.png` | One-colour reversed — dark photos, merch |
| `novus-horizontal-black.png` | One-colour — print, faxes, embroidery |
| `novus-stacked-white.png` / `-black.png` | One-colour stacked |
| `novus-icon.png` | Mark alone — avatars, favicons, app icons |
| `novus-icon-white.png` / `-black.png` | One-colour mark |

## Two things to know

**The full-colour mark is weak on white.** The palette is pastel — peach,
yellow and lavender all sit at high luminance, so on a light background the
yellow deck in particular nearly disappears. `novus-horizontal-light-bg.png`
pairs the colour mark with an ink wordmark, which helps, but for small sizes or
anything print-bound on white, use the mono black version instead.

**There is no SVG.** The master is a raster PNG. Auto-tracing it would produce a
bloated path soup with visible stair-stepping on the cable lines and would lose
the gradients in the deck. A real SVG needs the original vector file from
whoever drew it, or a deliberate redraw. Worth chasing — an SVG is what you want
for print, large-format, and crisp favicons.

## Regenerating

`scripts/` does not contain the generator; it was a one-off. To rebuild, resize
from `public/logo.png` and keep the ratios listed above so the lockups stay
consistent with the website.
