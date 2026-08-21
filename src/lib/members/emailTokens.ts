// Fills {{token}} placeholders in an email template body.
// Unknown tokens resolve to an empty string rather than being left visible.
export function substituteEmailTokens(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => data[name] ?? "");
}
