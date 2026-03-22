"use client";

import { useState, useEffect } from "react";
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

// ── TAB: ACCESS CODES ─────────────────────────────────────────────────────────

function AccessCodesTab({ uid }: { uid: string }) {
  const [codes, setCodes]   = useState<InviteCode[]>([]);
  const [newRole, setNewRole] = useState<AuthRole>("member");
  const [expireDays, setExpireDays] = useState("7");
  const [copiedCodeId, setCopiedCodeId] = useState("");
  const { ask, Dialog } = useConfirm();

  useEffect(() => subscribeInviteCodes(setCodes), []);

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
  const { user } = useAuth();

  const handleExport = async () => {
    if (!user) {
      setStatusMessage("You must be signed in as admin to export.");
      return;
    }

    setStatusMessage("Exporting…");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/members/admin/export", {
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
      link.download = `volta-data-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage("Export complete.");
    } catch {
      setStatusMessage("Export failed. Check admin access and try again.");
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
        <h2 className="font-display font-bold text-white mb-1">Export Data</h2>
        <p className="text-white/40 text-sm mb-4">Download a JSON backup of all portal data.</p>
        <button
          onClick={handleExport}
          className="bg-[#85CC17] text-[#0D0D0D] font-display font-bold px-5 py-2.5 rounded-xl hover:bg-[#72b314] transition-colors text-sm"
        >
          Download Backup
        </button>
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
