"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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
  StatCard,
  useConfirm,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeTeam,
  subscribeApplications,
  subscribeBusinesses,
  type Business,
  type FinanceAssignment,
  type FinanceAssignmentStatus,
  type TeamMember,
  type ApplicationRecord,
} from "@/lib/members/storage";
import { computeGlobalCodes } from "@/lib/members/assignmentCodes";
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
        const label = String(data.label ?? "").trim();
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

function generateCaseStudyEmailHtml(firstName: string, interviewDisplay: string, finalDisplay: string): string {
  return [
    `<p>Hey ${firstName},</p>`,
    `<p>Over the next few weeks, you'll be working on a short business case study for Volta. It's a project where you'll go out, talk to business owners, and write about what you learn.</p>`,
    `<p>If you know anyone else who'd want to work on this with you, feel free to bring them in.</p>`,
    `<p>The assignment is to find a small business near you and interview the owner. Aim for something interesting: a newer business, a unique pop-up, something with a story.</p>`,
    `<p>You have a lot of leeway in how you want to structure and develop this, but in general it should cover:</p>`,
    `<ol>`,
    `<li>What the business does, how long it has been around, and a bit about the owner.</li>`,
    `<li>How things are going: sales, foot traffic, day-to-day challenges.</li>`,
    `<li>How the owner uses (or avoids) technology and digital tools, and why.</li>`,
    `<li>What they have learned from running the business.</li>`,
    `<li>Where Volta could help, particularly with AI or digital tools.</li>`,
    `</ol>`,
    `<p>Try to highlight what makes your area unique. Whether you're in a dense NYC neighborhood or a more suburban area, the most interesting reports capture things that are specific to where you are: how customers find businesses, what resources owners know about or don't, how the community around the business works. If you're outside NYC, pay attention to the contrasts with a big urban environment: foot traffic vs. cars, access to city programs, how much word-of-mouth matters, market size.</p>`,
    `<p>Be specific: use quotes, anecdotes, and concrete details. Avoid including filler introductions, restating the prompt, or writing conclusions that just summarize what you already said.</p>`,
    `<p>On AI: Use it sparingly. It should not be writing your analysis, observations, or narrative. Please especially avoid writing that sounds plausible but says nothing specific.</p>`,
    `<p>These will be published as business highlights on our website and potentially our social media. If the owner is comfortable being featured, document your visit with notes, photos, or video. We can help turn it into content and post it, which is a good way to get yourself out there. If you'd rather just submit the report, that's perfectly fine.</p>`,
    `<p><strong>Timeline:</strong><br/>Interview due ${interviewDisplay}.<br/>Final report due ${finalDisplay}.</p>`,
    `<p><strong>Submission Guidelines:</strong><br/>Submit as a Google Doc.<br/>The file should be named in this format "[First + Last Name] - [Business Name] Case Study" e.g. "Andrew Chin - Petite Dumpling Case Study".<br/>Sharing access should allow "Anyone with the link" to view the document.</p>`,
    `<p>Please reply with any questions!</p>`,
    `<p>Best,<br/>Ethan</p>`,
  ].join("\n");
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
  return rows.map((row) => (row.label ? `${row.label}: ${row.date || "-"}` : `${row.date || "-"}`));
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
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [emailRecipientOverride, setEmailRecipientOverride] = useState<string[] | null>(null);
  const [emailRecipientLabel, setEmailRecipientLabel] = useState<string | null>(null);
  const [emailAttachments, setEmailAttachments] = useState<File[]>([]);
  const [memberPickerSearch, setMemberPickerSearch] = useState("");
  const [openStatusPopoverId, setOpenStatusPopoverId] = useState<string | null>(null);
  const [emailModalTitle, setEmailModalTitle] = useState<string | null>(null);
  const [caseStudyModal, setCaseStudyModal] = useState(false);
  const [caseStudySelected, setCaseStudySelected] = useState<string[]>([]);
  const [caseStudyPickerSearch, setCaseStudyPickerSearch] = useState("");
  const [caseStudySendEmail, setCaseStudySendEmail] = useState(true);
  const [caseStudyWorking, setCaseStudyWorking] = useState(false);
  const [caseStudyStatus, setCaseStudyStatus] = useState<string | null>(null);
  const { ask, Dialog } = useConfirm();
  const { authRole, user } = useAuth();
  const router = useRouter();
  const [deepLinkedAssignmentId, setDeepLinkedAssignmentId] = useState("");
  const handledAssignmentDeepLinkRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    setDeepLinkedAssignmentId((params.get("assignmentId") ?? "").trim());
  }, []);

  const canEdit = authRole === "admin";

  useEffect(() => {
    if (authRole && authRole !== "admin") {
      router.replace("/members/dashboard");
    }
  }, [authRole, router]);

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeApplications(setApplications), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);

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

  const globalCodeMaps = useMemo(
    () => computeGlobalCodes(businesses, assignments),
    [businesses, assignments]
  );

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
  const memberPickerQuery = memberPickerSearch.trim().toLowerCase();
  const memberPickerOptions = useMemo(
    () => (memberPickerQuery
      ? memberNameOptions
        .filter((option) => !(form.assignedMemberNames ?? []).includes(option))
        .filter((option) => option.toLowerCase().includes(memberPickerQuery))
        .slice(0, 80)
      : []),
    [memberNameOptions, form.assignedMemberNames, memberPickerQuery]
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

  const activeTeamList = useMemo(
    () =>
      team
        .filter((m) => normalizeLoose(m.status ?? "") !== "inactive" && String(m.name ?? "").trim())
        .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? ""))),
    [team]
  );

  const caseStudyFilteredMembers = useMemo(() => {
    const q = caseStudyPickerSearch.trim().toLowerCase();
    return q
      ? activeTeamList.filter((m) => String(m.name ?? "").toLowerCase().includes(q))
      : activeTeamList;
  }, [activeTeamList, caseStudyPickerSearch]);

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

  useEffect(() => {
    if (!canEdit) return;
    if (!deepLinkedAssignmentId) return;
    if (handledAssignmentDeepLinkRef.current === deepLinkedAssignmentId) return;
    const target = assignments.find((item) => item.id === deepLinkedAssignmentId);
    if (!target) return;
    handledAssignmentDeepLinkRef.current = deepLinkedAssignmentId;
    openEdit(target);
  }, [assignments, canEdit, deepLinkedAssignmentId]);

  const handleSave = async () => {
    if (form.type !== "Case Study" && !form.topic.trim()) return;

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
        label: String(entry.label ?? "").trim(),
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

  const handleBulkCaseStudy = async () => {
    if (caseStudySelected.length === 0 || !user) return;
    setCaseStudyWorking(true);
    setCaseStudyStatus(null);

    const today = new Date();
    const interviewDate = new Date(today);
    interviewDate.setDate(today.getDate() + 14);
    const finalDate = new Date(today);
    finalDate.setDate(today.getDate() + 28);

    const pad = (n: number) => String(n).padStart(2, "0");
    const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const toDisplayStr = (d: Date) =>
      d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

    const interviewDateStr = toDateStr(interviewDate);
    const finalDateStr = toDateStr(finalDate);
    const interviewDisplay = toDisplayStr(interviewDate);
    const finalDisplay = toDisplayStr(finalDate);

    const token = await user.getIdToken();
    let successCount = 0;
    let errorCount = 0;

    for (const memberName of caseStudySelected) {
      const memberId = memberIdByName.get(memberName.toLowerCase()) ?? "";
      const assignmentPayload = {
        type: "Case Study" as FinanceAssignment["type"],
        title: "Case Study",
        topic: "",
        teamLabel: "",
        region: "",
        assignedMemberNames: [memberName],
        assignedMemberIds: memberId ? [memberId] : [],
        deadlines: [
          { label: "Interview Deadline", date: interviewDateStr },
          { label: "Final Deadline", date: finalDateStr },
        ],
        deadline: interviewDateStr,
        interviewDueDate: interviewDateStr,
        firstDraftDueDate: "",
        finalDueDate: finalDateStr,
        deliverableUrl: "",
        status: "Ongoing" as FinanceAssignmentStatus,
        notes: "",
      };

      try {
        const res = await fetch("/api/members/finance-assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(assignmentPayload),
        });
        if (!res.ok) { errorCount++; continue; }
        successCount++;
      } catch {
        errorCount++;
        continue;
      }

      if (caseStudySendEmail) {
        const matches = activeTeamByName.get(normalizeKey(memberName)) ?? [];
        const memberEmail = String(matches[0]?.email ?? "").trim().toLowerCase();
        if (memberEmail) {
          const firstName = memberName.trim().split(/\s+/)[0] ?? memberName;
          const htmlBody = generateCaseStudyEmailHtml(firstName, interviewDisplay, finalDisplay);
          const fd = new FormData();
          fd.append("fromAddress", "info@voltanyc.org");
          fd.append("subject", "Your Case Study Assignment — Volta NYC");
          fd.append("message", htmlBody);
          fd.append("contentMode", "html");
          fd.append("bccRecipients", memberEmail);
          try {
            await fetch("/api/members/team-email", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: fd,
            });
          } catch { /* non-fatal: assignment still created */ }
        }
      }
    }

    await fetchAssignments();
    setCaseStudyWorking(false);
    setCaseStudyStatus(
      errorCount > 0
        ? `Created ${successCount} assignment(s). ${errorCount} failed.`
        : `Done — created ${successCount} assignment(s)${caseStudySendEmail ? " and sent emails" : ""}.`
    );
  };

  const handleDeleteFromEdit = async () => {
    if (!editingAssignment || !user) return;
    await ask(
      async () => {
        const token = await user.getIdToken();
        await fetch(`/api/members/finance-assignments?id=${encodeURIComponent(editingAssignment.id)}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetchAssignments();
        setModal(null);
      },
      `Delete "${getAssignmentDisplayTitle(editingAssignment)}"? This cannot be undone.`
    );
  };

  const handleQuickStatusChange = async (id: string, newStatus: FinanceAssignmentStatus) => {
    if (!user) return;
    setOpenStatusPopoverId(null);
    const token = await user.getIdToken();
    await fetch("/api/members/finance-assignments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, patch: { status: newStatus } }),
    });
    await fetchAssignments();
  };

  useEffect(() => {
    if (!openStatusPopoverId) return;
    const close = () => setOpenStatusPopoverId(null);
    const timerId = setTimeout(() => document.addEventListener("click", close), 0);
    return () => { clearTimeout(timerId); document.removeEventListener("click", close); };
  }, [openStatusPopoverId]);

  const closeEmailModal = () => {
    setEmailModalAssignment(null);
    setEmailRecipientOverride(null);
    setEmailRecipientLabel(null);
    setEmailModalTitle(null);
    setEmailStatus(null);
    setEmailAttachments([]);
  };

  const openGroupEmailModal = (group: { label: string; items: FinanceAssignment[] }) => {
    const allNames = Array.from(new Set(group.items.flatMap((item) => item.assignedMemberNames ?? [])));
    const resolved = resolveRecipientsFromNames(allNames);
    setEmailModalAssignment(group.items[0] ?? null);
    setEmailModalTitle(`Email All ${group.label}s`);
    setEmailRecipientOverride(resolved.emails);
    setEmailRecipientLabel(`All ${group.label}s (${group.items.length} assignments, ${resolved.emails.length} recipients)`);
    setEmailFrom("info@voltanyc.org");
    setEmailSubject(`${group.label} Update — Volta NYC`);
    setEmailMessage("");
    setEmailStatus(null);
    setEmailAttachments([]);
  };

  const openAssignmentTeamEmailModal = (item: FinanceAssignment) => {
    setEmailModalAssignment(item);
    setEmailRecipientOverride(null);
    setEmailRecipientLabel(null);
    setEmailFrom("info@voltanyc.org");
    setEmailSubject(`${getAssignmentDisplayTitle(item)} — Assignment Update`);
    setEmailMessage("");
    setEmailStatus(null);
    setEmailAttachments([]);
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
      const formData = new FormData();
      formData.append("fromAddress", emailFrom);
      formData.append("subject", emailSubject.trim());
      formData.append("message", emailMessage.trim());
      formData.append("contentMode", "html");
      emailRecipients.emails.forEach((email) => formData.append("bccRecipients", email));
      emailAttachments.forEach((f) => formData.append("attachments", f, f.name));

      const res = await fetch("/api/members/team-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        setEmailStatus("Could not send email.");
        return;
      }
      const payload = await res.json() as { sent?: number; failed?: string[]; counts?: { to?: number; cc?: number; bcc?: number } };
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

  const groupedFiltered = useMemo<Array<{ label: string; items: FinanceAssignment[] }>>(() => {
    const grouped: Array<{ label: string; items: FinanceAssignment[] }> = ASSIGNMENT_TYPES
      .map((type) => ({
        label: type,
        items: filtered.filter((item) => item.type === type),
      }))
      .filter((group) => group.items.length > 0);

    const knownTypes = new Set(ASSIGNMENT_TYPES);
    const otherItems = filtered.filter((item) => !knownTypes.has(item.type));
    if (otherItems.length > 0) grouped.push({ label: "Other", items: otherItems });
    return grouped;
  }, [filtered]);

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
        action={canEdit ? (
          <div className="flex items-center gap-2">
            <Btn
              variant="secondary"
              onClick={() => {
                setCaseStudySelected([]);
                setCaseStudyPickerSearch("");
                setCaseStudyStatus(null);
                setCaseStudyModal(true);
              }}
            >
              Assign Case Study
            </Btn>
            <Btn variant="primary" onClick={openCreate}>+ New Assignment</Btn>
          </div>
        ) : undefined}
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

      <div className="members-table-shell mb-6">
        <table className="members-grid-table w-full min-w-[1280px] table-fixed text-left [&_td]:overflow-hidden">
          <thead className="bg-[#0F1014] border-b border-white/8">
            <tr>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Type / Region</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[24%]">Topic / Focus</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[21%]">Members</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[18%]">Deadlines</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 w-[9%]">Status</th>
              <th className="px-2 py-2 text-[10px] uppercase tracking-wider text-white/45 text-left w-[160px]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groupedFiltered.map((group) => (
              <Fragment key={`assignment-group-${group.label}`}>
                <tr className="bg-[#12151B] border-b border-white/8">
                  <td colSpan={6} className="px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-[#85CC17]">
                        {group.label} · {group.items.length}
                      </span>
                      {canEdit && group.items.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openGroupEmailModal(group)}
                          className="text-[10px] text-white/50 hover:text-white/80 border border-white/10 hover:border-white/25 rounded px-2 py-0.5 transition-colors"
                          title={`Email all members assigned to ${group.label.toLowerCase()} assignments`}
                        >
                          Email All
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
                {group.items.map((item) => {
                  const rowRecipients = resolveRecipientsFromNames(item.assignedMemberNames ?? []);
                  const deadlineLines = formatDeadlineLabel(item);
                  return (
                    <tr key={item.id} className="border-b border-white/8 hover:bg-white/[0.03]">
                      <td className="px-2 py-1.5 text-[11px] text-white/85 whitespace-nowrap max-w-[220px] truncate" title={`${item.type}${item.region ? ` · ${item.region}` : ""}`}>
                        <div className="truncate">{item.type}</div>
                        <div className="text-[10px] text-white/45 truncate">{item.region || "—"}</div>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-white/90 max-w-[300px]" title={item.topic || "—"}>
                        <div className="flex items-center gap-1.5">
                          {(() => {
                            const code = globalCodeMaps.assignmentCode.get(item.id);
                            if (!code) return null;
                            const prefix = code.replace(/\d+$/, "");
                            const pillClass = prefix === "R"
                              ? "bg-blue-500/10 border-blue-400/25 text-blue-300"
                              : prefix === "C"
                                ? "bg-emerald-500/10 border-emerald-400/25 text-emerald-300"
                                : prefix === "G"
                                  ? "bg-amber-500/10 border-amber-400/25 text-amber-300"
                                  : "bg-[#85CC17]/10 border-[#85CC17]/25 text-[#85CC17]";
                            return (
                              <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold font-mono flex-shrink-0 ${pillClass}`}>
                                {code}
                              </span>
                            );
                          })()}
                          <p id={`finance-assignment-${item.id}`} className="truncate font-medium">{item.topic || "—"}</p>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-white/80 max-w-[300px]" title={(item.assignedMemberNames ?? []).join(", ")}>
                        {(item.assignedMemberNames ?? []).length === 0 ? (
                          <span className="text-white/35">—</span>
                        ) : (
                          <div className="truncate">
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
                                  <span>{memberName}</span>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-[11px] text-white/75 max-w-[260px]" title={deadlineLines.join(" · ") || "—"}>
                        {deadlineLines.length === 0 ? (
                          <span className="text-white/35">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {deadlineLines.slice(0, 2).map((line, idx) => (
                              <div key={`${item.id}-deadline-${idx}`} className="truncate">{line}</div>
                            ))}
                            {deadlineLines.length > 2 && <div className="text-white/40">+{deadlineLines.length - 2} more</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {canEdit ? (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenStatusPopoverId(openStatusPopoverId === item.id ? null : item.id)}
                              className="cursor-pointer"
                              title="Click to change status"
                            >
                              <Badge label={item.status} />
                            </button>
                            {openStatusPopoverId === item.id && (
                              <div onClick={(e) => e.stopPropagation()} className="absolute left-0 top-full mt-1 z-50 bg-[#1C1F26] border border-white/15 rounded-lg shadow-xl overflow-hidden min-w-[130px]">
                                {STATUSES.map((status) => (
                                  <button
                                    key={status}
                                    type="button"
                                    onClick={() => void handleQuickStatusChange(item.id, status)}
                                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/8 transition-colors ${item.status === status ? "text-[#85CC17]" : "text-white/70"}`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <Badge label={item.status} />
                        )}
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap text-left w-[160px]">
                        {canEdit ? (
                          <div className="flex justify-start gap-1.5">
                            <Btn
                              size="sm"
                              variant="secondary"
                              className="members-pill-btn"
                              onClick={() => openAssignmentTeamEmailModal(item)}
                              disabled={rowRecipients.emails.length === 0}
                            >
                              Email Team
                            </Btn>
                            <Btn size="sm" variant="secondary" className="members-pill-btn" onClick={() => openEdit(item)}>Edit</Btn>
                          </div>
                        ) : (
                          <span className="text-white/35 text-xs">View only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="p-4">
            <p className="text-center text-white/35 text-sm">No assignments found.</p>
          </div>
        )}
      </div>

      <Modal
        open={!!emailModalAssignment}
        onClose={closeEmailModal}
        title={emailModalTitle ?? `${emailRecipientLabel ? "Email Member" : "Email Team"}${emailModalAssignment ? ` · ${getAssignmentDisplayTitle(emailModalAssignment)}` : ""}`}
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
          <Field label="Message" required>
            <RichTextEditor
              content={emailMessage}
              onChange={setEmailMessage}
              attachments={emailAttachments}
              onAttachmentsChange={setEmailAttachments}
              placeholder="Write your email..."
              minHeight={200}
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

          {form.type !== "Case Study" && (
            <div className="md:col-span-2">
              <Field label="Topic / Focus" required>
                <Input
                  value={form.topic}
                  onChange={(event) => setField("topic", event.target.value)}
                  placeholder="What this assignment should cover."
                />
              </Field>
            </div>
          )}

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
                  {memberPickerOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setField("assignedMemberNames", [...(form.assignedMemberNames ?? []), option])}
                        className="w-full px-3 py-2 text-left text-sm text-white/75 hover:bg-white/10 transition-colors"
                      >
                        {option}
                      </button>
                    ))}
                  {!memberPickerQuery && (
                    <p className="px-3 py-2 text-xs text-white/40">Start typing to search members/applicants.</p>
                  )}
                  {memberPickerQuery && memberPickerOptions.length === 0 && (
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

        </div>
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between gap-3">
          {editingAssignment ? (
            <Btn variant="danger" onClick={() => void handleDeleteFromEdit()}>
              Delete Assignment
            </Btn>
          ) : <span />}
          <div className="flex items-center gap-3">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave}>
              {editingAssignment ? "Save Changes" : "Create Assignment"}
            </Btn>
          </div>
        </div>
      </Modal>
      {/* ── Bulk Case Study Assignment Modal ─────────────────────────────── */}
      <Modal
        open={caseStudyModal}
        onClose={() => { if (!caseStudyWorking) setCaseStudyModal(false); }}
        title="Assign Case Study"
      >
        <div className="space-y-4">
          {/* Deadline preview */}
          {(() => {
            const today = new Date();
            const iDate = new Date(today); iDate.setDate(today.getDate() + 14);
            const fDate = new Date(today); fDate.setDate(today.getDate() + 28);
            const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
            return (
              <div className="bg-[#0F1014] border border-white/10 rounded-lg px-4 py-3 text-xs text-white/60 space-y-1">
                <p className="text-white/40 uppercase tracking-wider text-[10px] font-semibold mb-2">Auto-filled deadlines</p>
                <p><span className="text-white/80">Interview Deadline:</span> {fmt(iDate)}</p>
                <p><span className="text-white/80">Final Deadline:</span> {fmt(fDate)}</p>
              </div>
            );
          })()}

          {/* Member search */}
          <Field label={`Select Members (${caseStudySelected.length} selected)`}>
            <input
              value={caseStudyPickerSearch}
              onChange={(e) => setCaseStudyPickerSearch(e.target.value)}
              placeholder="Search active members..."
              className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/35 focus:outline-none focus:border-[#85CC17]/45 mb-2"
            />
            <div className="max-h-56 overflow-y-auto rounded-lg border border-white/10 bg-[#0F1014] divide-y divide-white/5">
              {caseStudyFilteredMembers.length === 0 && (
                <p className="px-3 py-3 text-xs text-white/40">No active members found.</p>
              )}
              {caseStudyFilteredMembers.map((m) => {
                const name = String(m.name ?? "").trim();
                const checked = caseStudySelected.includes(name);
                return (
                  <button
                    key={m.id ?? name}
                    type="button"
                    onClick={() =>
                      setCaseStudySelected((prev) =>
                        checked ? prev.filter((n) => n !== name) : [...prev, name]
                      )
                    }
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${checked ? "bg-[#85CC17]/10 text-white" : "text-white/65 hover:bg-white/5"}`}
                  >
                    <span className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-colors ${checked ? "bg-[#85CC17] border-[#85CC17] text-black" : "border-white/25"}`}>
                      {checked && "✓"}
                    </span>
                    <span className="truncate">{name}</span>
                    {m.email && <span className="ml-auto text-[10px] text-white/30 truncate max-w-[140px]">{m.email}</span>}
                  </button>
                );
              })}
            </div>
            {caseStudySelected.length > 0 && (
              <button
                type="button"
                onClick={() => setCaseStudySelected([])}
                className="text-xs text-white/40 hover:text-white/70 mt-1.5 transition-colors"
              >
                Clear selection
              </button>
            )}
          </Field>

          {/* Email toggle */}
          <button
            type="button"
            onClick={() => setCaseStudySendEmail((v) => !v)}
            className="flex items-center gap-3 text-sm text-white/70 hover:text-white transition-colors"
          >
            <span className={`w-5 h-5 rounded border flex items-center justify-center text-[10px] font-bold transition-colors ${caseStudySendEmail ? "bg-[#85CC17] border-[#85CC17] text-black" : "border-white/25"}`}>
              {caseStudySendEmail && "✓"}
            </span>
            Send email notification to each member
          </button>

          {caseStudyStatus && (
            <p className={`text-xs ${caseStudyStatus.includes("failed") ? "text-red-400" : "text-[#85CC17]"}`}>
              {caseStudyStatus}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
            <Btn variant="ghost" onClick={() => setCaseStudyModal(false)} disabled={caseStudyWorking}>
              {caseStudyStatus ? "Close" : "Cancel"}
            </Btn>
            <Btn
              variant="primary"
              onClick={() => void handleBulkCaseStudy()}
              disabled={caseStudySelected.length === 0 || caseStudyWorking}
            >
              {caseStudyWorking
                ? "Creating..."
                : `Create ${caseStudySelected.length > 0 ? caseStudySelected.length : ""} Assignment${caseStudySelected.length !== 1 ? "s" : ""}`}
            </Btn>
          </div>
        </div>
      </Modal>
    </MembersLayout>
  );
}
