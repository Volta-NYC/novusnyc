"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, Btn, Badge, Empty, SkeletonRows } from "@/components/members/ui";
import {
  subscribePods, subscribePodMembers, subscribePodMeetings, subscribeTeam, subscribeChapters,
  createPodMeeting, deletePodMeeting, updatePod,
  addPodMember, removePodMember, setPodMemberRole,
  type Pod, type PodMember, type PodMeeting, type TeamMember, type PodRole, type Chapter,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import { isInactiveMember } from "@/lib/members/roles";
import AttendanceGrid from "./AttendanceGrid";
import PodAssignments from "./PodAssignments";

type Tab = "meetings" | "roster" | "tasks" | "settings";

export default function PodDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const { authRole, userProfile, loading } = useAuth();
  const isAdmin = authRole === "owner" || authRole === "admin";

  const [pods, setPods]         = useState<Pod[] | null>(null);
  const [members, setMembers]   = useState<PodMember[]>([]);
  const [meetings, setMeetings] = useState<PodMeeting[]>([]);
  const [team, setTeam]         = useState<TeamMember[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [tab, setTab]           = useState<Tab>("meetings");
  const [openMeeting, setOpenMeeting] = useState<string | null>(null);

  useEffect(() => subscribePods(setPods), []);
  useEffect(() => subscribePodMembers(setMembers), []);
  useEffect(() => subscribePodMeetings(setMeetings), []);
  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeChapters(setChapters), []);

  const pod = useMemo(() => (pods ?? []).find((p) => p.slug === slug) ?? null, [pods, slug]);
  const myId = userProfile?.id ?? null;

  const roster = useMemo(
    () => members.filter((m) => m.podId === pod?.id && !m.leftAt),
    [members, pod],
  );
  const isLit = !!myId && roster.some((m) => m.memberId === myId && m.role === "lit");
  const canRun = isAdmin || isLit;

  const nameById = useMemo(() => new Map(team.map((t) => [t.id, t.name])), [team]);

  const podMeetings = useMemo(
    () => meetings.filter((m) => m.podId === pod?.id).sort((a, b) => b.meetsOn.localeCompare(a.meetsOn)),
    [meetings, pod],
  );

  // Land on the newest meeting so the common case — "I just ran the call" — is
  // one click from a filled grid.
  useEffect(() => {
    if (!openMeeting && podMeetings.length) setOpenMeeting(podMeetings[0].id);
  }, [podMeetings, openMeeting]);

  const addMeeting = async () => {
    if (!pod) return;
    const today = new Date().toISOString().slice(0, 10);
    const date = window.prompt("Meeting date (YYYY-MM-DD)", today)?.trim();
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (podMeetings.some((m) => m.meetsOn === date)) {
      setOpenMeeting(podMeetings.find((m) => m.meetsOn === date)!.id);
      return;
    }
    const id = await createPodMeeting(pod.id, date, "", pod.defaultMeetingHours);
    setOpenMeeting(id);
  };

  if (loading || pods === null) {
    return <MembersLayout><div className="p-2"><SkeletonRows rows={6} cols={4} /></div></MembersLayout>;
  }

  if (!pod) {
    return (
      <MembersLayout>
        <Empty message="No pod at that address." action={<Link href="/members/pods" className="text-[#F3E28D] text-sm">Back to pods</Link>} />
      </MembersLayout>
    );
  }

  const lits = roster.filter((m) => m.role === "lit").map((m) => nameById.get(m.memberId) ?? "Unknown");
  const selected = podMeetings.find((m) => m.id === openMeeting) ?? null;

  const TABS: { key: Tab; label: string }[] = [
    { key: "meetings", label: "Meetings" },
    { key: "roster",   label: `Roster · ${roster.length}` },
    { key: "tasks",    label: "Assignments" },
    ...(canRun ? [{ key: "settings" as Tab, label: "Settings" }] : []),
  ];

  return (
    <MembersLayout>
      <div className="mb-1">
        <Link href="/members/pods" className="text-[11px] text-white/35 hover:text-white/70">← Pods</Link>
      </div>
      <PageHeader
        title={pod.name}
        subtitle={[
          chapters.find((c) => c.id === pod.chapterId)?.name,
          pod.serves === "clients" ? "for our clients" : "for Novus itself",
          lits.length ? `led by ${lits.join(", ")}` : "no LIT assigned yet",
        ].filter(Boolean).join(" · ")}
        action={canRun && tab === "meetings"
          ? <Btn variant="primary" onClick={addMeeting}>+ New meeting</Btn>
          : undefined}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
              tab === t.key
                ? "border-[#F3E28D]/40 bg-[#F3E28D]/15 text-[#F3E28D]"
                : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/20 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "meetings" && (
        podMeetings.length === 0 ? (
          <Empty
            message="No meetings yet."
            action={canRun ? <Btn variant="primary" onClick={addMeeting}>+ New meeting</Btn> : undefined}
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
              {podMeetings.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setOpenMeeting(m.id)}
                  className={`shrink-0 rounded-md border px-3 py-2 text-left transition-colors lg:shrink ${
                    openMeeting === m.id
                      ? "border-[#F3E28D]/40 bg-[#F3E28D]/10"
                      : "border-white/10 bg-white/[0.02] hover:border-white/25"
                  }`}
                >
                  <div className={`font-mono text-[12px] tabular-nums ${openMeeting === m.id ? "text-[#F3E28D]" : "text-white/85"}`}>
                    {m.meetsOn}
                  </div>
                  <div className="text-[10px] text-white/35">
                    {m.title || `${m.hours}h`}
                  </div>
                </button>
              ))}
            </div>

            {selected && (
              <AttendanceGrid
                key={selected.id}
                pod={pod}
                meeting={selected}
                roster={roster}
                nameById={nameById}
                canEdit={canRun}
                myId={myId}
                onDelete={async () => {
                  if (!window.confirm(`Delete the ${selected.meetsOn} meeting and its attendance?`)) return;
                  await deletePodMeeting(selected.id);
                  setOpenMeeting(null);
                }}
              />
            )}
          </div>
        )
      )}

      {tab === "roster" && (
        <Roster
          pod={pod} roster={roster} team={team} canEdit={canRun} nameById={nameById}
        />
      )}

      {tab === "tasks" && (
        <PodAssignments pod={pod} roster={roster} nameById={nameById} canEdit={canRun} myId={myId} />
      )}

      {tab === "settings" && canRun && <Settings pod={pod} />}
    </MembersLayout>
  );
}

// ── Roster ───────────────────────────────────────────────────────────────────

function Roster({
  pod, roster, team, canEdit, nameById,
}: {
  pod: Pod;
  roster: PodMember[];
  team: TeamMember[];
  canEdit: boolean;
  nameById: Map<string, string>;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inPod = useMemo(
    () => new Map(roster.map((m) => [m.memberId, m.role as PodRole])),
    [roster],
  );

  const run = async (memberId: string, fn: () => Promise<void>) => {
    setBusy(memberId);
    setError(null);
    try { await fn(); }
    catch (err) { setError(err instanceof Error ? err.message : "That didn't save. Try again."); }
    finally { setBusy(null); }
  };

  // The roster itself is already listed above as chips, so this list exists to
  // add someone. It shows results for a search rather than ninety names.
  const q = query.trim().toLowerCase();
  const candidates = !q ? [] : team
    .filter((t) => !isInactiveMember(t.status))
    .filter((t) => t.name.toLowerCase().includes(q) || (t.email ?? "").toLowerCase().includes(q))
    .sort((a, b) => {
      const aOn = inPod.has(a.id), bOn = inPod.has(b.id);
      if (aOn !== bOn) return aOn ? -1 : 1;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 25);

  return (
    <div className="max-w-2xl">
      {roster.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {roster.map((m) => (
            <span key={m.id} className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/80">
              {nameById.get(m.memberId) ?? "Unknown"}
              {m.role === "lit" && <Badge label="lit" />}
              {canEdit && (
                <button
                  onClick={() => void run(m.memberId, () => removePodMember(pod.id, m.memberId))}
                  disabled={busy === m.memberId}
                  aria-label={`Remove ${nameById.get(m.memberId) ?? "member"} from ${pod.name}`}
                  className="text-white/30 transition-colors hover:text-red-400"
                >✕</button>
              )}
            </span>
          ))}
        </div>
      )}

      {error && <p role="alert" className="mb-2 text-[11px] text-red-400">{error}</p>}

      {canEdit ? (
        <>
          <input
            className="mb-2 w-full rounded-md border border-white/10 bg-[#0F1014] px-2.5 py-1.5 text-[12px] text-white/90 placeholder:text-white/25 focus:border-[#F3E28D]/40 focus:outline-none"
            placeholder="Search everyone by name or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="max-h-[26rem] overflow-y-auto rounded-md border border-white/10 bg-[#0F1014]">
            {candidates.map((t) => {
              const role = inPod.get(t.id);
              const isBusy = busy === t.id;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 border-b border-white/5 px-2.5 py-1.5 last:border-b-0 hover:bg-white/[0.03] ${isBusy ? "opacity-50" : ""}`}
                >
                  <button
                    onClick={() => void run(t.id, () => role
                      ? removePodMember(pod.id, t.id)
                      : addPodMember(pod.id, t.id, "member"))}
                    disabled={isBusy}
                    aria-pressed={!!role}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                      role ? "border-[#F3E28D]/50 bg-[#F3E28D]/20 text-[#F3E28D]" : "border-white/20 text-transparent"
                    }`}>✓</span>
                    <span className={`truncate text-[12px] ${role ? "text-white" : "text-white/55"}`}>{t.name}</span>
                    {(t.divisions ?? []).length > 0 && (
                      <span className="shrink-0 text-[9px] uppercase tracking-wide text-white/25">
                        {(t.divisions ?? []).join(" · ")}
                      </span>
                    )}
                  </button>

                  {role && (
                    <button
                      onClick={() => void run(t.id, () => setPodMemberRole(pod.id, t.id, role === "lit" ? "member" : "lit"))}
                      disabled={isBusy}
                      aria-pressed={role === "lit"}
                      title={role === "lit" ? "Demote to member" : "Make LIT of this pod"}
                      className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition-colors ${
                        role === "lit" ? "bg-[#F3E28D]/20 text-[#F3E28D]" : "text-white/30 hover:text-white/70"
                      }`}
                    >LIT</button>
                  )}
                </div>
              );
            })}
            {candidates.length === 0 && (
              <p className="px-2.5 py-3 text-[11px] text-white/30">
                {q ? `No active member matches “${query.trim()}”.`
                   : "Search for someone by name or email to add them."}
              </p>
            )}
          </div>
          <p className="mt-2 text-[10px] text-white/25">
            Removing someone who has attended a meeting keeps their hours.
          </p>
        </>
      ) : (
        roster.length === 0 && <Empty message="No one in this pod yet." />
      )}
    </div>
  );
}

// ── Settings ─────────────────────────────────────────────────────────────────

function Settings({ pod }: { pod: Pod }) {
  const [cadence, setCadence]   = useState(String(pod.cadenceDays));
  const [meetingH, setMeetingH] = useState(String(pod.defaultMeetingHours));
  const [taskH, setTaskH]       = useState(String(pod.defaultTaskHours));
  const [saved, setSaved]       = useState(false);

  const dirty =
    Number(cadence) !== pod.cadenceDays ||
    Number(meetingH) !== pod.defaultMeetingHours ||
    Number(taskH) !== pod.defaultTaskHours;

  const save = async () => {
    await updatePod(pod.id, {
      cadenceDays: Math.max(1, Number(cadence) || pod.cadenceDays),
      defaultMeetingHours: Math.max(0, Number(meetingH)),
      defaultTaskHours: Math.max(0, Number(taskH)),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const field = "w-28 rounded-md border border-white/10 bg-[#0F1014] px-2.5 py-1.5 text-[12px] text-white/90 focus:border-[#F3E28D]/40 focus:outline-none";

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-[11px] leading-relaxed text-white/40">
        Prefills — any meeting or task can override its own hours.
      </p>

      {([
        ["Meets every", cadence, setCadence, "days", ""],
        ["Default meeting", meetingH, setMeetingH, "hours", "Earned by everyone marked Present or Excused."],
        ["Default task", taskH, setTaskH, "hours", "Earned when the task is marked done."],
      ] as const).map(([label, value, setter, unit, hint]) => (
        <div key={label} className="flex items-start gap-3">
          <div>
            <label className="mb-1 block text-[11px] text-white/60">{label}</label>
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" step={unit === "days" ? "1" : "0.25"}
                className={field}
                value={value}
                onChange={(e) => setter(e.target.value)}
              />
              <span className="text-[11px] text-white/35">{unit}</span>
            </div>
          </div>
          {hint && <p className="mt-6 flex-1 text-[10px] leading-relaxed text-white/25">{hint}</p>}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-1">
        <Btn variant="primary" onClick={save} disabled={!dirty}>Save</Btn>
        {saved && <span className="text-[11px] text-green-400">Saved</span>}
      </div>
    </div>
  );
}
