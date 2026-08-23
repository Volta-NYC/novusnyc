"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  subscribeMemberStrikes, subscribeInfractions, subscribePods, subscribePodMembers,
  deleteMemberStrike, clearMemberStrikes, createMemberStrike,
  fetchMemberHours, createHoursAdjustment, updateTeamMember, fetchApplicationForMember,
  type Infraction, type MemberStrike, type TeamMember,
  type Pod, type PodMember, type HoursEntry, type ApplicationRecord,
} from "@/lib/members/storage";
import { Btn, Field, Input, Modal, Select, useConfirm, useDialogBehavior } from "@/components/members/ui";
import PodPicker from "@/components/members/PodPicker";
import { getAuthToken } from "@/lib/members/supabaseAuth";

const TRACKS = ["Tech", "Marketing", "Finance"] as const;

interface Props {
  member: TeamMember | null;
  reviewerLabel: string;
  canEdit?: boolean;
  canAdjustHours?: boolean;
  canGenerateLetter?: boolean;
  canManageInfractions?: boolean;
  onClose: () => void;
}

const SOURCE_LABEL: Record<HoursEntry["source"], string> = {
  meeting: "Meetings",
  task: "Assignments",
  project: "Projects",
  adjustment: "Adjustments",
};

export default function MemberDrawer({
  member, reviewerLabel, canEdit = false,
  canAdjustHours = false, canGenerateLetter = false, canManageInfractions = false, onClose,
}: Props) {
  const [strikes, setStrikes]       = useState<MemberStrike[]>([]);
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [pods, setPods]             = useState<Pod[]>([]);
  const [podMembers, setPodMembers] = useState<PodMember[]>([]);
  const [hours, setHours]           = useState<HoursEntry[] | null>(null);
  const [application, setApplication] = useState<ApplicationRecord | null>(null);
  const [loadError, setLoadError]   = useState(false);
  const [showApplication, setShowApplication] = useState(false);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issueInfractionId, setIssueInfractionId] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [issuePointsOverride, setIssuePointsOverride] = useState("");
  const [issueStatus, setIssueStatus] = useState<"idle" | "busy" | "done" | "error">("idle");

  const [adjOpen, setAdjOpen] = useState(false);
  const [adjHours, setAdjHours] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const year = new Date().getFullYear();
  const secondHalf = new Date().getMonth() >= 6;
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterFrom, setLetterFrom] = useState(`${year}-${secondHalf ? "07-01" : "01-01"}`);
  const [letterTo, setLetterTo] = useState(`${year}-${secondHalf ? "12-31" : "06-30"}`);
  const [letterStatus, setLetterStatus] = useState<"idle" | "busy" | "error">("idle");

  const drawerRef = useRef<HTMLElement>(null);
  const drawerTitleId = useId();
  const onCloseRef = useRef(onClose);
  const memberId = member?.id;
  const { ask, Dialog } = useConfirm();

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => subscribeMemberStrikes(setStrikes), []);
  useEffect(() => subscribeInfractions(setInfractions), []);
  useEffect(() => subscribePods(setPods), []);
  useEffect(() => subscribePodMembers(setPodMembers), []);

  useEffect(() => {
    if (!memberId) { setApplication(null); setLoadError(false); return; }
    let live = true;
    setLoadError(false);
    void fetchApplicationForMember(memberId)
      .then((a) => { if (live) setApplication(a); })
      .catch(() => { if (live) setLoadError(true); });
    return () => { live = false; };
  }, [memberId]);

  useEffect(() => {
    if (!memberId) { setHours(null); return; }
    let live = true;
    void fetchMemberHours(memberId)
      .then((h) => { if (live) setHours(h); })
      .catch(() => { if (live) setLoadError(true); });
    return () => { live = false; };
  }, [memberId, strikes]);

  useDialogBehavior(true, onClose, drawerRef);

  const memberStrikes = useMemo(
    () => (memberId ? strikes.filter((s) => s.memberId === memberId) : []),
    [strikes, memberId],
  );

  const strikePoints = useMemo(
    () => memberStrikes.reduce((sum, s) => sum + (s.points || 0), 0),
    [memberStrikes],
  );

  const myPodRows = useMemo(
    () => (memberId ? podMembers.filter((m) => m.memberId === memberId && !m.leftAt) : []),
    [podMembers, memberId],
  );

  // LIT supersedes Member in the ladder, so it replaces that word here the same
  // way it does in the directory. A leadership title stays as it is.
  const roleLabel = useMemo(() => {
    const stored = String(member?.role ?? "").trim();
    const leadsAPod = myPodRows.some((m) => m.role === "lit");
    return leadsAPod && (stored === "" || stored === "Member") ? "LIT" : stored;
  }, [member?.role, myPodRows]);

  const bySource = useMemo(() => {
    const m = new Map<HoursEntry["source"], number>();
    for (const h of hours ?? []) m.set(h.source, (m.get(h.source) ?? 0) + Number(h.hours || 0));
    return m;
  }, [hours]);

  const totalHours = useMemo(
    () => (hours ?? []).reduce((s, h) => s + Number(h.hours || 0), 0),
    [hours],
  );

  const handleIssueStrike = async () => {
    const infraction = infractions.find((i) => i.id === issueInfractionId);
    if (!infraction || !member) return;
    setIssueStatus("busy");
    try {
      const override = issuePointsOverride.trim();
      await createMemberStrike({
        memberId: member.id,
        memberName: member.name,
        infractionId: infraction.id,
        infractionName: infraction.name,
        points: override ? Number(override) : infraction.points,
        source: "manual",
        issuedBy: reviewerLabel,
        note: issueNote.trim(),
      });
      setIssueStatus("done");
      setIssueOpen(false);
      setIssueInfractionId(""); setIssueNote(""); setIssuePointsOverride("");
      window.setTimeout(() => setIssueStatus("idle"), 1500);
    } catch {
      setIssueStatus("error");
    }
  };

  const handleAdjust = async () => {
    if (!member || !adjHours.trim()) return;
    try {
      await createHoursAdjustment(
        member.id, Number(adjHours), adjReason.trim(), new Date().toISOString().slice(0, 10),
      );
      setAdjOpen(false); setAdjHours(""); setAdjReason("");
      setHours(await fetchMemberHours(member.id));
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  };

  const generateLetter = async () => {
    if (!member || !letterFrom || !letterTo || letterFrom > letterTo) return;
    const popup = window.open("", "_blank");
    setLetterStatus("busy");
    try {
      const token = await getAuthToken();
      const params = new URLSearchParams({ memberId: member.id, from: letterFrom, to: letterTo });
      const response = await fetch(`/api/members/service-letter?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("The letter could not be generated.");
      const html = await response.text();
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      if (popup) popup.location.href = url;
      else window.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 120_000);
      setLetterOpen(false);
      setLetterStatus("idle");
    } catch {
      popup?.close();
      setLetterStatus("error");
    }
  };

  if (!member) return null;

  const field = "w-full rounded-md border border-white/10 bg-[#0F1014] px-2.5 py-1.5 text-[12px] text-white/90 placeholder:text-white/25 focus:border-[#F3E28D]/40 focus:outline-none";

  return (
    <>
      <Dialog />
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} aria-hidden="true" />
      <aside
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={drawerTitleId}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[440px] flex-col border-l border-white/10 bg-[#13161D] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 id={drawerTitleId} className="truncate font-semibold text-white">{member.name}</h2>
            <p className="mt-0.5 text-[11px] text-white/35">
              {[roleLabel, member.school].filter(Boolean).join(" · ") || member.email}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          >✕</button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loadError && (
            <div role="alert" className="mb-4 rounded-md border border-red-400/35 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
              Some member details could not be loaded or saved. Try again before relying on these values.
            </div>
          )}
          {/* Hours */}
          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between gap-3">
              <p className="text-[10px] uppercase tracking-wide text-white/40">Hours</p>
              <div className="flex items-center gap-3">
                {canGenerateLetter && <button onClick={() => { setLetterStatus("idle"); setLetterOpen(true); }} className="text-[10px] font-medium text-sky-300 transition-colors hover:text-sky-200">Service letter</button>}
                {canAdjustHours && (
                  <button onClick={() => setAdjOpen((v) => !v)} className="text-[10px] text-white/35 transition-colors hover:text-white/70">{adjOpen ? "Cancel" : "Adjust"}</button>
                )}
              </div>
            </div>
            <p className="font-mono text-3xl font-semibold tabular-nums text-[#F3E28D]">
              {totalHours.toFixed(1)}
            </p>
            {bySource.size > 0 && (
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {(["meeting", "task", "project", "adjustment"] as const).map((src) => {
                  const n = bySource.get(src);
                  if (!n) return null;
                  return (
                    <span key={src} className="text-[11px] text-white/45">
                      <span className="font-mono tabular-nums text-white/70">{n.toFixed(1)}</span>{" "}
                      {SOURCE_LABEL[src].toLowerCase()}
                    </span>
                  );
                })}
              </div>
            )}

            {adjOpen && (
              <div className="mt-3 space-y-2 rounded-md border border-white/10 bg-[#0F1014] p-3">
                <div className="flex gap-2">
                  <input
                    type="number" step="0.25"
                    className={`${field} w-24`}
                    placeholder="± hours"
                    value={adjHours}
                    onChange={(e) => setAdjHours(e.target.value)}
                    aria-label="Hours to add or remove"
                  />
                  <input
                    className={field}
                    placeholder="Reason"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    aria-label="Reason for adjustment"
                  />
                </div>
                <Btn variant="primary" size="sm" onClick={handleAdjust} disabled={!adjHours.trim()}>
                  Add adjustment
                </Btn>
                <p className="text-[10px] text-white/25">
                  Negative subtracts. Every adjustment is logged.
                </p>
              </div>
            )}
          </div>

          {/* Tracks */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Track</p>
            <div className="flex flex-wrap gap-1.5">
              {TRACKS.map((track) => {
                const on = (member.divisions ?? []).includes(track);
                return (
                  <button
                    key={track}
                    type="button"
                    disabled={!canEdit}
                    aria-pressed={on}
                    onClick={() => {
                      const current = member.divisions ?? [];
                      void updateTeamMember(member.id, {
                        divisions: on ? current.filter((d) => d !== track) : [...current, track],
                      });
                    }}
                    className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:cursor-not-allowed ${
                      on
                        ? "border-[#F3E28D]/45 bg-[#F3E28D]/15 text-[#F3E28D]"
                        : "border-white/12 bg-white/[0.03] text-white/55 hover:text-white/85"
                    }`}
                  >
                    {track}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pods */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Pods</p>
            <PodPicker
              pods={pods}
              memberships={myPodRows}
              memberId={member.id}
              disabled={!canEdit}
            />
          </div>

          {/* Infractions */}
          <div className="mb-5">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-[10px] uppercase tracking-wide text-white/40">
                Infractions
                {strikePoints > 0 && <span className="ml-1.5 text-red-400">{strikePoints} pts</span>}
              </p>
              <div className="flex gap-2">
                {canManageInfractions && memberStrikes.length > 0 && (
                  <button
                    onClick={() => ask(
                      async () => { await clearMemberStrikes(memberStrikes.map((s) => s.id)); },
                      `Clear all ${memberStrikes.length} infractions for ${member.name}?`,
                    )}
                    className="text-[10px] text-white/35 transition-colors hover:text-red-400"
                  >Clear all</button>
                )}
                {canManageInfractions && (
                  <button
                    onClick={() => setIssueOpen((v) => !v)}
                    className="text-[10px] text-white/35 transition-colors hover:text-white/70"
                  >{issueOpen ? "Cancel" : "Issue"}</button>
                )}
              </div>
            </div>

            {memberStrikes.length === 0 ? (
              <p className="text-[11px] text-white/25">None.</p>
            ) : (
              <div className="divide-y divide-white/5 rounded-md border border-white/10">
                {memberStrikes.map((s) => (
                  <div key={s.id} className="flex items-start gap-2 px-2.5 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-white/80">{s.infractionName}</p>
                      <p className="text-[10px] text-white/30">
                        {(s.issuedAt ?? "").slice(0, 10)} · {s.points} pts
                        {s.note ? ` · ${s.note}` : ""}
                      </p>
                    </div>
                    {canManageInfractions && (
                      <button
                        onClick={() => ask(
                          async () => { await deleteMemberStrike(s.id); },
                          "Revoke this infraction? It is removed from the member's record.",
                        )}
                        className="text-[10px] text-white/25 transition-colors hover:text-red-400"
                      >Revoke</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canManageInfractions && issueOpen && (
              <div className="mt-3 space-y-2 rounded-md border border-white/10 bg-[#0F1014] p-3">
                <Select
                  value={issueInfractionId}
                  onChange={(e) => setIssueInfractionId(e.target.value)}
                  aria-label="Infraction"
                >
                  <option value="">— Pick an infraction —</option>
                  {infractions.map((i) => (
                    <option key={i.id} value={i.id}>{i.name} ({i.points})</option>
                  ))}
                </Select>
                <div className="flex gap-2">
                  <input
                    type="number"
                    className={`${field} w-24`}
                    placeholder="Points"
                    value={issuePointsOverride}
                    onChange={(e) => setIssuePointsOverride(e.target.value)}
                    aria-label="Override points"
                  />
                  <input
                    className={field}
                    placeholder="Note (optional)"
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                    aria-label="Note"
                  />
                </div>
                <Btn
                  variant="danger" size="sm"
                  onClick={handleIssueStrike}
                  disabled={!issueInfractionId || issueStatus === "busy"}
                >
                  {issueStatus === "busy" ? "Issuing…" : "Issue infraction"}
                </Btn>
                {issueStatus === "error" && (
                  <p role="alert" className="text-[10px] text-red-400">That didn&apos;t save. Try again.</p>
                )}
              </div>
            )}
          </div>

          {/* Application */}
          {application && (
            <div className="mb-5">
              <div className="mb-2 flex items-baseline justify-between">
                <p className="text-[10px] uppercase tracking-wide text-white/40">Application</p>
                <button
                  onClick={() => setShowApplication((v) => !v)}
                  className="text-[10px] text-white/35 transition-colors hover:text-white/70"
                >
                  {showApplication ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-[11px] text-white/45">
                Applied {String(application.createdAt ?? "").slice(0, 10)}
                {application.tracksSelected ? ` · ${application.tracksSelected}` : ""}
              </p>

              {showApplication && (
                <div className="mt-2 space-y-2.5 rounded-md border border-white/10 bg-[#0F1014] p-3">
                  {([
                    ["School", application.schoolName],
                    ["Grade", application.grade],
                    ["From", [application.city, application.state].filter(Boolean).join(", ")],
                    ["Track", application.tracksSelected],
                    ["Focus", application.marketingSubtrack],
                    ["Heard via", [application.referral, application.referralName].filter(Boolean).join(" — ")],
                    ["Tools", application.toolsSoftware],
                  ] as const).map(([label, value]) =>
                    value ? (
                      <div key={label} className="flex gap-2">
                        <span className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-white/35">{label}</span>
                        <span className="text-[11px] leading-relaxed text-white/75">{value}</span>
                      </div>
                    ) : null,
                  )}

                  {application.accomplishment && (
                    <div>
                      <p className="mb-1 text-[10px] uppercase tracking-wide text-white/35">In their words</p>
                      <p className="text-[11px] leading-relaxed text-white/70">{application.accomplishment}</p>
                    </div>
                  )}

                  {application.resumeUrl && (
                    <a href={application.resumeUrl} target="_blank" rel="noopener noreferrer"
                       className="inline-block text-[11px] text-[#F3E28D]/80 hover:underline">
                      Résumé ↗
                    </a>
                  )}

                </div>
              )}
            </div>
          )}

          {/* History */}
          {hours && hours.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">History</p>
              <div className="divide-y divide-white/5 rounded-md border border-white/10">
                {hours.slice(0, 20).map((h, i) => (
                  <div key={`${h.occurredOn}-${i}`} className="flex items-center gap-2 px-2.5 py-1.5">
                    <span className="w-20 shrink-0 font-mono text-[10px] tabular-nums text-white/35">{h.occurredOn}</span>
                    <span className="min-w-0 flex-1 truncate text-[11px] text-white/70">{h.detail}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-white/60">
                      {Number(h.hours).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
      <Modal open={letterOpen} onClose={() => letterStatus !== "busy" && setLetterOpen(false)} title={`Service letter · ${member.name}`}>
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-white/55">Generate a one-page verification letter from the certified-hours journal. The letter includes the work performed and a department breakdown.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="From"><Input type="date" value={letterFrom} onChange={(e) => setLetterFrom(e.target.value)} /></Field>
            <Field label="Through"><Input type="date" value={letterTo} onChange={(e) => setLetterTo(e.target.value)} /></Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="secondary" size="sm" onClick={() => { setLetterFrom(`${year}-01-01`); setLetterTo(`${year}-06-30`); }}>Jan–Jun</Btn>
            <Btn variant="secondary" size="sm" onClick={() => { setLetterFrom(`${year}-07-01`); setLetterTo(`${year}-12-31`); }}>Jul–Dec</Btn>
          </div>
          {letterStatus === "error" && <p role="alert" className="text-xs text-red-400">The letter could not be generated. Check the date range and try again.</p>}
          <div className="flex gap-2"><Btn variant="primary" onClick={() => void generateLetter()} disabled={letterStatus === "busy" || !letterFrom || !letterTo || letterFrom > letterTo}>{letterStatus === "busy" ? "Generating…" : "Open service letter"}</Btn><Btn variant="ghost" onClick={() => setLetterOpen(false)} disabled={letterStatus === "busy"}>Cancel</Btn></div>
        </div>
      </Modal>
    </>
  );
}
