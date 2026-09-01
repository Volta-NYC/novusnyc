import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";
import PublicAnalytics from "@/components/PublicAnalytics";
import { SITE_URL } from "@/lib/site";
import { EMAIL } from "@/lib/mail";
import { SOCIAL } from "@/lib/social";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Novus NYC",
  title: {
    default: "Novus NYC — Free Consulting for NYC Small Businesses",
    template: "%s | Novus NYC",
  },
  description:
    "Digital equity is economic equity. Novus connects student teams with New York City small businesses to provide free support in technology, marketing, finance, operations, websites, SEO, social media, and grant development.",
  metadataBase: new URL(SITE_URL),
  // "./" resolves per-route against metadataBase, so every page emits a
  // self-referencing canonical on the www host. Without this Next emits no
  // canonical at all, which leaves Google free to pick its own preferred URL —
  // and during a domain move that is usually the old one.
  alternates: { canonical: "./" },
  openGraph: {
    title: "Novus NYC",
    description:
      "Digital equity is economic equity. Student teams providing free consulting support for New York City small businesses.",
    url: SITE_URL,
    siteName: "Novus NYC",
    images: ["/api/og"],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Novus NYC",
    description: "Digital equity is economic equity. Student teams providing free consulting support for New York City small businesses.",
    images: ["/api/og"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico?v=novus-transparent-20260815", sizes: "any" },
      { url: "/icon-192.png?v=novus-transparent-20260815", sizes: "192x192", type: "image/png" },
      { url: "/icon.png?v=novus-transparent-20260815", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=novus-transparent-20260815",
    apple: [
      { url: "/apple-touch-icon.png?v=novus-transparent-20260815", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    title: "Novus NYC",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "@id": `${SITE_URL}/#website`,
              name: "Novus NYC",
              url: SITE_URL,
              publisher: { "@id": `${SITE_URL}/#organization` },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NGO",
              "@id": `${SITE_URL}/#organization`,
              name: "Novus NYC",
              // "Volta NYC" is this organization's own former name (its old
              // domain, voltanyc.org, 301s here) — not a claim about any
              // other org. Schema.org's alternateName is exactly the field
              // search engines use to resolve a rebrand: "novusnyc.org is
              // the entity formerly named Volta NYC." Kept out of visible
              // page copy by design; this block is the only place it lives.
              alternateName: ["Novus New York City", "Volta NYC"],
              url: SITE_URL,
              logo: `${SITE_URL}/logo.png`,
              description:
                "A nonprofit corporation incorporated in New York State, placing high school and college student teams on real consulting projects — websites, social media, grant writing, and SEO — for NYC small businesses at no cost.",
              disambiguatingDescription:
                "Novus NYC was founded and operated under the name Volta NYC before rebranding. It is unaffiliated with any other organization using the Volta name.",
              email: EMAIL.info,
              foundingDate: "2025",
              areaServed: {
                "@type": "City",
                name: "New York City",
                containedInPlace: {
                  "@type": "State",
                  name: "New York",
                },
              },
              knowsAbout: [
                "Website Design",
                "Search Engine Optimization",
                "Social Media Marketing",
                "Grant Writing",
                "Small Business Consulting",
                "Digital Equity",
              ],
              contactPoint: {
                "@type": "ContactPoint",
                email: EMAIL.info,
                contactType: "customer service",
                areaServed: "US",
                availableLanguage: ["English", "Spanish", "Chinese", "Bengali", "Korean", "Arabic"],
                url: `${SITE_URL}/partners#contact`,
              },
              hasOfferCatalog: {
                "@type": "OfferCatalog",
                name: "Free Consulting Services for NYC Small Businesses",
                itemListElement: [
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Website Design & Development",
                      description: "Custom websites built with modern frameworks — mobile-friendly, accessible, and maintained.",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Social Media & Content Strategy",
                      description: "Instagram strategy, posting calendars, founder interview videos, and audience growth campaigns.",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Grant Research & Writing",
                      description: "Identify grants the business qualifies for and prepare full applications.",
                    },
                  },
                  {
                    "@type": "Offer",
                    itemOffered: {
                      "@type": "Service",
                      name: "Search Engine Optimization",
                      description: "On-page SEO, Google Maps setup, Yelp optimization, and web accessibility improvements.",
                    },
                  },
                ],
              },
              founder: {
                "@type": "Person",
                name: "Ethan Zhang",
                jobTitle: "Founder & Director",
                affiliation: { "@id": `${SITE_URL}/#organization` },
                url: `${SITE_URL}/about#leadership`,
              },
              sameAs: [
                SOCIAL.linkedin,
                SOCIAL.instagram,
              ],
            }),
          }}
        />
      </head>
      <body className="overflow-x-hidden" suppressHydrationWarning>
        <a href="#main-content" className="skip-to-content">Skip to main content</a>
        <ConditionalLayout>{children}</ConditionalLayout>
        <PublicAnalytics />
      </body>
    </html>
  );
}
