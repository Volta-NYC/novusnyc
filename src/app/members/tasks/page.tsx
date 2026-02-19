"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea, Table, Empty, useConfirm } from "@/components/members/ui";
import { getTasks, createTask, updateTask, deleteTask, type Task } from "@/lib/members/storage";
import { getSession, canEdit, canDelete } from "@/lib/members/auth";

const STATUSES = ["To Do", "In Progress", "Blocked", "In Review", "Done"];
const PRIORITIES = ["Urgent", "High", "Medium", "Low"];
const DIVISIONS = ["Tech", "Marketing", "Finance", "Outreach", "Operations"];

const BLANK: Omit<Task, "id" | "createdAt"> = {
  name: "", status: "To Do", priority: "Medium", assignedTo: "", businessId: "",
  division: "Tech", dueDate: "", week: "", notes: "", blocker: "", completedAt: "",
};

const STATUS_COLS: Task["status"][] = ["To Do", "In Progress", "Blocked", "In Review", "Done"];
const COL_COLORS: Record<string, string> = {
  "To Do": "border-gray-500/30",
  "In Progress": "border-blue-500/30",
  "Blocked": "border-red-500/30",
  "In Review": "border-yellow-500/30",
  "Done": "border-green-500/30",
};

export default function TasksPage() {
  const session = getSession()!;
  const editable = canEdit(session.role);
  const deletable = canDelete(session.role);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [search, setSearch] = useState("");
  const [filterDiv, setFilterDiv] = useState("");
  const [view, setView] = useState<"board" | "table">("board");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [form, setForm] = useState(BLANK);
  const { ask, Dialog } = useConfirm();

  useEffect(() => { setTasks(getTasks()); }, []);
  const refresh = () => setTasks(getTasks());
  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const openCreate = () => { setForm(BLANK); setEditing(null); setModal("create"); };
  const openEdit = (t: Task) => {
    setForm({ name: t.name, status: t.status, priority: t.priority, assignedTo: t.assignedTo,
      businessId: t.businessId, division: t.division, dueDate: t.dueDate, week: t.week,
      notes: t.notes, blocker: t.blocker, completedAt: t.completedAt });
    setEditing(t);
    setModal("edit");
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    if (editing) updateTask(editing.id, form as Partial<Task>);
    else createTask(form as Omit<Task, "id" | "createdAt">);
    refresh();
    setModal(null);
  };

  const filtered = tasks.filter(t =>
    (!search || t.name.toLowerCase().includes(search.toLowerCase()) || t.assignedTo.toLowerCase().includes(search.toLowerCase()))
    && (!filterDiv || t.division === filterDiv)
  );

  return (
    <MembersLayout>
      <Dialog />
      <PageHeader
        title="Tasks"
        subtitle={`${tasks.filter(t => t.status !== "Done").length} open · ${tasks.filter(t => t.status === "Blocked").length} blocked`}
        action={
          <div className="flex gap-2">
            <div className="flex bg-[#1C1F26] border border-white/8 rounded-lg p-0.5">
              {(["board", "table"] as const).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3 py-1.5 rounded text-xs font-medium capitalize transition-colors ${view === v ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/40 hover:text-white"}`}>
                  {v}
                </button>
              ))}
            </div>
            {editable && <Btn variant="primary" onClick={openCreate}>+ Task</Btn>}
          </div>
        }
      />

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search tasks, assignees…" />
        <select value={filterDiv} onChange={e => setFilterDiv(e.target.value)}
          className="bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white/70 focus:outline-none">
          <option value="">All divisions</option>
          {DIVISIONS.map(d => <option key={d}>{d}</option>)}
        </select>
      </div>

      {view === "board" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 overflow-x-auto">
          {STATUS_COLS.map(col => {
            const colTasks = filtered.filter(t => t.status === col);
            return (
              <div key={col} className={`bg-[#1C1F26] border ${COL_COLORS[col]} rounded-xl p-3 min-h-[200px]`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-white/50 uppercase tracking-wider">{col}</span>
                  <span className="text-xs bg-white/8 text-white/40 px-1.5 py-0.5 rounded-full">{colTasks.length}</span>
                </div>
                <div className="space-y-2">
                  {colTasks.map(t => (
                    <div key={t.id} className="bg-[#0F1014] border border-white/5 rounded-lg p-3 cursor-pointer hover:border-white/15 transition-colors"
                      onClick={() => editable && openEdit(t)}>
                      <p className="text-white text-sm font-medium leading-snug mb-1.5">{t.name}</p>
                      <div className="flex flex-wrap gap-1">
                        <Badge label={t.priority} />
                        <span className="text-xs text-white/30">{t.division}</span>
                      </div>
                      {t.assignedTo && <p className="text-white/30 text-xs mt-1.5">→ {t.assignedTo}</p>}
                      {t.dueDate && <p className="text-white/20 text-xs mt-0.5">Due {t.dueDate}</p>}
                    </div>
                  ))}
                  {editable && (
                    <button onClick={() => { setForm({ ...BLANK, status: col }); setEditing(null); setModal("create"); }}
                      className="w-full text-white/20 hover:text-white/50 text-xs py-2 border border-dashed border-white/8 rounded-lg transition-colors">
                      + Add task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <Table
            cols={["Task", "Status", "Priority", "Division", "Assigned To", "Due Date", "Actions"]}
            rows={filtered.map(t => [
              <span key="n" className="text-white font-medium">{t.name}</span>,
              <Badge key="s" label={t.status} />,
              <Badge key="p" label={t.priority} />,
              <span key="d" className="text-white/50">{t.division}</span>,
              <span key="a" className="text-white/50">{t.assignedTo || "—"}</span>,
              <span key="dd" className="text-white/40">{t.dueDate || "—"}</span>,
              <div key="ac" className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {editable && <Btn size="sm" variant="ghost" onClick={() => openEdit(t)}>Edit</Btn>}
                {deletable && <Btn size="sm" variant="danger" onClick={() => ask(() => { deleteTask(t.id); refresh(); })}>Del</Btn>}
              </div>,
            ])}
          />
          {filtered.length === 0 && <Empty message="No tasks yet." action={editable ? <Btn variant="primary" onClick={openCreate}>Add first task</Btn> : undefined} />}
        </>
      )}

      <Modal open={modal !== null} onClose={() => setModal(null)} title={editing ? "Edit Task" : "New Task"}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><Field label="Task Name" required><Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="What needs to happen?" /></Field></div>
          <Field label="Status"><Select options={STATUSES} value={form.status} onChange={e => set("status", e.target.value)} /></Field>
          <Field label="Priority"><Select options={PRIORITIES} value={form.priority} onChange={e => set("priority", e.target.value)} /></Field>
          <Field label="Division"><Select options={DIVISIONS} value={form.division} onChange={e => set("division", e.target.value)} /></Field>
          <Field label="Assigned To"><Input value={form.assignedTo} onChange={e => set("assignedTo", e.target.value)} placeholder="Name or @handle" /></Field>
          <Field label="Due Date"><Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} /></Field>
          <Field label="Week"><Input value={form.week} onChange={e => set("week", e.target.value)} placeholder="e.g. Week 3" /></Field>
          <div className="col-span-2"><Field label="Blocker (if blocked)"><Input value={form.blocker} onChange={e => set("blocker", e.target.value)} /></Field></div>
          <div className="col-span-2"><Field label="Notes"><TextArea rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} /></Field></div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editing ? "Save" : "Create Task"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
