"use client";

import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { Badge, Empty, PageHeader } from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";
import { subscribeBusinesses, subscribeTeam, subscribeFinanceAssignments, type Business, type TeamMember, type FinanceAssignment } from "@/lib/members/storage";

const TRACK_ORDER = ["Tech", "Marketing", "Finance"] as const;
type TrackDivision = (typeof TRACK_ORDER)[number];
type ProjectStatus = "Ongoing" | "Upcoming" | "Completed";
type TrackProjectInfo = {
  projectStatus: ProjectStatus;
  teamMembers: string[];
  deadlines?: Array<{ label: string; date: string }>;
  notes: string;
};
type TrackProjectMap = Partial<Record<TrackDivision, TrackProjectInfo>>;

const TRACK_META: Record<TrackDivision, { label: string; chip: string }> = {
  Tech: { label: "Digital & Tech", chip: "bg-blue-500/15 text-blue-300 border-blue-400/30" },
  Marketing: { label: "Marketing & Strategy", chip: "bg-lime-500/15 text-lime-300 border-lime-400/30" },
  Finance: { label: "Finance & Operations", chip: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
};

const SHARED_DRIVE_URL = "https://drive.google.com/drive/folders/1eJm7eh5yl-_QWKugOhVPhwt8CDgJ3U9_?usp=sharing";

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeName(value: string): string {
  return normalizeToken(value).replace(/[^a-z0-9]+/g, " ").trim();
}

function canonicalEmail(value: string): string {
  const raw = normalizeToken(value);
  const [local, domain] = raw.split("@");
  if (!local || !domain) return raw;
  if (domain === "gmail.com" || domain === "googlemail.com") {
    const base = local.split("+")[0].replace(/\./g, "");
    return `${base}@gmail.com`;
  }
  return `${local}@${domain}`;
}

function parseDecoratedMemberEmail(value: string): string {
  const match = value.match(/\(([^()]*@[^()]+)\)\s*$/);
  if (match?.[1]) return canonicalEmail(match[1]);
  if (value.includes("@")) return canonicalEmail(value);
  return "";
}

function stripDecoratedMemberName(value: string): string {
  return value.replace(/\s*\([^()]*\)\s*$/, "").trim();
}

function isTrack(value: unknown): value is TrackDivision {
  return value === "Tech" || value === "Marketing" || value === "Finance";
}

function normalizeProjectStatus(value: unknown): ProjectStatus {
  const raw = String(value ?? "").trim();
  if (raw === "Ongoing" || raw === "Upcoming" || raw === "Completed") return raw;
  if (raw === "Active") return "Ongoing";
  if (raw === "Complete") return "Completed";
  return "Upcoming";
}

function normalizeTrackProjectInfo(value: unknown): TrackProjectInfo | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const deadlines = Array.isArray(row.deadlines)
    ? (row.deadlines as unknown[])
        .map((d) => {
          if (!d || typeof d !== "object") return null;
          const de = d as Record<string, unknown>;
          return { label: String(de.label ?? "").trim(), date: String(de.date ?? "").trim() };
        })
        .filter((d): d is { label: string; date: string } => !!d)
    : undefined;
  return {
    projectStatus: normalizeProjectStatus(row.projectStatus),
    teamMembers: Array.isArray(row.teamMembers)
      ? row.teamMembers.map((member) => String(member ?? "").trim()).filter(Boolean)
      : [],
    deadlines,
    notes: String(row.notes ?? "").trim(),
  };
}

function normalizeTrackProjectsFromBusiness(business: Business): { projectTracks: TrackDivision[]; trackProjects: TrackProjectMap } {
  const normalizedMap: TrackProjectMap = {};
  const rawTrackProjects = business.trackProjects && typeof business.trackProjects === "object"
    ? (business.trackProjects as Record<string, unknown>)
    : {};

  for (const track of TRACK_ORDER) {
    const info = normalizeTrackProjectInfo(rawTrackProjects[track]);
    if (info) normalizedMap[track] = info;
  }

  const normalizedTracks = (Array.isArray(business.projectTracks) ? business.projectTracks : [])
    .filter(isTrack)
    .filter((track, index, arr) => arr.indexOf(track) === index);

  let projectTracks = normalizedTracks.filter((track) => !!normalizedMap[track]);
  if (projectTracks.length === 0) {
    projectTracks = Object.keys(normalizedMap).filter(isTrack);
  }

  if (projectTracks.length === 0) {
    const fallbackTrack = isTrack(business.division) ? business.division : "Tech";
    projectTracks = [fallbackTrack];
    normalizedMap[fallbackTrack] = {
      projectStatus: normalizeProjectStatus(business.projectStatus),
      teamMembers: (business.teamMembers ?? []).map((member) => String(member ?? "").trim()).filter(Boolean),
      notes: String(business.notes ?? "").trim(),
    };
  }

  for (const track of projectTracks) {
    if (!normalizedMap[track]) {
      normalizedMap[track] = {
        projectStatus: normalizeProjectStatus(business.projectStatus),
        teamMembers: [],
        notes: "",
      };
    }
  }

  return { projectTracks, trackProjects: normalizedMap };
}

function deriveOverallStatus(trackProjects: TrackProjectMap, projectTracks: TrackDivision[]): ProjectStatus {
  const statuses = projectTracks.map((track) => trackProjects[track]?.projectStatus ?? "Upcoming");
  if (statuses.includes("Ongoing")) return "Ongoing";
  if (statuses.includes("Upcoming")) return "Upcoming";
  return "Completed";
}

function normalizeAssignmentDeadlines(fa: FinanceAssignment): Array<{ label: string; date: string }> {
  if (Array.isArray(fa.deadlines) && fa.deadlines.length > 0) {
    return fa.deadlines
      .map((d) => ({ label: String(d.label ?? "").trim(), date: String(d.date ?? "").trim() }))
      .filter((d) => d.label || d.date);
  }
  const legacy: Array<{ label: string; date: string }> = [];
  if (fa.finalDueDate) legacy.push({ label: "Final Deadline", date: fa.finalDueDate });
  if (fa.deadline && fa.deadline !== fa.finalDueDate) legacy.push({ label: "1st Deadline", date: fa.deadline });
  if (fa.firstDraftDueDate && fa.firstDraftDueDate !== fa.finalDueDate && fa.firstDraftDueDate !== fa.deadline) {
    legacy.push({ label: "Draft Deadline", date: fa.firstDraftDueDate });
  }
  return legacy;
}

function lookupMember(name: string, teamByName: Map<string, TeamMember>): TeamMember | null {
  const key = normalizeName(name);
  return teamByName.get(key) ?? null;
}

function getTypeChip(type: string): string {
  if (type === "Case Study") return "bg-emerald-500/15 text-emerald-300 border-emerald-400/30";
  if (type === "Grant") return "bg-amber-500/15 text-amber-300 border-amber-400/30";
  return "bg-blue-500/15 text-blue-300 border-blue-400/30";
}

type AssignedBusiness = {
  business: Business;
  projectTracks: TrackDivision[];
  trackProjects: TrackProjectMap;
  assignedTracks: TrackDivision[];
};

export default function MembersDashboardPage() {
  const { user, userProfile } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [financeAssignments, setFinanceAssignments] = useState<FinanceAssignment[]>([]);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeFinanceAssignments(setFinanceAssignments), []);

  const primaryEmail = canonicalEmail(user?.email ?? userProfile?.email ?? "");
  const secondaryEmail = canonicalEmail(userProfile?.email ?? "");
  const myMember = useMemo(
    () => team.find((member) => {
      const memberEmail = canonicalEmail(member.email ?? "");
      const memberAltEmail = canonicalEmail(member.alternateEmail ?? "");
      return (
        !!primaryEmail
        && (
          memberEmail === primaryEmail
          || memberAltEmail === primaryEmail
          || (!!secondaryEmail && (memberEmail === secondaryEmail || memberAltEmail === secondaryEmail))
        )
      );
    }) ?? null,
    [primaryEmail, secondaryEmail, team],
  );

  const teamByName = useMemo(() => {
    const map = new Map<string, TeamMember>();
    for (const member of team) {
      map.set(normalizeName(member.name ?? ""), member);
    }
    return map;
  }, [team]);

  const assignedBusinesses = useMemo<AssignedBusiness[]>(() => {
    if (!myMember || !primaryEmail) return [];
    const myName = normalizeName(myMember.name ?? "");

    return businesses
      .map((business) => {
        const { projectTracks, trackProjects } = normalizeTrackProjectsFromBusiness(business);
        const assignedTracks = projectTracks.filter((track) => {
          const members = trackProjects[track]?.teamMembers ?? [];
          return members.some((entry) => {
            const entryEmail = parseDecoratedMemberEmail(entry);
            if (entryEmail && entryEmail === primaryEmail) return true;
            const entryName = normalizeName(stripDecoratedMemberName(entry));
            return !!entryName && !!myName && (entryName === myName || entryName.includes(myName) || myName.includes(entryName));
          });
        });

        if (assignedTracks.length === 0) return null;
        return { business, projectTracks, trackProjects, assignedTracks };
      })
      .filter((value): value is AssignedBusiness => !!value)
      .sort((a, b) => a.business.name.localeCompare(b.business.name));
  }, [businesses, myMember, primaryEmail]);

  const myFinanceAssignments = useMemo<FinanceAssignment[]>(() => {
    if (!myMember) return [];
    const myName = normalizeName(myMember.name ?? "");
    return financeAssignments.filter((fa) =>
      (fa.assignedMemberNames ?? []).some((n) => normalizeName(n) === myName)
    );
  }, [financeAssignments, myMember]);

  const initials = (myMember?.name ?? "?")[0]?.toUpperCase() ?? "?";

  const hasBusinesses = assignedBusinesses.length > 0;
  const hasFinance = myFinanceAssignments.length > 0;

  const financeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const fa of myFinanceAssignments) {
      counts[fa.type] = (counts[fa.type] ?? 0) + 1;
    }
    return counts;
  }, [myFinanceAssignments]);

  const financeTypeBreakdown = Object.entries(financeTypeCounts)
    .map(([type, count]) => `${count} ${type}${count !== 1 ? "s" : ""}`)
    .join(" · ");

  return (
    <MembersLayout>
      <PageHeader title="Dashboard" />

      {!myMember ? (
        <Empty message="Your login email is not linked to a member record yet. Ask an admin to match your portal account in Members." />
      ) : (
        <div className="space-y-6">
          {/* Section A: Profile card */}
          <div className="bg-[#1C1F26] border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-[#85CC17]/15 flex items-center justify-center flex-shrink-0">
              <span className="text-[#85CC17] font-bold text-lg">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm">{myMember.name}</p>
              <p className="text-white/50 text-xs mt-0.5">
                {(myMember.divisions ?? []).join(", ") || "No track assigned"}
                {myMember.pod ? ` · ${myMember.pod}` : ""}
              </p>
              <p className="text-white/35 text-xs mt-0.5 font-mono">{myMember.email}</p>
            </div>
          </div>

          {/* Section B: Business Projects */}
          {hasBusinesses && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-white font-semibold text-sm">Business Projects</h2>
                <span className="text-xs text-white/35 bg-white/5 px-2 py-0.5 rounded-full">{assignedBusinesses.length}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {assignedBusinesses.map(({ business, projectTracks, trackProjects, assignedTracks }) => {
                  const overallStatus = deriveOverallStatus(trackProjects, projectTracks);
                  return (
                    <article key={business.id} className="bg-[#1C1F26] border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-white font-semibold text-sm">{business.name}</h3>
                          <p className="text-white/40 text-xs mt-0.5">
                            {business.neighborhood ? `${business.neighborhood} · ` : ""}
                            {business.address || "Address not set"}
                          </p>
                        </div>
                        <Badge label={overallStatus} />
                      </div>

                      <p className="text-white/60 text-xs">
                        Owner: <span className="text-white/80">{business.ownerName || "Not set"}</span>
                        {business.ownerEmail && (
                          <> · <a href={`mailto:${business.ownerEmail}`} className="text-[#85CC17] hover:underline">{business.ownerEmail}</a></>
                        )}
                        {business.phone && (
                          <> · <a href={`tel:${business.phone}`} className="text-[#85CC17] hover:underline">{business.phone}</a></>
                        )}
                      </p>

                      <div className="space-y-2">
                        {assignedTracks.map((track) => {
                          const info = trackProjects[track];
                          const members = info?.teamMembers ?? [];
                          const deadlines = info?.deadlines ?? [];
                          return (
                            <div key={`${business.id}-${track}`} className="border border-white/8 rounded-lg p-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${TRACK_META[track].chip}`}>
                                  {TRACK_META[track].label}
                                </span>
                                <Badge label={info?.projectStatus ?? "Upcoming"} />
                              </div>

                              {/* Deadlines */}
                              {deadlines.length > 0 ? (
                                <div className="mt-2 space-y-0.5">
                                  {deadlines.map((d, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs">
                                      <span className="text-white/35 min-w-[90px]">{d.label || "Deadline"}:</span>
                                      <span className="text-white/70">{d.date || "TBD"}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-white/25 text-xs mt-2">No deadlines set</p>
                              )}

                              {/* Team members */}
                              {members.length > 0 && (
                                <div className="mt-2 space-y-1.5">
                                  {members.map((rawName, i) => {
                                    const cleanName = stripDecoratedMemberName(rawName);
                                    const found = lookupMember(cleanName, teamByName);
                                    return (
                                      <div key={i} className="flex items-center gap-2 text-xs">
                                        <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 text-[10px] text-white/50 font-bold">
                                          {cleanName[0]?.toUpperCase() ?? "?"}
                                        </div>
                                        <div className="min-w-0">
                                          <span className="text-white/80 font-medium">{cleanName}</span>
                                          {found?.school && (
                                            <span className="text-white/40 ml-1.5">· {found.school}</span>
                                          )}
                                          {found?.email && (
                                            <a href={`mailto:${found.email}`} className="text-[#85CC17]/70 hover:text-[#85CC17] ml-1.5 transition-colors">
                                              {found.email}
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section C: Independent Assignments */}
          {hasFinance && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-white font-semibold text-sm">My Assignments</h2>
                <span className="text-xs text-white/35 bg-white/5 px-2 py-0.5 rounded-full">{myFinanceAssignments.length}</span>
                {financeTypeBreakdown && (
                  <span className="text-xs text-white/35">{financeTypeBreakdown}</span>
                )}
              </div>
              <div className="space-y-3">
                {myFinanceAssignments.map((assignment) => {
                  const deadlines = normalizeAssignmentDeadlines(assignment);
                  const members = assignment.assignedMemberNames ?? [];
                  return (
                    <div key={assignment.id} className="bg-[#1C1F26] border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getTypeChip(assignment.type)}`}>
                          {assignment.type}
                        </span>
                        <span className="text-white font-medium text-sm flex-1">{assignment.topic || assignment.title || "Untitled"}</span>
                        <Badge label={assignment.status} />
                      </div>

                      {assignment.region && (
                        <p className="text-white/40 text-xs">{assignment.region}</p>
                      )}

                      {/* Deadlines */}
                      {deadlines.length > 0 ? (
                        <div className="space-y-0.5">
                          {deadlines.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="text-white/35 min-w-[90px]">{d.label || "Deadline"}:</span>
                              <span className="text-white/70">{d.date || "TBD"}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-white/25 text-xs">No deadlines set</p>
                      )}

                      {/* Team members */}
                      {members.length > 0 && (
                        <div className="space-y-1.5">
                          {members.map((rawName, i) => {
                            const found = lookupMember(rawName, teamByName);
                            return (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <div className="w-5 h-5 rounded-full bg-white/8 flex items-center justify-center flex-shrink-0 text-[10px] text-white/50 font-bold">
                                  {rawName[0]?.toUpperCase() ?? "?"}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-white/80 font-medium">{rawName}</span>
                                  {found?.school && (
                                    <span className="text-white/40 ml-1.5">· {found.school}</span>
                                  )}
                                  {found?.email && (
                                    <a href={`mailto:${found.email}`} className="text-[#85CC17]/70 hover:text-[#85CC17] ml-1.5 transition-colors">
                                      {found.email}
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Google Drive button */}
                      <div>
                        <a
                          href={SHARED_DRIVE_URL}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#85CC17]/10 border border-[#85CC17]/25 text-[#85CC17] text-xs font-medium hover:bg-[#85CC17]/20 hover:border-[#85CC17]/45 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                            <polyline points="17 8 12 3 7 8"/>
                            <line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          Upload Work to Shared Drive
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section D: Empty state */}
          {!hasBusinesses && !hasFinance && (
            <Empty message="No assigned projects yet. Once a business or assignment is assigned to you, it will appear here." />
          )}
        </div>
      )}
    </MembersLayout>
  );
}
