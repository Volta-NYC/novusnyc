"use client";

import { useState, useEffect, useMemo } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { PROJECT_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, SearchBar, Badge, Btn, Empty, SkeletonRows,
} from "@/components/members/ui";
import {
  subscribeBusinesses, subscribeTeam, subscribeChapters, updateBusiness, createBusiness,
  notifyDraftReady,
  TECH_STATUSES, TECH_PIPELINE,
  type Business, type TeamMember, type TechStatus, type Chapter,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import ProjectPanel from "./ProjectPanel";

// The doc's tabs, as filters over one list. Each is a question the tech team
// actually asks: what's live, what needs assigning, what's mine.
type ViewKey = "all" | "domains" | "backlog" | "mine" | "leads" | "hold";

const VIEWS: { key: ViewKey; label: string; hint: string }[] = [
  { key: "all",     label: "All",          hint: "Every project, most recently touched first" },
  { key: "domains", label: "Real Domains", hint: "Launched on their own domain" },
  { key: "backlog", label: "Backlog",      hint: "Not yet assigned, by priority" },
  { key: "mine",    label: "Mine",         hint: "Assigned to you" },
  { key: "leads",   label: "Leads",        hint: "Intake that hasn't entered the pipeline" },
  { key: "hold",    label: "On Hold",      hint: "Paused or dropped" },
];

const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Maybe: 2 };

function isLead(b: Business): boolean {
  return b.intakeSource === "website_form" || b.intakeSource === "discovery";
}

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ""); }
  catch { return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""); }
}

export default function ProjectsPage() {
  const { authRole, userProfile, loading } = useAuth();
  const canEdit = authRole === "owner" || authRole === "admin";

  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [team, setTeam]             = useState<TeamMember[]>([]);
  const [chapters, setChapters]     = useState<Chapter[]>([]);
  // Which market's clients we're looking at. Tech work is remote, but the
  // clients themselves are firmly in one city or the other.
  const [chapterId, setChapterId]   = useState<string | null>(null);
  const [view, setView]             = useState<ViewKey>("all");
  const [search, setSearch]         = useState("");
  const [openId, setOpenId]         = useState<string | null>(null);
  const [blocked, setBlocked]       = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<TechStatus | null>(null);

  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeChapters(setChapters), []);

  const myId = userProfile?.id ?? null;

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of team) m.set(t.id, t.name);
    return m;
  }, [team]);

  const rows = useMemo(() => {
    if (!businesses) return [];
    const q = search.trim().toLowerCase();
    let list = businesses.filter((b) => !b.archived);
    if (chapterId) list = list.filter((b) => (b.chapterId ?? "chapter_ny") === chapterId);

    switch (view) {
      case "domains": list = list.filter((b) => !!b.liveUrl); break;
      case "backlog": list = list.filter((b) => b.techStatus === "Backlog" && !isLead(b)); break;
      case "mine":    list = list.filter((b) => !!myId && (b.assignees ?? []).includes(myId)); break;
      case "leads":   list = list.filter(isLead); break;
      case "hold":    list = list.filter((b) => b.techStatus === "On Hold" || b.techStatus === "Dropped"); break;
      default:        list = list.filter((b) => !isLead(b));
    }

    if (statusFilter) list = list.filter((b) => (b.techStatus ?? "Backlog") === statusFilter);

    if (q) {
      list = list.filter((b) =>
        b.name.toLowerCase().includes(q) ||
        (b.notes ?? "").toLowerCase().includes(q) ||
        (b.neighborhood ?? "").toLowerCase().includes(q) ||
        (b.ownerName ?? "").toLowerCase().includes(q) ||
        (b.assignees ?? []).some((id) => (nameById.get(id) ?? "").toLowerCase().includes(q)) ||
        [b.liveUrl, b.previewUrl, b.clientUrl].some((u) => (u ?? "").toLowerCase().includes(q)));
    }

    if (view === "backlog") {
      return [...list].sort((a, b) =>
        (PRIORITY_RANK[a.techPriority ?? "Medium"] ?? 1) - (PRIORITY_RANK[b.techPriority ?? "Medium"] ?? 1)
        || a.name.localeCompare(b.name));
    }
    return [...list].sort((a, b) =>
      (b.lastTouchedAt ?? b.updatedAt ?? "").localeCompare(a.lastTouchedAt ?? a.updatedAt ?? "")
      || a.name.localeCompare(b.name));
  }, [businesses, view, search, myId, nameById, statusFilter, chapterId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of TECH_STATUSES) c[s] = 0;
    for (const b of businesses ?? []) {
      if (b.archived || isLead(b)) continue;
      if (chapterId && (b.chapterId ?? "chapter_ny") !== chapterId) continue;
      c[b.techStatus ?? "Backlog"] = (c[b.techStatus ?? "Backlog"] ?? 0) + 1;
    }
    return c;
  }, [businesses, chapterId]);

  const open = businesses?.find((b) => b.id === openId) ?? null;

  const setStatus = async (b: Business, status: TechStatus) => {
    // The gate that keeps the list honest: a status that claims a URL exists
    // can't be set until it does.
    if (status === "Draft Ready" && !b.previewUrl) {
      setBlocked("Draft Ready needs a preview URL — add one below first.");
      return;
    }
    if (status === "Live" && !b.liveUrl) {
      setBlocked("Live means its own domain. Add the live URL first; if it's still on Vercel it's Draft Ready or With Client.");
      return;
    }
    setBlocked(null);
    await updateBusiness(b.id, { techStatus: status, lastTouchedAt: new Date().toISOString() });
    if (status === "Draft Ready") void notifyDraftReady(b);
  };

  const addProject = async () => {
    const name = window.prompt("Business name")?.trim();
    if (!name) return;
    await createBusiness({
      name, ownerName: "", ownerEmail: "", ownerAlternateEmail: "", phone: "",
      alternatePhone: "", address: "", website: "", projectStatus: "Upcoming",
      teamLead: "", firstContactDate: "", notes: "",
      techStatus: "Backlog", techPriority: "Medium", assignees: [], hoursLogged: 0,
      chapterId: chapterId ?? chapters.find((c) => c.slug === "new-york")?.id,
      lastTouchedAt: new Date().toISOString(),
    } as Omit<Business, "id" | "createdAt" | "updatedAt">);
  };

  if (loading) return <MembersLayout><div className="p-6" /></MembersLayout>;

  return (
    <MembersLayout>
      <PageHeader
        title="Projects"
        subtitle="Every website Novus has built or agreed to build."
        action={canEdit ? <Btn variant="primary" onClick={addProject}>+ New Project</Btn> : undefined}
      />
      <SectionTabs tabs={PROJECT_GROUP_TABS} />

      {/* Pipeline counts — the whole board in one line */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-1">
        {TECH_PIPELINE.map((s) => (
          <button
            key={s}
            onClick={() => { setView("all"); setStatusFilter(statusFilter === s ? null : s); }}
            className="group flex items-baseline gap-1.5 text-left"
          >
            <span className={`font-mono text-[15px] font-semibold tabular-nums ${
              statusFilter === s ? "text-[#F3E28D]" : "text-white/85 group-hover:text-white"}`}>
              {counts[s] ?? 0}
            </span>
            <span className={`text-[11px] ${
              statusFilter === s ? "text-[#F3E28D]" : "text-white/45 group-hover:text-white/70"}`}>{s}</span>
          </button>
        ))}
      </div>

      {chapters.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-white/35">Clients in</span>
          {[{ id: null, name: "All" }, ...[...chapters].sort((a, b) => a.sortOrder - b.sortOrder)].map((c) => {
            const count = c.id === null
              ? (businesses ?? []).filter((b) => !b.archived && !isLead(b)).length
              : (businesses ?? []).filter((b) => !b.archived && !isLead(b) && (b.chapterId ?? "chapter_ny") === c.id).length;
            return (
              <button
                key={c.id ?? "all"}
                onClick={() => setChapterId(c.id)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  chapterId === c.id
                    ? "border-[#F3E28D]/45 bg-[#F3E28D]/15 text-[#F3E28D]"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white/85"
                }`}
              >
                {c.name}
                <span className="ml-1.5 font-mono tabular-nums text-white/35">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            title={v.hint}
            onClick={() => { setView(v.key); setStatusFilter(null); }}
            className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
              view === v.key
                ? "border-[#F3E28D]/40 bg-[#F3E28D]/15 text-[#F3E28D]"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/80"
            }`}
          >
            {v.label}
          </button>
        ))}
        <div className="ml-auto min-w-[200px] flex-1 sm:max-w-xs">
          <SearchBar value={search} onChange={setSearch} placeholder="Search name, note, assignee, URL…" />
        </div>
      </div>

      {businesses === null ? (
        <SkeletonRows rows={12} cols={5} />
      ) : rows.length === 0 ? (
        <Empty message={`Nothing in ${VIEWS.find((v) => v.key === view)?.label}.`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/10">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="bg-white/[0.03]">
                {["Business", "Status", "Assigned to", "Links", "Note", ""].map((h, i) => (
                  <th
                    key={h + i}
                    className="border-b border-white/10 px-3 py-2 text-left text-[10px] uppercase tracking-wide text-white/45"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const assigned = (b.assignees ?? []).map((id) => nameById.get(id) ?? id);
                return (
                  <tr
                    key={b.id}
                    onClick={() => setOpenId(b.id)}
                    className={`h-9 cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04] ${
                      openId === b.id ? "bg-white/[0.06]" : ""
                    }`}
                  >
                    <td className="px-3 py-1.5">
                      <div className="text-[12px] font-medium text-white/90">{b.name}</div>
                      {b.neighborhood && (
                        <div className="text-[10px] text-white/35">{b.neighborhood}</div>
                      )}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <Badge label={b.techStatus ?? "Backlog"} />
                        {b.techStatus === "Backlog" && b.techPriority && b.techPriority !== "Medium" && (
                          <Badge label={b.techPriority} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-[11px] text-white/70">
                      {assigned.length ? assigned.join(", ") : <span className="text-white/25">—</span>}
                    </td>
                    <td className="px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 text-[11px]">
                        {b.liveUrl && (
                          <a href={b.liveUrl} target="_blank" rel="noopener noreferrer"
                             className="text-green-400 hover:underline">{hostOf(b.liveUrl)}</a>
                        )}
                        {!b.liveUrl && b.previewUrl && (
                          <a href={b.previewUrl} target="_blank" rel="noopener noreferrer"
                             className="text-yellow-300/80 hover:underline">preview</a>
                        )}
                        {!b.liveUrl && !b.previewUrl && <span className="text-white/25">—</span>}
                      </div>
                    </td>
                    <td className="max-w-[240px] px-3 py-1.5">
                      <div className="truncate text-[11px] text-white/45">
                        {(b.notes ?? "").split("\n")[0] || <span className="text-white/20">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <span className="text-[10px] text-white/25">
                        {(b.lastTouchedAt ?? b.updatedAt ?? "").slice(5, 10)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-2 px-1 text-[10px] text-white/30">
        {rows.length} {rows.length === 1 ? "project" : "projects"}
      </div>

      {open && (
        <ProjectPanel
          business={open}
          team={team}
          canEdit={canEdit}
          blocked={blocked}
          onClose={() => { setOpenId(null); setBlocked(null); }}
          onStatus={(s) => setStatus(open, s)}
        />
      )}
    </MembersLayout>
  );
}
