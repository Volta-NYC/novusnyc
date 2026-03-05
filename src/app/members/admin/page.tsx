"use client";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeInviteCodes, createInviteCode, deleteInviteCode,
  subscribeUserProfiles, updateUserProfile, deletePortalUserAccount,
  getAuditLogsList, getUserProfilesList, getTeamMembersList, createTeamMember, updateTeamMember,
  type InviteCode, type UserProfile, type AuthRole, type AuditLogEntry, type TeamMember,
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
function isInviteCodeExpired(expiresAt: string): boolean {
  const raw = expiresAt.trim().toLowerCase();
  if (raw === "never") return false;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return true;
  return t < Date.now();
}

function getCodeStatus(code: InviteCode): string {
  if (code.used) return "Used";
  if (isInviteCodeExpired(code.expiresAt)) return "Expired";
  return "Active";
}

// Returns a Tailwind text color class for an invite code status string.
function getCodeStatusColor(status: string): string {
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
              options={["member", "interviewer", "project_lead", "admin"]}
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
        cols={["Code", "Role", "Expires", "Status", "Used By", "Actions"]}
        rows={sortedCodes.map(code => {
          const status = getCodeStatus(code);
          return [
            <span key="code" className="font-mono text-white tracking-widest text-sm">{code.code}</span>,
            <Badge key="role" label={code.role} />,
            <span key="exp" className="text-white/40 text-xs">{code.expiresAt.trim().toLowerCase() === "never" ? "Never" : code.expiresAt}</span>,
            <span key="status" className={`text-xs font-medium ${getCodeStatusColor(status)}`}>{status}</span>,
            <span key="usedBy" className="text-white/30 text-xs">{code.usedBy ?? "—"}</span>,
            <div key="actions" className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => copySignupLink(code.code, code.id)}
                className="text-xs text-[#85CC17]/70 hover:text-[#85CC17] transition-colors font-body"
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
        cols={["Email", "Name", "Role", "Active", "Joined", "Actions"]}
        rows={sortedUsers.map(user => [
          <span key="email" className="text-white text-sm font-mono">{user.email}</span>,
          <span key="name" className="text-white/70 text-sm">{user.name ?? "—"}</span>,
          <select
            key="role"
            value={user.authRole}
            onChange={e => changeRole(user.id, e.target.value as AuthRole)}
            className="bg-[#0F1014] border border-white/10 rounded-lg pl-2 pr-6 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/50"
          >
            <option value="member">member</option>
            <option value="interviewer">interviewer</option>
            <option value="project_lead">project_lead</option>
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
  const [syncingAccounts, setSyncingAccounts] = useState(false);
  const { user } = useAuth();

  const normalizeKey = (v?: string) => (v ?? "").trim().toLowerCase();

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

  const handleSyncAccountsToTeam = async () => {
    if (!user) {
      setStatusMessage("You must be signed in as admin to sync.");
      return;
    }

    setSyncingAccounts(true);
    setStatusMessage("Syncing accounts into team directory…");

    try {
      const [profiles, team] = await Promise.all([
        getUserProfilesList(),
        getTeamMembersList(),
      ]);

      const existingByEmail = new Map<string, TeamMember>();
      const existingByName = new Map<string, TeamMember[]>();

      for (const member of team) {
        const emailKey = normalizeKey(member.email);
        const altEmailKey = normalizeKey(member.alternateEmail);
        const nameKey = normalizeKey(member.name);
        if (emailKey) existingByEmail.set(emailKey, member);
        if (altEmailKey) existingByEmail.set(altEmailKey, member);
        if (nameKey) {
          const arr = existingByName.get(nameKey) ?? [];
          arr.push(member);
          existingByName.set(nameKey, arr);
        }
      }

      let added = 0;
      let updated = 0;
      let skipped = 0;
      let ambiguous = 0;
      const today = new Date().toISOString().split("T")[0];

      for (const profile of profiles) {
        const email = (profile.email ?? "").trim().toLowerCase();
        const name = (profile.name ?? "").trim();
        const school = (profile.school ?? "").trim();
        const grade = (profile.grade ?? "").trim();

        const emailKey = normalizeKey(email);
        const nameKey = normalizeKey(name);
        if (!emailKey && !nameKey) {
          skipped += 1;
          continue;
        }

        let target: TeamMember | undefined = emailKey ? existingByEmail.get(emailKey) : undefined;

        if (!target && nameKey) {
          const sameName = existingByName.get(nameKey) ?? [];
          if (sameName.length === 1) {
            [target] = sameName;
          } else if (sameName.length > 1) {
            ambiguous += 1;
            continue;
          }
        }

        if (target) {
          const patch: Partial<TeamMember> = {};
          if (name && name !== target.name) patch.name = name;
          if (school && school !== target.school) patch.school = school;
          if (grade && grade !== (target.grade ?? "")) patch.grade = grade;

          if (emailKey) {
            const primaryEmailKey = normalizeKey(target.email);
            const altEmailKey = normalizeKey(target.alternateEmail);
            if (emailKey !== primaryEmailKey && emailKey !== altEmailKey) {
              if (!target.email) patch.email = email;
              else if (!target.alternateEmail) patch.alternateEmail = email;
            }
          }

          if (Object.keys(patch).length === 0) {
            skipped += 1;
            continue;
          }

          // eslint-disable-next-line no-await-in-loop
          await updateTeamMember(target.id, patch);
          const merged = { ...target, ...patch } as TeamMember;

          const mergedPrimary = normalizeKey(merged.email);
          const mergedAlt = normalizeKey(merged.alternateEmail);
          const mergedName = normalizeKey(merged.name);
          if (mergedPrimary) existingByEmail.set(mergedPrimary, merged);
          if (mergedAlt) existingByEmail.set(mergedAlt, merged);
          if (mergedName) {
            const arr = (existingByName.get(mergedName) ?? []).filter((m) => m.id !== merged.id);
            arr.push(merged);
            existingByName.set(mergedName, arr);
          }

          updated += 1;
          continue;
        }

        const newMember: Omit<TeamMember, "id" | "createdAt"> = {
          name: name || (email ? email.split("@")[0] : "New Member"),
          email,
          alternateEmail: "",
          school,
          grade,
          divisions: [],
          pod: "",
          role: "Member",
          slackHandle: "",
          status: "Active",
          skills: [],
          joinDate: today,
          notes: "Synced from portal account",
        };

        // eslint-disable-next-line no-await-in-loop
        await createTeamMember(newMember);
        added += 1;
      }

      setStatusMessage(
        `Sync complete: ${added} added, ${updated} updated, ${skipped} unchanged/skipped${
          ambiguous ? `, ${ambiguous} ambiguous name matches skipped` : ""
        }.`
      );
    } catch {
      setStatusMessage("Sync failed. Check Firebase permissions and try again.");
    } finally {
      setSyncingAccounts(false);
    }
  };

  return (
    <div className="max-w-lg space-y-4">
      <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
        <h2 className="font-display font-bold text-white mb-1">Sync Accounts to Team Directory</h2>
        <p className="text-white/40 text-sm mb-4">
          Import/update team members from website account profiles (name, email, school, grade).
        </p>
        <button
          onClick={handleSyncAccountsToTeam}
          disabled={syncingAccounts}
          className="bg-[#85CC17] text-[#0D0D0D] font-display font-bold px-5 py-2.5 rounded-xl hover:bg-[#72b314] transition-colors text-sm disabled:opacity-60"
        >
          {syncingAccounts ? "Syncing..." : "Sync Now"}
        </button>
      </div>
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

// ── TAB: AUDIT LOG ────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const loadLogs = async () => {
      if (!user) return;
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/members/admin/audit?limit=250", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          let apiError = "load_failed";
          try {
            const data = await res.json() as { error?: string };
            if (typeof data.error === "string" && data.error.trim()) {
              apiError = data.error.trim();
            }
          } catch {
            // ignore json parse error
          }
          throw new Error(apiError);
        }
        const data = await res.json() as { logs?: AuditLogEntry[] };
        if (cancelled) return;
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setErrorMessage("");
      } catch (apiErr) {
        if (cancelled) return;
        try {
          const fallbackLogs = await getAuditLogsList();
          if (cancelled) return;
          setLogs(fallbackLogs);
          setErrorMessage("");
        } catch {
          if (cancelled) return;
          setErrorMessage(
            `Could not load audit logs (${apiErr instanceof Error ? apiErr.message : "unknown_error"}).`
          );
        }
      } finally {
        if (cancelled) return;
        setLoadingLogs(false);
      }
    };

    void loadLogs();
    intervalId = setInterval(() => {
      void loadLogs();
    }, 10000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [user]);

  const sortedLogs = [...logs]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 250);

  return (
    <div className="space-y-4">
      <p className="text-white/45 text-sm font-body">
        Latest 250 database changes with actor attribution.
      </p>
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm font-body">
          {errorMessage}
        </div>
      )}
      {loadingLogs && (
        <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-6 text-center text-white/40 text-sm font-body">
          Loading audit logs…
        </div>
      )}
      <Table
        cols={["Time", "Action", "Collection", "Record", "Actor", "Details"]}
        rows={sortedLogs.map((log) => [
          <span key="time" className="text-white/40 text-xs">{log.timestamp.replace("T", " ").slice(0, 19)}</span>,
          <Badge key="action" label={log.action} />,
          <span key="collection" className="text-white/70 text-xs">{log.collection}</span>,
          <span key="record" className="text-white/40 text-xs font-mono">{log.recordId || "—"}</span>,
          <div key="actor" className="text-xs">
            <p className="text-white/60 font-mono">{log.actorEmail || "unknown"}</p>
            <p className="text-white/30">{log.actorUid || "unknown"}</p>
          </div>,
          <span key="details" className="text-white/35 text-xs">
            {log.details ? JSON.stringify(log.details) : "—"}
          </span>,
        ])}
      />
      {sortedLogs.length === 0 && (
        <p className="text-white/30 text-sm text-center py-6 font-body">No audit entries yet.</p>
      )}
    </div>
  );
}

// ── ADMIN CONTENT (inside AuthProvider via MembersLayout) ─────────────────────
// useAuth() must be called from inside MembersLayout's AuthProvider — not from
// the page root, which is outside it.

function AdminContent() {
  const [activeTab, setActiveTab] = useState<"codes" | "users" | "data" | "audit">("codes");
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
    { key: "audit", label: "Audit Log" },
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
      {activeTab === "audit" && <AuditLogTab />}
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
