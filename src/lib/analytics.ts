/**
 * Google Analytics 4.
 *
 * The measurement ID is not a secret — it ships in the page source of every
 * site that uses GA — so it lives here rather than in an env var, which keeps
 * it from silently going missing the way a stale NEXT_PUBLIC_SITE_URL once did.
 *
 * Vercel Analytics runs alongside this and is not redundant: it gives
 * cookieless pageviews and referrers, while GA4 is here for conversions,
 * funnels, and the Search Console link. Losing one does not blind the other.
 */
export const GA_MEASUREMENT_ID = "G-ZZ3J71MZY4";

/**
 * Conversion event names. Novus has three distinct audiences on one site, and
 * pageviews cannot tell them apart — a visit to /join and an actual application
 * look identical without these.
 */
export const GA_EVENTS = {
  /** A business or partner org submitted the contact form on /partners. */
  contactSubmitted: "contact_form_submitted",
  /** A student submitted the membership application on /apply. */
  applicationSubmitted: "application_submitted",
} as const;

type GtagWindow = Window & {
  gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
};

/** Fire a GA4 event. No-ops when gtag has not loaded (dev, blockers, SSR). */
export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const gtag = (window as GtagWindow).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", name, params);
}
