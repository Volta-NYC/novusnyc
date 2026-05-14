"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { Field, Input } from "@/components/members/ui";
import { useAuth } from "@/lib/members/authContext";
import { useRouter } from "next/navigation";
import {
  getHandbookPage, upsertHandbookPage, type HandbookPage,
  getSiteSettings, updateSiteSettings, type SiteSettings,
} from "@/lib/members/storage";

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
type AdminTab = "data" | "applications" | "services" | "banners" | "roles" | "handbook";

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
    <button
      onClick={onClick}
      disabled={saving}
      className={`font-display font-bold px-5 py-2.5 rounded-xl transition-colors text-sm ${
        saving ? "bg-white/10 text-white/35 cursor-not-allowed" : "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"
      }`}
    >
      {saving ? "Saving…" : label}
    </button>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5.5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${checked ? "bg-[#85CC17]" : "bg-white/15"}`}
        style={{ height: "22px", width: "40px" }}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </div>
      <span className="text-sm text-white/80 group-hover:text-white transition-colors">{label}</span>
    </label>
  );
}

function StatusMsg({ msg }: { msg: string }) {
  if (!msg) return null;
  return <div className="mt-3 bg-white/5 border border-white/8 rounded-lg px-4 py-2.5 text-white/60 text-sm font-body">{msg}</div>;
}

const BANNER_PRESET_COLORS = [
  { bg: "#1a1a2e", text: "#ffffff", label: "Dark navy" },
  { bg: "#0D0D0D", text: "#85CC17", label: "Black + green" },
  { bg: "#85CC17", text: "#0D0D0D", label: "Volta green" },
  { bg: "#1e40af", text: "#ffffff", label: "Blue" },
  { bg: "#92400e", text: "#fef3c7", label: "Amber" },
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
        <button
          onClick={() => void handleRevalidate()}
          disabled={revalidating}
          className={`font-display font-bold px-5 py-2.5 rounded-xl transition-colors text-sm ${revalidating ? "bg-white/10 text-white/35 cursor-not-allowed" : "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"}`}
        >
          {revalidating ? "Refreshing…" : "Update All Stats"}
        </button>
      </Card>

      <Card title="Export Data" subtitle="Download a full JSON backup, or export selected datasets only.">
        <button
          onClick={() => void handleExport()}
          className="bg-[#85CC17] text-[#0D0D0D] font-display font-bold px-5 py-2.5 rounded-xl hover:bg-[#72b314] transition-colors text-sm mb-4"
        >
          Download Full Backup
        </button>

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
            <button
              onClick={() => void handleExport(selectedSections)}
              disabled={selectedSections.length === 0}
              className={`font-display font-bold px-4 py-2 rounded-lg transition-colors text-xs ${selectedSections.length === 0 ? "bg-white/10 text-white/35 cursor-not-allowed" : "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"}`}
            >
              Download Selected
            </button>
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

  if (loading) return <div className="flex items-center h-24"><div className="w-5 h-5 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <Card title="Application Status" subtitle="Control whether the public /apply page accepts new submissions.">
        <div className="space-y-5">
          <Toggle
            checked={paused}
            onChange={setPaused}
            label={paused ? "Applications are paused" : "Applications are open"}
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

  if (loading) return <div className="flex items-center h-24"><div className="w-5 h-5 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" /></div>;

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

  if (loading || !settings) return <div className="flex items-center h-24"><div className="w-5 h-5 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" /></div>;

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

const ROLE_KEYS: Array<keyof SiteSettings["roleLabels"]> = ["Analyst", "Senior Analyst", "Associate", "Reserve"];
const ROLE_DESCRIPTIONS: Record<string, string> = {
  Analyst:          "Entry-level member. Most members start here.",
  "Senior Analyst": "Mid-level member. Eligible to review assignments.",
  Associate:        "Senior member. Full access and leadership responsibilities.",
  Reserve:          "Inactive or penalized status. Limited portal access.",
};

function RolesTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [labels, setLabels] = useState<SiteSettings["roleLabels"]>({
    Analyst: "Analyst",
    "Senior Analyst": "Senior Analyst",
    Associate: "Associate",
    Reserve: "Reserve",
  });

  useEffect(() => {
    getSiteSettings().then((s) => { setLabels(s.roleLabels); setLoading(false); });
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus("");
    try {
      await updateSiteSettings({ roleLabels: labels });
      setStatus("Saved.");
    } catch {
      setStatus("Save failed. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center h-24"><div className="w-5 h-5 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <Card title="Role Labels" subtitle="Override the display name for each role tier. Internal enum values are unchanged.">
        <div className="space-y-3 mb-4">
          {ROLE_KEYS.map((key) => (
            <div key={key}>
              <Field label={`${key} label`}>
                <Input
                  value={labels[key]}
                  onChange={(e) => setLabels((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={key}
                />
              </Field>
              <p className="text-[11px] text-white/35 mt-1 ml-0.5">{ROLE_DESCRIPTIONS[key]}</p>
            </div>
          ))}
        </div>
        <SaveBtn saving={saving} onClick={() => void save()} />
        <StatusMsg msg={status} />
      </Card>
    </div>
  );
}

// ── TAB: HANDBOOK ─────────────────────────────────────────────────────────────

function HandbookTab() {
  const { user } = useAuth();
  const [page, setPage] = useState<HandbookPage | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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

  if (loading) return <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" /></div>;

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
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-[#85CC17]/50 resize-y"
              placeholder="Enter handbook content here..."
            />
          </div>
        </div>
        <div className="mt-4">
          <SaveBtn saving={saving} onClick={() => void handleSave()} />
        </div>
        <StatusMsg msg={statusMessage} />
      </Card>
    </div>
  );
}

// ── ADMIN CONTENT ──────────────────────────────────────────────────────────────

function AdminContent() {
  const [activeTab, setActiveTab] = useState<AdminTab>("data");
  const { authRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && authRole !== "owner") router.replace("/members/projects");
  }, [authRole, loading, router]);

  if (loading || authRole !== "owner") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
      </div>
    );
  }

  const TABS: { key: AdminTab; label: string }[] = [
    { key: "data",         label: "Data" },
    { key: "applications", label: "Applications" },
    { key: "services",     label: "Services" },
    { key: "banners",      label: "Banners" },
    { key: "roles",        label: "Roles" },
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
            onClick={() => setActiveTab(tab.key)}
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
      {activeTab === "roles"        && <RolesTab />}
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
