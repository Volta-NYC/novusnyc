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
  title: "Volta NYC — Student-Led Digital & Financial Services for Small Businesses",
  description:
    "Volta is a registered nonprofit placing high school and college students on real consulting projects for NYC small businesses — websites, social media, grant writing, and more.",
  metadataBase: new URL("https://nyc.voltanpo.org"),
  openGraph: {
    title: "Volta NYC",
    description: "Built by students. For NYC small businesses.",
    url: "https://nyc.voltanpo.org",
    siteName: "Volta NYC",
    locale: "en_US",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body>
        <ConditionalLayout>{children}</ConditionalLayout>
      </body>
    </html>
  );
}
