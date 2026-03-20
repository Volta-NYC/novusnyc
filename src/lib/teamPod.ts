const TEAM_POD_CANONICAL: Record<string, string> = {
  "outreach/fundraising": "Outreach",
  "outreach fundraising": "Outreach",
  outreach: "Outreach",
  "grant writing": "Grants",
  grants: "Grants",
  grant: "Grants",
  "report writing": "Reports",
  reports: "Reports",
  report: "Reports",
};

function toText(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

export function isLegacyAutoPod(value: unknown): boolean {
  const pod = toText(value);
  if (!pod) return false;
  return /^[mt]\d+$/i.test(pod);
}

export function normalizeTeamPod(value: unknown): string {
  const pod = toText(value);
  if (!pod) return "";

  if (isLegacyAutoPod(pod)) return "";

  const canonical = TEAM_POD_CANONICAL[pod.toLowerCase()];
  if (canonical) return canonical;
  return pod;
}

