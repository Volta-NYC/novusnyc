/**
 * Every mailbox the site references, in one place.
 *
 * ─── Why these are still on voltanyc.org ────────────────────────────────────
 * novusnyc.org has no MX records, so @novusnyc.org addresses bounce. Verify
 * before changing anything here:
 *
 *   dig +short MX novusnyc.org      # must return mail servers
 *   dig +short TXT novusnyc.org     # must include a v=spf1 record
 *
 * Once Google Workspace is live on novusnyc.org — MX, SPF and DKIM all
 * published, and the aliases actually receiving — flip MAIL_DOMAIN below. That
 * is the only edit needed for the addresses; the sending side also needs the
 * Vercel env vars updated (EMAIL_FROM, EMAIL_REPLY_TO, TEAM_EMAIL_ALLOWED_FROM)
 * and a matching "send mail as" alias on the sending Gmail account, or messages
 * will be rejected for failing SPF/DKIM alignment.
 *
 * Keep voltanyc.org mail alive through the cutover: existing partners, BIDs and
 * applicants have the old addresses, and Cloudflare is routing them today.
 */
const MAIL_DOMAIN = "voltanyc.org";

export const EMAIL = {
  /** General inbox — contact forms, transactional reply-to. */
  info: `info@${MAIL_DOMAIN}`,
  ethan: `ethan@${MAIL_DOMAIN}`,
  andrew: `andrew@${MAIL_DOMAIN}`,

  /**
   * Public-facing contact shown in the footer. Deliberately a Gmail address:
   * it is independent of the domain migration, so it keeps working whichever
   * way MAIL_DOMAIN points.
   */
  publicContact: "nyc.novus@gmail.com",
} as const;

/** Comma-separated default for the TEAM_EMAIL_ALLOWED_FROM env var. */
export const TEAM_EMAIL_ALLOWED_FROM_DEFAULT = `${EMAIL.info},${EMAIL.ethan}`;
