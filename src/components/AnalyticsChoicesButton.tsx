"use client";

export default function AnalyticsChoicesButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("novus:open-analytics-choices"))}
      className="font-body text-xs text-n-orange/75 transition-colors hover:text-n-orange"
    >
      Analytics choices
    </button>
  );
}
