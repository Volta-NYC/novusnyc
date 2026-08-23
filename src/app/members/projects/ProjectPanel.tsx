"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge, Btn, useDialogBehavior } from "@/components/members/ui";
import {
  updateBusiness, subscribeChapters, notifyProjectAssigned, getSiteSettings, revalidatePublicPages, TECH_STATUSES, TECH_PRIORITIES,
  type Business, type TeamMember, type TechStatus, type TechPriority, type Chapter,
} from "@/lib/members/storage";
import { formatPhone } from "@/lib/format";
import { isInactiveMember } from "@/lib/members/roles";

// Everything about one project, beside the list rather than over it — a modal
// would hide the row you clicked and the ones around it.
export default function ProjectPanel({
  business, team, canEdit, canPublish, blocked, onClose, onStatus,
}: {
  business: Business;
  team: TeamMember[];
  canEdit: boolean;
  canPublish: boolean;
  blocked: string | null;
  onClose: () => void;
  onStatus: (status: TechStatus) => void;
}) {
  const [draft, setDraft] = useState(business);
  const [baseline, setBaseline] = useState(business);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [tab, setTab] = useState<"website" | "public">("website");
  const [serviceOptions, setServiceOptions] = useState<string[]>(["Website", "SEO", "Social Media", "Graphic Design", "Grants"]);

  useEffect(() => subscribeChapters(setChapters), []);
  useEffect(() => { void getSiteSettings().then((settings) => setServiceOptions(settings.services)); }, []);

  useEffect(() => {
    setDraft(business);
    setBaseline(business);
    setSaved(false);
    setSaveError("");
    setTab("website");
  }, [business]);

  const panelRef = useRef<HTMLElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const assignees = useMemo(() => draft.assignees ?? [], [draft.assignees]);
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.sortOrder - b.sortOrder),
    [chapters],
  );

  // Who is on this project is what the panel is for, so they are always
  // listed. The rest of the directory only appears once you search for it —
  // dumping sixty names to pick one or two is scrolling, not choosing.
  const techTeam = useMemo(() => {
    const active = team.filter((t) => !isInactiveMember(t.status));
    const q = memberQuery.trim().toLowerCase();
    const on = active.filter((t) => assignees.includes(t.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    if (!q) return on;
    const off = active
      .filter((t) => !assignees.includes(t.id))
      .filter((t) => t.name.toLowerCase().includes(q) || (t.email ?? "").toLowerCase().includes(q))
      .sort((a, b) => {
        const aTech = (a.divisions ?? []).includes("Tech"), bTech = (b.divisions ?? []).includes("Tech");
        if (aTech !== bTech) return aTech ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 25);
    return [...on, ...off];
  }, [team, assignees, memberQuery]);

  const dirty = useMemo(() => {
    const keys: (keyof Business)[] = [
      "notes", "clientUrl", "previewUrl", "liveUrl", "assignees", "techPriority",
      "ownerName", "ownerEmail", "phone", "address", "neighborhood", "chapterId",
      "showcaseEnabled", "showcaseFeaturedOnHome", "showcaseDescription", "activeServices",
      "showcaseColor", "showcaseImageData", "showcaseImageUrl",
    ];
    return keys.some((k) => JSON.stringify(draft[k] ?? "") !== JSON.stringify(baseline[k] ?? ""));
  }, [draft, baseline]);
  const publicDirty = useMemo(() => {
    const keys: (keyof Business)[] = [
      "showcaseEnabled", "showcaseFeaturedOnHome", "showcaseDescription", "activeServices",
      "showcaseColor", "showcaseImageData", "showcaseImageUrl",
    ];
    return keys.some((key) => JSON.stringify(draft[key] ?? "") !== JSON.stringify(baseline[key] ?? ""));
  }, [draft, baseline]);

  const requestClose = useCallback(() => {
    if (dirty && !window.confirm("Discard the unsaved changes to this project?")) return;
    onClose();
  }, [dirty, onClose]);
  useDialogBehavior(true, requestClose, panelRef);

  const save = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await updateBusiness(business.id, {
        notes: draft.notes,
        clientUrl: draft.clientUrl ?? "",
        previewUrl: draft.previewUrl ?? "",
        liveUrl: draft.liveUrl ?? "",
        assignees: draft.assignees ?? [],
        techPriority: draft.techPriority,
        ownerName: draft.ownerName,
        ownerEmail: draft.ownerEmail,
        phone: draft.phone,
        address: draft.address,
        neighborhood: draft.neighborhood,
        chapterId: draft.chapterId,
        ...(canPublish ? {
          showcaseEnabled: !!draft.showcaseEnabled,
          showcaseFeaturedOnHome: !!draft.showcaseEnabled && !!draft.showcaseFeaturedOnHome,
          showcaseDescription: draft.showcaseDescription ?? "",
          activeServices: draft.activeServices ?? [],
          showcaseColor: draft.showcaseColor ?? "blue-mid",
          showcaseSortIndex: draft.showcaseEnabled ? (draft.showcaseSortIndex ?? Date.now()) : draft.showcaseSortIndex,
          homeSortIndex: draft.showcaseFeaturedOnHome ? (draft.homeSortIndex ?? Date.now()) : draft.homeSortIndex,
          showcaseImageData: draft.showcaseImageData,
          showcaseImageUrl: draft.showcaseImageUrl,
        } : {}),
        lastTouchedAt: new Date().toISOString(),
      });
      // Only the people newly added hear about it; the ones already on the
      // project don't need telling again every time the notes change.
      const added = (draft.assignees ?? []).filter((id) => !(business.assignees ?? []).includes(id));
      if (added.length > 0) void notifyProjectAssigned({ ...business, ...draft }, added);
      const publicRefreshed = !publicDirty || await revalidatePublicPages();
      setBaseline(draft);
      setSaved(true);
      if (!publicRefreshed) setSaveError("Saved, but the public pages could not be refreshed. Try again shortly.");
      window.setTimeout(() => setSaved(false), 1800);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Project changes were not saved.");
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

  const colors: Array<{ value: NonNullable<Business["showcaseColor"]>; swatch: string; label: string }> = [
    { value: "blue-soft", swatch: "#DDD6FE", label: "Lavender" },
    { value: "blue-mid", swatch: "#C4B5FD", label: "Violet" },
    { value: "blue-deep", swatch: "#A78BFA", label: "Deep violet" },
    { value: "lime-soft", swatch: "#FED7AA", label: "Soft orange" },
    { value: "lime-mid", swatch: "#FDBA74", label: "Orange" },
    { value: "lime-deep", swatch: "#FB923C", label: "Deep orange" },
    { value: "amber-soft", swatch: "#FDE68A", label: "Soft yellow" },
    { value: "amber-mid", swatch: "#FCD34D", label: "Yellow" },
    { value: "amber-deep", swatch: "#FBBF24", label: "Amber" },
    { value: "pink-soft", swatch: "#F5D0FE", label: "Soft pink" },
    { value: "pink-mid", swatch: "#F0ABFC", label: "Pink" },
    { value: "pink-deep", swatch: "#E879F9", label: "Deep pink" },
    { value: "purple-mid", swatch: "#D8B4FE", label: "Purple" },
    { value: "red-soft", swatch: "#FECDD3", label: "Soft coral" },
    { value: "red-mid", swatch: "#FDA4AF", label: "Coral" },
    { value: "red-deep", swatch: "#FB7185", label: "Deep coral" },
  ];
  const selectedSwatch = colors.find((color) => color.value === (draft.showcaseColor ?? "blue-mid"))?.swatch ?? "#C4B5FD";

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/50 lg:bg-black/25"
        onClick={requestClose}
        aria-hidden="true"
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-label={`${business.name} details`}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-[480px] flex-col border-l border-white/10 bg-[#13161D] shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-white">{business.name}</h2>
            <p className="mt-0.5 text-[11px] text-white/35">
              {business.neighborhood || "No neighborhood"}
            </p>
          </div>
          <button
            onClick={requestClose}
            aria-label="Close"
            className="rounded-md px-2 py-1 text-white/40 transition-colors hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </header>

        {canPublish && (
          <div className="flex border-b border-white/10 bg-black/10 px-5 pt-3">
            {(["website", "public"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`border-b-2 px-3 pb-2 text-xs font-medium transition-colors ${tab === key
                  ? "border-[#F6B78D] text-[#F6B78D]"
                  : "border-transparent text-white/40 hover:text-white/75"}`}
              >
                {key === "website" ? "Website" : "Public card"}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "website" ? (
            <>
          {/* Status */}
          <div className="mb-5">
            <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Status</p>
            <div className="flex flex-wrap gap-1.5">
              {TECH_STATUSES.map((s) => (
                <button
                  key={s}
                  disabled={!canEdit}
                  onClick={() => onStatus(s)}
                  aria-pressed={(business.techStatus ?? "Backlog") === s}
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
                    aria-pressed={(draft.techPriority ?? "Medium") === p}
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

          {/* Chapter — the market this client belongs to */}
          {chapters.length > 1 && (
            <div className="mb-5">
              <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Market</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedChapters.map((c) => (
                  <button
                    key={c.id}
                    disabled={!canEdit}
                    onClick={() => setDraft((d) => ({ ...d, chapterId: c.id }))}
                    aria-pressed={(draft.chapterId ?? sortedChapters[0]?.id) === c.id}
                    className={`rounded-md border px-2 py-1 text-[11px] transition-colors disabled:opacity-50 ${
                      (draft.chapterId ?? sortedChapters[0]?.id) === c.id
                        ? "border-[#F3E28D]/45 bg-[#F3E28D]/15 text-[#F3E28D]"
                        : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/85"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

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
                <p className="px-2.5 py-3 text-[11px] text-white/30">
                  {memberQuery.trim()
                    ? `No active member matches “${memberQuery.trim()}”.`
                    : "Nobody assigned yet — search above to add someone."}
                </p>
              )}
            </div>
          </div>

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

          {business.showcaseEnabled && canPublish && (
            <button type="button" onClick={() => setTab("public")} className="mb-4 flex items-center gap-2 text-[11px] text-white/45 hover:text-white/75">
              <Badge label="Public" /> On the public showcase
              {business.showcaseFeaturedOnHome ? " · featured on the home page" : ""} →
            </button>
          )}
            </>
          ) : (
            <div>
              <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.025] p-3">
                <p className="text-xs font-medium text-white/85">Public placement</p>
                <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                  Name, neighborhood, contact and website links stay in the Website tab. This tab only controls public presentation.
                </p>
                <label className="mt-3 flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2.5">
                  <span>
                    <span className="block text-xs font-medium text-white/80">Show on the public Showcase</span>
                    <span className="block text-[10px] text-white/35">Publishes this business as a project card.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!draft.showcaseEnabled}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      showcaseEnabled: event.target.checked,
                      showcaseFeaturedOnHome: event.target.checked ? current.showcaseFeaturedOnHome : false,
                    }))}
                    className="members-checkbox"
                  />
                </label>
                <label className={`mt-2 flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2.5 ${draft.showcaseEnabled ? "cursor-pointer" : "opacity-45"}`}>
                  <span>
                    <span className="block text-xs font-medium text-white/80">Feature on the home page</span>
                    <span className="block text-[10px] text-white/35">Uses the same card with a separate home-page order.</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!draft.showcaseFeaturedOnHome}
                    disabled={!draft.showcaseEnabled}
                    onChange={(event) => setDraft((current) => ({ ...current, showcaseFeaturedOnHome: event.target.checked }))}
                    className="members-checkbox"
                  />
                </label>
              </div>

              <div className={`space-y-5 ${draft.showcaseEnabled ? "" : "pointer-events-none opacity-40"}`} aria-disabled={!draft.showcaseEnabled}>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#FDFBF8] text-[#2D2830] shadow-lg">
                  <div className="h-2" style={{ backgroundColor: selectedSwatch }} />
                  {(draft.showcaseImageData || draft.showcaseImageUrl) && (
                    <div className="mx-4 mt-4 aspect-[16/9] overflow-hidden rounded-xl bg-black/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.showcaseImageData || draft.showcaseImageUrl || ""} alt="" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {(draft.activeServices ?? []).slice(0, 3).map((service) => (
                        <span key={service} className="rounded-full border border-[#73516E]/20 bg-[#73516E]/8 px-2 py-0.5 text-[10px] font-medium">{service}</span>
                      ))}
                      <span className="ml-auto rounded-full bg-[#F6B78D]/30 px-2 py-0.5 text-[10px] font-medium">{draft.techStatus === "Live" ? "Completed" : "Ongoing"}</span>
                    </div>
                    <p className="text-lg font-bold leading-tight">{draft.name}</p>
                    {draft.showcaseDescription && <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#6B646D]">{draft.showcaseDescription}</p>}
                    <p className="mt-3 text-[10px] text-[#817982]">⌖ {draft.neighborhood || "Neighborhood not set"}</p>
                  </div>
                </div>

                <div>
                  <label htmlFor={`public-description-${business.id}`} className="mb-1.5 block text-[10px] uppercase tracking-wide text-white/40">Card description</label>
                  <textarea
                    id={`public-description-${business.id}`}
                    rows={4}
                    className={`${field} resize-y leading-relaxed`}
                    value={draft.showcaseDescription ?? ""}
                    onChange={(event) => setDraft((current) => ({ ...current, showcaseDescription: event.target.value }))}
                    placeholder="A short public description of the work and its outcome."
                  />
                </div>

                <fieldset>
                  <legend className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Services</legend>
                  <div className="flex flex-wrap gap-2">
                    {serviceOptions.map((service) => {
                      const checked = (draft.activeServices ?? []).includes(service);
                      return (
                        <label key={service} className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] transition-colors ${checked
                          ? "border-[#F3E28D]/50 bg-[#F3E28D]/15 text-[#F3E28D]"
                          : "border-white/10 bg-white/[0.03] text-white/45 hover:border-white/25"}`}>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => setDraft((current) => ({
                              ...current,
                              activeServices: checked
                                ? (current.activeServices ?? []).filter((item) => item !== service)
                                : [...(current.activeServices ?? []), service],
                            }))}
                          />
                          {service}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Card color</legend>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        aria-label={color.label}
                        aria-pressed={(draft.showcaseColor ?? "blue-mid") === color.value}
                        title={color.label}
                        onClick={() => setDraft((current) => ({ ...current, showcaseColor: color.value }))}
                        className={`h-8 w-8 rounded-full border-2 transition-transform ${(draft.showcaseColor ?? "blue-mid") === color.value
                          ? "scale-110 border-white"
                          : "border-white/15 hover:scale-105 hover:border-white/45"}`}
                        style={{ backgroundColor: color.swatch }}
                      />
                    ))}
                  </div>
                </fieldset>

                <div>
                  <p className="mb-2 text-[10px] uppercase tracking-wide text-white/40">Card photo</p>
                  {(draft.showcaseImageData || draft.showcaseImageUrl) && (
                    <div className="mb-2 aspect-[16/9] overflow-hidden rounded-xl border border-white/10 bg-white/5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={draft.showcaseImageData || draft.showcaseImageUrl || ""} alt="Public card preview" className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Btn variant="secondary" size="sm" onClick={() => imageInputRef.current?.click()}>
                      {draft.showcaseImageData || draft.showcaseImageUrl ? "Change photo" : "Upload photo"}
                    </Btn>
                    {(draft.showcaseImageData || draft.showcaseImageUrl) && (
                      <Btn variant="ghost" size="sm" onClick={() => setDraft((current) => ({ ...current, showcaseImageData: "", showcaseImageUrl: "" }))}>Remove</Btn>
                    )}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (loadEvent) => setDraft((current) => ({ ...current, showcaseImageData: loadEvent.target?.result as string }));
                        reader.readAsDataURL(file);
                        event.target.value = "";
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] text-white/30">Stored in Supabase Storage. A 16:9 image works best.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {canEdit && (
          <footer className="flex items-center gap-2 border-t border-white/10 px-5 py-3">
            <Btn variant="primary" onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save"}
            </Btn>
            {dirty && !saving && <span className="text-[11px] text-white/35">Unsaved changes</span>}
            {saved && <span className="text-[11px] text-green-400">Saved</span>}
            {saveError && <span role="alert" className="text-[11px] text-red-400">{saveError}</span>}
          </footer>
        )}
      </aside>
    </>
  );
}
