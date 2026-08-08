/**
 * Novus social profiles.
 *
 * These are the same accounts as before — the usernames were changed, not
 * recreated. Two consequences:
 *
 *  - The old profile URLs (instagram.com/voltanyc, linkedin.com/company/volta-nyc)
 *    no longer resolve and can be claimed by anyone, so nothing should link there.
 *  - Individual post permalinks survive a rename: Instagram shortcodes
 *    (/p/DVBS-6LDvk9/) and LinkedIn activity URNs are account-independent.
 *    Embeds elsewhere in the codebase therefore keep working and are not derived
 *    from these profile URLs — do not rewrite them to match.
 */
export const SOCIAL = {
  instagram: "https://www.instagram.com/nyc.novus",
  linkedin: "https://www.linkedin.com/company/novusnyc",
} as const;
