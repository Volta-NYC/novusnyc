"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

const GA_DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;

export default function PublicAnalytics() {
  const pathname = usePathname();
  const isPrivateRoute = pathname?.startsWith("/members") || pathname?.startsWith("/book");

  if (isPrivateRoute || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Analytics />
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          window['${GA_DISABLE_KEY}'] = false;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
        `}
      </Script>
    </>
  );
}
