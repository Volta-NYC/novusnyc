"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

type AnalyticsPreference = "granted" | "denied";

const STORAGE_KEY = "novus-analytics-consent";
const OPEN_EVENT = "novus:open-analytics-choices";
const GA_DISABLE_KEY = `ga-disable-${GA_MEASUREMENT_ID}`;

type AnalyticsWindow = Window & {
  gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
};

function setGoogleAnalyticsDisabled(disabled: boolean): void {
  (window as unknown as Record<string, unknown>)[GA_DISABLE_KEY] = disabled;
}

function clearGoogleAnalyticsCookies(): void {
  const rootDomain = window.location.hostname.replace(/^www\./, "");
  const domains = ["", window.location.hostname, `.${rootDomain}`];
  const names = document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim() ?? "")
    .filter((name) => name.startsWith("_ga"));

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
    }
  }
}

export default function PublicAnalytics() {
  const pathname = usePathname();
  const [preference, setPreference] = useState<AnalyticsPreference | null>(null);
  const [choicesOpen, setChoicesOpen] = useState(false);
  const isPrivateRoute = pathname?.startsWith("/members") || pathname?.startsWith("/book");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "granted" || saved === "denied") {
      setPreference(saved);
      setGoogleAnalyticsDisabled(isPrivateRoute || saved === "denied");
    } else {
      setChoicesOpen(true);
      setGoogleAnalyticsDisabled(true);
    }

    const openChoices = () => setChoicesOpen(true);
    window.addEventListener(OPEN_EVENT, openChoices);
    return () => window.removeEventListener(OPEN_EVENT, openChoices);
  }, [isPrivateRoute]);

  useEffect(() => {
    setGoogleAnalyticsDisabled(isPrivateRoute || preference !== "granted");
  }, [isPrivateRoute, preference]);

  if (isPrivateRoute || process.env.NODE_ENV !== "production") return null;

  const savePreference = (next: AnalyticsPreference) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    setPreference(next);
    setChoicesOpen(false);
    setGoogleAnalyticsDisabled(next === "denied");

    if (next === "denied") {
      const analyticsWindow = window as AnalyticsWindow;
      analyticsWindow.gtag?.("consent", "update", { analytics_storage: "denied" });
      clearGoogleAnalyticsCookies();
    }
  };

  return (
    <>
      <Analytics />

      {preference === "granted" && (
        <>
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
      )}

      {choicesOpen && (
        <section
          role="dialog"
          aria-modal="false"
          aria-labelledby="analytics-choices-title"
          className="fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/15 bg-n-dark text-white shadow-[0_24px_80px_rgba(35,31,36,0.38)] sm:inset-x-6 sm:bottom-6"
        >
          <div className="h-1.5 bg-gradient-to-r from-n-orange via-n-yellow to-n-purple" />
          <div className="grid gap-5 px-5 py-5 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
            <div>
              <p id="analytics-choices-title" className="font-display text-lg font-bold text-white">
                Your analytics choice
              </p>
              <p className="mt-1.5 max-w-2xl font-body text-sm leading-relaxed text-white/65">
                We use optional Google Analytics cookies to understand visits and completed forms. Vercel&apos;s anonymous, cookieless analytics remains active either way. Read our{" "}
                <Link href="/privacy#analytics-cookies" className="font-semibold text-n-orange hover:underline">
                  privacy policy
                </Link>.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:min-w-44">
              <button
                type="button"
                onClick={() => savePreference("granted")}
                className="rounded-full bg-n-orange px-5 py-2.5 font-body text-sm font-bold text-n-ink transition-colors hover:bg-n-orange-dark"
              >
                Allow analytics
              </button>
              <button
                type="button"
                onClick={() => savePreference("denied")}
                className="rounded-full border border-white/20 px-5 py-2.5 font-body text-sm font-semibold text-white/80 transition-colors hover:border-white/40 hover:text-white"
              >
                Necessary only
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
