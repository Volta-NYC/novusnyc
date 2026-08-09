import nodemailer from "nodemailer";
import { EMAIL, TEAM_EMAIL_ALLOWED_FROM_DEFAULT } from "@/lib/mail";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== "string") return fallback;
  const v = value.trim().toLowerCase();
  if (v === "true") return true;
  if (v === "false") return false;
  return fallback;
}

function parsePort(value: string | undefined, fallback: number): number {
  const n = Number(value ?? "");
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function pickFirst(...values: Array<string | undefined>): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

export function getDefaultFromAddress(): string {
  return normalizeEmail(
    pickFirst(
      process.env.EMAIL_FROM,
      process.env.INTERVIEW_FROM_EMAIL,
      EMAIL.info,
    ),
  );
}

export function getDefaultReplyToAddress(fromAddress: string): string {
  const from = normalizeEmail(fromAddress);
  return normalizeEmail(
    pickFirst(
      process.env.EMAIL_REPLY_TO,
      process.env.INTERVIEW_EMAIL_REPLY_TO,
      from,
    ),
  );
}

/**
 * Addresses this deployment may send from.
 *
 * Every one must be a verified "Send mail as" alias on the Gmail account in
 * SMTP_USER. Gmail rejects an unverified sender outright rather than falling
 * back to the account address, so an address that is listed here but not
 * verified there fails at send time.
 */
export function getAllowedFromAddresses(): string[] {
  return Array.from(
    new Set(
      String(process.env.TEAM_EMAIL_ALLOWED_FROM ?? TEAM_EMAIL_ALLOWED_FROM_DEFAULT)
        .split(",")
        .map((item) => normalizeEmail(item))
        .filter(Boolean),
    ),
  );
}

/**
 * One Gmail account sends for every address.
 *
 * Gmail lets a single authenticated account send as any of its verified
 * aliases, so the four @novusnyc.org addresses need one credential pair
 * between them, not one each.
 */
export function resolveSmtpProfile(): {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
} {
  const user = pickFirst(
    process.env.SMTP_USER,
    process.env.INTERVIEW_EMAIL_SMTP_USER,
    process.env.GMAIL_USER,
  );
  const pass = pickFirst(
    process.env.SMTP_PASS,
    process.env.INTERVIEW_EMAIL_SMTP_PASS,
    process.env.GMAIL_APP_PASSWORD,
  );
  if (!user || !pass) {
    throw new Error("smtp_not_configured");
  }
  return {
    host: pickFirst(
      process.env.SMTP_HOST,
      process.env.INTERVIEW_EMAIL_SMTP_HOST,
      "smtp.gmail.com",
    ),
    port: parsePort(
      pickFirst(process.env.SMTP_PORT, process.env.INTERVIEW_EMAIL_SMTP_PORT),
      465,
    ),
    secure: parseBool(
      pickFirst(process.env.SMTP_SECURE, process.env.INTERVIEW_EMAIL_SMTP_SECURE),
      true,
    ),
    user,
    pass,
  };
}

export function createTransportForFrom(fromAddress?: string) {
  const from = normalizeEmail(fromAddress ?? getDefaultFromAddress());
  if (from && !getAllowedFromAddresses().includes(from)) {
    throw new Error("sender_not_allowed");
  }
  const profile = resolveSmtpProfile();
  const transporter = nodemailer.createTransport({
    host: profile.host,
    port: profile.port,
    secure: profile.secure,
    auth: { user: profile.user, pass: profile.pass },
  });
  return { transporter, profile };
}

/**
 * Resolve a display-name-qualified "From" header for nodemailer.
 *
 * Looks up the env var EMAIL_FROM_NAMES which should be a comma-separated
 * list of "email=Display Name" pairs, e.g.:
 *   info@novusnyc.org=Novus NYC,ethan@novusnyc.org=Ethan Zhang
 *
 * Falls back to TEAM_EMAIL_FROM_NAME (legacy) or the per-address defaults.
 */
export function resolveFromWithName(rawFrom: string): string {
  const email = rawFrom.trim().toLowerCase();
  if (!email) return rawFrom;

  // Parse EMAIL_FROM_NAMES: "addr1=Name1,addr2=Name2"
  const namesRaw = process.env.EMAIL_FROM_NAMES ?? "";
  if (namesRaw.trim()) {
    for (const pair of namesRaw.split(",")) {
      const eqIdx = pair.indexOf("=");
      if (eqIdx === -1) continue;
      const addr = pair.slice(0, eqIdx).trim().toLowerCase();
      const name = pair.slice(eqIdx + 1).trim();
      if (addr === email && name) {
        return `${name} <${email}>`;
      }
    }
  }

  // Fallback to TEAM_EMAIL_FROM_NAME (legacy compat)
  const legacyName = (process.env.TEAM_EMAIL_FROM_NAME ?? "").trim();
  if (legacyName) return `${legacyName} <${email}>`;

  // Practical defaults for Novus sender aliases.
  if (email === EMAIL.info) return `Novus NYC <${email}>`;
  if (email === EMAIL.ethan) return `Ethan Zhang <${email}>`;
  if (email === EMAIL.andrew) return `Andrew Chin <${email}>`;
  if (email === EMAIL.tahmid) return `Tahmid Islam <${email}>`;

  return email;
}
