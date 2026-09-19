import type { Metadata } from "next";
import AnimatedSection from "@/components/AnimatedSection";
import SectionProgressNav from "@/components/SectionProgressNav";
import IntroductionMapSection from "@/components/partnerships/IntroductionMapSection";
import PartnerDirectory from "@/components/partnerships/PartnerDirectory";
import { ROLE_META, ROLE_ORDER, liveSiteCount } from "@/data/partnerships";
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

const STEPS = [
  {
    title: "You share merchants who need help",
    body: "Tell us which businesses in your district need a better website, or introduce us to their owners directly.",
  },
  {
    title: "We review and build a draft",
    body: "We look at each business's current web presence and build a draft site the owner can react to.",
  },
  {
    title: "You help us reach owners",
    body: "Owners are busy. Your staff help us reach them for feedback, photos and menus so drafts keep moving.",
  },
  {
    title: "We launch and keep it current",
    body: "We launch the site, hand the owner access, and keep making updates after launch.",
  },
];

const MAP_NOTE_ID = "partnership-map-note";

export default async function PartnershipsPage() {
  const partners = await getPublicPartnerships();
  const liveSites = liveSiteCount(partners);
  const usedRoles = ROLE_ORDER.filter((role) => partners.some((partner) => partner.roles.includes(role)));

  return (
    <>
      <SectionProgressNav
        accent="orange"
        sections={[
          { id: "introductions", label: "Introductions" },
          { id: "what-partnering-means", label: "What partnering means" },
          { id: "citywide-networks", label: "Citywide networks" },
          { id: "neighborhood-organizations", label: "Neighborhood" },
          { id: "community-organizations", label: "Community" },
          { id: "work-with-us", label: "Work with us" },
        ]}
      />

      <section className="relative overflow-hidden bg-n-dark pb-12 pt-32 md:pb-6" data-home-dark-end="true">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8">
          <AnimatedSection>
            <p className="mb-4 font-body text-sm font-semibold uppercase tracking-widest text-n-orange">Partnerships</p>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <h1 className="font-display font-bold leading-[1.02] tracking-tight text-white" style={{ fontSize: "clamp(2.3rem, 5.4vw, 4.2rem)" }}>
                  The organizations that introduce us to New York&apos;s small businesses.
                </h1>
                <p className="mt-6 max-w-2xl font-body text-lg leading-relaxed text-white/80">
                  Chambers, business improvement districts and development corporations know their merchants. We build the websites. Here is what each relationship involves.
                </p>
              </div>
              <dl className="flex gap-10 lg:pb-2">
                {[
                  { label: "Organizations", value: partners.length },
                  { label: "Sites live through\npartners", value: liveSites },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse">
                    <dt className="mt-2 whitespace-pre-line font-body text-xs uppercase leading-relaxed tracking-widest text-white/60">{stat.label}</dt>
                    <dd className="font-display text-4xl font-bold leading-none text-n-orange">{stat.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </AnimatedSection>
        </div>
      </section>

      <section id="introductions" className="relative scroll-mt-20 bg-n-dark pb-16 pt-6 max-md:hidden">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <div className="border-t border-white/10 pt-10">
            <h2 className="font-display text-2xl font-bold text-white md:text-3xl">How the introductions connect</h2>
            <p className="mt-3 max-w-2xl font-body text-base leading-relaxed text-white/75">
              Every organization connects to Novus. The dashed arrows show who introduced whom, including one introduction that came from a client whose site we built.
            </p>
            <p id={MAP_NOTE_ID} className="sr-only">
              This map is a visual summary. Every organization, what it did, and who introduced it are described in full in the sections below.
            </p>
            <div className="mx-auto mt-8 max-w-[68rem]">
              <IntroductionMapSection partners={partners} describedBy={MAP_NOTE_ID} />
            </div>
          </div>
        </div>
      </section>

      <section id="what-partnering-means" className="public-surface public-surface-grid scroll-mt-20 bg-white py-14 md:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8">
          <AnimatedSection>
            <h2 className="page-section-heading text-n-ink">What partnering means</h2>
            <p className="mt-3 max-w-2xl font-body leading-relaxed text-n-muted">
              Partnership covers different kinds of work. Each organization on this page is described by what it actually did.
            </p>
            <dl className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
              {usedRoles.map((role) => (
                <div key={role} className="border-t border-n-border pt-4">
                  <dt className="font-display text-base font-bold text-n-ink">{ROLE_META[role].label}</dt>
                  <dd className="mt-1 font-body text-sm leading-relaxed text-n-muted">{ROLE_META[role].description}</dd>
                </div>
              ))}
            </dl>
          </AnimatedSection>
        </div>
      </section>

      <PartnerDirectory partners={partners} />

      <section id="work-with-us" className="scroll-mt-20 bg-n-dark py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-5 md:px-8">
          <AnimatedSection>
            <p className="mb-4 font-body text-sm font-semibold uppercase tracking-widest text-n-orange">For organizations</p>
            <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight text-white md:text-4xl">How working with Novus works</h2>
            <p className="mt-4 max-w-2xl font-body text-base leading-relaxed text-white/75 md:text-lg">
              If your organization supports small businesses in New York City, this is what working together involves.
            </p>
            <ol className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
                  <p className="font-display text-sm font-bold text-n-orange">Step {index + 1}</p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug text-white">{step.title}</h3>
                  <p className="mt-2 font-body text-sm leading-relaxed text-white/75">{step.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <a
                href={`mailto:${EMAIL.info}?subject=${encodeURIComponent("Working with Novus")}`}
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-n-orange px-7 py-3 font-display text-base font-bold text-n-ink transition-colors hover:bg-n-orange-dark focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/70"
              >
                Email us to start
              </a>
              <p className="font-body text-sm text-white/70">
                Or write to <a href={`mailto:${EMAIL.info}`} className="font-semibold text-white underline underline-offset-4">{EMAIL.info}</a>
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </>
  );
}
