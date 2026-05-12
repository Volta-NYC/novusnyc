"use client";

// Infractions catalog — renders as a tab on the Members page. Defines the *types*
// of infractions and their point values. Severity is implicit in the points
// (1 = minor, 2 = major, 3 = severe). Sort is fixed: points low→high, name A→Z.
//
// Also doubles as the "Issue infraction" entry point when navigated to with
// ?memberId=<id>&memberName=<name> query params (from MemberDrawer).

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { MEMBERS_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, TextArea, Empty, useConfirm,
} from "@/components/members/ui";
import {
  subscribeInfractions, subscribeCycles, subscribeTeam,
  createInfraction, updateInfraction, deleteInfraction, createMemberStrike,
  type Infraction, type Cycle, type TeamMember,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

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

const BLANK_FORM: Omit<Infraction, "id" | "createdAt" | "updatedAt"> = {
  name: "",
  description: "",
  points: 1,
};

function InfractionsPageInner() {
  const { authRole, loading, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ask, Dialog } = useConfirm();

  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Infraction | null>(null);
  const [form, setForm] = useState(BLANK_FORM);

  // Issue-infraction form state
  const [issueInfractionId, setIssueInfractionId] = useState("");
  const [issueMemberId, setIssueMemberId] = useState("");
  const [issueNote, setIssueNote] = useState("");
  const [issuePointsOverride, setIssuePointsOverride] = useState("");
  const [issueStatus, setIssueStatus] = useState<"idle" | "busy" | "done" | "error">("idle");

  useEffect(() => {
    if (!loading && authRole !== "owner") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeInfractions(setInfractions), []);
  useEffect(() => subscribeCycles(setCycles), []);
  useEffect(() => subscribeTeam(setTeam), []);

  // Pre-select member from query params (navigated from MemberDrawer)
  useEffect(() => {
    const memberId = searchParams.get("memberId");
    if (memberId) setIssueMemberId(memberId);
  }, [searchParams]);

  // Fixed sort: by points (low→high), then by name (A→Z). No other sort needed.
  const sorted = useMemo(() => {
    return [...infractions].sort((a, b) => (a.points - b.points) || a.name.localeCompare(b.name));
  }, [infractions]);

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setEditing(null);
    setModal("create");
  };

  const openEdit = (i: Infraction) => {
    setForm({
      name: i.name,
      description: i.description,
      points: i.points,
    });
    setEditing(i);
    setModal("edit");
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) return;
    const payload = {
      name,
      description: form.description.trim(),
      points: Math.max(1, Math.min(3, Math.round(form.points || 1))),
    };
    if (editing) await updateInfraction(editing.id, payload);
    else await createInfraction(payload);
    setModal(null);
  };

  const handleDelete = async () => {
    if (!editing) return;
    await ask(
      async () => {
        await deleteInfraction(editing.id);
        setModal(null);
      },
      `Delete "${editing.name}"? This permanently removes the infraction type. Strikes already issued under this name keep their record.`,
    );
  };

  const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);

  const handleIssueStrike = async () => {
    const infraction = sorted.find((i) => i.id === issueInfractionId);
    const member = team.find((m) => m.id === issueMemberId);
    if (!infraction || !member || !activeCycle) return;
    setIssueStatus("busy");
    try {
      const points = issuePointsOverride.trim()
        ? Math.max(0, Number(issuePointsOverride) || 0)
        : infraction.points;
      await createMemberStrike({
        memberId: member.id,
        memberName: member.name,
        cycleId: activeCycle.id,
        infractionId: infraction.id,
        infractionName: infraction.name,
        points,
        issuedBy: user?.email ?? "admin",
        note: issueNote.trim(),
        source: "manual",
      });
      setIssueStatus("done");
      setIssueInfractionId("");
      setIssueNote("");
      setIssuePointsOverride("");
    } catch {
      setIssueStatus("error");
    }
  };

  if (loading || authRole !== "owner") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={MEMBERS_GROUP_TABS} />

      <PageHeader
        title="Infractions"
        subtitle="Catalog of infraction types and their point values. Members see this list on their dashboard rules card."
        action={<Btn variant="primary" onClick={openCreate}>+ New Infraction</Btn>}
      />

      {/* Issue infraction to member */}
      <section className="rounded-2xl border border-white/10 bg-[#13161D] p-5">
        <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-3">Issue infraction to member</p>
        {!activeCycle ? (
          <p className="text-xs text-white/45">No active cycle — infractions can only be issued during an active cycle.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Member" required>
              <select
                value={issueMemberId}
                onChange={(e) => { setIssueMemberId(e.target.value); setIssueStatus("idle"); }}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              >
                <option value="">— Select member —</option>
                {[...team].sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "")).map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Infraction" required>
              <select
                value={issueInfractionId}
                onChange={(e) => { setIssueInfractionId(e.target.value); setIssueStatus("idle"); }}
                className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              >
                <option value="">— Select infraction —</option>
                {sorted.map((i) => (
                  <option key={i.id} value={i.id}>{i.name} ({i.points} pt{i.points === 1 ? "" : "s"})</option>
                ))}
              </select>
            </Field>
            <Field label="Points override (optional)">
              <Input
                type="number"
                min="0"
                value={issuePointsOverride}
                onChange={(e) => setIssuePointsOverride(e.target.value)}
                placeholder={sorted.find((i) => i.id === issueInfractionId)?.points?.toString() ?? "default"}
              />
            </Field>
            <Field label="Note (optional)">
              <Input
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder="Context for this infraction…"
              />
            </Field>
          </div>
        )}
        {activeCycle && (
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/8">
            <Btn
              variant="primary"
              disabled={!issueMemberId || !issueInfractionId || issueStatus === "busy"}
              onClick={() => void handleIssueStrike()}
            >
              {issueStatus === "busy" ? "Issuing…" : "Issue infraction"}
            </Btn>
            {issueStatus === "done" && <span className="text-xs text-emerald-400">✓ Issued successfully</span>}
            {issueStatus === "error" && <span className="text-xs text-red-400">Failed — try again</span>}
          </div>
        )}
      </section>

      <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[28%]">Name</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45">Description</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[100px]">Points</th>
              <th className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[100px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((i) => (
              <tr key={i.id} className="border-b border-white/8 align-top hover:bg-white/[0.03]">
                <td className="px-3 py-2.5 text-sm text-white/90 break-words">{i.name}</td>
                <td className="px-3 py-2.5 text-xs text-white/65 break-words">
                  {i.description || <span className="text-white/30">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${POINTS_PILL[i.points] ?? ""}`}>
                    {i.points} pt{i.points === 1 ? "" : "s"}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <Btn size="sm" variant="secondary" onClick={() => openEdit(i)}>Edit</Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="p-6">
            <Empty
              message="No infractions in the catalog yet."
              action={<Btn variant="primary" onClick={openCreate}>+ New Infraction</Btn>}
            />
          </div>
        )}
      </div>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editing ? "Edit Infraction" : "New Infraction"}
      >
        <div className="space-y-4">
          <Field label="Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Did not respond to email within 48 hours"
            />
          </Field>
          <Field label="Description">
            <TextArea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="When this should be issued — guidance for the admin issuing it."
            />
          </Field>
          <Field label="Points" required>
            <select
              value={String(form.points)}
              onChange={(e) => setForm((p) => ({ ...p, points: Number(e.target.value) || 1 }))}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              {POINT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <p className="text-[11px] text-white/40 mt-1.5">
              Severity is implicit in the points value: 1 minor, 2 major, 3 severe.
            </p>
          </Field>
        </div>
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
          <div>
            {editing && <Btn variant="danger" onClick={() => void handleDelete()}>Delete</Btn>}
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.name.trim()}>
              {editing ? "Save" : "Create"}
            </Btn>
          </div>
        </div>
      </Modal>
    </MembersLayout>
  );
}

export default function InfractionsPage() {
  return (
    <Suspense>
      <InfractionsPageInner />
    </Suspense>
  );
}
