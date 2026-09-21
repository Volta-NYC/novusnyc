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
 * The Workspace SMTP relay is configured to accept any address in the domain,
 * so this list is a deliberate shortlist rather than a technical limit. Google
 * DKIM-signs with the domain of the authenticated Workspace account, which is
 * what keeps these aligned for DMARC.
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
 * One Workspace account relays for every address.
 *
 * Mail goes through Google Workspace's SMTP relay (smtp-relay.gmail.com:587,
 * STARTTLS, SMTP auth), which accepts any sender in the domain. That is what
 * lets one credential pair send as all four @novusnyc.org addresses without a
 * "Send mail as" alias for each, and it is the supported path for application
 * mail rather than a workaround.
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
      "smtp-relay.gmail.com",
    ),
    port: parsePort(
      pickFirst(process.env.SMTP_PORT, process.env.INTERVIEW_EMAIL_SMTP_PORT),
      587,
    ),
    // Port 587 is STARTTLS, not implicit TLS: `secure` stays false there and
    // the connection is upgraded instead. requireTLS below makes the upgrade
    // mandatory, so a downgrade fails the send rather than sending in clear.
    secure: parseBool(
      pickFirst(process.env.SMTP_SECURE, process.env.INTERVIEW_EMAIL_SMTP_SECURE),
      false,
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
  const transporter = nodemailer.createTransport(
    {
      host: profile.host,
      port: profile.port,
      secure: profile.secure,
      requireTLS: !profile.secure,
      auth: { user: profile.user, pass: profile.pass },
    },
    {
      // Defaults every message inherits. The envelope sender nodemailer derives
      // from this From is what SPF checks, so header and envelope stay on the
      // same domain and DMARC alignment holds.
      from: resolveFromWithName(from),
      replyTo: getDefaultReplyToAddress(from),
      // RFC 3834: the portal never wants an out-of-office bounced back at it.
      headers: { "Auto-Submitted": "auto-generated" },
    },
  );
  return { transporter, profile };
}

/** A readable plain-text part. A missing one reads as spam to most filters. */
// The one HTML-to-text conversion for outgoing mail. The text part is what
// spam filters and text-only clients read, so it has to carry every link the
// HTML does.
export function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    // Anchor text carries the meaning, the href the destination. Dropping the
    // tag alone keeps "the member portal" and loses the URL.
    .replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return text && text !== href ? `${text} (${href})` : href;
    })
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6])>/gi, "\n\n")
    .replace(/<\/(tr|li)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .split("\n").map((line) => line.trim()).join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
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
