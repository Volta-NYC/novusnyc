/**
 * Every mailbox the site references, in one place.
 *
 * ─── Sending requires more than a delivering domain ─────────────────────────
 * Cloudflare Email Routing receives mail for novusnyc.org and forwards it to
 * Gmail. It cannot send. Outbound still goes through Gmail's SMTP, which means
 * two things must stay true or messages get rejected or spam-filed:
 *
 *   1. Every address below is a verified "Send mail as" alias on the single
 *      Gmail account whose credentials are in SMTP_USER / SMTP_PASS.
 *   2. The SPF record authorises Google as well as Cloudflare:
 *        v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all
 *
 * Verify both before adding an address here:
 *
 *   dig +short MX novusnyc.org
 *   dig +short TXT novusnyc.org | grep spf1
 *
 * voltanyc.org still routes to the same inbox and is deliberately left alive —
 * partners, BIDs and applicants from before the rebrand hold those addresses.
 */
const MAIL_DOMAIN = "novusnyc.org";

export const EMAIL = {
  /** General inbox — contact forms, transactional reply-to. */
  info: `info@${MAIL_DOMAIN}`,
  ethan: `ethan@${MAIL_DOMAIN}`,
  andrew: `andrew@${MAIL_DOMAIN}`,
  tahmid: `tahmid@${MAIL_DOMAIN}`,
} as const;

/**
 * Addresses the team-email composer may send from. Every entry must be a
 * verified alias on the sending Gmail account — an unverified one is rejected
 * by Gmail at submission time, not silently downgraded.
 */
export const TEAM_EMAIL_ALLOWED_FROM_DEFAULT = [
  EMAIL.info,
  EMAIL.ethan,
  EMAIL.andrew,
  EMAIL.tahmid,
].join(",");
