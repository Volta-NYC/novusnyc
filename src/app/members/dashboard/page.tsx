"use client";

import { useEffect, useMemo, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { Badge, Empty, PageHeader } from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";
import { subscribeBusinesses, subscribeTeam, type Business, type TeamMember } from "@/lib/members/storage";

const TRACK_ORDER = ["Tech", "Marketing", "Finance"] as const;
type TrackDivision = (typeof TRACK_ORDER)[number];
type ProjectStatus = "Ongoing" | "Upcoming" | "Completed";
type TrackProjectInfo = {
  projectStatus: ProjectStatus;
  teamMembers: string[];
  notes: string;
};
type TrackProjectMap = Partial<Record<TrackDivision, TrackProjectInfo>>;

const TRACK_META: Record<TrackDivision, { label: string; chip: string }> = {
  Tech: { label: "Digital & Tech", chip: "bg-blue-500/15 text-blue-300 border-blue-400/30" },
  Marketing: { label: "Marketing & Strategy", chip: "bg-lime-500/15 text-lime-300 border-lime-400/30" },
  Finance: { label: "Finance & Operations", chip: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
};

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
  return {
    projectStatus: normalizeProjectStatus(row.projectStatus),
    teamMembers: Array.isArray(row.teamMembers)
      ? row.teamMembers.map((member) => String(member ?? "").trim()).filter(Boolean)
      : [],
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

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);

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

  return (
    <MembersLayout>
      <PageHeader
        title="Dashboard"
      />

      {!myMember ? (
        <Empty message="Your login email is not linked to a member record yet. Ask an admin to match your portal account in Members." />
      ) : (
        <div className="space-y-4">
          <div className="bg-[#1C1F26] border border-white/10 rounded-xl p-4">
            <p className="text-white text-sm font-semibold">{myMember.name}</p>
            <p className="text-white/50 text-xs mt-1">
              {(myMember.divisions ?? []).join(", ") || "No track assigned"}
              {myMember.pod ? ` · ${myMember.pod}` : ""}
            </p>
            <p className="text-white/35 text-xs mt-1">{myMember.email}</p>
          </div>

          {assignedBusinesses.length === 0 ? (
            <Empty message="No assigned projects yet. Once a business is assigned to your team, it will appear here." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {assignedBusinesses.map(({ business, projectTracks, trackProjects, assignedTracks }) => {
                const overallStatus = deriveOverallStatus(trackProjects, projectTracks);
                return (
                  <article key={business.id} className="bg-[#1C1F26] border border-white/10 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-white font-semibold text-sm">{business.name}</h3>
                        <p className="text-white/40 text-xs mt-1">
                          {business.neighborhood ? `${business.neighborhood} · ` : ""}
                          {business.address || "Address not set"}
                        </p>
                      </div>
                      <Badge label={overallStatus} />
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-xs">
                      <p className="text-white/75">
                        Owner: <span className="text-white">{business.ownerName || "Not set"}</span>
                      </p>
                      <p className="text-white/75 break-all">
                        Email: {business.ownerEmail ? <a className="text-[#85CC17] hover:underline" href={`mailto:${business.ownerEmail}`}>{business.ownerEmail}</a> : <span className="text-white">Not set</span>}
                      </p>
                      {business.ownerAlternateEmail && (
                        <p className="text-white/75 break-all">
                          Alt Email: <a className="text-[#85CC17] hover:underline" href={`mailto:${business.ownerAlternateEmail}`}>{business.ownerAlternateEmail}</a>
                        </p>
                      )}
                      <p className="text-white/75">
                        Phone: {business.phone ? <a className="text-[#85CC17] hover:underline" href={`tel:${business.phone}`}>{business.phone}</a> : <span className="text-white">Not set</span>}
                      </p>
                      {business.alternatePhone && (
                        <p className="text-white/75">
                          Alt Phone: <a className="text-[#85CC17] hover:underline" href={`tel:${business.alternatePhone}`}>{business.alternatePhone}</a>
                        </p>
                      )}
                      {business.website && (
                        <p className="text-white/75 break-all">
                          Website: <a className="text-[#85CC17] hover:underline" href={business.website} target="_blank" rel="noreferrer">Open link</a>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      {assignedTracks.map((track) => {
                        const info = trackProjects[track];
                        const members = info?.teamMembers ?? [];
                        return (
                          <div key={`${business.id}-${track}`} className="border border-white/8 rounded-lg p-3">
                            <div className="flex items-center justify-between gap-2">
                              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${TRACK_META[track].chip}`}>
                                {TRACK_META[track].label}
                              </span>
                              <Badge label={info?.projectStatus ?? "Upcoming"} />
                            </div>
                            <p className="text-white/35 text-xs mt-2">
                              Team: {members.length > 0 ? members.map((entry) => stripDecoratedMemberName(entry)).join(", ") : "Not assigned"}
                            </p>
                            {info?.notes && (
                              <p className="text-white/60 text-xs mt-2 whitespace-pre-wrap">{info.notes}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {business.notes && (
                      <p className="text-white/45 text-xs whitespace-pre-wrap border-t border-white/8 pt-3">
                        {business.notes}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </MembersLayout>
  );
}
