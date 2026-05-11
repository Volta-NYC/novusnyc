"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";

import { useRouter } from "next/navigation";
import { getHandbookPage, upsertHandbookPage, type HandbookPage } from "@/lib/members/storage";

const EXPORT_OPTIONS = [
  { key: "businesses", label: "Businesses" },
  { key: "financeAssignments", label: "Finance Assignments" },
  { key: "members", label: "Member List" },
  { key: "applicants", label: "Applicants" },
  { key: "bids", label: "BIDs" },
  { key: "interviews", label: "Interview Slots" },
  { key: "calendar", label: "Calendar Events" },
] as const;

type ExportOptionKey = (typeof EXPORT_OPTIONS)[number]["key"];

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
    if (!user) {
      setStatusMessage("You must be signed in as admin to export.");
      return;
    }

    setStatusMessage("Exporting…");
    try {
      const token = await getAuthToken();
      const query = sections && sections.length > 0
        ? `?sections=${encodeURIComponent(sections.join(","))}`
        : "";
      const res = await fetch(`/api/members/admin/export${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("export_failed");
      }

      const data = await res.json() as Record<string, unknown>;
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url  = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href     = url;
      const date = new Date().toISOString().split("T")[0];
      const suffix = sections && sections.length > 0 ? `-${sections.join("-")}` : "-full";
      link.download = `volta-data-${date}${suffix}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage(
        sections && sections.length > 0
          ? `Export complete (${sections.length} section${sections.length === 1 ? "" : "s"}).`
          : "Export complete (full backup).",
      );
    } catch {
      setStatusMessage("Export failed. Check admin access and try again.");
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
        <h2 className="font-display font-bold text-white mb-1">Public Stats</h2>
        <p className="text-white/40 text-sm mb-4">Refresh the cached data shown on the public showcase, home, and about pages.</p>
        <button
          onClick={() => void handleRevalidate()}
          disabled={revalidating}
          className={`font-display font-bold px-5 py-2.5 rounded-xl transition-colors text-sm ${
            revalidating
              ? "bg-white/10 text-white/35 cursor-not-allowed"
              : "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"
          }`}
        >
          {revalidating ? "Refreshing…" : "Update All Stats"}
        </button>
      </div>

      <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
        <h2 className="font-display font-bold text-white mb-1">Export Data</h2>
        <p className="text-white/40 text-sm mb-4">Download a full JSON backup, or export selected datasets only.</p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => void handleExport()}
            className="bg-[#85CC17] text-[#0D0D0D] font-display font-bold px-5 py-2.5 rounded-xl hover:bg-[#72b314] transition-colors text-sm"
          >
            Download Full Backup
          </button>
        </div>

        <div className="border border-white/10 rounded-lg p-3 bg-[#0F1014]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide text-white/45">Select Data Sections</p>
            <div className="flex gap-3 text-[11px]">
              <button
                type="button"
                className="text-[#85CC17]/80 hover:text-[#85CC17] transition-colors"
                onClick={() => setSelectedSections(EXPORT_OPTIONS.map((opt) => opt.key))}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-red-300/80 hover:text-red-300 transition-colors"
                onClick={() => setSelectedSections([])}
              >
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXPORT_OPTIONS.map((option) => (
              <label key={option.key} className="inline-flex items-center gap-2 text-xs text-white/80">
                <input
                  type="checkbox"
                  className="members-checkbox"
                  checked={selectedSections.includes(option.key)}
                  onChange={() => toggleSection(option.key)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-white/45">
              {selectedSections.length} selected
            </span>
            <button
              onClick={() => void handleExport(selectedSections)}
              disabled={selectedSections.length === 0}
              className={`font-display font-bold px-4 py-2 rounded-lg transition-colors text-xs ${
                selectedSections.length === 0
                  ? "bg-white/10 text-white/35 cursor-not-allowed"
                  : "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"
              }`}
            >
              Download Selected
            </button>
          </div>
        </div>
      </div>
      {statusMessage && (
        <div className="bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/60 text-sm font-body">
          {statusMessage}
        </div>
      )}
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
      // Refresh the page record
      const updated = await getHandbookPage("credit-infraction-policy");
      setPage(updated);
    } catch {
      setStatusMessage("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-4">
      <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
        <h2 className="font-display font-bold text-white mb-1">Credit &amp; Infraction Policy</h2>
        <p className="text-white/40 text-sm mb-4">
          Edit the handbook page shown to members. Members must acknowledge this page on first login.
          {page?.updatedAt && (
            <span className="block mt-1 text-white/25 text-xs">
              Last saved: {new Date(page.updatedAt).toLocaleString()}
              {page.updatedBy ? ` by ${page.updatedBy}` : ""}
            </span>
          )}
        </p>

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

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className={`font-display font-bold px-5 py-2.5 rounded-xl transition-colors text-sm ${
              saving
                ? "bg-white/10 text-white/35 cursor-not-allowed"
                : "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"
            }`}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {statusMessage && (
          <div className="mt-3 bg-white/5 border border-white/8 rounded-lg px-4 py-2.5 text-white/60 text-sm font-body">
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}

// ── ADMIN CONTENT (inside AuthProvider via MembersLayout) ─────────────────────
// useAuth() must be called from inside MembersLayout's AuthProvider — not from
// the page root, which is outside it.

function AdminContent() {
  const [activeTab, setActiveTab] = useState<"users" | "data" | "handbook">("users");
  const { authRole, loading } = useAuth();
  const router = useRouter();

  // Redirect non-admins away from this page.
  useEffect(() => {
    if (!loading && authRole !== "admin") {
      router.replace("/members/projects");
    }
  }, [authRole, loading, router]);

  if (loading || authRole !== "admin") {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
      </div>
    );
  }

  const TABS: { key: typeof activeTab; label: string }[] = [
    { key: "data",     label: "Data" },
    { key: "handbook", label: "Handbook" },
  ];

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display font-bold text-white text-2xl">Admin</h1>
        <p className="text-white/40 text-sm mt-1">Manage access, users, and data.</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#1C1F26] border border-white/8 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium font-body transition-colors ${
              activeTab === tab.key ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/50 hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "data"     && <DataTab />}
      {activeTab === "handbook" && <HandbookTab />}
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
