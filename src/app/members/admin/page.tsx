"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useState, useEffect } from "react";
import Link from "next/link";
import MembersLayout from "@/components/members/MembersLayout";
import { Btn, Field, Input, Select, Spinner, Toggle, PageHeader, LoadError } from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import AdminAuditLog from "@/components/members/admin/AdminAuditLog";
import { useAuth } from "@/lib/members/authContext";
import { useRouter, usePathname } from "next/navigation";
import {
  getHandbookPage, upsertHandbookPage, type HandbookPage,
  getSiteSettings, updateSiteSettings, type SiteSettings,
  subscribeChapters, updateChapter, createChapter, type Chapter,
  subscribeInfractions, createInfraction, updateInfraction, deleteInfraction,
  type Infraction,
} from "@/lib/members/storage";
import { useConfirm, Modal, TextArea } from "@/components/members/ui";
import { formatDate } from "@/lib/format";
import { EXPORT_SECTIONS, type ExportSectionKey } from "@/lib/members/exportSections";

const EXPORT_OPTIONS = EXPORT_SECTIONS;
type ExportOptionKey = ExportSectionKey;
type AdminTab = "overview" | "public" | "policy" | "data";

const ADMIN_TAB_HREFS: Record<AdminTab, string> = {
  overview: "/members/admin",
  public:   "/members/admin/public",
  policy:   "/members/admin/policy",
  data:     "/members/admin/data",
};

function getAdminTab(pathname: string): AdminTab {
  if (pathname.startsWith("/members/admin/frontend") ||
      pathname.startsWith("/members/admin/applications") ||
      pathname.startsWith("/members/admin/services") ||
      pathname.startsWith("/members/admin/banners") ||
      pathname.startsWith("/members/admin/public"))      return "public";
  if (pathname.startsWith("/members/admin/handbook") ||
      pathname.startsWith("/members/admin/infractions") ||
      pathname.startsWith("/members/admin/policy"))      return "policy";
  if (pathname.startsWith("/members/admin/audit-logs") ||
      pathname.startsWith("/members/admin/data"))        return "data";
  return "overview";
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

type AdminHealth = {
  checkedAt: string;
  issues: Array<{
    id: string;
    label: string;
    detail: string;
    count: number;
    href: string;
    severity: "attention" | "info";
  }>;
  summary: {
    activeMembers: number;
    pendingApplications: number;
    scheduledInterviews: number;
    activePods: number;
    publicCards: number;
    enabledAutomations: number;
  };
  settings: {
    applicationsOpen: boolean;
    publicBannerOn: boolean;
    portalBannerOn: boolean;
    handbookAcknowledgmentResetAt: string | null;
  };
};

const QUICK_ACTIONS = [
  { label: "Review applicants", detail: "Decisions and interview scheduling", href: "/members/applicants" },
  { label: "Manage access", detail: "Invite members and review roles", href: "/members/team" },
  { label: "Check pod operations", detail: "Meetings, attendance, tasks, and grants", href: "/members/pods" },
  { label: "Edit public cards", detail: "Website details, images, and card order", href: "/members/projects?view=public" },
  { label: "Manage email", detail: "Templates, automations, and delivery status", href: "/members/email" },
  { label: "Open operations dashboard", detail: "Projects, pods, members, and hours", href: "/members/overview" },
] as const;

function OverviewTab() {
  const [health, setHealth] = useState<AdminHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const token = await getAuthToken();
      const response = await fetch("/api/members/admin/health", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("health_check_failed");
      setHealth(await response.json() as AdminHealth);
    } catch {
      setError("The system check could not load. No counts on this page should be treated as current.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">Needs attention</h2>
            <p className="mt-0.5 text-sm text-white/45">Only exceptions appear here. Routine counts live on the Dashboard.</p>
          </div>
          <Btn variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? "Checking…" : "Run check again"}
          </Btn>
        </div>
        {error ? (
          <LoadError message={error} onRetry={() => void load()} />
        ) : loading ? (
          <div className="flex h-28 items-center justify-center rounded-xl border border-white/10 bg-[#1C1F26]"><Spinner size="sm" /></div>
        ) : health && health.issues.length === 0 ? (
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.05] px-5 py-5">
            <p className="font-medium text-emerald-300">Nothing is waiting on an owner.</p>
            <p className="mt-1 text-xs text-white/45">Applications, interviews, pod leadership, public cards, and email automations all passed their checks.</p>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {health?.issues.map((issue) => (
              <Link key={issue.id} href={issue.href} className={`group rounded-xl border p-4 transition-colors hover:border-white/30 ${issue.severity === "attention" ? "border-amber-500/25 bg-amber-500/[0.04]" : "border-white/10 bg-[#1C1F26]"}`}>
                <div className="flex items-start gap-4">
                  <span className={`min-w-10 rounded-lg px-2 py-1 text-center font-mono text-lg font-semibold tabular-nums ${issue.severity === "attention" ? "bg-amber-500/15 text-amber-300" : "bg-white/8 text-white/75"}`}>{issue.count}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white/90 group-hover:text-[#F6B78D]">{issue.label}</span>
                    <span className="mt-1 block text-xs leading-relaxed text-white/45">{issue.detail}</span>
                  </span>
                  <span aria-hidden="true" className="text-white/30 group-hover:text-white/70">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-lg font-bold text-white">Common tasks</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <Link key={action.href} href={action.href} className="group rounded-xl border border-white/10 bg-[#1C1F26] px-4 py-3 transition-colors hover:border-[#F6B78D]/45">
              <span className="block text-sm font-medium text-white/85 group-hover:text-[#F6B78D]">{action.label} →</span>
              <span className="mt-1 block text-[11px] text-white/40">{action.detail}</span>
            </Link>
          ))}
        </div>
      </section>

      {health && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold text-white">Current switches</h2>
          <div className="grid gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-3">
            {[
              { label: "Applications", value: health.settings.applicationsOpen ? "Open" : "Closed", href: ADMIN_TAB_HREFS.public },
              { label: "Public banner", value: health.settings.publicBannerOn ? "On" : "Off", href: ADMIN_TAB_HREFS.public },
              { label: "Portal banner", value: health.settings.portalBannerOn ? "On" : "Off", href: ADMIN_TAB_HREFS.public },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="bg-[#1C1F26] px-4 py-3 hover:bg-white/[0.04]">
                <span className="block text-[10px] uppercase tracking-wide text-white/40">{item.label}</span>
                <span className="mt-1 block text-sm font-semibold text-white/85">{item.value}</span>
              </Link>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-white/30">Checked {formatDate(health.checkedAt, { withTime: true })}</p>
        </section>
      )}
    </div>
  );
}

// The Novus palette, not generic Tailwind. Pastels are fills carrying ink text;
// the dark option is the one place a pastel works as the text colour. Every
// pairing clears AA (6.2:1 at worst).
const BANNER_PRESET_COLORS = [
  { bg: "#F6B78D", text: "#2D282E", label: "Peach" },
  { bg: "#F3E28D", text: "#2D282E", label: "Yellow" },
  { bg: "#BEA2BA", text: "#2D282E", label: "Lavender" },
  { bg: "#231F24", text: "#F6B78D", label: "Ink" },
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
      link.download = `novus-data-${date}${sections && sections.length > 0 ? `-${sections.join("-")}` : "-full"}.json`;
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
      <Card title="Refresh public pages" subtitle="Recovery control only. Public settings normally refresh automatically when you save them.">
        <Btn variant="primary" onClick={() => void handleRevalidate()} disabled={revalidating}>
          {revalidating ? "Refreshing…" : "Refresh public pages"}
        </Btn>
      </Card>

      <Card title="Database backup" subtitle="Download database records as JSON. Uploaded images, resumes, and other Supabase Storage files are not included.">
        <Btn variant="primary" onClick={() => void handleExport()} className="mb-4">
          Download full database backup
        </Btn>

        <div className="border border-white/10 rounded-lg p-3 bg-[#0F1014]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide text-white/45">Select Sections</p>
            <div className="flex gap-3 text-[11px]">
              <Btn type="button" variant="ghost" size="sm" onClick={() => setSelectedSections(EXPORT_OPTIONS.map((o) => o.key))}>Select all</Btn>
              <Btn type="button" variant="ghost" size="sm" onClick={() => setSelectedSections([])}>Clear</Btn>
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
  const [settingsLoadFailed, setSettingsLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState("");
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [newChapter, setNewChapter] = useState("");
  const [newChapterCity, setNewChapterCity] = useState("");
  const [newChapterState, setNewChapterState] = useState("");
  const [savingChapters, setSavingChapters] = useState(false);
  const [chapterStatus, setChapterStatus] = useState("");

  useEffect(() => {
    getSiteSettings().then((s) => {
      setPaused(s.applicationsPaused);
      setMessage(s.applicationsPausedMsg);
      setLoading(false);
    }).catch(() => {
      setSettingsLoadFailed(true);
      setStatus("Application settings could not load. Refresh this page before making changes.");
      setLoading(false);
    });
  }, []);

  useEffect(() => subscribeChapters(setChapters), []);

  const renameChapter = async (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSavingChapters(true);
    setChapterStatus("");
    try {
      await updateChapter(id, { name: trimmed });
      setChapterStatus("Saved.");
    } catch {
      setChapterStatus("Save failed. Nothing changed.");
    } finally {
      setSavingChapters(false);
    }
  };

  const setChapterStatusValue = async (id: string, status: Chapter["status"]) => {
    setSavingChapters(true);
    try {
      await updateChapter(id, { status });
      setChapterStatus("Saved.");
    } catch {
      setChapterStatus("Save failed. Nothing changed.");
    } finally {
      setSavingChapters(false);
    }
  };

  const addChapter = async () => {
    const trimmed = newChapter.trim();
    if (!trimmed) return;
    setSavingChapters(true);
    setChapterStatus("");
    try {
      await createChapter(trimmed, newChapterCity, newChapterState);
      setNewChapter(""); setNewChapterCity(""); setNewChapterState("");
      setChapterStatus("Added.");
    } catch (err) {
      setChapterStatus(err instanceof Error ? err.message : "Could not add that chapter.");
    } finally {
      setSavingChapters(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setStatus("");
    try {
      await updateSiteSettings({ applicationsPaused: paused, applicationsPausedMsg: message });
      // /apply is statically generated, so the switch means nothing to a visitor
      // until the page is rebuilt.
      const token = await getAuthToken();
      const res = await fetch("/api/members/admin/revalidate", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      setStatus(res.ok
        ? "Saved and the public page was refreshed."
        : "Saved, but the public page didn't refresh — use Refresh public pages.");
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
        {settingsLoadFailed ? (
          <LoadError message="Application settings could not load. The open/closed control is disabled so it cannot overwrite the live value." />
        ) : <div className="space-y-5">
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
        </div>}
        <StatusMsg msg={status} />
      </Card>

      <Card title="Chapters" subtitle="Markets where Novus is active or launching. Active and launching chapters appear on /apply.">
        <div className="space-y-3">
          {chapters.length === 0 && (
            <p className="text-[11px] text-white/40">No chapters yet.</p>
          )}
          {[...chapters].sort((a, b) => a.sortOrder - b.sortOrder).map((chapter) => (
            <div key={chapter.id} className="flex flex-wrap items-center gap-2">
              <Input
                defaultValue={chapter.name}
                disabled={savingChapters}
                onBlur={(e) => {
                  const edited = e.target.value.trim();
                  if (edited && edited !== chapter.name) void renameChapter(chapter.id, edited);
                }}
              />
              <span className="text-[11px] text-white/35">
                {[chapter.city, chapter.state].filter(Boolean).join(", ") || "—"}
              </span>
              <div className="ml-auto flex gap-1">
                {(["Active", "Launching", "Archived"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={savingChapters}
                    onClick={() => void setChapterStatusValue(chapter.id, st)}
                    className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wide transition-colors disabled:opacity-50 ${
                      chapter.status === st
                        ? "bg-[#F3E28D]/20 text-[#F3E28D]"
                        : "text-white/35 hover:text-white/70"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Input
              value={newChapter}
              disabled={savingChapters}
              onChange={(e) => setNewChapter(e.target.value)}
              placeholder="Chapter name"
            />
            <Input
              value={newChapterCity}
              disabled={savingChapters}
              onChange={(e) => setNewChapterCity(e.target.value)}
              placeholder="City"
            />
            <Input
              value={newChapterState}
              disabled={savingChapters}
              onChange={(e) => setNewChapterState(e.target.value)}
              placeholder="State"
            />
            <Btn variant="secondary" onClick={() => void addChapter()} disabled={!newChapter.trim() || savingChapters}>
              {savingChapters ? "Saving…" : "Add"}
            </Btn>
          </div>
        </div>
        <StatusMsg msg={chapterStatus} />
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
      {/* A column, not space-y: the toggle and the save button are both
          inline-flex, and margin alone lets them share a line whenever the
          block-level fields between them are hidden. */}
      <div className="flex flex-col items-start gap-4">
        <Toggle checked={enabled} onChange={onToggle} label={enabled ? "Banner is on" : "Banner is off"} />

        {enabled && (
          <>
            <Field label="Message">
              <Input value={message} onChange={(e) => onMessage(e.target.value)} placeholder="Enter announcement text…" />
            </Field>

            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">Color</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {BANNER_PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => { onBg(preset.bg); onText(preset.text); }}
                    aria-pressed={bg === preset.bg && text === preset.text}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${bg === preset.bg && text === preset.text ? "border-white/70" : "border-white/15 hover:border-white/40"}`}
                    style={{ backgroundColor: preset.bg, color: preset.text }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/40">Presets use the approved Novus palette and readable text contrast.</p>
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
    getSiteSettings()
      .then((s) => setSettings(s))
      .catch(() => setPublicStatus("Banner settings could not load. Refresh this page before making changes."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center h-24"><Spinner size="sm" /></div>;
  if (!settings) return <LoadError message={publicStatus || "Banner settings could not load."} />;

  const savePublic = async () => {
    if (settings.publicBannerEnabled && !settings.publicBannerMessage.trim()) {
      setPublicStatus("Add a message before turning on the public banner.");
      return;
    }
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
    if (settings.portalBannerEnabled && !settings.portalBannerMessage.trim()) {
      setPortalStatus("Add a message before turning on the portal banner.");
      return;
    }
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
        subtitle="Appears above the navbar on the public-facing website (novusnyc.org)."
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

const PUBLIC_STAT_FIELDS = [
  { key: "homeStudentMembers", label: "Homepage: Student members", source: "Live active-member records" },
  { key: "homeBusinessesSupported", label: "Homepage: Businesses supported", source: "Live business records" },
  { key: "communityOrganizations", label: "All public pages: Community organizations", source: "Live partner-organization records" },
  { key: "homeNetworkLocations", label: "Homepage: Network locations", source: "Exact network-location list" },
  { key: "aboutBusinesses", label: "About: Total businesses", source: "Live business records" },
  { key: "aboutWebsiteProjects", label: "About: Website projects", source: "Live Tech project-track records" },
  { key: "aboutMarketingProjects", label: "About: Marketing projects", source: "Live Marketing project-track records" },
] as const;

type PublicStatFieldKey = (typeof PUBLIC_STAT_FIELDS)[number]["key"];
type PublicStatFieldValues = Record<PublicStatFieldKey, string>;
type PublicStatSnapshotResponse = {
  automaticValues: PublicStatFieldValues;
  effectiveValues: PublicStatFieldValues;
  overrides: Record<string, string>;
};

const MANAGED_PUBLIC_STAT_KEYS = new Set<string>([
  ...PUBLIC_STAT_FIELDS.map((field) => field.key),
  "homeCommunityPartners",
  "aboutCommunityPartners",
]);

function PublicStatsTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [values, setValues] = useState<Partial<PublicStatFieldValues>>({});
  const [automaticValues, setAutomaticValues] = useState<Partial<PublicStatFieldValues>>({});
  const [savedOverrides, setSavedOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getAuthToken();
        const response = await fetch("/api/members/admin/public-stats", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!response.ok) throw new Error("public_stats_load_failed");
        const snapshot = await response.json() as PublicStatSnapshotResponse;
        if (cancelled) return;
        setValues(snapshot.effectiveValues);
        setAutomaticValues(snapshot.automaticValues);
        setSavedOverrides(snapshot.overrides);
      } catch (error) {
        console.error("Failed to load public number values", error);
        if (!cancelled) setStatus("Could not load the current public numbers. Try refreshing this page.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, []);

  const save = async () => {
    setSaving(true);
    setStatus("");
    try {
      const cleaned: Record<string, string> = Object.fromEntries(
        Object.entries(savedOverrides).filter(([key]) => !MANAGED_PUBLIC_STAT_KEYS.has(key)),
      );

      for (const field of PUBLIC_STAT_FIELDS) {
        const value = (values[field.key] ?? "").trim();
        const automaticValue = (automaticValues[field.key] ?? "").trim();
        if (value && value !== automaticValue) cleaned[field.key] = value;
      }

      await updateSiteSettings({ publicStatOverrides: cleaned });
      setSavedOverrides(cleaned);
      setValues(Object.fromEntries(PUBLIC_STAT_FIELDS.map((field) => [
        field.key,
        cleaned[field.key] || automaticValues[field.key] || "",
      ])) as PublicStatFieldValues);
      try {
        const token = await getAuthToken();
        const response = await fetch("/api/members/admin/revalidate", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error("revalidate_failed");
        setStatus("Saved and public pages refreshed. Values matching the automatic count remain automatic.");
      } catch {
        setStatus("Saved, but the public pages could not refresh automatically. Use Refresh public pages under Data & Audit → Backup & recovery.");
      }
    } catch (error) {
      console.error("Failed to save public number overrides", error);
      setStatus("Save failed. Check your admin access and try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex h-24 items-center"><Spinner size="sm" /></div>;

  return (
    <Card title="Public Numbers" subtitle="Each field starts with the value currently shown on the public site. Automatic values are either live counts or explicitly preserved all-time totals, identified under each field. Edit a value to override it, or clear it and save to restore the automatic value.">
      <div className="grid gap-3 sm:grid-cols-2">
        {PUBLIC_STAT_FIELDS.map((field) => {
          const value = values[field.key] ?? "";
          const automaticValue = automaticValues[field.key] ?? "";
          const isAutomatic = !value.trim() || value.trim() === automaticValue;
          const savedValue = savedOverrides[field.key]?.trim() ?? "";
          const hasUnsavedChange = value.trim() !== (savedValue || automaticValue);

          return (
            <Field key={field.key} label={field.label}>
              <Input
                value={value}
                placeholder={automaticValue}
                onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
              />
              <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-[11px] text-white/45">
                <span className={isAutomatic ? "text-emerald-300/80" : "text-n-orange"}>
                  {hasUnsavedChange ? "Unsaved change" : isAutomatic ? "Automatic" : "Override active"}
                </span>
                <span>Automatic value: {automaticValue}</span>
                <span>Source: {field.source}</span>
              </p>
            </Field>
          );
        })}
      </div>
      <div className="mt-5"><SaveBtn saving={saving} onClick={() => void save()} /></div>
      <StatusMsg msg={status} />
    </Card>
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

function ManageFrontendTab() {
  return (
    <div className="space-y-12">
      <section>
        <FrontendSection title="Applications & chapters" subtitle="Control public intake and the locations shown on the application form." />
        <ApplicationsTab />
      </section>
      <section>
        <FrontendSection title="Banners" subtitle="Configure announcement banners shown on the public site and members portal." />
        <BannersTab />
      </section>
      <section>
        <FrontendSection title="Impact numbers" subtitle="Override the numbers shown on the homepage and About page when a verified all-time figure needs to be published." />
        <PublicStatsTab />
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
          <thead className="bg-[#0F1014]">
            <tr className="members-header-sep">
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
            <Select
              value={String(form.points)}
              onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) || 1 }))}
            >
              {POINT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
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
        setTitle(p?.title ?? "Conduct & Infraction Policy");
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
    <div className="space-y-4">
      <div className="max-w-2xl space-y-4">
        <Card title="Conduct & Infraction Policy" subtitle={page?.updatedAt ? `Last saved: ${new Date(page.updatedAt).toLocaleString()}${page.updatedBy ? ` by ${page.updatedBy}` : ""}` : "Edit the handbook page shown to members. Members must acknowledge this page on first login."}>
          <div className="space-y-3">
            <div>
              <label htmlFor="handbook-page-title" className="block text-xs text-white/50 font-body mb-1">Page Title</label>
              <input
                id="handbook-page-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-body focus:outline-none focus:border-[#F6B78D]/50"
                placeholder="Conduct & Infraction Policy"
              />
            </div>
            <div>
              <label id="handbook-content-label" className="block text-xs text-white/50 font-body mb-1">Content</label>
              <RichTextEditor aria-labelledby="handbook-content-label" content={content} onChange={setContent} lightMode={true} />
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
      </div>

      <ResetDialog />

      <div className="pt-2 border-t border-white/8 mt-6">
        <InfractionsTab />
      </div>
    </div>
  );
}

// ── AUDIT LOG TAB ──────────────────────────────────────────────────────────────

function AuditLogTab() {
  return <AdminAuditLog />;
}

function DataAuditTab() {
  const [view, setView] = useState<"audit" | "backup">("audit");
  return (
    <div>
      <div role="tablist" aria-label="Data and audit tools" className="mb-5 flex w-fit rounded-lg border border-white/10 bg-[#1C1F26] p-1">
        <button type="button" role="tab" onClick={() => setView("audit")} aria-selected={view === "audit"} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === "audit" ? "bg-[#F6B78D] text-[#0D0D0D]" : "text-white/50 hover:text-white"}`}>Audit history</button>
        <button type="button" role="tab" onClick={() => setView("backup")} aria-selected={view === "backup"} className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${view === "backup" ? "bg-[#F6B78D] text-[#0D0D0D]" : "text-white/50 hover:text-white"}`}>Backup & recovery</button>
      </div>
      {view === "audit" ? (
        <section>
          <FrontendSection title="Audit history" subtitle="A searchable owner-only record of meaningful changes. Bulk migrations and retired-system noise have been removed." />
          <AuditLogTab />
        </section>
      ) : (
        <section>
          <FrontendSection title="Backup & recovery" subtitle="Download database records or manually refresh cached public pages after a failed automatic refresh." />
          <DataTab />
        </section>
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
    { key: "overview", label: "Overview" },
    { key: "public",   label: "Public & Intake" },
    { key: "policy",   label: "Policy" },
    { key: "data",     label: "Data & Audit" },
  ];

  return (
    <>
      <PageHeader title="Admin" subtitle="Owner controls, system checks, public settings, and policy." />

      <div className="mb-6 flex w-full gap-1 overflow-x-auto rounded-xl border border-white/8 bg-[#1C1F26] p-1 sm:w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => router.push(ADMIN_TAB_HREFS[tab.key])}
            aria-current={activeTab === tab.key ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium font-body transition-colors ${
              activeTab === tab.key ? "bg-[#F6B78D] text-[#0D0D0D]" : "text-white/50 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && <OverviewTab />}
      {activeTab === "public"   && <ManageFrontendTab />}
      {activeTab === "policy"   && <HandbookTab />}
      {activeTab === "data"     && <DataAuditTab />}
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
