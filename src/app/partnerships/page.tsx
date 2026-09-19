import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import IntroductionMapSection from "@/components/partnerships/IntroductionMapSection";
import PartnerDirectory from "@/components/partnerships/PartnerDirectory";
import { EMAIL } from "@/lib/mail";
import { getPublicPartnerships } from "@/lib/server/publicPartnerships";

const DESCRIPTION =
  "The chambers, business improvement districts and development corporations that introduce Novus NYC to small businesses, and what each relationship involves.";

// Draft: kept out of the sitemap, nav, footer and llms.txt until approved.
// Open Graph and Twitter are set here so the page does not inherit the root
// layout's pricing language while the founder settles it.
export const metadata: Metadata = {
  title: "Partnerships",
  description: DESCRIPTION,
  robots: { index: false, follow: false },
  openGraph: { title: "Partnerships | Novus NYC", description: DESCRIPTION, images: ["/api/og"] },
  twitter: { card: "summary_large_image", title: "Partnerships | Novus NYC", description: DESCRIPTION, images: ["/api/og"] },
};

const DIVISION_OF_WORK = [
  {
    heading: "What a partner organization does",
    items: [
      "Tells us which businesses in its area need a website, or introduces us to their owners.",
      "Helps us reach owners when we need their feedback, photos or menus.",
      "Passes along the changes owners want after their site is live.",
      "Sometimes walks the neighborhood with us or invites us to a merchant event.",
    ],
  },
  {
    heading: "What Novus does",
    items: [
      "Reviews each business's current web presence.",
      "Builds a draft site and revises it with the owner until they approve it.",
      "Launches the site and gives the owner access to it.",
      "Keeps making updates after launch.",
    ],
  },
];

const MAP_NOTE_ID = "partnership-map-note";

export default async function PartnershipsPage() {
  const partners = await getPublicPartnerships();

  return (
    <>
      <section className="relative overflow-hidden bg-n-dark pb-12 pt-32 lg:pb-6" data-home-dark-end="true">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8">
          <AnimatedSection>
            <p className="mb-4 font-body text-sm font-semibold uppercase tracking-widest text-n-orange">Partnerships</p>
            <h1 className="max-w-4xl font-display font-bold leading-[1.02] tracking-tight text-white" style={{ fontSize: "clamp(2.3rem, 5.4vw, 4.2rem)" }}>
              The organizations that introduce us to New York&apos;s small businesses.
            </h1>
            <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-white/80">
              Chambers, business improvement districts and development corporations know their merchants. We build the websites. Here is what each relationship involves.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section id="introductions" className="relative scroll-mt-20 bg-n-dark pb-16 pt-6 max-lg:hidden">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="border-t border-white/10 pt-10">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">How the introductions connect</h2>
            <p className="mt-3 max-w-2xl font-body text-base leading-relaxed text-white/75">
              Every organization connects to Novus. The dashed arrows show who introduced whom, including one introduction that came from a client whose site we built.
            </p>
            <p id={MAP_NOTE_ID} className="sr-only">
              Select an organization to read its full description below the map. The same descriptions are listed after the map.
            </p>
            <div className="mt-6">
              <IntroductionMapSection partners={partners} describedBy={MAP_NOTE_ID} />
            </div>
          </div>
        </div>
      </section>

      <PartnerDirectory partners={partners} />

      <section id="what-partnering-means" className="scroll-mt-20 bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8">
          <AnimatedSection>
            <p className="mb-4 font-body text-sm font-semibold uppercase tracking-widest text-n-orange-ink">For organizations</p>
            <h2 className="page-section-heading text-n-ink">What partnering means</h2>
            <p className="mt-4 max-w-2xl font-body text-lg leading-relaxed text-n-muted">
              A partnership splits the work. You know the owners in your area. We build and maintain their websites.
            </p>
            <div className="mt-10 grid gap-10 md:grid-cols-2 md:gap-12">
              {DIVISION_OF_WORK.map((column, columnIndex) => (
                <div key={column.heading}>
                  <h3 className="border-b border-n-border pb-3 font-display text-xl font-bold text-n-ink">{column.heading}</h3>
                  <ol className="mt-4 space-y-3">
                    {column.items.map((item) => (
                      <li key={item} className="flex gap-3 font-body text-base leading-relaxed text-n-ink">
                        <span
                          aria-hidden="true"
                          className={`mt-2.5 h-2 w-2 shrink-0 rounded-full ${columnIndex === 0 ? "bg-n-purple" : "bg-n-orange"}`}
                        />
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col gap-4 border-t border-n-border pt-8 sm:flex-row sm:items-center">
              <a
                href={`mailto:${EMAIL.info}?subject=${encodeURIComponent("Working with Novus")}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-n-orange px-7 py-3 font-display text-base font-bold text-n-ink transition-colors hover:bg-n-orange-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-n-orange-ink/40"
              >
                Email us to start
              </a>
              <p className="font-body text-sm text-n-muted">
                Or write to <a href={`mailto:${EMAIL.info}`} className="font-semibold text-n-ink underline underline-offset-4">{EMAIL.info}</a>
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
