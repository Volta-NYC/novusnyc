import type { Business, FinanceAssignment } from "@/lib/members/storage";

export type CodePrefix = "W" | "M" | "R" | "C" | "G";

export interface AssignmentCode {
  code: string;           // "W1", "M2", "R3", "C1", "G2"
  prefix: CodePrefix;
  entityKey: string;      // unique key: "businessId-Tech", "businessId-Marketing", or assignmentId
  title: string;          // display name for tooltip
  href: string;           // navigation link
  businessId?: string;
  track?: string;
  assignmentId?: string;
}

function sortBusinesses(businesses: Business[]): Business[] {
  return [...businesses].sort((a, b) => {
    const aIdx = a.sortIndex ?? Infinity;
    const bIdx = b.sortIndex ?? Infinity;
    if (aIdx !== bIdx) return aIdx - bIdx;
    const aTime = Date.parse(String(a.createdAt ?? "")) || 0;
    const bTime = Date.parse(String(b.createdAt ?? "")) || 0;
    if (aTime !== bTime) return aTime - bTime;
    return (a.name || "").localeCompare(b.name || "");
  });
}

function getBusinessTracks(business: Business): Array<{ track: "Tech" | "Marketing" | "Finance"; hasMembers: boolean }> {
  const trackProjects = (business.trackProjects ?? {}) as Record<string, { teamMembers?: string[] }>;
  const requestedTracks = (Array.isArray(business.projectTracks) ? business.projectTracks : []) as string[];
  const explicitTracks = Object.keys(trackProjects);
  const allTracks = [...new Set([...requestedTracks, ...explicitTracks])].filter(
    (t): t is "Tech" | "Marketing" | "Finance" => t === "Tech" || t === "Marketing" || t === "Finance"
  );
  if (allTracks.length === 0) return [];
  return allTracks.map((track) => ({
    track,
    hasMembers: Array.isArray(trackProjects[track]?.teamMembers) && (trackProjects[track]?.teamMembers?.length ?? 0) > 0,
  }));
}

function sortAssignments(assignments: FinanceAssignment[]): FinanceAssignment[] {
  return [...assignments].sort((a, b) => {
    const aTime = Date.parse(String(a.createdAt ?? "")) || 0;
    const bTime = Date.parse(String(b.createdAt ?? "")) || 0;
    if (aTime !== bTime) return aTime - bTime;
    return (a.topic || a.title || "").localeCompare(b.topic || b.title || "");
  });
}

export interface GlobalCodeMaps {
  // key: "businessId-Tech", "businessId-Marketing", "businessId-Finance", or "businessId" (legacy no-track)
  businessTrackCode: Map<string, string>;
  // key: assignmentId
  assignmentCode: Map<string, string>;
  // Full code objects for every entity
  allCodes: AssignmentCode[];
}

export function computeGlobalCodes(
  businesses: Business[],
  financeAssignments: FinanceAssignment[],
): GlobalCodeMaps {
  const businessTrackCode = new Map<string, string>();
  const assignmentCode = new Map<string, string>();
  const allCodes: AssignmentCode[] = [];

  let wCount = 0;
  let mCount = 0;

  const sorted = sortBusinesses(businesses);
  for (const business of sorted) {
    const tracks = getBusinessTracks(business);
    if (tracks.length === 0) {
      // Legacy no-track business → W code keyed by businessId alone
      wCount++;
      const code = `W${wCount}`;
      businessTrackCode.set(business.id, code);
      allCodes.push({
        code,
        prefix: "W",
        entityKey: business.id,
        title: business.name || "Untitled",
        href: `/members/projects?projectId=${encodeURIComponent(business.id)}#project-${business.id}`,
        businessId: business.id,
      });
    } else {
      // Track-specific
      for (const { track } of tracks) {
        const key = `${business.id}-${track}`;
        if (track === "Marketing") {
          mCount++;
          const code = `M${mCount}`;
          businessTrackCode.set(key, code);
          allCodes.push({
            code,
            prefix: "M",
            entityKey: key,
            title: `${business.name || "Untitled"} (Marketing)`,
            href: `/members/projects?projectId=${encodeURIComponent(business.id)}#project-${business.id}`,
            businessId: business.id,
            track: "Marketing",
          });
        } else {
          // Tech or Finance → W
          wCount++;
          const code = `W${wCount}`;
          businessTrackCode.set(key, code);
          allCodes.push({
            code,
            prefix: "W",
            entityKey: key,
            title: `${business.name || "Untitled"}${track !== "Tech" ? ` (${track})` : ""}`,
            href: `/members/projects?projectId=${encodeURIComponent(business.id)}#project-${business.id}`,
            businessId: business.id,
            track,
          });
        }
      }
    }
  }

  // Finance assignments: Reports → R#, Case Studies → C#, Grants → G#
  let rCount = 0;
  let cCount = 0;
  let gCount = 0;

  const reports = sortAssignments(financeAssignments.filter((a) => a.type === "Report"));
  const caseStudies = sortAssignments(financeAssignments.filter((a) => a.type === "Case Study"));
  const grants = sortAssignments(financeAssignments.filter((a) => a.type === "Grant"));

  for (const a of reports) {
    rCount++;
    const code = `R${rCount}`;
    assignmentCode.set(a.id, code);
    allCodes.push({
      code, prefix: "R", entityKey: a.id,
      title: a.topic || a.title || "Report",
      href: `/members/assignments?assignmentId=${encodeURIComponent(a.id)}#finance-assignment-${a.id}`,
      assignmentId: a.id,
    });
  }
  for (const a of caseStudies) {
    cCount++;
    const code = `C${cCount}`;
    assignmentCode.set(a.id, code);
    allCodes.push({
      code, prefix: "C", entityKey: a.id,
      title: a.topic || a.title || "Case Study",
      href: `/members/assignments?assignmentId=${encodeURIComponent(a.id)}#finance-assignment-${a.id}`,
      assignmentId: a.id,
    });
  }
  for (const a of grants) {
    gCount++;
    const code = `G${gCount}`;
    assignmentCode.set(a.id, code);
    allCodes.push({
      code, prefix: "G", entityKey: a.id,
      title: a.topic || a.title || "Grant",
      href: `/members/assignments?assignmentId=${encodeURIComponent(a.id)}#finance-assignment-${a.id}`,
      assignmentId: a.id,
    });
  }

  return { businessTrackCode, assignmentCode, allCodes };
}

/** Given a member name, return all codes assigned to them (from businesses + finance assignments). */
export function getMemberCodes(
  memberName: string,
  businesses: Business[],
  financeAssignments: FinanceAssignment[],
  globalCodes: GlobalCodeMaps,
): AssignmentCode[] {
  const normName = memberName.trim().replace(/\s+/g, " ").toLowerCase();
  if (!normName) return [];

  const result: AssignmentCode[] = [];
  const seen = new Set<string>();

  const addCode = (code: AssignmentCode) => {
    if (seen.has(code.entityKey)) return;
    seen.add(code.entityKey);
    result.push(code);
  };

  // Business projects
  for (const business of businesses) {
    const tracks = getBusinessTracks(business);
    if (tracks.length === 0) {
      // Legacy: check teamMembers or teamLead
      const legacyMembers = [
        ...(business.teamMembers ?? []).map((n) => n.trim().replace(/\s+/g, " ").toLowerCase()),
        (business.teamLead ?? "").trim().replace(/\s+/g, " ").toLowerCase(),
      ].filter(Boolean);
      if (legacyMembers.some((n) => n === normName || n.includes(normName) || normName.includes(n))) {
        const codeEntry = globalCodes.allCodes.find((c) => c.entityKey === business.id);
        if (codeEntry) addCode(codeEntry);
      }
    } else {
      const trackProjects = (business.trackProjects ?? {}) as Record<string, { teamMembers?: string[] }>;
      for (const { track } of tracks) {
        const members = (trackProjects[track]?.teamMembers ?? []).map((n: string) => {
          // Strip decorated email "(email)" from names
          return n.replace(/\s*\([^()]*\)\s*$/, "").trim().replace(/\s+/g, " ").toLowerCase();
        });
        if (members.some((n) => n === normName || n.includes(normName) || normName.includes(n))) {
          const key = `${business.id}-${track}`;
          const codeEntry = globalCodes.allCodes.find((c) => c.entityKey === key);
          if (codeEntry) addCode(codeEntry);
        }
      }
    }
  }

  // Finance assignments
  for (const assignment of financeAssignments) {
    const names = (assignment.assignedMemberNames ?? []).map((n) =>
      n.trim().replace(/\s+/g, " ").toLowerCase()
    );
    if (names.some((n) => n === normName || n.includes(normName) || normName.includes(n))) {
      const codeEntry = globalCodes.allCodes.find((c) => c.assignmentId === assignment.id);
      if (codeEntry) addCode(codeEntry);
    }
  }

  // Sort: W first, then M, then R, then C, then G; within prefix by number
  const prefixOrder: Record<string, number> = { W: 0, M: 1, R: 2, C: 3, G: 4 };
  return result.sort((a, b) => {
    const pa = prefixOrder[a.prefix] ?? 9;
    const pb = prefixOrder[b.prefix] ?? 9;
    if (pa !== pb) return pa - pb;
    const na = parseInt(a.code.slice(1)) || 0;
    const nb = parseInt(b.code.slice(1)) || 0;
    return na - nb;
  });
}
