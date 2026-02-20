import type { Metadata } from "next";
import { Space_Grotesk, DM_Sans } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/ConditionalLayout";

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
  title: {
    default: "Volta NYC — Student-Led Digital & Financial Services for Small Businesses",
    template: "%s | Volta NYC",
  },
  description:
    "Volta NYC is a registered 501(c)(3) nonprofit placing high school and college student teams on real consulting projects for NYC small businesses — websites, social media, grant writing, SEO, and more. Free of charge.",
  metadataBase: new URL("https://nyc.voltanpo.org"),
  openGraph: {
    title: "Volta NYC",
    description:
      "Student consultants. Real deliverables. Free for NYC small businesses.",
    url: "https://nyc.voltanpo.org",
    siteName: "Volta NYC",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Volta NYC",
    description: "Student consultants. Real deliverables. Free for NYC small businesses.",
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
              "@type": "Organization",
              name: "Volta NYC",
              url: "https://nyc.voltanpo.org",
              logo: "https://nyc.voltanpo.org/logo.png",
              description:
                "A registered 501(c)(3) nonprofit placing high school and college student teams on real consulting projects for NYC small businesses at no cost.",
              email: "volta.newyork@gmail.com",
              areaServed: "New York City, NY",
              nonprofitStatus: "Nonprofit501c3",
              sameAs: ["https://www.linkedin.com/company/volta-nyc/"],
            }),
          }}
        />
      </head>
      <body>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
