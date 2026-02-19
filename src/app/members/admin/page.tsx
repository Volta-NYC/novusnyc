"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, Badge, Btn, Modal, Field, Input, Select, Table, useConfirm } from "@/components/members/ui";
import { getAccessKeys, generateAccessKey, revokeKey, getSession, getUsers, updateUser, deleteUser, canManageKeys, exportAllData, importAllData, type AccessKey, type Role, BOOTSTRAP_ADMIN_KEY } from "@/lib/members/auth";

const ROLES: Role[] = ["admin", "project_lead", "member", "viewer"];

function daysTil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function AdminPage() {
  const session = getSession()!;
  const router = useRouter();

  useEffect(() => {
    if (!canManageKeys(session.role)) router.replace("/members/dashboard");
  }, [session.role, router]);

  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [users, setUsers] = useState<ReturnType<typeof getUsers>>([]);
  const [keyModal, setKeyModal] = useState(false);
  const [newKey, setNewKey] = useState<AccessKey | null>(null);
  const [keyForm, setKeyForm] = useState({ label: "", role: "member" as Role, days: "7", maxUses: "" });
  const [tab, setTab] = useState<"keys" | "users" | "data">("keys");
  const { ask, Dialog } = useConfirm();

  useEffect(() => { setKeys(getAccessKeys()); setUsers(getUsers()); }, []);

  const handleCreateKey = () => {
    const k = generateAccessKey(keyForm.label || "Weekly Key", keyForm.role, parseInt(keyForm.days) || 7,
      keyForm.maxUses ? parseInt(keyForm.maxUses) : null);
    setNewKey(k);
    setKeys(getAccessKeys());
  };

  const handleRevoke = (id: string) => ask(() => { revokeKey(id); setKeys(getAccessKeys()); });
  const handleDeleteUser = (id: string) => ask(() => { deleteUser(id); setUsers(getUsers()); });

  const handleExport = () => {
    const blob = new Blob([exportAllData()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `volta-export-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try { importAllData(ev.target?.result as string); alert("Import successful! Refresh the page."); }
      catch { alert("Import failed — invalid JSON."); }
    };
    reader.readAsText(file);
  };

  return (
    <MembersLayout>
      <Dialog />
      <PageHeader title="Admin Panel" subtitle="Access keys · User management · Data" />

      {/* Tabs */}
      <div className="flex gap-1 bg-[#1C1F26] border border-white/8 rounded-xl p-1 mb-6 w-fit">
        {(["keys", "users", "data"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/40 hover:text-white"}`}>
            {t === "keys" ? "Access Keys" : t === "users" ? "Users" : "Data Export"}
          </button>
        ))}
      </div>

      {tab === "keys" && (
        <div className="space-y-5">
          {/* Bootstrap admin key info */}
          <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-5">
            <p className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-2">Master Bootstrap Key (always valid)</p>
            <code className="text-[#85CC17] font-mono text-sm bg-[#0F1014] px-3 py-1.5 rounded-lg">{BOOTSTRAP_ADMIN_KEY}</code>
            <p className="text-white/30 text-xs mt-2">Use this key on the signup page to create the first admin account. Change the value in <code className="text-white/40">auth.ts</code> to rotate it.</p>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-white/50 text-sm">{keys.length} active access keys</p>
            <Btn variant="primary" onClick={() => { setKeyForm({ label: "", role: "member", days: "7", maxUses: "" }); setNewKey(null); setKeyModal(true); }}>+ Generate Key</Btn>
          </div>

          <Table
            cols={["Label", "Key", "Role", "Expires", "Uses", "Actions"]}
            rows={keys.map(k => {
              const daysLeft = daysTil(k.expiresAt);
              const expired = daysLeft <= 0;
              return [
                <span key="l" className="text-white font-medium">{k.label}</span>,
                <code key="k" className={`font-mono text-sm px-2 py-1 rounded ${expired ? "bg-red-500/10 text-red-400/50" : "bg-[#85CC17]/10 text-[#85CC17]"}`}>{k.key}</code>,
                <Badge key="r" label={k.role} />,
                <span key="e" className={`text-sm ${expired ? "text-red-400" : daysLeft <= 2 ? "text-orange-400" : "text-white/50"}`}>{expired ? "Expired" : `${daysLeft}d left`}</span>,
                <span key="u" className="text-white/40">{k.uses}{k.maxUses !== null ? `/${k.maxUses}` : ""}</span>,
                <Btn key="a" size="sm" variant="danger" onClick={() => handleRevoke(k.id)}>Revoke</Btn>,
              ];
            })}
          />
        </div>
      )}

      {tab === "users" && (
        <Table
          cols={["Name", "Email", "Role", "Joined", "Actions"]}
          rows={users.map(u => [
            <div key="n" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#85CC17]/15 flex items-center justify-center flex-shrink-0">
                <span className="text-[#85CC17] text-xs font-bold">{u.name[0]?.toUpperCase()}</span>
              </div>
              <span className="text-white font-medium">{u.name}{u.id === session.userId && <span className="text-white/30 text-xs ml-1">(you)</span>}</span>
            </div>,
            <span key="e" className="text-white/50">{u.email}</span>,
            <div key="r" className="flex items-center gap-2">
              <Badge label={u.role} />
              {u.id !== session.userId && (
                <select defaultValue={u.role} onChange={e => { updateUser(u.id, { role: e.target.value as Role }); setUsers(getUsers()); }}
                  className="text-xs bg-[#0F1014] border border-white/10 rounded px-2 py-1 text-white/50 focus:outline-none">
                  {ROLES.map(r => <option key={r} value={r}>{r.replace("_"," ")}</option>)}
                </select>
              )}
            </div>,
            <span key="j" className="text-white/30">{new Date(u.createdAt).toLocaleDateString()}</span>,
            u.id !== session.userId ? (
              <Btn key="a" size="sm" variant="danger" onClick={() => handleDeleteUser(u.id)}>Remove</Btn>
            ) : <span key="a" className="text-white/20 text-xs">—</span>,
          ])}
        />
      )}

      {tab === "data" && (
        <div className="space-y-4 max-w-lg">
          <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-6">
            <h3 className="text-white font-bold mb-2">Export All Data</h3>
            <p className="text-white/40 text-sm mb-4">Download a JSON backup of all databases (businesses, projects, tasks, grants, BIDs, team).</p>
            <Btn variant="primary" onClick={handleExport}>⬇ Download Backup</Btn>
          </div>
          <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-6">
            <h3 className="text-white font-bold mb-2">Import Data</h3>
            <p className="text-white/40 text-sm mb-4">Restore from a previously exported JSON file. <strong className="text-orange-400">This overwrites existing records.</strong></p>
            <input type="file" accept=".json" onChange={handleImport} className="text-sm text-white/50 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-white/8 file:text-white/70 hover:file:bg-white/14 file:cursor-pointer" />
          </div>
        </div>
      )}

      {/* Generate key modal */}
      <Modal open={keyModal} onClose={() => setKeyModal(false)} title="Generate Access Key">
        {!newKey ? (
          <div className="space-y-4">
            <Field label="Label (optional)"><Input value={keyForm.label} onChange={e => setKeyForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Spring 2026 Week 3" /></Field>
            <Field label="Role for this key">
              <Select options={ROLES.map(r => r)} value={keyForm.role} onChange={e => setKeyForm(p => ({ ...p, role: e.target.value as Role }))} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Expires in (days)"><Input type="number" min={1} max={90} value={keyForm.days} onChange={e => setKeyForm(p => ({ ...p, days: e.target.value }))} /></Field>
              <Field label="Max uses (blank = unlimited)"><Input type="number" min={1} value={keyForm.maxUses} onChange={e => setKeyForm(p => ({ ...p, maxUses: e.target.value }))} placeholder="unlimited" /></Field>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/8">
              <Btn variant="ghost" onClick={() => setKeyModal(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={handleCreateKey}>Generate Key</Btn>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-white/50 text-sm">Share this key in Slack. It expires in {keyForm.days} days.</p>
            <div className="bg-[#0F1014] border border-[#85CC17]/30 rounded-xl p-5">
              <p className="text-[#85CC17] font-mono text-2xl font-bold tracking-widest">{newKey.key}</p>
            </div>
            <p className="text-white/30 text-xs">Role: <span className="text-white/60">{newKey.role}</span> · Expires: <span className="text-white/60">{new Date(newKey.expiresAt).toLocaleDateString()}</span></p>
            <Btn variant="secondary" onClick={() => { navigator.clipboard.writeText(newKey.key); }}>Copy Key</Btn>
            <div className="pt-3 border-t border-white/8">
              <Btn variant="ghost" onClick={() => setKeyModal(false)}>Done</Btn>
            </div>
          </div>
        )}
      </Modal>
    </MembersLayout>
  );
}
