"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { PROJECT_GROUP_TABS } from "@/components/members/SectionTabs";
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
  useConfirm,
} from "@/components/members/ui";
import {
  subscribeTeam,
  subscribeApplications,
  type FinanceAssignment,
  type TeamMember,
  type ApplicationRecord,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

const ASSIGNMENT_TYPES = ["Report", "Case Study", "Grant"] as const;
const STATUSES = ["Upcoming", "Ongoing", "Completed"] as const;
const TEAM_EMAIL_FROM_OPTIONS = [
  { value: "info@voltanyc.org", label: "info@voltanyc.org" },
  { value: "ethan@voltanyc.org", label: "ethan@voltanyc.org" },
] as const;

type DeadlineItem = {
  label: string;
  date: string;
};

const BLANK_FORM: Omit<FinanceAssignment, "id" | "createdAt" | "updatedAt"> = {
  type: "Report",
  title: "",
  topic: "",
  teamLabel: "",
  region: "",
  assignedMemberNames: [],
  assignedMemberIds: [],
  deadlines: [{ label: "Final Deadline", date: "" }],
  deadline: "",
  interviewDueDate: "",
  firstDraftDueDate: "",
  finalDueDate: "",
  deliverableUrl: "",
  status: "Upcoming",
  notes: "",
};

function normalizeKey(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeLoose(value: string): string {
  return String(value ?? "").trim().toLowerCase();
}

function sortDeadlinesMostRecentFirst(input: DeadlineItem[]): DeadlineItem[] {
  return [...input]
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const aMs = Date.parse(a.entry.date || "");
      const bMs = Date.parse(b.entry.date || "");
      const aValid = Number.isFinite(aMs);
      const bValid = Number.isFinite(bMs);
      if (aValid && bValid && aMs !== bMs) return bMs - aMs;
      if (aValid !== bValid) return aValid ? -1 : 1;
      return a.index - b.index;
    })
    .map((row) => row.entry);
}

function getOrdinalDeadlineLabel(index: number): string {
  const value = Math.max(1, index);
  const lastTwo = value % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${value}th Deadline`;
  const last = value % 10;
  if (last === 1) return `${value}st Deadline`;
  if (last === 2) return `${value}nd Deadline`;
  if (last === 3) return `${value}rd Deadline`;
  return `${value}th Deadline`;
}

function parseOrdinalDeadlineNumber(label: string): number | null {
  const match = label.trim().match(/^(\d+)(st|nd|rd|th)\s+deadline$/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeDeadlines(item: Partial<FinanceAssignment>): DeadlineItem[] {
  const fromArray = Array.isArray(item.deadlines)
    ? item.deadlines
      .map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const data = entry as Record<string, unknown>;
        const label = String(data.label ?? "").trim() || "Deadline";
        const date = String(data.date ?? "").trim();
        if (!label && !date) return null;
        return { label, date };
      })
      .filter((entry): entry is DeadlineItem => !!entry)
    : [];

  if (fromArray.length > 0) return sortDeadlinesMostRecentFirst(fromArray);

  const legacy: DeadlineItem[] = [];
  const finalDate = String(item.finalDueDate ?? "").trim();
  const primaryDate = String(item.deadline ?? "").trim();
  const firstDraftDate = String(item.firstDraftDueDate ?? "").trim();
  const interviewDate = String(item.interviewDueDate ?? "").trim();

  if (finalDate) legacy.push({ label: "Final Deadline", date: finalDate });
  if (primaryDate && primaryDate !== finalDate) legacy.push({ label: "1st Deadline", date: primaryDate });
  if (firstDraftDate && firstDraftDate !== finalDate && firstDraftDate !== primaryDate) {
    legacy.push({ label: "2nd Deadline", date: firstDraftDate });
  }
  if (interviewDate && interviewDate !== finalDate && interviewDate !== primaryDate && interviewDate !== firstDraftDate) {
    legacy.push({ label: "Interview Deadline", date: interviewDate });
  }

  return legacy.length > 0
    ? sortDeadlinesMostRecentFirst(legacy)
    : [{ label: "Final Deadline", date: "" }];
}

function normalizeDateForSort(value: string | undefined): number {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? Number.MAX_SAFE_INTEGER : ms;
}

function earliestDeadlineForSort(item: FinanceAssignment): number {
  const dated = normalizeDeadlines(item)
    .map((entry) => normalizeDateForSort(entry.date))
    .filter((value) => value !== Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a - b);
  return dated[0] ?? Number.MAX_SAFE_INTEGER;
}

function formatDeadlineLabel(item: FinanceAssignment): string[] {
  const rows = normalizeDeadlines(item);
  if (rows.length === 0) return ["-"];
  return rows.map((row) => `${row.label}: ${row.date || "-"}`);
}

export default function FinanceAssignmentsPage() {
  const [assignments, setAssignments] = useState<FinanceAssignment[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<FinanceAssignment | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [emailModalAssignment, setEmailModalAssignment] = useState<FinanceAssignment | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailFrom, setEmailFrom] = useState("info@voltanyc.org");
  const [emailMode, setEmailMode] = useState<"plain" | "html">("plain");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailRecipientOverride, setEmailRecipientOverride] = useState<string[] | null>(null);
  const [emailRecipientLabel, setEmailRecipientLabel] = useState<string | null>(null);
  const [memberPickerSearch, setMemberPickerSearch] = useState("");
  const { ask, Dialog } = useConfirm();
  const { authRole, user } = useAuth();
  const router = useRouter();

  const canEdit = authRole === "admin";

  useEffect(() => {
    if (authRole && authRole !== "admin") {
      router.replace("/members/dashboard");
    }
  }, [authRole, router]);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeApplications(setApplications), []);

  const fetchAssignments = async () => {
    if (!user) return;
    setLoadingAssignments(true);
    setLoadError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/members/finance-assignments", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        setAssignments([]);
        setLoadError("Could not load assignments.");
        return;
      }
      const data = await res.json() as { assignments?: FinanceAssignment[] };
      setAssignments(Array.isArray(data.assignments) ? data.assignments : []);
    } catch {
      setAssignments([]);
      setLoadError("Could not load assignments.");
    } finally {
      setLoadingAssignments(false);
    }
  };

  useEffect(() => {
    if (!user || !canEdit) return;
    void fetchAssignments();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, canEdit]);

  const memberNameOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...team.map((member) => String(member.name ?? "").trim()),
            ...applications.map((app) => String(app.fullName ?? "").trim()),
          ].filter(Boolean),
        )
      ).sort((a, b) => a.localeCompare(b)),
    [team, applications]
  );

  const memberNameLookup = useMemo(
    () => new Map(memberNameOptions.map((name) => [normalizeLoose(name), name])),
    [memberNameOptions],
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

  const activeTeamByName = useMemo(() => {
    const map = new Map<string, TeamMember[]>();
    for (const member of team) {
      if (normalizeLoose(member.status ?? "") === "inactive") continue;
      const key = normalizeKey(String(member.name ?? ""));
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(member);
      map.set(key, list);
    }
    return map;
  }, [team]);

  const resolveRecipientsFromNames = (rawNames: string[]): { emails: string[]; unresolved: string[] } => {
    const emails = new Set<string>();
    const unresolved = new Set<string>();

    for (const raw of rawNames) {
      const name = String(raw ?? "").trim();
      if (!name) continue;
      const matches = activeTeamByName.get(normalizeKey(name)) ?? [];
      if (matches.length === 0) {
        unresolved.add(name);
        continue;
      }
      for (const member of matches) {
        const email = String(member.email ?? "").trim().toLowerCase();
        if (email) emails.add(email);
      }
    }

    return { emails: Array.from(emails), unresolved: Array.from(unresolved) };
  };

  const getAssignmentDisplayTitle = (item: FinanceAssignment): string => {
    return String(item.topic ?? "").trim() || String(item.title ?? "").trim() || "Untitled Assignment";
  };

  const setField = (key: keyof typeof form, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setDeadlineAt = (index: number, patch: Partial<DeadlineItem>) => {
    const current = normalizeDeadlines(form);
    if (index < 0 || index >= current.length) return;
    const next = current.map((entry, idx) => (idx === index ? {
      ...entry,
      ...patch,
    } : entry));
    setField("deadlines", sortDeadlinesMostRecentFirst(next));
  };

  const addDeadlineRow = () => {
    const current = normalizeDeadlines(form);
    const maxOrdinal = current.reduce((best, entry) => {
      const parsed = parseOrdinalDeadlineNumber(entry.label);
      if (!parsed) return best;
      return parsed > best ? parsed : best;
    }, 0);
    const nextLabel = getOrdinalDeadlineLabel(maxOrdinal + 1);
    setField("deadlines", sortDeadlinesMostRecentFirst([...current, { label: nextLabel, date: "" }]));
  };

  const removeDeadlineRow = (index: number) => {
    const current = normalizeDeadlines(form);
    if (current.length <= 1) return;
    const next = current.filter((_, idx) => idx !== index);
    setField(
      "deadlines",
      next.length > 0 ? sortDeadlinesMostRecentFirst(next) : [{ label: "Final Deadline", date: "" }],
    );
  };

  const openCreate = () => {
    setForm({ ...BLANK_FORM });
    setMemberPickerSearch("");
    setEditingAssignment(null);
    setModal("create");
  };

  const openEdit = (item: FinanceAssignment) => {
    setForm({
      type: item.type,
      title: item.title ?? "",
      topic: item.topic,
      teamLabel: item.teamLabel ?? "",
      region: item.region ?? "",
      assignedMemberNames: item.assignedMemberNames ?? [],
      assignedMemberIds: item.assignedMemberIds ?? [],
      deadlines: normalizeDeadlines(item),
      deadline: item.deadline ?? "",
      interviewDueDate: item.interviewDueDate ?? "",
      firstDraftDueDate: item.firstDraftDueDate ?? "",
      finalDueDate: item.finalDueDate ?? "",
      deliverableUrl: item.deliverableUrl ?? "",
      status: item.status,
      notes: item.notes ?? "",
    });
    setMemberPickerSearch("");
    setEditingAssignment(item);
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.topic.trim()) return;

    const normalizedMemberNames = (form.assignedMemberNames ?? [])
      .map((name) => String(name ?? "").trim())
      .map((name) => memberNameLookup.get(normalizeLoose(name)) ?? "")
      .filter(Boolean);
    const normalizedMemberIds = normalizedMemberNames
      .map((name) => memberIdByName.get(name.toLowerCase()) ?? "")
      .filter(Boolean);
    const generatedTitle = form.type === "Case Study"
      ? `Case Study${String(form.region ?? "").trim() ? ` — ${String(form.region ?? "").trim()}` : ""}`
      : form.type === "Grant"
        ? "Grant Assignment"
        : "Report Assignment";

    const normalizedDeadlines = sortDeadlinesMostRecentFirst(normalizeDeadlines(form)
      .map((entry) => ({
        label: String(entry.label ?? "").trim() || "Deadline",
        date: String(entry.date ?? "").trim(),
      }))
      .filter((entry) => entry.label || entry.date));

    const datedRows = normalizedDeadlines.filter((entry) => !!entry.date);
    const finalDate = normalizedDeadlines.find((entry) => normalizeLoose(entry.label) === "final deadline" && entry.date)?.date
      ?? datedRows[datedRows.length - 1]?.date
      ?? "";
    const primaryDate = normalizedDeadlines.find((entry) => normalizeLoose(entry.label) !== "final deadline" && entry.date)?.date ?? "";

    const payload: Omit<FinanceAssignment, "id" | "createdAt" | "updatedAt"> = {
      ...form,
      title: generatedTitle,
      topic: form.topic.trim(),
      teamLabel: "",
      region: String(form.region ?? "").trim(),
      assignedMemberNames: normalizedMemberNames,
      assignedMemberIds: normalizedMemberIds,
      deadlines: normalizedDeadlines.length > 0 ? normalizedDeadlines : [{ label: "Final Deadline", date: "" }],
      deadline: primaryDate,
      interviewDueDate: "",
      firstDraftDueDate: "",
      finalDueDate: finalDate,
      deliverableUrl: String(form.deliverableUrl ?? "").trim(),
      notes: "",
    };

    if (!user) return;
    const token = await user.getIdToken();

    if (editingAssignment) {
      await fetch("/api/members/finance-assignments", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingAssignment.id,
          patch: payload,
        }),
      });
    } else {
      await fetch("/api/members/finance-assignments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
    }
    await fetchAssignments();
    setModal(null);
  };

  const closeEmailModal = () => {
    setEmailModalAssignment(null);
    setEmailRecipientOverride(null);
    setEmailRecipientLabel(null);
    setEmailStatus(null);
  };

  const openAssignmentTeamEmailModal = (item: FinanceAssignment) => {
    setEmailModalAssignment(item);
    setEmailRecipientOverride(null);
    setEmailRecipientLabel(null);
    setEmailFrom("info@voltanyc.org");
    setEmailMode("plain");
    setEmailSubject(`${getAssignmentDisplayTitle(item)} — Assignment Update`);
    setEmailMessage("");
    setEmailStatus(null);
  };

  const openAssignmentMemberEmailModal = (item: FinanceAssignment, memberName: string) => {
    openAssignmentTeamEmailModal(item);
    const resolved = resolveRecipientsFromNames([memberName]);
    setEmailRecipientLabel(memberName);
    setEmailRecipientOverride(resolved.emails);
    if (resolved.emails.length === 0) {
      setEmailStatus(`No active email found for ${memberName}.`);
    }
  };

  const baseEmailRecipients = emailModalAssignment
    ? resolveRecipientsFromNames(emailModalAssignment.assignedMemberNames ?? [])
    : { emails: [], unresolved: [] as string[] };

  const emailRecipients = emailRecipientOverride
    ? { emails: emailRecipientOverride, unresolved: [] as string[] }
    : baseEmailRecipients;

  const sendAssignmentEmail = async () => {
    if (!emailModalAssignment) return;
    if (!emailSubject.trim() || !emailMessage.trim()) {
      setEmailStatus("Please add a subject and message.");
      return;
    }
    if (emailRecipients.emails.length === 0) {
      setEmailStatus("No assigned members with email addresses were found.");
      return;
    }
    if (!user) {
      setEmailStatus("Not authenticated.");
      return;
    }

    setEmailSending(true);
    setEmailStatus("Sending...");
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/members/team-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fromAddress: emailFrom,
          subject: emailSubject.trim(),
          message: emailMessage.trim(),
          contentMode: emailMode,
          recipients: emailRecipients.emails,
        }),
      });
      if (!res.ok) {
        setEmailStatus("Could not send email.");
        return;
      }
      const payload = await res.json() as { sent?: number; failed?: string[] };
      const sentCount = payload.sent ?? 0;
      const failedCount = payload.failed?.length ?? 0;
      setEmailStatus(
        failedCount > 0
          ? `Sent to ${sentCount}. Failed: ${failedCount}.`
          : `Sent to ${sentCount} members.`,
      );
    } catch {
      setEmailStatus("Could not send email.");
    } finally {
      setEmailSending(false);
    }
  };

  const filtered = assignments
    .filter((item) => {
      if (filterType && item.type !== filterType) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      if (!search.trim()) return true;
      const q = search.trim().toLowerCase();
      return [
        item.topic,
        item.region,
        item.type,
        ...(item.assignedMemberNames ?? []),
      ].some((value) => String(value ?? "").toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const aDate = earliestDeadlineForSort(a);
      const bDate = earliestDeadlineForSort(b);
      if (aDate !== bDate) return aDate - bDate;
      return getAssignmentDisplayTitle(a).localeCompare(getAssignmentDisplayTitle(b));
    });

  const reportCount = assignments.filter((item) => item.type === "Report").length;
  const caseStudyCount = assignments.filter((item) => item.type === "Case Study").length;
  const grantCount = assignments.filter((item) => item.type === "Grant").length;
  const ongoingCount = assignments.filter((item) => item.status === "Ongoing").length;
  const completedCount = assignments.filter((item) => item.status === "Completed").length;

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={PROJECT_GROUP_TABS} />

      <PageHeader
        title="Assignments"
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn> : undefined}
      />

      {(loadingAssignments || loadError) && (
        <p className={`text-xs mb-3 ${loadError ? "text-red-300" : "text-white/45"}`}>
          {loadError ?? "Loading assignments..."}
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        <StatCard label="Reports" value={reportCount} color="text-blue-300" />
        <StatCard label="Case Studies" value={caseStudyCount} color="text-emerald-300" />
        <StatCard label="Grants" value={grantCount} color="text-amber-300" />
        <StatCard label="Ongoing" value={ongoingCount} color="text-green-400" />
        <StatCard label="Completed" value={completedCount} color="text-violet-300" />
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder="Search topic, region, or member..." />
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
        cols={["Type / Region", "Topic / Focus", "Members", "Deadlines", "Status", "Actions"]}
        rows={filtered.map((item) => {
          const rowRecipients = resolveRecipientsFromNames(item.assignedMemberNames ?? []);
          return [
            <div key="type" className="min-w-[170px]">
              <p className="text-white/80">{item.type}</p>
              <p className="text-xs text-white/45">{item.region || "-"}</p>
            </div>,
            <div key="topic" className="min-w-[260px]">
              <p id={`finance-assignment-${item.id}`} className="text-white font-medium">{item.topic || "-"}</p>
            </div>,
            <div key="members" className="min-w-[230px]" title={(item.assignedMemberNames ?? []).join(", ")}>
              {(item.assignedMemberNames ?? []).length === 0 ? (
                <span className="text-white/40 text-xs">-</span>
              ) : (
                <span className="text-xs text-white/80">
                  {(item.assignedMemberNames ?? []).map((memberName, idx) => (
                    <span key={`${item.id}-${memberName}-${idx}`}>
                      {idx > 0 && <span className="text-white/40">, </span>}
                      {canEdit ? (
                        <button
                          type="button"
                          className="text-[#85CC17]/85 hover:text-[#9BE22B] underline-offset-2 hover:underline"
                          onClick={() => openAssignmentMemberEmailModal(item, memberName)}
                          title={`Email ${memberName}`}
                        >
                          {memberName}
                        </button>
                      ) : (
                        <span className="text-white/70">{memberName}</span>
                      )}
                    </span>
                  ))}
                </span>
              )}
            </div>,
            <div key="deadlines" className="text-xs text-white/70 min-w-[260px] space-y-1">
              {formatDeadlineLabel(item).map((line, idx) => (
                <p key={`${item.id}-deadline-${idx}`} className="leading-tight">{line}</p>
              ))}
            </div>,
            <Badge key="status" label={item.status} />,
            <div key="actions" className="flex items-center gap-2">
              {canEdit ? (
                <>
                  <Btn
                    size="sm"
                    variant="secondary"
                    onClick={() => openAssignmentTeamEmailModal(item)}
                    disabled={rowRecipients.emails.length === 0}
                  >
                    Email Team
                  </Btn>
                  <Btn size="sm" variant="secondary" onClick={() => openEdit(item)}>Edit</Btn>
                  <Btn
                    size="sm"
                    variant="danger"
                    onClick={() => ask(
                      async () => {
                        if (!user) return;
                        const token = await user.getIdToken();
                        await fetch(`/api/members/finance-assignments?id=${encodeURIComponent(item.id)}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        await fetchAssignments();
                      },
                      `Delete "${getAssignmentDisplayTitle(item)}"? This cannot be undone.`
                    )}
                  >
                    Delete
                  </Btn>
                </>
              ) : (
                <span className="text-white/35 text-xs">View only</span>
              )}
            </div>,
          ];
        })}
      />

      <Modal
        open={!!emailModalAssignment}
        onClose={closeEmailModal}
        title={`${emailRecipientLabel ? "Email Member" : "Email Team"}${emailModalAssignment ? ` · ${getAssignmentDisplayTitle(emailModalAssignment)}` : ""}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-white/55">
            {emailRecipientLabel ? `${emailRecipientLabel} · ` : ""}
            {emailRecipients.emails.length} recipients
            {emailRecipients.unresolved.length > 0 ? ` · ${emailRecipients.unresolved.length} unresolved assignments` : ""}
          </p>
          {emailRecipients.unresolved.length > 0 && (
            <div className="bg-[#0F1014] border border-white/10 rounded-lg p-3">
              <p className="text-[11px] text-white/70 mb-1">Unresolved assigned names:</p>
              <p className="text-[11px] text-white/45 break-words">{emailRecipients.unresolved.join(", ")}</p>
            </div>
          )}
          <Field label="Subject" required>
            <Input value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
          </Field>
          <Field label="Send from" required>
            <select
              value={emailFrom}
              onChange={(event) => setEmailFrom(event.target.value)}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              {TEAM_EMAIL_FROM_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Message Format" required>
            <select
              value={emailMode}
              onChange={(event) => setEmailMode(event.target.value === "html" ? "html" : "plain")}
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
            >
              <option value="plain">Plain Text</option>
              <option value="html">HTML (links/images supported)</option>
            </select>
          </Field>
          <Field label="Message" required>
            <TextArea
              rows={8}
              value={emailMessage}
              onChange={(event) => setEmailMessage(event.target.value)}
              placeholder={
                emailMode === "html"
                  ? "<p>Assignment update...</p>"
                  : "Write your email..."
              }
            />
          </Field>
          {emailStatus && <p className="text-xs text-white/60">{emailStatus}</p>}

          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={closeEmailModal}>Close</Btn>
            <Btn
              variant="primary"
              onClick={sendAssignmentEmail}
              disabled={emailSending || emailRecipients.emails.length === 0}
            >
              {emailSending ? "Sending..." : `Send Email (${emailRecipients.emails.length})`}
            </Btn>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={editingAssignment ? "Edit Assignment" : "New Assignment"}
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
            <Field label="Topic / Focus" required>
              <Input
                value={form.topic}
                onChange={(event) => setField("topic", event.target.value)}
                placeholder="What this assignment should cover."
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Region">
              <Input
                value={form.region}
                onChange={(event) => setField("region", event.target.value)}
                placeholder={form.type === "Case Study" ? "e.g., Manhattan Hunter" : "Optional"}
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Assigned Members">
              <div className="space-y-2">
                <Input
                  value={memberPickerSearch}
                  onChange={(event) => setMemberPickerSearch(event.target.value)}
                  placeholder="Search members/applicants to add..."
                />
                <div className="flex flex-wrap gap-1.5 min-h-[1.25rem]">
                  {(form.assignedMemberNames ?? []).map((name) => (
                    <span key={name} className="flex items-center gap-1 text-xs bg-[#85CC17]/15 text-[#85CC17] border border-[#85CC17]/20 px-2 py-0.5 rounded-full">
                      {name}
                      <button
                        type="button"
                        onClick={() =>
                          setField(
                            "assignedMemberNames",
                            (form.assignedMemberNames ?? []).filter((entry) => entry !== name),
                          )
                        }
                        className="text-red-300 hover:text-red-200 transition-colors"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-white/10 bg-[#0F1014]">
                  {memberNameOptions
                    .filter((option) => !(form.assignedMemberNames ?? []).includes(option))
                    .filter((option) => {
                      const q = memberPickerSearch.trim().toLowerCase();
                      return !q || option.toLowerCase().includes(q);
                    })
                    .slice(0, 80)
                    .map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setField("assignedMemberNames", [...(form.assignedMemberNames ?? []), option])}
                        className="w-full px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  {memberNameOptions
                    .filter((option) => !(form.assignedMemberNames ?? []).includes(option))
                    .filter((option) => {
                      const q = memberPickerSearch.trim().toLowerCase();
                      return !q || option.toLowerCase().includes(q);
                    }).length === 0 && (
                    <p className="px-3 py-2 text-xs text-white/40">No matching members/applicants.</p>
                  )}
                </div>
              </div>
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Deadlines">
              <div className="space-y-2">
                {normalizeDeadlines(form).map((entry, index) => (
                  <div key={`deadline-row-${index}`} className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_170px_auto] gap-2 items-center">
                    <Input
                      value={entry.label}
                      onChange={(event) => setDeadlineAt(index, { label: event.target.value })}
                      placeholder={index === 0 ? "Final Deadline" : getOrdinalDeadlineLabel(index)}
                    />
                    <Input
                      type="date"
                      value={entry.date}
                      onChange={(event) => setDeadlineAt(index, { date: event.target.value })}
                    />
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => removeDeadlineRow(index)}
                      disabled={normalizeDeadlines(form).length <= 1}
                    >
                      Remove
                    </Btn>
                  </div>
                ))}
                <Btn size="sm" variant="secondary" onClick={addDeadlineRow}>+ Add Deadline</Btn>
              </div>
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Deliverable Link">
              <Input
                value={form.deliverableUrl ?? ""}
                onChange={(event) => setField("deliverableUrl", event.target.value)}
                placeholder="https://docs.google.com/..."
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
