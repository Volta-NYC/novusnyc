# Novus brand assets

The master is `source/novus-logo.svg` — a true vector mark. Everything else in
this folder is generated from it. All PNGs are RGBA with a transparent
background, so "dark bg" / "light bg" refers to the **surface the file is
designed to sit on**, not a baked-in background.

Lockups match the site: the wordmark is **Sora 700** with -0.02em tracking, set
at its natural width. (It was Syne squeezed to 90% horizontal scale before the
2026 wordmark change — Sora's proportions need no squeeze, so the scale hack is
gone. See `src/components/Wordmark.tsx`.)

The mark carries a **7% optical lift** in the lockups: its alpha centroid sits
7.61% below the bounding-box centre — a thin spire over a heavy deck — so
box-centring it against the wordmark reads low. `src/components/HeroSection.tsx`
applies the same correction.

| File | Use |
|---|---|
| `novus-horizontal-dark-bg.png` | Primary lockup on dark surfaces |
| `novus-horizontal-light-bg.png` | Primary lockup on light surfaces |
| `novus-stacked-dark-bg.png` | Square-ish spaces on dark |
| `novus-stacked-light-bg.png` | Square-ish spaces on light |
| `novus-horizontal-white.png` | One-colour reversed — dark photos, merch |
| `novus-horizontal-black.png` | One-colour — print, embroidery |
| `novus-stacked-white.png` / `-black.png` | One-colour stacked |
| `novus-icon.png` | Mark alone — avatars, favicons, app icons |
| `novus-icon-white.png` / `-black.png` | One-colour mark |

## `source/` — masters

| File | Use |
|---|---|
| `novus-logo.svg` | **The master.** Vector, three-colour mark. Start here. |
| `novus-logo-300dpi.png` | Print raster, 6277 x 5602 |
| `novus-logo-100dpi.png` | Mid raster, 2092 x 1867 |
| `novus-logo-1000px.png` | Screen raster, 1000 x 892 |
| `novus-lockup-horizontal.svg` | Mark + Sora wordmark, vector |
| `novus-lockup-stacked.svg` | Same, stacked |

## Two things to know

**The full-colour mark is weak on white.** The palette is pastel — peach, yellow
and lavender all sit at high luminance, so on a light background the yellow deck
in particular nearly disappears. `novus-horizontal-light-bg.png` pairs the
colour mark with an ink wordmark, which helps, but for small sizes or anything
print-bound on white, use the mono black version instead.

**The mark needs size to hold together.** Below roughly 20pt the cable hairlines
and the second tower stop resolving and it reads as an orange smudge. At 25pt+
it holds. Under that, use `novus-icon-black.png` or drop the mark and set the
wordmark alone.

## Regenerating

Rasterise from `source/novus-logo.svg` rather than upscaling any PNG. Keep the
mark-to-wordmark ratio and the 7% optical lift so the lockups stay consistent
with the site.
