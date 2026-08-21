"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Btn } from "@/components/members/ui";
import {
  updateBusiness, TECH_STATUSES, TECH_PRIORITIES,
  type Business, type TeamMember, type TechStatus, type TechPriority,
} from "@/lib/members/storage";
import { formatPhone } from "@/lib/format";
import { isInactiveMember } from "@/lib/members/roles";

// Everything about one project, beside the list rather than over it — a modal
// would hide the row you clicked and the ones around it.
export default function ProjectPanel({
  business, team, canEdit, blocked, onClose, onStatus,
}: {
  business: Business;
  team: TeamMember[];
  canEdit: boolean;
  blocked: string | null;
  onClose: () => void;
  onStatus: (status: TechStatus) => void;
}) {
  const [draft, setDraft] = useState(business);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [memberQuery, setMemberQuery] = useState("");

  useEffect(() => { setDraft(business); setSaved(false); }, [business]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const assignees = useMemo(() => draft.assignees ?? [], [draft.assignees]);

  const techTeam = useMemo(() => {
    const active = team.filter((t) => !isInactiveMember(t.status));
    const q = memberQuery.trim().toLowerCase();
    const pool = q ? active.filter((t) => t.name.toLowerCase().includes(q)) : active;
    return [...pool].sort((a, b) => {
      const aOn = assignees.includes(a.id), bOn = assignees.includes(b.id);
      if (aOn !== bOn) return aOn ? -1 : 1;
      const aTech = (a.divisions ?? []).includes("Tech"), bTech = (b.divisions ?? []).includes("Tech");
      if (aTech !== bTech) return aTech ? -1 : 1;
      return a.name.localeCompare(b.name);
    }).slice(0, q ? 40 : 60);
  }, [team, assignees, memberQuery]);

  const dirty = useMemo(() => {
    const keys: (keyof Business)[] = [
      "notes", "clientUrl", "previewUrl", "liveUrl", "assignees", "techPriority",
      "hoursLogged", "ownerName", "ownerEmail", "phone", "address", "neighborhood", "targetDate",
    ];
    return keys.some((k) => JSON.stringify(draft[k] ?? "") !== JSON.stringify(business[k] ?? ""));
  }, [draft, business]);

  const save = async () => {
    setSaving(true);
    try {
      await updateBusiness(business.id, {
        notes: draft.notes,
        clientUrl: draft.clientUrl ?? "",
        previewUrl: draft.previewUrl ?? "",
        liveUrl: draft.liveUrl ?? "",
        assignees: draft.assignees ?? [],
        techPriority: draft.techPriority,
        hoursLogged: Number(draft.hoursLogged ?? 0),
        ownerName: draft.ownerName,
        ownerEmail: draft.ownerEmail,
        phone: draft.phone,
        address: draft.address,
        neighborhood: draft.neighborhood,
        targetDate: draft.targetDate || undefined,
        lastTouchedAt: new Date().toISOString(),
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  const toggleAssignee = (id: string) => {
    setDraft((d) => {
      const cur = d.assignees ?? [];
      return { ...d, assignees: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id] };
    });
  };

  const field = "w-full rounded-md border border-white/10 bg-[#0F1014] px-2.5 py-1.5 text-[12px] text-white/90 placeholder:text-white/25 focus:border-[#F3E28D]/40 focus:outline-none";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:bg-black/25"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={`${business.name} details`}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col border-l border-white/10 bg-[#13161D] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-white">{business.name}</h2>
            <p className="mt-0.5 text-[11px] text-white/35">
              {business.neighborhood || "No neighborhood"}
              {business.hoursLogged ? ` · ${business.hoursLogged}h logged` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Status */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {TECH_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={!canEdit}
                  onClick={() => onStatus(s)}
                  className={`rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-50 ${
                    (business.techStatus ?? "Backlog") === s
                      ? "border-[#F3E28D]/45 bg-[#F3E28D]/15 text-[#F3E28D]"
                      : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/85"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            {blocked && (
              <p role="alert" className="mt-2 rounded-md border border-yellow-400/25 bg-yellow-400/10 px-2.5 py-1.5 text-[11px] text-yellow-200">
                {blocked}
              </p>
            )}
            {business.techStatus === "Backlog" && (
              <div className="mt-2 flex items-center gap-1.5">
                <span className="text-[10px] uppercase tracking-wide text-white/35">Priority</span>
                {TECH_PRIORITIES.map((p) => (
                  <button
                    key={p}
                    disabled={!canEdit}
                    onClick={() => setDraft((d) => ({ ...d, techPriority: p as TechPriority }))}
                    className={`rounded px-1.5 py-0.5 text-[10px] transition-colors disabled:opacity-50 ${
                      (draft.techPriority ?? "Medium") === p
                        ? "bg-white/15 text-white"
                        : "text-white/40 hover:text-white/70"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div className="mb-5 space-y-2.5">
            <p className="text-[10px] uppercase tracking-wide text-white/40">Links</p>
            {([
              ["liveUrl", "Live domain", "The launched site on its own domain"],
              ["previewUrl", "Preview", "The Vercel deploy"],
              ["clientUrl", "Client's own site", "What they had before Novus"],
            ] as const).map(([key, label, hint]) => (
              <div key={key}>
                <div className="mb-1 flex items-center justify-between">
                  <label htmlFor={`${key}-${business.id}`} className="text-[11px] text-white/60">{label}</label>
                  {draft[key] && (
                    <a href={draft[key] as string} target="_blank" rel="noopener noreferrer"
                       className="text-[10px] text-[#F3E28D]/80 hover:underline">open ↗</a>
                  )}
                </div>
                <input
                  id={`${key}-${business.id}`}
                  className={field}
                  placeholder={hint}
                  disabled={!canEdit}
                  value={(draft[key] as string) ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>

          {/* Who's working on it */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wide text-white/40">
                Who&apos;s working on it
                {assignees.length > 0 && <span className="ml-1.5 text-white/25">{assignees.length}</span>}
              </p>
            </div>
            <input
              className={`${field} mb-2`}
              placeholder="Filter people…"
              value={memberQuery}
              onChange={(e) => setMemberQuery(e.target.value)}
            />
            <div className="max-h-52 overflow-y-auto rounded-md border border-white/10 bg-[#0F1014]">
              {techTeam.map((t) => {
                const on = assignees.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className="flex cursor-pointer items-center gap-2 border-b border-white/5 px-2.5 py-1.5 last:border-b-0 hover:bg-white/[0.04]"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      disabled={!canEdit}
                      onChange={() => toggleAssignee(t.id)}
                      className="h-3.5 w-3.5 accent-[#F3E28D]"
                    />
                    <span className={`text-[12px] ${on ? "text-white" : "text-white/60"}`}>{t.name}</span>
                    {(t.divisions ?? []).includes("Tech") && (
                      <span className="ml-auto text-[9px] uppercase tracking-wide text-white/25">Tech</span>
                    )}
                  </label>
                );
              })}
              {techTeam.length === 0 && (
                <p className="px-2.5 py-3 text-[11px] text-white/30">No one matches.</p>
              )}
            </div>
          </div>

          {/* Hours — optional by design; tech is judged on shipped sites */}
          <div className="mb-5 flex items-end gap-3">
            <div className="w-28">
              <label htmlFor={`hours-${business.id}`} className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
                Hours logged
              </label>
              <input
                id={`hours-${business.id}`}
                type="number" min="0" step="0.5"
                className={field}
                disabled={!canEdit}
                value={draft.hoursLogged ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, hoursLogged: Number(e.target.value) }))}
              />
            </div>
            <div className="flex-1">
              <label htmlFor={`target-${business.id}`} className="mb-1 block text-[10px] uppercase tracking-wide text-white/40">
                Target date
              </label>
              <input
                id={`target-${business.id}`}
                type="date"
                className={field}
                disabled={!canEdit}
                value={draft.targetDate ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, targetDate: e.target.value }))}
              />
            </div>
          </div>
          <p className="-mt-4 mb-5 text-[10px] leading-relaxed text-white/25">
            Hours are optional for tech and split evenly across everyone assigned.
          </p>

          {/* Notes */}
          <div className="mb-5">
            <label htmlFor={`notes-${business.id}`} className="mb-1.5 block text-[10px] uppercase tracking-wide text-white/40">
              Notes
            </label>
            <textarea
              id={`notes-${business.id}`}
              rows={5}
              className={`${field} resize-y leading-relaxed`}
              placeholder="Anything worth remembering — what's blocked, what the client asked for, whether to send it out."
              disabled={!canEdit}
              value={draft.notes ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            />
          </div>

          {/* Contact */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Contact</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                ["ownerName", "Owner", "text"],
                ["ownerEmail", "Email", "email"],
                ["phone", "Phone", "tel"],
                ["neighborhood", "Neighborhood", "text"],
              ] as const).map(([key, label, type]) => (
                <div key={key}>
                  <label htmlFor={`${key}-${business.id}`} className="mb-1 block text-[10px] text-white/45">{label}</label>
                  <input
                    id={`${key}-${business.id}`}
                    type={type}
                    className={field}
                    disabled={!canEdit}
                    value={(draft[key] as string) ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2">
              <label htmlFor={`address-${business.id}`} className="mb-1 block text-[10px] text-white/45">Address</label>
              <input
                id={`address-${business.id}`}
                className={field}
                disabled={!canEdit}
                value={draft.address ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              />
            </div>
            {(business.ownerEmail || business.phone) && (
              <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
                {business.ownerEmail && (
                  <a href={`mailto:${business.ownerEmail}`} className="text-[#F3E28D]/80 hover:underline">
                    {business.ownerEmail}
                  </a>
                )}
                {business.phone && <span className="text-white/45">{formatPhone(business.phone)}</span>}
              </div>
            )}
          </div>

          {business.showcaseEnabled && (
            <p className="mb-4 flex items-center gap-2 text-[11px] text-white/45">
              <Badge label="Live" /> On the public showcase
              {business.showcaseFeaturedOnHome ? " · featured on the home page" : ""}
            </p>
          )}
        </div>

        {canEdit && (
          <footer className="flex items-center gap-2 border-t border-white/10 px-5 py-3">
            <Btn variant="primary" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Btn>
            {dirty && !saving && <span className="text-[11px] text-white/35">Unsaved changes</span>}
            {saved && <span className="text-[11px] text-green-400">Saved</span>}
          </footer>
        )}
      </aside>
    </>
  );
}
