// Silent Google Sheets logger for public forms.
// Fires-and-forgets a POST to the Apps Script web app.
// Never throws or blocks the UI — Formspree is the primary submission.

export function logToSheets(data: Record<string, unknown>): void {
  const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
  if (!url) return;
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch(() => {}); // intentionally silent
}
