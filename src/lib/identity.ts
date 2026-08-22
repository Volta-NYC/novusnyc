// Identity matching for people — applicants, members, interview bookers.
//
// This logic was previously copy-pasted into nine files. They agreed today, but
// nothing kept them in step, and the one place it mattered most — the route that
// creates member records — used a plainer comparison than the UI that decides
// whether a person already exists. That disagreement is how you get two rows
// for the same person.

export function normalizeKey(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Gmail treats `a.b+tag@gmail.com` and `ab@gmail.com` as one mailbox.
 * Canonicalise so the same person applying with a variant still matches.
 */
export function canonicalEmail(value: unknown): string {
  const raw = normalizeKey(value);
  const [local, domain] = raw.split("@");
  if (!local || !domain) return raw;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const base = local.split("+")[0].replace(/\./g, "");
    return `${base}@gmail.com`;
  }
  return `${local}@${domain}`;
}

export function emailsMatch(a: unknown, b: unknown): boolean {
  const left = canonicalEmail(a);
  const right = canonicalEmail(b);
  return !!left && left === right;
}

/**
 * Loose name comparison for records with no usable email. Requires either
 * containment or two shared tokens, so "Chen" alone never matches "Sunny Chen".
 */
export function namesLikelyMatch(aRaw: unknown, bRaw: unknown): boolean {
  const left = normalizeKey(aRaw).replace(/[^a-z0-9]+/g, " ").trim();
  const right = normalizeKey(bRaw).replace(/[^a-z0-9]+/g, " ").trim();
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const lt = new Set(left.split(" ").filter(Boolean));
  const rt = new Set(right.split(" ").filter(Boolean));
  let overlap = 0;
  lt.forEach((token) => { if (rt.has(token)) overlap += 1; });
  return overlap >= 2;
}

// Same tokens, ignoring order and punctuation. No containment, no partial
// overlap — used where a wrong match merges two people's records.
export function namesMatchExactly(aRaw: unknown, bRaw: unknown): boolean {
  const tokens = (v: unknown) => {
    const t = normalizeKey(v).replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);
    return t.length > 0 ? [...new Set(t)].sort().join(" ") : "";
  };
  const left = tokens(aRaw);
  const right = tokens(bRaw);
  return !!left && left === right;
}

/**
 * Find the one record that is this person, preferring email over name.
 * Name-only matches are returned separately so a caller creating records can
 * refuse to act on a guess.
 */
/**
 * `strictNames` is for callers that would merge two people on a bad guess.
 * It requires the same set of name tokens rather than the fuzzy containment
 * used for search — "Ann Lee" must not resolve to "Ann Leeson".
 */
export function findPersonMatch<T>(
  candidates: T[],
  person: { email?: unknown; name?: unknown },
  read: (item: T) => { email?: unknown; alternateEmail?: unknown; name?: unknown },
  opts: { strictNames?: boolean } = {},
): { match: T | null; matchedOn: "email" | "name" | null } {
  const email = canonicalEmail(person.email);

  if (email) {
    for (const item of candidates) {
      const row = read(item);
      if (emailsMatch(row.email, email) || emailsMatch(row.alternateEmail, email)) {
        return { match: item, matchedOn: "email" };
      }
    }
  }

  const name = normalizeKey(person.name);
  if (name) {
    const matcher = opts.strictNames ? namesMatchExactly : namesLikelyMatch;
    const byName = candidates.filter((item) => matcher(read(item).name, name));
    // An ambiguous name is worse than no match — it would merge two people.
    if (byName.length === 1) return { match: byName[0], matchedOn: "name" };
  }

  return { match: null, matchedOn: null };
}
