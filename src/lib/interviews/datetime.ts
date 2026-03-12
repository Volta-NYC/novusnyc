const ET_TIMEZONE = "America/New_York";
const ISO_NO_TZ_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function parseIsoWithoutTimezone(value: string): DateParts | null {
  const match = value.match(ISO_NO_TZ_RE);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? "0"),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const val = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUTC = Date.UTC(
    val("year"),
    val("month") - 1,
    val("day"),
    val("hour"),
    val("minute"),
    val("second"),
  );
  return asUTC - date.getTime();
}

function etWallClockToUtc(parts: DateParts): Date {
  const targetUTC = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  let guess = new Date(targetUTC);
  for (let i = 0; i < 3; i += 1) {
    const offset = getTimeZoneOffsetMs(guess, ET_TIMEZONE);
    const next = new Date(targetUTC - offset);
    if (next.getTime() === guess.getTime()) break;
    guess = next;
  }
  return guess;
}

export function parseInterviewDateTime(value: string): Date {
  const trimmed = value.trim();
  const naive = parseIsoWithoutTimezone(trimmed);
  if (naive) return etWallClockToUtc(naive);
  return new Date(trimmed);
}

export function toInterviewTimestamp(value: string): number {
  const parsed = parseInterviewDateTime(value);
  return parsed.getTime();
}

export function toInterviewDateString(value: string): string {
  const naive = value.match(/^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}/);
  if (naive) return naive[1];
  const parsed = parseInterviewDateTime(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

export function toInterviewDateTimeKey(value: string): string {
  const naive = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/);
  if (naive) return `${naive[1]}T${naive[2]}:${naive[3]}`;
  const parsed = parseInterviewDateTime(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 16);
  return `${toInterviewDateString(value)}T${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
}

export function formatInterviewInET(
  value: string,
  options: Intl.DateTimeFormatOptions,
): string {
  const parsed = parseInterviewDateTime(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-US", {
    ...options,
    timeZone: ET_TIMEZONE,
  });
}

