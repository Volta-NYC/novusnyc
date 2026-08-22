"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { PROJECT_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, SearchBar, Badge, Btn, Empty, SkeletonRows, LoadError,
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
type ViewKey = "all" | "domains" | "backlog" | "leads" | "hold";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "all",     label: "All" },
  { key: "domains", label: "Real Domains" },
  { key: "backlog", label: "Backlog" },
  { key: "leads",   label: "Leads" },
  { key: "hold",    label: "On Hold" },
];

const PRIORITY_RANK: Record<string, number> = { High: 0, Medium: 1, Maybe: 2 };

// Colour belongs to the status, not to whichever URL happens to exist.
const STATUS_TINT: Record<TechStatus, string> = {
  Backlog:       "border-white/15 bg-white/[0.03] text-white/60",
  Assigned:      "border-indigo-500/30 bg-indigo-500/10 text-indigo-300",
  "Draft Ready": "border-yellow-400/35 bg-yellow-400/10 text-yellow-300",
  "With Client": "border-purple-400/30 bg-purple-400/10 text-purple-300",
  Live:          "border-green-500/35 bg-green-500/10 text-green-400",
  "On Hold":     "border-orange-500/30 bg-orange-500/10 text-orange-400",
  Dropped:       "border-red-500/25 bg-red-500/8 text-red-400",
};

const STATUS_DOT: Record<TechStatus, string> = {
  Backlog:       "bg-white/30",
  Assigned:      "bg-indigo-400",
  "Draft Ready": "bg-yellow-400",
  "With Client": "bg-purple-400",
  Live:          "bg-green-500",
  "On Hold":     "bg-orange-400",
  Dropped:       "bg-red-500",
};

function isLead(b: Business): boolean {
  return b.intakeSource === "website_form" || b.intakeSource === "discovery";
}

function hostOf(url: string): string {
  try { return new URL(url).host.replace(/^www\./, ""); }
  catch { return url.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, ""); }
}

// Wrapped so the tracker can read ?view= without opting the whole route out of
// static rendering.
export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageInner />
    </Suspense>
  );
}

function ProjectsPageInner() {
  const { authRole, isTechLead, loading } = useAuth();
  const canEdit = authRole === "owner" || authRole === "admin" || isTechLead;
  const canPublish = authRole === "owner" || authRole === "admin";

  const [businesses, setBusinesses] = useState<Business[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [team, setTeam]             = useState<TeamMember[]>([]);
  const [chapters, setChapters]     = useState<Chapter[]>([]);
  // Which market's clients we're looking at. Tech work is remote, but the
  // clients themselves are firmly in one city or the other.
  const [chapterId, setChapterId]   = useState<string | null>(null);
  // The view is addressable, so /members/projects?view=leads is linkable and the
  // retired /members/projects/discovery route has somewhere real to land.
  const searchParams = useSearchParams();
  const requestedView = searchParams.get("view");
  const [view, setView]             = useState<ViewKey>(
    VIEWS.some((v) => v.key === requestedView) ? (requestedView as ViewKey) : "all",
  );
  const [search, setSearch]         = useState("");
  const [openId, setOpenId]         = useState<string | null>(null);
  const [blocked, setBlocked]       = useState<string | null>(null);
  const [quickAdd, setQuickAdd]     = useState("");
  const [adding, setAdding]         = useState(false);
  const [statusFilter, setStatusFilter] = useState<Set<TechStatus>>(new Set());

  useEffect(() => subscribeBusinesses((rows, state) => {
    setBusinesses(rows);
    setLoadError(state.error);
  }), []);
  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeChapters(setChapters), []);


  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of team) m.set(t.id, t.name);
    return m;
  }, [team]);

  // Never name a chapter id in code: the default is whichever chapter sorts
  // first, so renaming or reordering them doesn't silently break the filter.
  const defaultChapterId = useMemo(
    () => [...chapters].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ?? null,
    [chapters],
  );
  const rows = useMemo(() => {
    if (!businesses) return [];
    const q = search.trim().toLowerCase();
    let list = businesses.filter((b) => !b.archived);
    if (chapterId) list = list.filter((b) => (b.chapterId ?? defaultChapterId) === chapterId);

    switch (view) {
      case "domains": list = list.filter((b) => !!b.liveUrl); break;
      case "backlog": list = list.filter((b) => b.techStatus === "Backlog" && !isLead(b)); break;
      case "leads":   list = list.filter(isLead); break;
      case "hold":    list = list.filter((b) => b.techStatus === "On Hold" || b.techStatus === "Dropped"); break;
      default:        list = list.filter((b) => !isLead(b));
    }

    if (statusFilter.size > 0) list = list.filter((b) => statusFilter.has(b.techStatus ?? "Backlog"));

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
  }, [businesses, view, search, nameById, statusFilter, chapterId, defaultChapterId]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of TECH_STATUSES) c[s] = 0;
    for (const b of businesses ?? []) {
      if (b.archived || isLead(b)) continue;
      if (chapterId && (b.chapterId ?? defaultChapterId) !== chapterId) continue;
      c[b.techStatus ?? "Backlog"] = (c[b.techStatus ?? "Backlog"] ?? 0) + 1;
    }
    return c;
  }, [businesses, chapterId, defaultChapterId]);

  const open = businesses?.find((b) => b.id === openId) ?? null;

  const setStatus = async (b: Business, status: TechStatus) => {
    // The gate that keeps the list honest: a status that claims a URL exists
    // can't be set until it does.
    if (status === "Draft Ready" && !b.previewUrl) {
      setBlocked("Draft Ready needs a preview link.");
      setOpenId(b.id);
      return;
    }
    if (status === "Live" && !b.liveUrl) {
      setBlocked("Live needs its own domain. Still on Vercel? That's Draft Ready or With Client.");
      setOpenId(b.id);
      return;
    }
    setBlocked(null);
    await updateBusiness(b.id, { techStatus: status, lastTouchedAt: new Date().toISOString() });
    if (status === "Draft Ready") void notifyDraftReady(b);
  };

  // One field. Paste a link or type a name — the doc this replaces was a list
  // of pasted links, so pasting one has to be the whole interaction.
  const addProject = async () => {
    const raw = quickAdd.trim();
    if (!raw || adding) return;

    const looksLikeUrl = /^(https?:\/\/|www\.)|\.[a-z]{2,}(\/|$)/i.test(raw);
    let name = raw;
    let previewUrl: string | undefined;
    let liveUrl: string | undefined;
    let techStatus: TechStatus = "Backlog";

    if (looksLikeUrl) {
      const url = raw.startsWith("http") ? raw : `https://${raw}`;
      let host = url;
      try { host = new URL(url).host; } catch { /* keep the raw string */ }
      const bare = host.replace(/^www\./, "");
      if (bare.endsWith(".vercel.app")) {
        previewUrl = url;
        techStatus = "Draft Ready";
        name = bare.replace(/\.vercel\.app$/, "");
      } else {
        liveUrl = url;
        techStatus = "Live";
        name = bare.replace(/\.[a-z.]+$/i, "");
      }
      name = name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
    }

    // Adding the same site twice is the easy mistake here; open the existing
    // one instead of making a second row.
    const existing = (businesses ?? []).find((b) =>
      (previewUrl && b.previewUrl === previewUrl) ||
      (liveUrl && b.liveUrl === liveUrl) ||
      b.name.trim().toLowerCase() === name.toLowerCase());
    if (existing) {
      setQuickAdd("");
      setOpenId(existing.id);
      return;
    }

    setAdding(true);
    try {
      await createBusiness({
        name, ownerName: "", ownerEmail: "", ownerAlternateEmail: "", phone: "",
        alternatePhone: "", address: "", website: "", projectStatus: "Upcoming",
        teamLead: "", firstContactDate: "", notes: "",
        techStatus, techPriority: "Medium", assignees: [], hoursLogged: 0,
        previewUrl, liveUrl,
        chapterId: chapterId ?? defaultChapterId ?? undefined,
        lastTouchedAt: new Date().toISOString(),
      } as Omit<Business, "id" | "createdAt" | "updatedAt">);
      setQuickAdd("");
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <MembersLayout><div className="p-6" /></MembersLayout>;

  return (
    <MembersLayout>
      <PageHeader
        title="Tech Projects"
      />
      <SectionTabs tabs={PROJECT_GROUP_TABS.filter((t) => canPublish || t.href === "/members/projects")} />

      {/* The pipeline doubles as the filter, so each tier carries its own
          colour — a row of plain numbers gave no sign it could be clicked. */}
      <div className="mb-4 flex flex-wrap items-center gap-2 px-1">
        {TECH_PIPELINE.map((st) => {
          const on = statusFilter.has(st);
          return (
            <button
              key={st}
              aria-pressed={on}
              onClick={() => setStatusFilter((prev) => {
                const next = new Set(prev);
                if (next.has(st)) next.delete(st); else next.add(st);
                return next;
              })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${STATUS_TINT[st]} ${
                on ? "ring-2 ring-offset-1 ring-current/40" : "opacity-70 hover:opacity-100"
              }`}
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[st]}`} />
              <span className="font-mono text-[12px] font-semibold tabular-nums">{counts[st] ?? 0}</span>
              <span>{st}</span>
            </button>
          );
        })}
        {statusFilter.size > 0 && (
          <button
            onClick={() => setStatusFilter(new Set())}
            className="text-[11px] text-white/45 underline decoration-white/20 hover:text-white/75"
          >
            Clear
          </button>
        )}
      </div>

      {chapters.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[10px] uppercase tracking-wide text-white/35">Clients in</span>
          {[{ id: null, name: "All" }, ...[...chapters].sort((a, b) => a.sortOrder - b.sortOrder)].map((c) => {
            const count = c.id === null
              ? (businesses ?? []).filter((b) => !b.archived && !isLead(b)).length
              : (businesses ?? []).filter((b) => !b.archived && !isLead(b) && (b.chapterId ?? defaultChapterId) === c.id).length;
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

      {canEdit && (
        <div className="mb-3 flex items-center gap-2">
          <input
            value={quickAdd}
            onChange={(e) => setQuickAdd(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void addProject(); } }}
            placeholder="Paste a Vercel link or type a business name, then press Enter"
            aria-label="Add a website"
            className="flex-1 rounded-lg border border-white/15 bg-[#0F1014] px-3 py-2 text-[13px] text-white/90 placeholder:text-white/35 focus:border-[#F3E28D]/50 focus:outline-none"
          />
          <Btn variant="primary" onClick={() => void addProject()} disabled={!quickAdd.trim() || adding}>
            {adding ? "Adding…" : "Add"}
          </Btn>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.key}
            onClick={() => { setView(v.key); setStatusFilter(new Set()); }}
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

      {loadError ? (
        <LoadError message={loadError} onRetry={() => window.location.reload()} />
      ) : businesses === null ? (
        <SkeletonRows rows={12} cols={5} />
      ) : rows.length === 0 ? (
        <Empty message={`Nothing in ${VIEWS.find((v) => v.key === view)?.label}.`} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/15">
          <table className="w-full min-w-[880px] table-fixed border-collapse">
            <colgroup>
              <col className="w-[22%]" /><col className="w-[13%]" /><col className="w-[16%]" />
              <col className="w-[20%]" /><col /><col className="w-[64px]" />
            </colgroup>
            <thead>
              <tr className="bg-white/[0.04]">
                {["Business", "Status", "Assigned to", "Links", "Note", "Updated"].map((h) => (
                  <th
                    key={h}
                    className="border-b border-white/15 px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => {
                const assigned = (b.assignees ?? []).map((id) => nameById.get(id) ?? id);
                // Show the real address either way. Which link exists is not the
                // same fact as what status the project is in, and colouring the
                // URL by it made the two look like one thing.
                const primary = b.liveUrl || b.previewUrl || "";
                return (
                  <tr
                    key={b.id}
                    // The row is the control that opens the project, so it has
                    // to answer the keyboard the way a button does.
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${b.name}`}
                    onClick={() => setOpenId(b.id)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setOpenId(b.id);
                      }
                    }}
                    className={`cursor-pointer border-b border-white/10 align-middle transition-colors last:border-b-0 hover:bg-white/[0.05] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#F6B78D]/70 ${
                      openId === b.id ? "bg-white/[0.07]" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      <div className="truncate text-[12px] font-medium text-white/90" title={b.name}>{b.name}</div>
                      {b.neighborhood && (
                        <div className="truncate text-[10px] text-white/35">{b.neighborhood}</div>
                      )}
                    </td>

                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {canEdit ? (
                          <span className={`members-status-select inline-flex items-center gap-1.5 rounded-md border px-2 py-1 ${STATUS_TINT[b.techStatus ?? "Backlog"]}`}>
                            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[b.techStatus ?? "Backlog"]}`} />
                            <select
                              value={b.techStatus ?? "Backlog"}
                              onChange={(e) => void setStatus(b, e.target.value as TechStatus)}
                              aria-label={`Status for ${b.name}`}
                              className="cursor-pointer border-0 bg-transparent text-[11px] leading-none text-current focus:outline-none"
                            >
                              {TECH_STATUSES.map((st) => <option key={st} value={st}>{st}</option>)}
                            </select>
                          </span>
                        ) : (
                          <Badge label={b.techStatus ?? "Backlog"} />
                        )}
                        {b.techStatus === "Backlog" && b.techPriority && b.techPriority !== "Medium" && (
                          <Badge label={b.techPriority} />
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2">
                      <div className="truncate text-[11px] text-white/70" title={assigned.join(", ")}>
                        {assigned.length ? assigned.join(", ") : <span className="text-white/25">—</span>}
                      </div>
                    </td>

                    <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                      {primary ? (
                        <a
                          href={primary}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={primary}
                          className="block truncate text-[11px] text-blue-400 hover:underline"
                        >
                          {hostOf(primary)}
                        </a>
                      ) : (
                        <span className="text-[11px] text-white/25">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <div className="truncate text-[11px] text-white/45" title={(b.notes ?? "").replace(/\n/g, " ")}>
                        {(b.notes ?? "").split("\n")[0] || <span className="text-white/20">—</span>}
                      </div>
                    </td>

                    <td className="px-3 py-2 text-right">
                      <span className="whitespace-nowrap font-mono text-[10px] tabular-nums text-white/30">
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
