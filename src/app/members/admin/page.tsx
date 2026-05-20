"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { Btn, Field, Input, Spinner, Toggle } from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import { useAuth } from "@/lib/members/authContext";
import { useRouter, usePathname } from "next/navigation";
import {
  getHandbookPage, upsertHandbookPage, type HandbookPage,
  getSiteSettings, updateSiteSettings, type SiteSettings,
  subscribeInfractions, createInfraction, updateInfraction, deleteInfraction,
  type Infraction,
} from "@/lib/members/storage";
import { useConfirm, Modal, TextArea } from "@/components/members/ui";

const EXPORT_OPTIONS = [
  { key: "team",                label: "Team Members" },
  { key: "userProfiles",        label: "User Profiles" },
  { key: "businesses",          label: "Businesses" },
  { key: "assignments",         label: "Assignments" },
  { key: "assignmentCatalog",   label: "Assignment Catalog" },
  { key: "assignmentClaims",    label: "Assignment Claims" },
  { key: "applicants",          label: "Applicants" },
  { key: "bids",                label: "BID Directory" },
  { key: "cycles",              label: "Cycles" },
  { key: "creditAdjustments",   label: "Credit Adjustments" },
  { key: "emailTemplates",      label: "Email Templates" },
  { key: "calendarEvents",      label: "Calendar Events" },
  { key: "auditLogs",           label: "Audit Logs" },
] as const;

type ExportOptionKey = (typeof EXPORT_OPTIONS)[number]["key"];
type AdminTab = "data" | "applications" | "services" | "banners" | "infractions" | "handbook" | "emails";

const ADMIN_TAB_HREFS: Record<AdminTab, string> = {
  data:         "/members/admin",
  applications: "/members/admin/applications",
  services:     "/members/admin/services",
  banners:      "/members/admin/banners",
  infractions:  "/members/admin/infractions",
  handbook:     "/members/admin/handbook",
  emails:       "/members/admin/emails",
};

function getAdminTab(pathname: string): AdminTab {
  if (pathname.startsWith("/members/admin/applications")) return "applications";
  if (pathname.startsWith("/members/admin/services"))     return "services";
  if (pathname.startsWith("/members/admin/banners"))      return "banners";
  if (pathname.startsWith("/members/admin/infractions"))  return "infractions";
  if (pathname.startsWith("/members/admin/handbook"))     return "handbook";
  if (pathname.startsWith("/members/admin/emails"))       return "emails";
  return "data";
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
      <h2 className="font-display font-bold text-white mb-1">{title}</h2>
      {subtitle && <p className="text-white/40 text-sm mb-4">{subtitle}</p>}
      {children}
    </div>
  );
}

function SaveBtn({ saving, onClick, label = "Save" }: { saving: boolean; onClick: () => void; label?: string }) {
  return (
    <Btn variant="primary" onClick={onClick} disabled={saving}>
      {saving ? "Saving…" : label}
    </Btn>
  );
}

function StatusMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="mt-3 bg-white/5 border border-white/8 rounded-lg px-4 py-2.5 text-white/60 text-sm font-body">{msg}</div>;
}

const BANNER_PRESET_COLORS = [
  { bg: "#0D0D0D", text: "#85CC17", label: "Black + green" },
  { bg: "#85CC17", text: "#0D0D0D", label: "Volta green" },
  { bg: "#1e40af", text: "#ffffff", label: "Blue" },
  { bg: "#7f1d1d", text: "#fee2e2", label: "Red" },
];

// ── TAB: DATA ─────────────────────────────────────────────────────────────────

function DataTab() {
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedSections, setSelectedSections] = useState<ExportOptionKey[]>([]);
  const [revalidating, setRevalidating] = useState(false);
  const { user } = useAuth();

  const handleRevalidate = async () => {
    if (!user) return;
    setRevalidating(true);
    setStatusMessage("");
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/admin/revalidate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("revalidate_failed");
      setStatusMessage("Public pages refreshed successfully.");
    } catch {
      setStatusMessage("Revalidation failed. Check admin access and try again.");
    } finally {
      setRevalidating(false);
    }
  };

  const toggleSection = (key: ExportOptionKey) => {
    setSelectedSections((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key],
    );
  };

  const handleExport = async (sections?: ExportOptionKey[]) => {
    if (!user) { setStatusMessage("You must be signed in as admin to export."); return; }
    setStatusMessage("Exporting…");
    try {
      const token = await getAuthToken();
      const query = sections && sections.length > 0 ? `?sections=${encodeURIComponent(sections.join(","))}` : "";
      const res = await fetch(`/api/members/admin/export${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) throw new Error("export_failed");
      const data = await res.json() as Record<string, unknown>;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const date = new Date().toISOString().split("T")[0];
      link.download = `volta-data-${date}${sections && sections.length > 0 ? `-${sections.join("-")}` : "-full"}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage(sections && sections.length > 0
        ? `Export complete (${sections.length} section${sections.length === 1 ? "" : "s"}).`
        : "Export complete (full backup).");
    } catch {
      setStatusMessage("Export failed. Check admin access and try again.");
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <Card title="Public Stats" subtitle="Refresh the cached data shown on the public showcase, home, and about pages.">
        <Btn variant="primary" onClick={() => void handleRevalidate()} disabled={revalidating}>
          {revalidating ? "Refreshing…" : "Update All Stats"}
        </Btn>
      </Card>

      <Card title="Export Data" subtitle="Download a full JSON backup, or export selected datasets only.">
        <Btn variant="primary" onClick={() => void handleExport()} className="mb-4">
          Download Full Backup
        </Btn>

        <div className="border border-white/10 rounded-lg p-3 bg-[#0F1014]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide text-white/45">Select Sections</p>
            <div className="flex gap-3 text-[11px]">
              <button type="button" className="text-[#85CC17]/80 hover:text-[#85CC17] transition-colors"
                onClick={() => setSelectedSections(EXPORT_OPTIONS.map((o) => o.key))}>Select all</button>
              <button type="button" className="text-red-300/80 hover:text-red-300 transition-colors"
                onClick={() => setSelectedSections([])}>Clear</button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPORT_OPTIONS.map((option) => (
              <label key={option.key} className="inline-flex items-center gap-2 text-xs text-white/80">
                <input type="checkbox" className="members-checkbox"
                  checked={selectedSections.includes(option.key)} onChange={() => toggleSection(option.key)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/45">{selectedSections.length} selected</span>
            <Btn
              variant="primary"
              size="sm"
              onClick={() => void handleExport(selectedSections)}
              disabled={selectedSections.length === 0}
            >
              Download Selected
            </Btn>
          </div>
        </div>
      </Card>
      <StatusMsg msg={statusMessage} />
    </div>
  );
}

// ── TAB: APPLICATIONS ─────────────────────────────────────────────────────────

function ApplicationsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    getSiteSettings().then((s) => {
      setPaused(s.applicationsPaused);
      setMessage(s.applicationsPausedMsg);
      setLoading(false);
    });
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus("");
    try {
      await updateSiteSettings({ applicationsPaused: paused, applicationsPausedMsg: message });
      setStatus("Saved.");
    } catch {
      setStatus("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center h-24"><Spinner size="sm" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <Card title="Application Status" subtitle="Control whether the public /apply page accepts new submissions.">
        <div className="space-y-5">
          <Toggle
            checked={!paused}
            onChange={(open) => setPaused(!open)}
            label={!paused ? "Applications are open" : "Applications are closed"}
          />
          {paused && (
            <Field label="Paused message shown to applicants">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Applications are currently paused. Check back soon."
              />
            </Field>
          )}
          <div className="pt-1">
            <SaveBtn saving={saving} onClick={() => void save()} />
          </div>
        </div>
        <StatusMsg msg={status} />
      </Card>
    </div>
  );
}

// ── TAB: SERVICES ─────────────────────────────────────────────────────────────

function ServicesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");

  useEffect(() => {
    getSiteSettings().then((s) => { setServices(s.services); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus("");
    try {
      await updateSiteSettings({ services: services.filter(Boolean) });
      setStatus("Saved.");
    } catch {
      setStatus("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const addService = () => {
    const trimmed = newService.trim();
    if (!trimmed || services.includes(trimmed)) return;
    setServices((prev) => [...prev, trimmed]);
    setNewService("");
  };

  const removeService = (i: number) => setServices((prev) => prev.filter((_, idx) => idx !== i));
  const renameService = (i: number, val: string) => setServices((prev) => prev.map((s, idx) => idx === i ? val : s));

  if (loading) return <div className="flex items-center h-24"><Spinner size="sm" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <Card title="Active Services" subtitle="These appear in the showcase filter, business edit form, and application form.">
        <div className="space-y-2 mb-4">
          {services.map((svc, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={svc}
                onChange={(e) => renameService(i, e.target.value)}
                className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-body focus:outline-none focus:border-[#85CC17]/50"
              />
              <button
                type="button"
                onClick={() => removeService(i)}
                className="text-white/30 hover:text-red-400 transition-colors text-xs px-1"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addService(); } }}
            placeholder="New service name…"
            className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-body focus:outline-none focus:border-[#85CC17]/50"
          />
          <button
            type="button"
            onClick={addService}
            disabled={!newService.trim()}
            className="px-3 py-1.5 rounded-lg bg-white/8 text-white/70 hover:bg-white/12 text-sm disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </div>

        <SaveBtn saving={saving} onClick={() => void save()} />
        <StatusMsg msg={status} />
      </Card>
    </div>
  );
}

// ── TAB: BANNERS ──────────────────────────────────────────────────────────────

function BannerEditor({
  title,
  subtitle,
  enabled,
  onToggle,
  message,
  onMessage,
  bg,
  onBg,
  text,
  onText,
  saving,
  onSave,
  status,
}: {
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  message: string;
  onMessage: (v: string) => void;
  bg: string;
  onBg: (v: string) => void;
  text: string;
  onText: (v: string) => void;
  saving: boolean;
  onSave: () => void;
  status: string;
}) {
  return (
    <Card title={title} subtitle={subtitle}>
      <div className="space-y-4">
        <Toggle checked={enabled} onChange={onToggle} label={enabled ? "Banner is on" : "Banner is off"} />

        {enabled && (
          <>
            <Field label="Message">
              <Input value={message} onChange={(e) => onMessage(e.target.value)} placeholder="Enter announcement text…" />
            </Field>

            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">Colors</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {BANNER_PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { onBg(preset.bg); onText(preset.text); }}
                    title={preset.label}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${bg === preset.bg ? "border-white scale-110" : "border-white/20 hover:border-white/50"}`}
                    style={{ backgroundColor: preset.bg }}
                  />
                ))}
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-white/60">
                  <input type="color" value={bg} onChange={(e) => onBg(e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer bg-transparent border-0" />
                  Background
                </label>
                <label className="flex items-center gap-2 text-xs text-white/60">
                  <input type="color" value={text} onChange={(e) => onText(e.target.value)}
                    className="w-8 h-6 rounded cursor-pointer bg-transparent border-0" />
                  Text
                </label>
              </div>
            </div>

            {message && (
              <div className="rounded-lg px-4 py-2.5 text-sm font-body font-semibold" style={{ backgroundColor: bg, color: text }}>
                {message}
              </div>
            )}
          </>
        )}

        <SaveBtn saving={saving} onClick={onSave} />
        <StatusMsg msg={status} />
      </div>
    </Card>
  );
}

function BannersTab() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [publicSaving, setPublicSaving] = useState(false);
  const [portalSaving, setPortalSaving] = useState(false);
  const [publicStatus, setPublicStatus] = useState("");
  const [portalStatus, setPortalStatus] = useState("");

  useEffect(() => {
    getSiteSettings().then((s) => { setSettings(s); setLoading(false); });
  }, []);

  if (loading || !settings) return <div className="flex items-center h-24"><Spinner size="sm" /></div>;

  const savePublic = async () => {
    setPublicSaving(true);
    setPublicStatus("");
    try {
      await updateSiteSettings({
        publicBannerEnabled: settings.publicBannerEnabled,
        publicBannerMessage: settings.publicBannerMessage,
        publicBannerBg: settings.publicBannerBg,
        publicBannerText: settings.publicBannerText,
      });
      setPublicStatus("Saved.");
    } catch { setPublicStatus("Save failed."); }
    finally { setPublicSaving(false); }
  };

  const savePortal = async () => {
    setPortalSaving(true);
    setPortalStatus("");
    try {
      await updateSiteSettings({
        portalBannerEnabled: settings.portalBannerEnabled,
        portalBannerMessage: settings.portalBannerMessage,
        portalBannerBg: settings.portalBannerBg,
        portalBannerText: settings.portalBannerText,
      });
      setPortalStatus("Saved.");
    } catch { setPortalStatus("Save failed."); }
    finally { setPortalSaving(false); }
  };

  return (
    <div className="max-w-lg space-y-4">
      <BannerEditor
        title="Public Site Banner"
        subtitle="Appears above the navbar on the public-facing website (voltanyc.org)."
        enabled={settings.publicBannerEnabled}
        onToggle={(v) => setSettings((s) => s ? { ...s, publicBannerEnabled: v } : s)}
        message={settings.publicBannerMessage}
        onMessage={(v) => setSettings((s) => s ? { ...s, publicBannerMessage: v } : s)}
        bg={settings.publicBannerBg}
        onBg={(v) => setSettings((s) => s ? { ...s, publicBannerBg: v } : s)}
        text={settings.publicBannerText}
        onText={(v) => setSettings((s) => s ? { ...s, publicBannerText: v } : s)}
        saving={publicSaving}
        onSave={() => void savePublic()}
        status={publicStatus}
      />
      <BannerEditor
        title="Members Portal Banner"
        subtitle="Appears at the top of the sidebar in the members portal."
        enabled={settings.portalBannerEnabled}
        onToggle={(v) => setSettings((s) => s ? { ...s, portalBannerEnabled: v } : s)}
        message={settings.portalBannerMessage}
        onMessage={(v) => setSettings((s) => s ? { ...s, portalBannerMessage: v } : s)}
        bg={settings.portalBannerBg}
        onBg={(v) => setSettings((s) => s ? { ...s, portalBannerBg: v } : s)}
        text={settings.portalBannerText}
        onText={(v) => setSettings((s) => s ? { ...s, portalBannerText: v } : s)}
        saving={portalSaving}
        onSave={() => void savePortal()}
        status={portalStatus}
      />
    </div>
  );
}

// ── TAB: ROLES ────────────────────────────────────────────────────────────────

// ── TAB: INFRACTIONS ──────────────────────────────────────────────────────────

const POINT_OPTIONS = [
  { value: 1, label: "1 — minor" },
  { value: 2, label: "2 — major" },
  { value: 3, label: "3 — severe" },
];
const POINTS_PILL: Record<number, string> = {
  1: "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  2: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  3: "border-red-400/30 bg-red-400/10 text-red-300",
};
const BLANK_INFRACTION: Omit<Infraction, "id" | "createdAt" | "updatedAt"> = { name: "", description: "", points: 1 };

function InfractionsTab() {
  const { ask, Dialog } = useConfirm();
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Infraction | null>(null);
  const [form, setForm] = useState(BLANK_INFRACTION);

  useEffect(() => subscribeInfractions(setInfractions), []);

  const sorted = [...infractions].sort((a, b) => (a.points - b.points) || a.name.localeCompare(b.name));

  const openCreate = () => { setForm({ ...BLANK_INFRACTION }); setEditing(null); setModal("create"); };
  const openEdit = (i: Infraction) => { setForm({ name: i.name, description: i.description, points: i.points }); setEditing(i); setModal("edit"); };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return;
    const payload = { name, description: form.description.trim(), points: Math.max(1, Math.min(3, Math.round(form.points || 1))) };
    if (editing) await updateInfraction(editing.id, payload);
    else await createInfraction(payload);
    setModal(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    await ask(
      async () => { await deleteInfraction(editing.id); setModal(null); },
      `Delete "${editing.name}"? Strikes already issued under this name keep their record.`,
    );
  };

  return (
    <div className="space-y-4">
      <Dialog />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-white">Infraction Catalog</h2>
          <p className="text-white/40 text-sm mt-0.5">Define infraction types and their point values. Issue them per-member via the Manage button in the team directory.</p>
        </div>
        <Btn variant="primary" onClick={openCreate}>+ New Infraction</Btn>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[30%]">Name</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45">Description</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[100px]">Points</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[80px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => (
              <tr key={i.id} className="border-b border-white/8 align-top hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 text-sm text-white/90">{i.name}</td>
                <td className="px-3 py-2.5 text-xs text-white/65">{i.description || <span className="text-white/30">—</span>}</td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${POINTS_PILL[i.points] ?? ""}`}>
                    {i.points} pt{i.points === 1 ? "" : "s"}
                  </span>
                </td>
                <td className="px-3 py-2.5"><Btn size="sm" variant="secondary" onClick={() => openEdit(i)}>Edit</Btn></td>
              </tr>
            ))}
          </tbody>
        </table>
        {sorted.length === 0 && (
          <div className="p-6 text-center text-white/45 text-sm">No infractions yet. Add one above.</div>
        )}
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editing ? "Edit Infraction" : "New Infraction"}>
        <div className="space-y-4">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Did not respond to email within 48 hours" />
          </Field>
          <Field label="Description">
            <TextArea rows={3} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="When this should be issued — guidance for the admin issuing it." />
          </Field>
          <Field label="Points" required>
            <select
              value={String(form.points)}
              onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) || 1 }))}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              {POINT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className="text-[11px] text-white/40 mt-1.5">1 = minor, 2 = major, 3 = severe.</p>
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
          <div>{editing && <Btn variant="danger" onClick={() => void handleDelete()}>Delete</Btn>}</div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.name.trim()}>{editing ? "Save" : "Create"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── TAB: HANDBOOK ─────────────────────────────────────────────────────────────

// ── TAB: EMAILS ───────────────────────────────────────────────────────────────

interface EmailTemplateRow {
  key: string;
  label: string;
  description: string;
  subject: string;
  body: string;
  updated_at: string | null;
  updated_by: string | null;
}

const EMAIL_TEMPLATE_VARS = [
  { v: "{{name}}",      desc: "Member's full name" },
  { v: "{{firstName}}", desc: "Member's first name" },
  { v: "{{link}}",      desc: "The action link (invite or setup link)" },
];

const EMAIL_TEMPLATE_META: Record<string, { label: string; description: string }> = {
  "invite":     { label: "Member Invite",     description: "Sent by admin when inviting a member. Contains a permanent link (never expires)." },
  "setup-link": { label: "Portal Setup Link", description: "Sent when a member requests a fresh setup link. Contains a one-time OTP link (expires in 24 hours)." },
};

function EmailsTab() {
  const [templates, setTemplates] = useState<EmailTemplateRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editing, setEditing]     = useState<Record<string, { subject: string; body: string }>>({});
  const [saving, setSaving]       = useState<Record<string, boolean>>({});
  const [status, setStatus]       = useState<Record<string, string>>({});

  useEffect(() => {
    void (async () => {
      try {
        const token = await getAuthToken();
        const res = await fetch("/api/members/admin/email-templates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { templates: rows } = await res.json() as { templates: EmailTemplateRow[] };
        setTemplates(rows ?? []);
        const initial: Record<string, { subject: string; body: string }> = {};
        for (const t of rows ?? []) initial[t.key] = { subject: t.subject, body: t.body };
        setEditing(initial);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (key: string) => {
    const vals = editing[key];
    if (!vals) return;
    setSaving(s => ({ ...s, [key]: true }));
    setStatus(s => ({ ...s, [key]: "" }));
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/admin/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ key, subject: vals.subject, html: vals.body }),
      });
      setStatus(s => ({ ...s, [key]: res.ok ? "Saved." : "Save failed. Please try again." }));
      if (res.ok) {
        setTemplates(ts => ts.map(t => t.key === key ? { ...t, subject: vals.subject, body: vals.body, updated_at: new Date().toISOString() } : t));
      }
    } catch {
      setStatus(s => ({ ...s, [key]: "Save failed. Please try again." }));
    } finally {
      setSaving(s => ({ ...s, [key]: false }));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-32"><Spinner size="sm" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-4">
        <p className="text-xs text-white/50 font-body mb-2 font-semibold uppercase tracking-wider">Available variables</p>
        <div className="flex flex-wrap gap-2">
          {EMAIL_TEMPLATE_VARS.map(({ v, desc }) => (
            <div key={v} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
              <code className="text-[#85CC17] text-xs font-mono">{v}</code>
              <span className="text-white/40 text-xs">— {desc}</span>
            </div>
          ))}
        </div>
      </div>

      {["invite", "setup-link"].map((key) => {
        const meta = EMAIL_TEMPLATE_META[key] ?? { label: key, description: "" };
        const row  = templates.find(t => t.key === key);
        const vals = editing[key] ?? { subject: "", body: "" };
        return (
          <Card
            key={key}
            title={meta.label}
            subtitle={row?.updated_at
              ? `Last saved: ${new Date(row.updated_at).toLocaleString()}${row.updated_by ? ` by ${row.updated_by}` : ""}`
              : meta.description}
          >
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-white/50 font-body mb-1">Subject</label>
                <input
                  type="text"
                  value={vals.subject}
                  onChange={e => setEditing(ed => ({ ...ed, [key]: { ...vals, subject: e.target.value } }))}
                  className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-[#85CC17]/50"
                  placeholder="Email subject line"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs text-white/50 font-body">HTML Body</label>
                  <span className="text-[10px] text-white/30 font-mono">{"{{firstName}}, {{name}}, {{link}}"}</span>
                </div>
                <textarea
                  value={vals.body}
                  onChange={e => setEditing(ed => ({ ...ed, [key]: { ...vals, body: e.target.value } }))}
                  rows={14}
                  className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#85CC17]/50 resize-y"
                  placeholder="<!DOCTYPE html><html>…</html>"
                  spellCheck={false}
                />
              </div>
            </div>
            <div className="mt-4">
              <SaveBtn saving={saving[key] ?? false} onClick={() => void handleSave(key)} />
            </div>
            <StatusMsg msg={status[key] ?? ""} />
          </Card>
        );
      })}
    </div>
  );
}

function HandbookTab() {
  const { user } = useAuth();
  const [page, setPage] = useState<HandbookPage | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState("");
  const { ask: askReset, Dialog: ResetDialog } = useConfirm();

  useEffect(() => {
    getHandbookPage("credit-infraction-policy")
      .then((p) => {
        setPage(p);
        setTitle(p?.title ?? "Credit & Infraction Policy");
        setContent(p?.content ?? "");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setStatusMessage("");
    try {
      await upsertHandbookPage("credit-infraction-policy", {
        slug: "credit-infraction-policy",
        title,
        content,
        updatedBy: user.email ?? user.id,
      });
      setStatusMessage("Handbook page saved successfully.");
      const updated = await getHandbookPage("credit-infraction-policy");
      setPage(updated);
    } catch {
      setStatusMessage("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const doResetAcks = async () => {
    setResetting(true);
    setResetMessage("");
    try {
      const { data: { session } } = await (await import("@/lib/supabaseClient")).supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error("no_session");
      const res = await fetch("/api/members/admin/reset-handbook-acks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ slug: "credit-infraction-policy" }),
      });
      if (!res.ok) throw new Error("failed");
      setResetMessage("All member acknowledgments cleared. Members will see the popup again on next login.");
    } catch {
      setResetMessage("Failed to reset. Please try again.");
    } finally {
      setResetting(false);
    }
  };

  const handleResetAcks = () => {
    askReset(() => void doResetAcks(), "All existing acknowledgments will be cleared. Members will see the policy popup again on their next login.");
  };

  if (loading) return <div className="flex items-center justify-center h-32"><Spinner size="sm" /></div>;

  return (
    <div className="max-w-2xl space-y-4">
      <Card title="Credit & Infraction Policy" subtitle={page?.updatedAt ? `Last saved: ${new Date(page.updatedAt).toLocaleString()}${page.updatedBy ? ` by ${page.updatedBy}` : ""}` : "Edit the handbook page shown to members. Members must acknowledge this page on first login."}>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 font-body mb-1">Page Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-[#85CC17]/50"
              placeholder="Credit & Infraction Policy"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 font-body mb-1">Content</label>
            <RichTextEditor content={content} onChange={setContent} />
          </div>
        </div>
        <div className="mt-4">
          <SaveBtn saving={saving} onClick={() => void handleSave()} />
        </div>
        <StatusMsg msg={statusMessage} />
      </Card>

      <Card title="Re-show popup for all members" subtitle="Use this after updating the policy if you want every member to acknowledge it again. Clears all existing acknowledgments — members will see the policy popup again on their next login.">
        <Btn variant="danger" onClick={handleResetAcks} disabled={resetting}>
          {resetting ? "Resetting..." : "Reset acknowledgments for all members"}
        </Btn>
        <StatusMsg msg={resetMessage} />
      </Card>

      <ResetDialog />
    </div>
  );
}

// ── ADMIN CONTENT ──────────────────────────────────────────────────────────────

function AdminContent() {
  const { authRole, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = getAdminTab(pathname);

  useEffect(() => {
    if (!loading && authRole !== "owner") router.replace("/members/projects");
  }, [authRole, loading, router]);

  if (loading || authRole !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  const TABS: { key: AdminTab; label: string }[] = [
    { key: "data",         label: "Data" },
    { key: "applications", label: "Applications" },
    { key: "services",     label: "Services" },
    { key: "banners",      label: "Banners" },
    { key: "infractions",  label: "Infractions" },
    { key: "emails",       label: "Emails" },
    { key: "handbook",     label: "Handbook" },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display font-bold text-white text-2xl">Admin</h1>
        <p className="text-white/40 text-sm mt-1">Site settings, content, and data management.</p>
      </div>

      <div className="flex gap-1 bg-[#1C1F26] border border-white/8 rounded-xl p-1 mb-6 w-fit flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => router.push(ADMIN_TAB_HREFS[tab.key])}
            className={`px-4 py-2 rounded-lg text-sm font-medium font-body transition-colors ${
              activeTab === tab.key ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/50 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "data"         && <DataTab />}
      {activeTab === "applications" && <ApplicationsTab />}
      {activeTab === "services"     && <ServicesTab />}
      {activeTab === "banners"      && <BannersTab />}
      {activeTab === "infractions"  && <InfractionsTab />}
      {activeTab === "emails"       && <EmailsTab />}
      {activeTab === "handbook"     && <HandbookTab />}
    </>
  );
}

// ── PAGE EXPORT ───────────────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <MembersLayout>
      <AdminContent />
    </MembersLayout>
  );
}
