// CSV export helper. Quotes fields containing commas, quotes, or newlines per
// RFC 4180; doubles embedded quotes.

function escapeField(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") return escapeField(JSON.stringify(value));
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv<T>(
  rows: readonly T[],
  columns: readonly { key: keyof T; label: string }[],
): string {
  const header = columns.map((c) => escapeField(c.label)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeField((row as Record<string, unknown>)[c.key as string])).join(","))
    .join("\n");
  return `${header}\n${body}`;
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function dateStampedFilename(base: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${base}-${stamp}.csv`;
}
