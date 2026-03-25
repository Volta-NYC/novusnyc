import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/server/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_TEXT_RE = /^[^\u0000-\u001F<>`]+$/;

function toPositiveInt(value: string | undefined, fallback: number): number {
  const num = Number(value ?? "");
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
}

export function normalizeBookingId(value: unknown): string {
  const cleaned = typeof value === "string" ? value.trim() : "";
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(cleaned)) return "";
  return cleaned;
}

export function normalizeBookerName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function normalizeBookerEmail(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function validateBookerInput(nameRaw: unknown, emailRaw: unknown): {
  ok: true;
  name: string;
  email: string;
} | {
  ok: false;
  error: string;
} {
  const name = normalizeBookerName(nameRaw);
  const email = normalizeBookerEmail(emailRaw);

  if (!name || !email) {
    return { ok: false, error: "missing_booker" };
  }
  if (name.length < 2 || name.length > 120 || !SAFE_TEXT_RE.test(name)) {
    return { ok: false, error: "invalid_booker_name" };
  }
  if (email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false, error: "invalid_booker_email" };
  }
  return { ok: true, name, email };
}

export async function enforcePublicBookingRateLimit(
  req: NextRequest,
  bucketPrefix: string,
  email?: string,
): Promise<NextResponse | null> {
  const ip = getClientIp(req.headers);
  const perIp = toPositiveInt(process.env.BOOKING_RATE_LIMIT_PER_IP, 30);
  const perEmail = toPositiveInt(process.env.BOOKING_RATE_LIMIT_PER_EMAIL, 6);
  const windowSec = toPositiveInt(process.env.BOOKING_RATE_LIMIT_WINDOW_SEC, 3600);

  const ipCheck = await consumeRateLimit({
    bucket: `${bucketPrefix}-ip`,
    key: ip,
    limit: perIp,
    windowSec,
  });
  if (!ipCheck.ok) {
    return NextResponse.json(
      { error: "too_many_requests", retryAfterSec: ipCheck.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec) } },
    );
  }

  if (email) {
    const emailCheck = await consumeRateLimit({
      bucket: `${bucketPrefix}-email`,
      key: email,
      limit: perEmail,
      windowSec,
    });
    if (!emailCheck.ok) {
      return NextResponse.json(
        { error: "too_many_requests", retryAfterSec: emailCheck.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(emailCheck.retryAfterSec) } },
      );
    }
  }

  return null;
}
