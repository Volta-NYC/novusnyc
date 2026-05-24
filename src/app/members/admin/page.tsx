"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useState, useEffect, useMemo } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { Btn, Field, Input, SearchBar, Spinner, Toggle } from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import { useAuth } from "@/lib/members/authContext";
import { useRouter, usePathname } from "next/navigation";
import {
  getHandbookPage, upsertHandbookPage, type HandbookPage,
  getSiteSettings, updateSiteSettings, type SiteSettings,
  subscribeInfractions, createInfraction, updateInfraction, deleteInfraction,
  subscribeBusinesses, type Business,
  type Infraction,
  getAuditLogsList, type AuditLogEntry,
} from "@/lib/members/storage";
import { useConfirm, Modal, TextArea } from "@/components/members/ui";
import { formatDate } from "@/lib/format";
import { toCsv, downloadCsv, dateStampedFilename } from "@/lib/csv";

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
type AdminTab = "data" | "frontend" | "handbook" | "audit";

const ADMIN_TAB_HREFS: Record<AdminTab, string> = {
  data:     "/members/admin",
  frontend: "/members/admin/frontend",
  handbook: "/members/admin/handbook",
  audit:    "/members/admin/audit-logs",
};

function getAdminTab(pathname: string): AdminTab {
  if (pathname.startsWith("/members/admin/frontend") ||
      pathname.startsWith("/members/admin/applications") ||
      pathname.startsWith("/members/admin/services") ||
      pathname.startsWith("/members/admin/banners"))     return "frontend";
  if (pathname.startsWith("/members/admin/handbook") ||
      pathname.startsWith("/members/admin/infractions")) return "handbook";
  if (pathname.startsWith("/members/admin/audit-logs")) return "audit";
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
  const { ask, Dialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    getSiteSettings().then((s) => { setServices(s.services); setLoading(false); });
  }, []);

  useEffect(() => subscribeBusinesses(setBusinesses), []);

  const usageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of businesses) {
      for (const svc of (b.showcaseServices ?? b.activeServices ?? [])) {
        counts[svc] = (counts[svc] ?? 0) + 1;
      }
    }
    return counts;
  }, [businesses]);

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

  const removeService = (i: number) => {
    const svc = services[i];
    const count = usageCount[svc] ?? 0;
    if (count > 0) {
      void ask(
        async () => { setServices((prev) => prev.filter((_, idx) => idx !== i)); },
        `"${svc}" is used by ${count} business${count === 1 ? "" : "es"}. Remove it from the list? Existing businesses keep their data.`,
      );
    } else {
      setServices((prev) => prev.filter((_, idx) => idx !== i));
    }
  };
  const renameService = (i: number, val: string) => setServices((prev) => prev.map((s, idx) => idx === i ? val : s));

  if (loading) return <div className="flex items-center h-24"><Spinner size="sm" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <Dialog />
      <Card title="Active Services" subtitle="These appear in the showcase filter, business edit form, and application form.">
        <div className="space-y-2 mb-4">
          {services.map((svc, i) => {
            const count = usageCount[svc] ?? 0;
            return (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={svc}
                  onChange={(e) => renameService(i, e.target.value)}
                  className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white font-body focus:outline-none focus:border-[#85CC17]/50"
                />
                <span className="text-[10px] text-white/35 w-16 text-right shrink-0">
                  {count > 0 ? `${count} biz` : "unused"}
                </span>
                <button
                  type="button"
                  onClick={() => removeService(i)}
                  className={`transition-colors text-xs px-1 ${count > 0 ? "text-amber-400/50 hover:text-red-400" : "text-white/30 hover:text-red-400"}`}
                  aria-label="Remove"
                  title={count > 0 ? `Used by ${count} business${count === 1 ? "" : "es"}` : "Remove"}
                >
                  ✕
                </button>
              </div>
            );
          })}
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

// ── TAB: MANAGE FRONTEND ─────────────────────────────────────────────────────

function FrontendSection({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pb-3 mb-5 border-b border-white/8">
      <h2 className="font-display font-bold text-white text-lg">{title}</h2>
      {subtitle && <p className="text-white/40 text-sm mt-0.5">{subtitle}</p>}
    </div>
  );
}

function HandbookAckResetSection() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"idle" | "done" | "error">("idle");

  const handleReset = async () => {
    setBusy(true);
    setStatus("idle");
    try {
      await updateSiteSettings({ handbookAckRequiredAt: new Date().toISOString() });
      setStatus("done");
    } catch {
      setStatus("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <p className="text-sm text-white/85 font-body font-medium">Require all members to re-confirm the handbook</p>
        <p className="text-xs text-white/40 font-body mt-0.5">
          Members will see the acknowledgment prompt on their next portal visit. Has no effect on admins or owners.
        </p>
        {status === "done" && <p className="text-xs text-[#85CC17] mt-1.5">Done — all members will be prompted on next login.</p>}
        {status === "error" && <p className="text-xs text-red-400 mt-1.5">Something went wrong. Try again.</p>}
      </div>
      <Btn variant="secondary" onClick={() => void handleReset()} disabled={busy}>
        {busy ? "Resetting…" : "Reset acknowledgments"}
      </Btn>
    </div>
  );
}

function ManageFrontendTab() {
  return (
    <div className="space-y-14">
      <section>
        <FrontendSection title="Applications" subtitle="Control whether the public /apply page accepts new submissions." />
        <ApplicationsTab />
      </section>
      <section>
        <FrontendSection title="Services" subtitle="Manage the service options shown in the showcase filter, business edit form, and application form." />
        <ServicesTab />
      </section>
      <section>
        <FrontendSection title="Banners" subtitle="Configure announcement banners shown on the public site and members portal." />
        <BannersTab />
      </section>
      <section>
        <FrontendSection title="Member Handbook" subtitle="Control when members are prompted to re-read and re-confirm the handbook." />
        <HandbookAckResetSection />
      </section>
    </div>
  );
}

// ── TAB: INFRACTIONS ──────────────────────────────────────────────────────────

const POINT_OPTIONS = [
  { value: 1, label: "1 demerit" },
  { value: 2, label: "2 demerits" },
  { value: 3, label: "3 demerits" },
];
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
          <p className="text-white/40 text-sm mt-0.5">Define infraction types and their demerit values. Issue them per-member via the Manage button in the team directory.</p>
        </div>
        <Btn variant="primary" onClick={openCreate}>+ New Infraction</Btn>
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[30%]">Name</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45">Description</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[110px]">Demerits</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[80px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => (
              <tr key={i.id} className="border-b border-white/8 align-top hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 text-sm text-white/90">{i.name}</td>
                <td className="px-3 py-2.5 text-xs text-white/65">{i.description || <span className="text-white/30">—</span>}</td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-semibold text-white/60">
                    {i.points} {i.points === 1 ? "demerit" : "demerits"}
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
          <Field label="Demerits" required>
            <select
              value={String(form.points)}
              onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) || 1 }))}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              {POINT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <p className="text-[11px] text-white/40 mt-1.5">Higher demerit values are more severe. See the handbook for thresholds.</p>
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

// ── TAB: HANDBOOK (merged with Infractions) ────────────────────────────────────

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
    askReset(() => doResetAcks(), "All existing acknowledgments will be cleared. Members will see the policy popup again on their next login.");
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

      <div className="pt-2 border-t border-white/8 mt-10">
        <div className="pb-3 mb-6">
          <h2 className="font-display font-bold text-white text-lg">Infraction Catalog</h2>
          <p className="text-white/40 text-sm mt-0.5">Define infraction types and point values. These are shown to members in the handbook below the policy text. Issue them per-member via the team directory.</p>
        </div>
        <InfractionsTab />
      </div>
    </div>
  );
}

// ── AUDIT LOG TAB ──────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [actionFilter, setActionFilter] = useState<"all" | "create" | "update" | "delete">("all");
  const [detailEntry, setDetailEntry] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const items = await getAuditLogsList(500);
      if (cancelled) return;
      setEntries(items);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (!q) return true;
      const haystack = [
        e.actorEmail, e.actorName, e.collection, e.recordId,
        JSON.stringify(e.details ?? {}),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [entries, search, actionFilter]);

  const actionBadgeClass = (action: string) => {
    if (action === "create") return "bg-[#85CC17]/15 text-[#85CC17] border-[#85CC17]/30";
    if (action === "update") return "bg-blue-500/15 text-blue-300 border-blue-500/30";
    if (action === "delete") return "bg-red-500/15 text-red-300 border-red-500/30";
    return "bg-white/10 text-white/60 border-white/20";
  };

  return (
    <div className="space-y-4">
      <Card title="Audit log" subtitle={`Showing ${filtered.length} of ${entries.length} recent entries (most recent 500).`}>
        <div className="flex gap-2 mb-4 flex-wrap">
          <SearchBar value={search} onChange={setSearch} placeholder="Filter by user, collection, record, or details…" debounceMs={250} />
          <div className="flex gap-1 bg-[#1C1F26] border border-white/8 rounded-lg p-1">
            {(["all", "create", "update", "delete"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setActionFilter(opt)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  actionFilter === opt ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/50 hover:text-white"
                }`}
              >
                {opt[0].toUpperCase() + opt.slice(1)}
              </button>
            ))}
          </div>
          <Btn
            variant="secondary"
            onClick={() => {
              const csv = toCsv(filtered, [
                { key: "timestamp", label: "Timestamp" },
                { key: "action", label: "Action" },
                { key: "collection", label: "Collection" },
                { key: "recordId", label: "Record ID" },
                { key: "actorEmail", label: "Actor Email" },
                { key: "actorName", label: "Actor Name" },
                { key: "details", label: "Details" },
              ]);
              downloadCsv(dateStampedFilename("audit-log"), csv);
            }}
          >
            Export CSV
          </Btn>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <p className="text-white/30 text-sm py-12 text-center">No audit entries match your filter.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-xs">
              <thead className="border-b border-white/8">
                <tr className="text-white/40 uppercase tracking-wider text-[10px]">
                  <th className="text-left py-2 pr-3 font-medium">When</th>
                  <th className="text-left py-2 pr-3 font-medium">Action</th>
                  <th className="text-left py-2 pr-3 font-medium">Collection</th>
                  <th className="text-left py-2 pr-3 font-medium">Record</th>
                  <th className="text-left py-2 pr-3 font-medium">Actor</th>
                  <th className="text-left py-2 pr-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="py-2 pr-3 text-white/70 whitespace-nowrap" title={e.timestamp}>
                      {formatDate(e.timestamp, { withTime: true })}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] uppercase tracking-wider border ${actionBadgeClass(e.action)}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-white/70 font-mono">{e.collection}</td>
                    <td className="py-2 pr-3 text-white/40 font-mono text-[10px]">{e.recordId ?? "—"}</td>
                    <td className="py-2 pr-3 text-white/70">{e.actorName || e.actorEmail || "—"}</td>
                    <td className="py-2 pr-3">
                      {e.details && Object.keys(e.details).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setDetailEntry(e)}
                          className="text-[10px] text-white/40 hover:text-white/75 underline underline-offset-2 transition-colors font-mono"
                        >
                          {Object.keys(e.details).length} field{Object.keys(e.details).length !== 1 ? "s" : ""} changed
                        </button>
                      ) : (
                        <span className="text-white/20 text-[10px]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {detailEntry && (
        <Modal open onClose={() => setDetailEntry(null)} title={`${detailEntry.action.toUpperCase()} · ${detailEntry.collection}`}>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs bg-[#0F1014] rounded-lg p-3">
              <span className="text-white/40">Actor</span>
              <span className="text-white/80">{detailEntry.actorName || detailEntry.actorEmail || "—"}</span>
              <span className="text-white/40">When</span>
              <span className="text-white/80">{new Date(detailEntry.timestamp).toLocaleString()}</span>
              {detailEntry.recordId && (
                <>
                  <span className="text-white/40">Record ID</span>
                  <span className="text-white/55 font-mono text-[10px] break-all">{detailEntry.recordId}</span>
                </>
              )}
            </div>
            {detailEntry.details && Object.keys(detailEntry.details).length > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-2">Changed fields</p>
                <div className="rounded-lg border border-white/8 overflow-hidden divide-y divide-white/6">
                  {Object.entries(detailEntry.details).map(([key, val]) => (
                    <div key={key} className="grid grid-cols-[160px_1fr] gap-3 px-3 py-2 text-xs">
                      <span className="text-white/45 font-mono truncate">{key}</span>
                      <span className="text-white/75 break-words">
                        {typeof val === "object" ? JSON.stringify(val) : String(val ?? "—")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[10px] text-white/25 pt-1">
              Note: the audit log records what was written, not the previous state — point-in-time undo requires storing before-snapshots, which is a planned schema improvement.
            </p>
          </div>
        </Modal>
      )}
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
    { key: "data",     label: "Data" },
    { key: "frontend", label: "Manage Frontend" },
    { key: "handbook", label: "Handbook" },
    { key: "audit",    label: "Audit Log" },
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

      {activeTab === "data"     && <DataTab />}
      {activeTab === "frontend" && <ManageFrontendTab />}
      {activeTab === "handbook" && <HandbookTab />}
      {activeTab === "audit"    && <AuditLogTab />}
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
