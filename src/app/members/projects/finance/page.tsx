"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import ProjectsTabs from "@/components/members/ProjectsTabs";
import {
  PageHeader,
  SearchBar,
  Badge,
  Btn,
  Modal,
  Field,
  Input,
  Select,
  TextArea,
  StatCard,
  Table,
  AutocompleteTagInput,
  useConfirm,
} from "@/components/members/ui";
import {
  subscribeFinanceAssignments,
  createFinanceAssignment,
  updateFinanceAssignment,
  deleteFinanceAssignment,
  subscribeTeam,
  type FinanceAssignment,
  type TeamMember,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const ASSIGNMENT_TYPES = ["Report", "Business Case Study"] as const;
const STATUSES = ["Upcoming", "Ongoing", "Completed", "On Hold"] as const;

const BLANK_FORM: Omit<FinanceAssignment, "id" | "createdAt" | "updatedAt"> = {
  type: "Report",
  title: "",
  topic: "",
  teamLabel: "",
  region: "",
  assignedMemberNames: [],
  assignedMemberIds: [],
  interviewDueDate: "",
  firstDraftDueDate: "",
  finalDueDate: "",
  deliverableUrl: "",
  status: "Upcoming",
  notes: "",
};

function normalizeDateForSort(value: string | undefined): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

function formatDeadlineLabel(item: FinanceAssignment): string {
  if (item.type === "Report") {
    const first = item.firstDraftDueDate ? `Draft: ${item.firstDraftDueDate}` : "";
    const final = item.finalDueDate ? `Final: ${item.finalDueDate}` : "";
    return [first, final].filter(Boolean).join(" · ") || "—";
  }
  const interview = item.interviewDueDate ? `Interview: ${item.interviewDueDate}` : "";
  const final = item.finalDueDate ? `Final: ${item.finalDueDate}` : "";
  return [interview, final].filter(Boolean).join(" · ") || "—";
}

export default function FinanceAssignmentsPage() {
  const [assignments, setAssignments] = useState<FinanceAssignment[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<FinanceAssignment | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const { ask, Dialog } = useConfirm();
  const { authRole } = useAuth();
  const router = useRouter();

  const canEdit = authRole === "admin";

  useEffect(() => {
    if (authRole && authRole !== "admin") {
      router.replace("/members/dashboard");
    }
  }, [authRole, router]);

  useEffect(() => subscribeFinanceAssignments(setAssignments), []);
  useEffect(() => subscribeTeam(setTeam), []);

  const memberNameOptions = useMemo(
    () =>
      Array.from(
        new Set(
          team
            .map((member) => String(member.name ?? "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [team]
  );

  const memberIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const member of team) {
      const name = String(member.name ?? "").trim();
      if (!name || !member.id) continue;
      map.set(name.toLowerCase(), member.id);
    }
    return map;
  }, [team]);

  const setField = (key: keyof typeof form, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setEditingAssignment(null);
    setModal("create");
  };

  const openEdit = (item: FinanceAssignment) => {
    setForm({
      type: item.type,
      title: item.title,
      topic: item.topic,
      teamLabel: item.teamLabel ?? "",
      region: item.region ?? "",
      assignedMemberNames: item.assignedMemberNames ?? [],
      assignedMemberIds: item.assignedMemberIds ?? [],
      interviewDueDate: item.interviewDueDate ?? "",
      firstDraftDueDate: item.firstDraftDueDate ?? "",
      finalDueDate: item.finalDueDate ?? "",
      deliverableUrl: item.deliverableUrl ?? "",
      status: item.status,
      notes: item.notes ?? "",
    });
    setEditingAssignment(item);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.topic.trim()) return;
    const normalizedMemberNames = (form.assignedMemberNames ?? [])
      .map((name) => String(name ?? "").trim())
      .filter(Boolean);
    const normalizedMemberIds = normalizedMemberNames
      .map((name) => memberIdByName.get(name.toLowerCase()) ?? "")
      .filter(Boolean);
    const payload: Omit<FinanceAssignment, "id" | "createdAt" | "updatedAt"> = {
      ...form,
      title: form.title.trim(),
      topic: form.topic.trim(),
      teamLabel: String(form.teamLabel ?? "").trim(),
      region: String(form.region ?? "").trim(),
      assignedMemberNames: normalizedMemberNames,
      assignedMemberIds: normalizedMemberIds,
      interviewDueDate: String(form.interviewDueDate ?? "").trim(),
      firstDraftDueDate: String(form.firstDraftDueDate ?? "").trim(),
      finalDueDate: String(form.finalDueDate ?? "").trim(),
      deliverableUrl: String(form.deliverableUrl ?? "").trim(),
      notes: String(form.notes ?? "").trim(),
    };

    if (editingAssignment) {
      await updateFinanceAssignment(editingAssignment.id, payload);
    } else {
      await createFinanceAssignment(payload);
    }
    setModal(null);
  };

  const filtered = assignments
    .filter((item) => {
      if (filterType && item.type !== filterType) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return [
        item.title,
        item.topic,
        item.teamLabel,
        item.region,
        ...(item.assignedMemberNames ?? []),
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const aDate = normalizeDateForSort(a.finalDueDate || a.firstDraftDueDate || a.interviewDueDate);
      const bDate = normalizeDateForSort(b.finalDueDate || b.firstDraftDueDate || b.interviewDueDate);
      if (aDate !== bDate) return aDate - bDate;
      return String(a.title ?? "").localeCompare(String(b.title ?? ""));
    });

  const reportCount = assignments.filter((item) => item.type === "Report").length;
  const caseStudyCount = assignments.filter((item) => item.type === "Business Case Study").length;
  const ongoingCount = assignments.filter((item) => item.status === "Ongoing").length;
  const completedCount = assignments.filter((item) => item.status === "Completed").length;

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Finance Assignments"
        subtitle={`${filtered.length} shown · ${assignments.length} total assignments`}
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn> : undefined}
      />
      <ProjectsTabs />

      <p className="text-sm text-white/50 mb-4">
        Track long-form finance workstreams (reports + business case studies), including team members, deadlines, and publication progress.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <StatCard label="Reports" value={reportCount} color="text-blue-300" />
        <StatCard label="Case Studies" value={caseStudyCount} color="text-emerald-300" />
        <StatCard label="Ongoing" value={ongoingCount} color="text-green-400" />
        <StatCard label="Completed" value={completedCount} color="text-violet-300" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search title, topic, team, member…" />
        <div className="min-w-[180px]">
          <Select
            options={ASSIGNMENT_TYPES}
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
            emptyLabel="All types"
          />
        </div>
        <div className="min-w-[160px]">
          <Select
            options={STATUSES}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            emptyLabel="All statuses"
          />
        </div>
      </div>

      <Table
        cols={["Type", "Assignment", "Team / Region", "Members", "Deadlines", "Status", "Actions"]}
        rows={filtered.map((item) => [
          <span key="type" className="text-white/80">{item.type}</span>,
          <div key="assignment" className="min-w-[240px]">
            <p className="text-white font-medium">{item.title}</p>
            <p className="text-xs text-white/45">{item.topic}</p>
          </div>,
          <div key="team" className="min-w-[170px]">
            <p className="text-white/80">{item.teamLabel || "—"}</p>
            <p className="text-xs text-white/45">{item.region || "—"}</p>
          </div>,
          <div key="members" className="min-w-[220px]" title={(item.assignedMemberNames ?? []).join(", ")}>
            <span className="text-white/70 text-xs">
              {(item.assignedMemberNames ?? []).length > 0 ? (item.assignedMemberNames ?? []).join(", ") : "—"}
            </span>
          </div>,
          <span key="deadlines" className="text-xs text-white/70 min-w-[210px]">{formatDeadlineLabel(item)}</span>,
          <Badge key="status" label={item.status} />,
          <div key="actions" className="flex items-center gap-2">
            {canEdit ? (
              <>
                <Btn size="sm" variant="secondary" onClick={() => openEdit(item)}>Edit</Btn>
                <Btn
                  size="sm"
                  variant="danger"
                  onClick={() => ask(
                    async () => deleteFinanceAssignment(item.id),
                    `Delete "${item.title}"? This cannot be undone.`
                  )}
                >
                  Delete
                </Btn>
              </>
            ) : (
              <span className="text-white/35 text-xs">View only</span>
            )}
          </div>,
        ])}
      />

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editingAssignment ? "Edit Finance Assignment" : "New Finance Assignment"}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[68vh] overflow-y-auto pr-2">
          <Field label="Assignment Type" required>
            <Select
              options={ASSIGNMENT_TYPES}
              value={form.type}
              onChange={(event) => setField("type", event.target.value as FinanceAssignment["type"])}
              emptyLabel="Select type"
            />
          </Field>
          <Field label="Status" required>
            <Select
              options={STATUSES}
              value={form.status}
              onChange={(event) => setField("status", event.target.value as FinanceAssignment["status"])}
              emptyLabel="Select status"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Assignment Title" required>
              <Input
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder={form.type === "Report" ? "e.g., Practical Guide: Customer Loyalty Programs" : "e.g., Business Case Study — Stuy 1"}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Topic / Focus" required>
              <TextArea
                rows={2}
                value={form.topic}
                onChange={(event) => setField("topic", event.target.value)}
                placeholder="What this assignment should cover."
              />
            </Field>
          </div>

          <Field label="Team / Group Label">
            <Input
              value={form.teamLabel}
              onChange={(event) => setField("teamLabel", event.target.value)}
              placeholder={form.type === "Report" ? "e.g., Reports" : "e.g., Stuy 1"}
            />
          </Field>
          <Field label="Region / School Cohort">
            <Input
              value={form.region}
              onChange={(event) => setField("region", event.target.value)}
              placeholder={form.type === "Report" ? "Optional" : "e.g., Manhattan Hunter"}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Assigned Members">
              <AutocompleteTagInput
                values={form.assignedMemberNames ?? []}
                onChange={(values) => setField("assignedMemberNames", values)}
                options={memberNameOptions}
                commitOnBlur
                placeholder="Type member names, then Enter/comma"
              />
            </Field>
          </div>

          {form.type === "Business Case Study" ? (
            <Field label="Interview Due Date">
              <Input
                type="date"
                value={form.interviewDueDate ?? ""}
                onChange={(event) => setField("interviewDueDate", event.target.value)}
              />
            </Field>
          ) : (
            <Field label="First Draft Due Date">
              <Input
                type="date"
                value={form.firstDraftDueDate ?? ""}
                onChange={(event) => setField("firstDraftDueDate", event.target.value)}
              />
            </Field>
          )}

          <Field label="Final Due Date">
            <Input
              type="date"
              value={form.finalDueDate ?? ""}
              onChange={(event) => setField("finalDueDate", event.target.value)}
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Deliverable Link (Google Doc)">
              <Input
                value={form.deliverableUrl ?? ""}
                onChange={(event) => setField("deliverableUrl", event.target.value)}
                placeholder="https://docs.google.com/..."
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Notes">
              <TextArea
                rows={3}
                value={form.notes ?? ""}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Instructions, scope, publishing notes, or reviewer comments."
              />
            </Field>
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-white/10 flex justify-end gap-3">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>
            {editingAssignment ? "Save Changes" : "Create Assignment"}
          </Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
