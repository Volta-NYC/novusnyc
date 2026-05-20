// Shared formatters for displaying user-facing values consistently.
// All functions return a safe string for any input (including null/undefined).

export function formatPhone(raw: unknown): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return String(raw ?? "");
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(raw: unknown, opts?: { withTime?: boolean }): string {
  if (raw == null || raw === "") return "";
  const d = typeof raw === "number" ? new Date(raw) : new Date(String(raw));
  if (isNaN(d.getTime())) return "";
  const month = MONTHS[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  if (!opts?.withTime) return `${month} ${day}, ${year}`;
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${month} ${day}, ${year} ${hour12}:${m} ${ampm}`;
}

export function formatRelativeTime(raw: unknown): string {
  if (raw == null || raw === "") return "";
  const d = typeof raw === "number" ? new Date(raw) : new Date(String(raw));
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (Math.abs(diffSec) < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (Math.abs(diffHr) < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (Math.abs(diffDay) < 30) return `${diffDay}d ago`;
  return formatDate(raw);
}
