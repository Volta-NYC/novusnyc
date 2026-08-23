import "server-only";


export type MemberTrack = "Tech" | "Marketing" | "Finance" | "Other";


function normalize(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

function parseTrackTokens(raw: unknown): string {
  return normalize(raw)
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ");
}

export function pickPrimaryTrack(rawTracks: unknown): MemberTrack {
  const text = parseTrackTokens(rawTracks);
  if (!text) return "Other";

  const hasTech = /(digital|tech|website|seo|development|software|engineer|coding|code)/.test(text);
  if (hasTech) return "Tech";

  const hasMarketing = /(marketing|strategy|social|content|brand|outreach media)/.test(text);
  if (hasMarketing) return "Marketing";

  const hasFinance = /(finance|operation|grant|fundraising|fund raising|report)/.test(text);
  if (hasFinance) return "Finance";

  return "Other";
}

export function trackToDivisions(track: MemberTrack): string[] {
  if (track === "Other") return ["Other"];
  return [track];
}


export function canonicalEmail(value: unknown): string {
  const raw = normalize(value);
  const [local, domain] = raw.split("@");
  if (!local || !domain) return raw;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const base = local.split("+")[0].replace(/\./g, "");
    return `${base}@gmail.com`;
  }
  return `${local}@${domain}`;
}

export function namesLikelyMatch(aRaw: unknown, bRaw: unknown): boolean {
  const left = normalize(aRaw).replace(/[^a-z0-9]+/g, " ").trim();
  const right = normalize(bRaw).replace(/[^a-z0-9]+/g, " ").trim();
  if (!left || !right) return false;
  if (left === right || left.includes(right) || right.includes(left)) return true;
  const lt = new Set(left.split(" ").filter(Boolean));
  const rt = new Set(right.split(" ").filter(Boolean));
  let overlap = 0;
  lt.forEach((token) => {
    if (rt.has(token)) overlap += 1;
  });
  return overlap >= 2;
}
