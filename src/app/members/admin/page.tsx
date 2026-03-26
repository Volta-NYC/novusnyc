"use client";

import { useState, useEffect, useCallback } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeInviteCodes, createInviteCode, deleteInviteCode,
  subscribeUserProfiles, updateUserProfile, deletePortalUserAccount,
  type InviteCode, type UserProfile, type AuthRole,
} from "@/lib/members/storage";
import { Btn, Badge, Table, Field, Select, useConfirm } from "@/components/members/ui";
import { useRouter } from "next/navigation";

// ── INVITE CODE HELPERS ───────────────────────────────────────────────────────

// Generates a random invite code like "VOLTA-A3BX7M".
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const suffix = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `VOLTA-${suffix}`;
}

// Returns a display string for the current state of an invite code.
function isInviteCodeExpired(expiresAt?: string): boolean {
  const value = String(expiresAt ?? "");
  const raw = value.trim().toLowerCase();
  if (raw === "never") return false;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return true;
  return t < Date.now();
}

function getCodeStatus(code: InviteCode): string {
  if (code.active === false) return "Inactive";
  if (isInviteCodeExpired(code.expiresAt)) return "Expired";
  const isSingleUse = code.multiUse === false;
  const signupCount = getSignupCount(code);
  if (isSingleUse && (code.used || signupCount > 0)) return "Used";
  return "Active";
}

function getSignupCount(code: InviteCode): number {
  const count = Number(code.signupCount);
  if (Number.isFinite(count) && count >= 0) return Math.trunc(count);
  return code.used || !!code.usedBy ? 1 : 0;
}

function getSourceLabel(code: InviteCode): string {
  return code.source === "auto_rotation" ? "Auto (3-day)" : "Manual";
}

// Returns a Tailwind text color class for an invite code status string.
function getCodeStatusColor(status: string): string {
  if (status === "Inactive") return "text-white/40";
  if (status === "Used")    return "text-white/30";
  if (status === "Expired") return "text-orange-400";
  return "text-green-400";
}

const EXPORT_OPTIONS = [
  { key: "businesses", label: "Businesses" },
  { key: "projects", label: "Projects (legacy collection)" },
  { key: "financeAssignments", label: "Finance Assignments" },
  { key: "members", label: "Member List" },
  { key: "applicants", label: "Applicants" },
  { key: "bids", label: "BIDs" },
  { key: "interviews", label: "Interview Slots" },
  { key: "grants", label: "Grant Library" },
  { key: "calendar", label: "Calendar Events" },
  { key: "users", label: "Portal Users" },
  { key: "inviteCodes", label: "Invite Codes" },
] as const;

type ExportOptionKey = (typeof EXPORT_OPTIONS)[number]["key"];

// ── TAB: ACCESS CODES ─────────────────────────────────────────────────────────

function AccessCodesTab({ uid }: { uid: string }) {
  const [codes, setCodes]   = useState<InviteCode[]>([]);
  const [newRole, setNewRole] = useState<AuthRole>("member");
  const [expireDays, setExpireDays] = useState("7");
  const [copiedCodeId, setCopiedCodeId] = useState("");
  const { user } = useAuth();
  const { ask, Dialog } = useConfirm();

  useEffect(() => subscribeInviteCodes(setCodes), []);

  const ensureRotatingInviteCode = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await fetch("/api/members/admin/ensure-rotating-invite", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
    } catch {
      // Keep invite code UI usable even if ensure call fails.
    }
  }, [user]);

  useEffect(() => {
    void ensureRotatingInviteCode();
    const timer = window.setInterval(() => {
      void ensureRotatingInviteCode();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [ensureRotatingInviteCode]);

  const handleGenerate = async () => {
    const code      = generateInviteCode();
    const expiresAt = expireDays === "Never"
      ? "never"
      : new Date(Date.now() + parseInt(expireDays, 10) * 86400000).toISOString().split("T")[0];
    await createInviteCode({
      code,
      role:      newRole,
      expiresAt,
      used:      false,
      multiUse:  true,
      active:    true,
      source:    "manual",
      signupCount: 0,
      createdBy: uid,
      createdAt: new Date().toISOString(),
    });
  };

  const copySignupLink = (codeText: string, id: string) => {
    const signupLink = `${window.location.origin}/members/signup?code=${encodeURIComponent(codeText)}`;
    navigator.clipboard.writeText(signupLink);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(""), 2000);
  };

  // Display newest codes first.
  const sortedCodes = [...codes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="space-y-5">
      <Dialog />

      {/* Code generator form */}
      <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
        <h3 className="font-display font-bold text-white text-sm mb-4">Generate New Invite Code</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <Field label="Role">
            <Select
              options={["member", "interviewer", "admin"]}
              value={newRole}
              onChange={e => setNewRole(e.target.value as AuthRole)}
            />
          </Field>
          <Field label="Expires in">
            <Select
              options={["1", "3", "7", "14", "30", "Never"]}
              value={expireDays}
              onChange={e => setExpireDays(e.target.value)}
            />
          </Field>
          <Btn variant="primary" onClick={handleGenerate}>Generate Code</Btn>
        </div>
      </div>

      {/* Existing codes table */}
      <Table
        cols={["Code", "Accounts", "Role", "Source", "Expires", "Status", "Actions"]}
        rows={sortedCodes.map(code => {
          const status = getCodeStatus(code);
          const expiresValue = String(code.expiresAt ?? "").trim();
          return [
            <span key="code" className="font-mono text-white tracking-widest text-sm whitespace-nowrap">{code.code}</span>,
            <span key="count" className="text-xs text-white/80 whitespace-nowrap">{getSignupCount(code)}</span>,
            <Badge key="role" label={code.role} />,
            <span key="source" className="text-xs text-white/60 whitespace-nowrap">{getSourceLabel(code)}</span>,
            <span key="exp" className="text-white/70 text-xs whitespace-nowrap">{expiresValue.toLowerCase() === "never" ? "Never" : (expiresValue || "—")}</span>,
            <span key="status" className={`text-xs font-medium ${getCodeStatusColor(status)}`}>{status}</span>,
            <div key="actions" className="flex gap-2">
              <button
                onClick={() => copySignupLink(code.code, code.id)}
                className="text-xs text-[#85CC17]/80 hover:text-[#85CC17] transition-colors font-body whitespace-nowrap"
              >
                {copiedCodeId === code.id ? "Copied!" : "Copy Link"}
              </button>
              <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteInviteCode(code.id))}>Delete</Btn>
            </div>,
          ];
        })}
      />
      {codes.length === 0 && (
        <p className="text-white/30 text-sm text-center py-6 font-body">No invite codes yet. Generate one above.</p>
      )}
    </div>
  );
}

// ── TAB: USERS ────────────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const { ask, Dialog } = useConfirm();

  useEffect(() => subscribeUserProfiles(setUsers), []);

  const changeRole = async (uid: string, role: AuthRole) => {
    await updateUserProfile(uid, { authRole: role });
  };

  const toggleActive = async (uid: string, currentlyActive: boolean) => {
    await updateUserProfile(uid, { active: !currentlyActive });
  };

  const handleDelete = (user: UserProfile) => {
    ask(
      async () => deletePortalUserAccount(user.id),
      `Delete ${user.email}? This removes both the Firebase Auth account and the portal user profile. They will not be able to sign in again unless a new account is created.`
    );
  };

  // Display users in the order they joined.
  const sortedUsers = [...users].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return (
    <>
      <Dialog />
      <Table
        cols={["Name", "Email", "Role", "Active", "Joined", "Actions"]}
        rows={sortedUsers.map(user => [
          <span key="name" className="text-white/70 text-sm">{user.name ?? "—"}</span>,
          <span key="email" className="text-white text-sm font-mono">{user.email}</span>,
          <select
            key="role"
            value={user.authRole}
            onChange={e => changeRole(user.id, e.target.value as AuthRole)}
            className="bg-[#0F1014] border border-white/10 rounded-lg pl-2 pr-6 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/50"
          >
            <option value="member">member</option>
            <option value="interviewer">interviewer</option>
            <option value="admin">admin</option>
          </select>,
          <span key="active" className={`text-xs font-medium ${user.active ? "text-green-400" : "text-red-400"}`}>
            {user.active ? "Active" : "Disabled"}
          </span>,
          <span key="joined" className="text-white/30 text-xs">{user.createdAt?.split("T")[0] ?? "—"}</span>,
          <div key="actions" className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => toggleActive(user.id, user.active)}
              className={`text-xs font-body transition-colors ${
                user.active ? "text-red-400/70 hover:text-red-400" : "text-green-400/70 hover:text-green-400"
              }`}
            >
              {user.active ? "Disable" : "Enable"}
            </button>
            <Btn size="sm" variant="danger" onClick={() => handleDelete(user)}>Delete</Btn>
          </div>,
        ])}
      />
    </>
  );
}

// ── TAB: DATA ─────────────────────────────────────────────────────────────────

function DataTab() {
  const [statusMessage, setStatusMessage] = useState("");
  const [selectedSections, setSelectedSections] = useState<ExportOptionKey[]>([]);
  const { user } = useAuth();

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
      const token = await user.getIdToken();
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

// ── ADMIN CONTENT (inside AuthProvider via MembersLayout) ─────────────────────
// useAuth() must be called from inside MembersLayout's AuthProvider — not from
// the page root, which is outside it.

function AdminContent() {
  const [activeTab, setActiveTab] = useState<"codes" | "users" | "data">("codes");
  const { user, authRole, loading } = useAuth();
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
    { key: "codes", label: "Access Codes" },
    { key: "users", label: "Users" },
    { key: "data",  label: "Data" },
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

      {activeTab === "codes" && <AccessCodesTab uid={user?.uid ?? ""} />}
      {activeTab === "users" && <UsersTab />}
      {activeTab === "data"  && <DataTab />}
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
