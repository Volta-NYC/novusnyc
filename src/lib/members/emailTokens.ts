// Fills {{token}} placeholders in an email template body.
// Unknown tokens resolve to an empty string rather than being left visible.
export function substituteEmailTokens(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => data[name] ?? "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// The template body is authored HTML, but the values substituted into it are
// data. Escaping the values keeps a name or a note from closing a tag and
// injecting markup into mail that carries the org's branding.
export function substituteEmailTokensHtml(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) =>
    escapeHtml(data[name] ?? ""));
}

// Only http(s) survives. A link token is dropped into an href, so a
// javascript: or data: URL there would execute from inside the message.
export function safeLinkValue(value: string): string {
  const trimmed = String(value ?? "").trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : "";
}
