"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { EMAIL_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Field, Btn, Empty, Modal, Input, useConfirm,
} from "@/components/members/ui";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/members/RichTextEditor";
import {
  subscribeTeam,
  subscribeBusinesses,
  subscribeFinanceAssignments,
  subscribeEmailTemplates,
  subscribeCycles,
  subscribeAssignments,
  subscribeAssignmentClaims,
  subscribeMemberCreditAdjustments,
  createEmailTemplate,
  updateEmailTemplate,
  type TeamMember,
  type Business,
  type FinanceAssignment,
  type EmailTemplate,
  type Cycle,
  type Assignment,
  type AssignmentClaim,
  type MemberCreditAdjustment,
} from "@/lib/members/storage";
import { computeGlobalCodes, getMemberCodes, type AssignmentCode } from "@/lib/members/assignmentCodes";
import { computeDot, computeCreditLedger, classifyMember, lookupCreditTarget, pickPrimaryTrack } from "@/lib/members/cycleCompute";
import { useAuth } from "@/lib/members/authContext";
import { gradeToClassOf } from "@/lib/grades";

const TEAM_EMAIL_FROM_OPTIONS = [
  { value: "info@voltanyc.org", label: "info@voltanyc.org" },
  { value: "ethan@voltanyc.org", label: "ethan@voltanyc.org" },
];

// System email templates seeded on first admin visit. Keys here match the
// EmailTemplateKey union; automation looks them up by key. Edit copy at any
// time from the templates panel — automation reads the live row.
const SYSTEM_TEMPLATE_SEEDS: Array<{
  key: string;
  label: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
}> = [
  {
    key: "orange_pace_warning",
    label: "Pace warning (orange)",
    description: "Sent when a member crosses into orange (2–3 check-ins behind credits). No strike issued.",
    subject: "Heads up — you're behind pace on {{cycleName}}",
    body: "<p>Hey {{memberName}},</p><p>You're at <strong>{{creditsEarned}} of {{creditsTarget}} credits</strong> for {{cycleName}}, which puts you {{checkInsBehind}} check-ins behind pace. There are {{daysRemaining}} days left in the cycle — please claim something from the marketplace soon.</p><p>This is a heads-up, not a strike.</p>",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "checkInsBehind", "daysRemaining"],
  },
  {
    key: "red_pace_strike",
    label: "Pace strike (red)",
    description: "Sent when a member crosses into red (>3 behind, or zero activity past day 28). Issues an automatic strike.",
    subject: "Strike issued — {{cycleName}}",
    body: "<p>Hi {{memberName}},</p><p>You've been issued a strike for: <strong>{{strikeReason}}</strong>.</p><p>Current standing: {{creditsEarned}} of {{creditsTarget}} credits, {{strikeCount}} strikes total. Please reach out to a senior associate if there's context we should know about.</p>",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "strikeReason", "strikeCount"],
  },
  {
    key: "biweekly_checkin",
    label: "Biweekly check-in reminder",
    description: "Fires automatically every two weeks during an active cycle.",
    subject: "{{cycleName}} — biweekly check-in",
    body: "<p>Hey {{memberName}},</p><p>Quick biweekly check-in for {{cycleName}}. You're at <strong>{{creditsEarned}} of {{creditsTarget}}</strong> credits.</p><p>Aim for ~{{pacingPercent}}% of your target every two weeks. Browse the portal for available work.</p>",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "pacingPercent"],
  },
  {
    key: "demotion_notice",
    label: "Demotion notice",
    description: "Sent when a member crosses the demotion threshold and their role is automatically lowered.",
    subject: "Role change — {{cycleName}}",
    body: "<p>Hi {{memberName}},</p><p>Your role has been changed from <strong>{{previousRole}}</strong> to <strong>{{newRole}}</strong> for {{cycleName}} due to accumulated strikes.</p>",
    variables: ["memberName", "previousRole", "newRole", "cycleName"],
  },
  {
    key: "cycle_start",
    label: "Cycle start announcement",
    description: "Mass email at the start of a new cycle.",
    subject: "{{cycleName}} starts now",
    body: "<p>Team,</p><p>{{cycleName}} runs from {{startDate}} to {{endDate}}. Your credit target depends on your role and track — check the portal dashboard for your number.</p>",
    variables: ["cycleName", "startDate", "endDate", "creditsTarget", "pacingPercent"],
  },
  {
    key: "cycle_end_summary",
    label: "Cycle end summary",
    description: "Per-member email at cycle close summarizing earned credits.",
    subject: "{{cycleName}} — your wrap-up",
    body: "<p>Hi {{memberName}},</p><p>{{cycleName}} is closed. You earned <strong>{{creditsEarned}} of {{creditsTarget}}</strong> credits with {{strikeCount}} strikes.</p>",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "outcome", "strikeCount"],
  },
  {
    key: "assignment_approved",
    label: "Assignment approved",
    description: "Sent when an approver accepts a submitted claim.",
    subject: "Approved — {{assignmentTitle}}",
    body: "<p>Nice work, {{memberName}}.</p><p><strong>{{assignmentTitle}}</strong> was approved. {{creditsAwarded}} credits added to your ledger.</p>",
    variables: ["memberName", "assignmentTitle", "creditsAwarded", "businessName"],
  },
  {
    key: "assignment_rejected",
    label: "Assignment rejected",
    description: "Sent when a submission is rejected. Includes the reviewer's reason.",
    subject: "Resubmit needed — {{assignmentTitle}}",
    body: "<p>Hi {{memberName}},</p><p>Your submission for <strong>{{assignmentTitle}}</strong> needs revision.</p><blockquote>{{rejectionReason}}</blockquote><p>Address the feedback and resubmit when ready.</p>",
    variables: ["memberName", "assignmentTitle", "rejectionReason"],
  },
  {
    key: "infraction_notice",
    label: "Infraction notice",
    description: "Sent when an admin manually issues an infraction.",
    subject: "Infraction logged — {{infractionName}}",
    body: "<p>Hi {{memberName}},</p><p>An infraction was logged: <strong>{{infractionName}}</strong> ({{points}} points). Total this cycle: {{totalPoints}}.</p>",
    variables: ["memberName", "infractionName", "points", "totalPoints", "issuedBy", "note"],
  },
  {
    key: "monthly_portal_reminder",
    label: "Monthly portal reminder",
    description: "Replaces per-assignment emails. Reminds members to check the portal.",
    subject: "{{cycleName}} — check the portal",
    body: "<p>Hey {{memberName}},</p><p>Quick reminder: {{openAssignmentCount}} assignments are open. You're at {{creditsEarned}} of {{creditsTarget}} credits.</p>",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "openAssignmentCount"],
  },
];

const EMAIL_PLACEHOLDERS = [
  "{{firstName}}",
  "{{fullName}}",
  "{{memberName}}",
  "{{school}}",
  "{{grade}}",
  "{{projects}}",
] as const;

type DeliveryMode = "to" | "cc" | "bcc";
type TrackKey = "Tech" | "Marketing" | "Finance" | "Other" | "—";

const DEFAULT_EMAIL_SORT_RULES: { col: number; dir: "asc" | "desc" }[] = [
  { col: 1, dir: "asc" },
  { col: 4, dir: "asc" },
  { col: 2, dir: "asc" },
];

// col 0=Status(credit pace), 1=Track, 2=Name, 3=School, 4=Role
const EMAIL_SORT_OPTIONS = [
  { value: 0, label: "Status" },
  { value: 1, label: "Track" },
  { value: 2, label: "Name" },
  { value: 3, label: "School" },
  { value: 4, label: "Role" },
];

const DOT_RANK: Record<string, number> = {
  "bg-emerald-400": 0,
  "bg-yellow-400": 1,
  "bg-orange-400": 2,
  "bg-red-500": 3,
  "bg-gray-400": 4,
};

function roleSortKey(role: string | undefined | null): number {
  switch (String(role ?? "").toLowerCase()) {
    case "board": return 0;
    case "senior associate": return 1;
    case "associate": return 2;
    case "junior associate": return 3;
    default: return 4;
  }
}

const TRACK_SORT_ORDER: Record<TrackKey, number> = {
  Tech: 0,
  Marketing: 1,
  Finance: 2,
  Other: 3,
  "—": 4,
};

function normalizeToken(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getMemberTrack(member: TeamMember): TrackKey {
  const divisions = member.divisions ?? [];
  if (divisions.includes("Tech")) return "Tech";
  if (divisions.includes("Marketing")) return "Marketing";
  if (divisions.includes("Finance")) return "Finance";
  if (divisions.includes("Other") || divisions.includes("Outreach")) return "Other";
  return "—";
}

function getTrackAvatarStyles(track: TrackKey): { bg: string; text: string } {
  switch (track) {
    case "Tech":
      return { bg: "#DBEAFE", text: "#1E3A8A" };
    case "Marketing":
      return { bg: "#FEF3C7", text: "#92400E" };
    case "Finance":
      return { bg: "#DCFCE7", text: "#166534" };
    case "Other":
      return { bg: "#F3F4F6", text: "#374151" };
    default:
      return { bg: "rgba(133,204,23,0.15)", text: "#85CC17" };
  }
}

function TrackAvatarIcon({ track, color }: { track: TrackKey; color: string }) {
  if (track === "Tech") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 8L3 12L8 16" />
        <path d="M16 8L21 12L16 16" />
      </svg>
    );
  }
  if (track === "Marketing") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20l4.5-1.2L19 8.3a1.6 1.6 0 0 0 0-2.2l-1.1-1.1a1.6 1.6 0 0 0-2.2 0L5.2 15.5L4 20z" />
        <path d="M13.5 6.5l4 4" />
      </svg>
    );
  }
  if (track === "Finance") {
    return (
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19h16" />
        <path d="M7 16v-4" />
        <path d="M12 16V9" />
        <path d="M17 16v-10" />
      </svg>
    );
  }
  return (
    <span className="text-[11px] font-semibold leading-none" style={{ color }} aria-hidden="true">
      –
    </span>
  );
}

function isInactiveMember(member: TeamMember): boolean {
  return normalizeToken(member.status ?? "") === "inactive";
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export default function MemberEmailPage() {
  const { authRole, user } = useAuth();
  const canUseEmail = authRole === "owner";

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [financeAssignments, setFinanceAssignments] = useState<FinanceAssignment[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [creditAssignments, setCreditAssignments] = useState<Assignment[]>([]);
  const [creditClaims, setCreditClaims] = useState<AssignmentClaim[]>([]);
  const [creditAdjustments, setCreditAdjustments] = useState<MemberCreditAdjustment[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [fromAddress, setFromAddress] = useState<string>("info@voltanyc.org");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastClickedRecipientId, setLastClickedRecipientId] = useState<string | null>(null);
  const [deliveryModeById, setDeliveryModeById] = useState<Record<string, DeliveryMode>>({});
  const [defaultNewRecipientMode, setDefaultNewRecipientMode] = useState<DeliveryMode>("to");
  const [sortRules, setSortRules] = useState<{ col: number; dir: "asc" | "desc" }[]>(DEFAULT_EMAIL_SORT_RULES);
  const [showSortPanel, setShowSortPanel] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [prefillIds, setPrefillIds] = useState<string[]>([]);
  const editorRef = useRef<RichTextEditorHandle>(null);
  const insertPlaceholder = (placeholder: string) => {
    if (editorRef.current) {
      editorRef.current.insertAtCursor(placeholder);
    }
  };

  // Templates state — drives the pill selector above compose.
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoaded, setTemplatesLoaded] = useState(false);
  const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalLabel, setSaveModalLabel] = useState("");
  const { Dialog: ConfirmDialog } = useConfirm();

  useEffect(() => subscribeTeam(setTeam), []);
  useEffect(() => subscribeBusinesses(setBusinesses), []);
  useEffect(() => subscribeFinanceAssignments(setFinanceAssignments), []);
  useEffect(() => subscribeEmailTemplates((data) => { setTemplatesLoaded(true); setTemplates(data); }), []);
  useEffect(() => subscribeCycles(setCycles), []);
  useEffect(() => subscribeAssignments(setCreditAssignments), []);
  useEffect(() => subscribeAssignmentClaims(setCreditClaims), []);
  useEffect(() => subscribeMemberCreditAdjustments(setCreditAdjustments), []);

  // Seed system templates once Supabase has confirmed the templates list.
  // Wait for templatesLoaded so we don't seed against an empty initial state.
  const [seededSystemTemplates, setSeededSystemTemplates] = useState(false);
  useEffect(() => {
    if (seededSystemTemplates) return;
    if (!canUseEmail || !user) return;
    if (!templatesLoaded) return;
    setSeededSystemTemplates(true);
    void (async () => {
      const existingKeys = new Set(templates.map((t) => t.key));
      const updatedBy = user.email || user.id || "system";
      for (const def of SYSTEM_TEMPLATE_SEEDS) {
        if (existingKeys.has(def.key)) continue;
        try {
          // eslint-disable-next-line no-await-in-loop
          await createEmailTemplate({
            key: def.key,
            label: def.label,
            description: def.description,
            subject: def.subject,
            body: def.body,
            availableVariables: def.variables,
            active: true,
            updatedBy,
          });
        } catch { /* non-fatal */ }
      }
    })();
  }, [seededSystemTemplates, canUseEmail, user, templates, templatesLoaded]);

  // Sort templates: system ones first, then user-created alphabetically.
  // Deduplicate by key, keeping the first occurrence (oldest row wins).
  const sortedTemplates = useMemo(() => {
    const seen = new Set<string>();
    const deduped = templates.filter((t) => {
      if (seen.has(t.key)) return false;
      seen.add(t.key);
      return true;
    });
    return deduped.sort((a, b) => {
      const aSystem = !a.key.startsWith("custom_") ? 0 : 1;
      const bSystem = !b.key.startsWith("custom_") ? 0 : 1;
      if (aSystem !== bSystem) return aSystem - bSystem;
      return (a.label || "").localeCompare(b.label || "");
    });
  }, [templates]);

  const loadedTemplate = loadedTemplateId ? templates.find((t) => t.id === loadedTemplateId) ?? null : null;

  const loadTemplate = (template: EmailTemplate) => {
    setSubject(template.subject || "");
    setMessage(template.body || "");
    setLoadedTemplateId(template.id);
    editorRef.current?.setContent(template.body || "");
  };

  const startSaveAsNew = () => {
    setSaveModalLabel("");
    setSaveModalOpen(true);
  };

  const submitSaveAsNew = async () => {
    const label = saveModalLabel.trim();
    if (!label) return;
    if (!subject.trim() || !message.trim()) {
      setStatus("Please add both a subject and message before saving.");
      return;
    }
    if (!user) return;
    const updatedBy = user.email || user.id || "admin";
    // Custom keys are namespaced so they never collide with system templates.
    const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    await createEmailTemplate({
      key,
      label,
      description: "Saved from the Email page",
      subject,
      body: message,
      availableVariables: [],
      active: true,
      updatedBy,
    });
    setSaveModalOpen(false);
    setSaveModalLabel("");
  };

  const saveChangesToLoaded = async () => {
    if (!loadedTemplate || !user) return;
    if (!subject.trim() || !message.trim()) {
      setStatus("Please add both a subject and message before saving.");
      return;
    }
    const updatedBy = user.email || user.id || "admin";
    await updateEmailTemplate(loadedTemplate.id, {
      subject,
      body: message,
      updatedBy,
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("prefill");
    if (!raw) return;
    const ids = raw.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) return;
    setPrefillIds(ids);
  }, []);

  const globalCodeMaps = useMemo(
    () => computeGlobalCodes(businesses, financeAssignments),
    [businesses, financeAssignments]
  );

  const memberAssignmentsById = useMemo(() => {
    const map = new Map<string, AssignmentCode[]>();
    for (const member of team) {
      const codes = getMemberCodes(member.name ?? "", businesses, financeAssignments, globalCodeMaps);
      map.set(member.id, codes);
    }
    return map;
  }, [team, businesses, financeAssignments, globalCodeMaps]);

const activeCycle = useMemo(() => cycles.find((c) => c.active) ?? null, [cycles]);

  const getMemberIndicator = useCallback((member: TeamMember): { colorClass: string; label: string } => {
    const memberClaims = creditClaims.filter(
      (c) => c.memberId === member.id && (!activeCycle || c.cycleId === activeCycle.id),
    );
    const memberAdjustments = creditAdjustments.filter(
      (a) => a.memberId === member.id && (!activeCycle || a.cycleId === activeCycle.id),
    );
    const credits = new Map<string, number>();
    for (const a of creditAssignments) credits.set(a.id, a.credits);
    const ledger = computeCreditLedger({ claims: memberClaims, adjustments: memberAdjustments, assignmentCredits: credits });
    const classification = classifyMember(member);
    const primaryTrack = pickPrimaryTrack(member);
    const target = activeCycle && classification.cycleRole
      ? lookupCreditTarget(activeCycle, primaryTrack, classification.cycleRole)
      : 0;
    const dot = computeDot({ cycle: activeCycle, member, earnedCredits: ledger.total, targetCredits: target, hasAnyClaims: memberClaims.length > 0 });
    const colorClass =
      dot.color === "green" ? "bg-emerald-400"
        : dot.color === "yellow" ? "bg-yellow-400"
        : dot.color === "orange" ? "bg-orange-400"
        : dot.color === "red" ? "bg-red-500"
        : "bg-gray-400";
    return { colorClass, label: dot.label };
  }, [activeCycle, creditClaims, creditAdjustments, creditAssignments]);

  const compareMemberByCol = useCallback((a: TeamMember, b: TeamMember, col: number): number => {
    switch (col) {
      case 0:
        return (DOT_RANK[getMemberIndicator(a).colorClass] ?? 5) - (DOT_RANK[getMemberIndicator(b).colorClass] ?? 5);
      case 1: {
        const trackCmp = TRACK_SORT_ORDER[getMemberTrack(a)] - TRACK_SORT_ORDER[getMemberTrack(b)];
        return trackCmp !== 0 ? trackCmp : (a.name || "").localeCompare(b.name || "");
      }
      case 2:
        return (a.name || "").localeCompare(b.name || "");
      case 3:
        return (a.school || "").localeCompare(b.school || "");
      case 4: {
        const roleCmp = roleSortKey(a.role) - roleSortKey(b.role);
        return roleCmp !== 0 ? roleCmp : (a.name || "").localeCompare(b.name || "");
      }
      default:
        return 0;
    }
  }, [getMemberIndicator]);

  const addSortRule = () => {
    const usedCols = new Set(sortRules.map((rule) => rule.col));
    const next = EMAIL_SORT_OPTIONS.find((option) => !usedCols.has(option.value));
    if (!next) return;
    setSortRules((prev) => [...prev, { col: next.value, dir: "asc" }]);
  };

  const removeSortRule = (idx: number) => {
    setSortRules((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0 ? [...DEFAULT_EMAIL_SORT_RULES] : next;
    });
  };

  const updateSortRule = (idx: number, field: "col" | "dir", value: number | string) => {
    setSortRules((prev) =>
      prev.map((rule, i) => {
        if (i !== idx) return rule;
        if (field === "col") return { ...rule, col: Number(value) };
        return { ...rule, dir: value as "asc" | "desc" };
      }),
    );
  };

  const normalizedSearch = memberSearch.trim().toLowerCase();

  const filteredMembers = useMemo(
    () =>
      team.filter((member) => {
        if (!normalizedSearch) return true;
        const q = normalizedSearch;
        return (
          (member.name ?? "").toLowerCase().includes(q)
          || (member.school ?? "").toLowerCase().includes(q)
          || (member.grade ?? "").toLowerCase().includes(q)
          || gradeToClassOf(member.grade ?? "").toLowerCase().includes(q)
          || getMemberTrack(member).toLowerCase().includes(q)
          || String(member.role ?? "").toLowerCase().includes(q)
          || (member.email ?? "").toLowerCase().includes(q)
          || (member.alternateEmail ?? "").toLowerCase().includes(q)
        );
      }),
    [team, normalizedSearch],
  );

  const sortedFilteredMembers = useMemo(
    () =>
      [...filteredMembers].sort((a, b) => {
        for (const rule of sortRules) {
          const cmp = compareMemberByCol(a, b, rule.col);
          if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
        }
        return 0;
      }),
    [filteredMembers, sortRules, compareMemberByCol],
  );

  const selectableFilteredMembers = useMemo(
    () => sortedFilteredMembers.filter((member) => !isInactiveMember(member)),
    [sortedFilteredMembers],
  );
  const orderedSelectableMemberIds = useMemo(
    () => selectableFilteredMembers.map((member) => member.id),
    [selectableFilteredMembers],
  );

  const selectedMembers = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    return team
      .filter((member) => selectedSet.has(member.id) && !isInactiveMember(member))
      .sort((a, b) => {
        for (const rule of sortRules) {
          const cmp = compareMemberByCol(a, b, rule.col);
          if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
        }
        return 0;
      });
  }, [selectedIds, team, sortRules, compareMemberByCol]);

  const selectedRecipients = useMemo(() => {
    return selectedMembers
      .map((member) => {
        const email = normalizeEmail(member.email ?? "");
        const mode = deliveryModeById[member.id] ?? defaultNewRecipientMode;
        return { id: member.id, email, mode, name: member.name };
      })
      .filter((item) => !!item.email);
  }, [defaultNewRecipientMode, deliveryModeById, selectedMembers]);

  const prefillKey = prefillIds.join(",");
  const [appliedPrefillKey, setAppliedPrefillKey] = useState("");

  const toRecipients = useMemo(
    () => Array.from(new Set(selectedRecipients.filter((recipient) => recipient.mode === "to").map((recipient) => recipient.email))),
    [selectedRecipients],
  );
  const ccRecipients = useMemo(
    () => Array.from(new Set(selectedRecipients.filter((recipient) => recipient.mode === "cc").map((recipient) => recipient.email))),
    [selectedRecipients],
  );
  const bccRecipients = useMemo(
    () => Array.from(new Set(selectedRecipients.filter((recipient) => recipient.mode === "bcc").map((recipient) => recipient.email))),
    [selectedRecipients],
  );

  useEffect(() => {
    setSelectedIds((prev) =>
      prev.filter((id) => {
        const member = team.find((entry) => entry.id === id);
        return !!member && !isInactiveMember(member);
      }),
    );
  }, [team]);

  useEffect(() => {
    if (!prefillKey || prefillKey === appliedPrefillKey || team.length === 0) return;
    const validSet = new Set(
      team
        .filter((member) => prefillIds.includes(member.id))
        .filter((member) => !isInactiveMember(member) && !!normalizeEmail(member.email ?? ""))
        .map((member) => member.id),
    );
    if (validSet.size === 0) {
      setAppliedPrefillKey(prefillKey);
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...Array.from(validSet)])));
    setDeliveryModeById((prev) => {
      const next = { ...prev };
      for (const id of Array.from(validSet)) {
        if (!next[id]) next[id] = defaultNewRecipientMode;
      }
      return next;
    });
    setAppliedPrefillKey(prefillKey);
  }, [appliedPrefillKey, defaultNewRecipientMode, prefillIds, prefillKey, team]);

  const toggleSelected = (id: string, checked: boolean, shiftKey = false) => {
    const targetIds = (() => {
      if (!shiftKey || !lastClickedRecipientId || lastClickedRecipientId === id) return [id];
      const start = orderedSelectableMemberIds.indexOf(lastClickedRecipientId);
      const end = orderedSelectableMemberIds.indexOf(id);
      if (start === -1 || end === -1) return [id];
      const [lo, hi] = start < end ? [start, end] : [end, start];
      return orderedSelectableMemberIds.slice(lo, hi + 1);
    })();

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        targetIds.forEach((targetId) => next.add(targetId));
      } else {
        targetIds.forEach((targetId) => next.delete(targetId));
      }
      return Array.from(next);
    });
    if (checked) {
      setDeliveryModeById((current) => {
        const next = { ...current };
        targetIds.forEach((targetId) => {
          if (!next[targetId]) next[targetId] = defaultNewRecipientMode;
        });
        return next;
      });
    }
    setLastClickedRecipientId(id);
  };

  const setRecipientMode = (id: string, mode: DeliveryMode) => {
    setDeliveryModeById((prev) => ({ ...prev, [id]: mode }));
  };


  const sendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      setStatus("Please add a subject and message.");
      return;
    }
    const totalRecipients = toRecipients.length + ccRecipients.length + bccRecipients.length;
    if (totalRecipients === 0) {
      setStatus("No recipients selected.");
      return;
    }
    if (!user) {
      setStatus("Not authenticated.");
      return;
    }

    setSending(true);
    setStatus("Sending…");
    try {
      const token = await getAuthToken();
      const formData = new FormData();
      formData.append("fromAddress", fromAddress);
      formData.append("subject", subject.trim());
      formData.append("message", message.trim());
      formData.append("contentMode", "html");
      toRecipients.forEach((e) => formData.append("toRecipients", e));
      ccRecipients.forEach((e) => formData.append("ccRecipients", e));
      bccRecipients.forEach((e) => formData.append("bccRecipients", e));
      selectedRecipients.forEach((recipient) => {
        const member = team.find((item) => item.id === recipient.id);
        const assignments = member ? (memberAssignmentsById.get(member.id) ?? []).map((item) => item.title).join(", ") : "";
        formData.append("recipientMeta", JSON.stringify({
          email: recipient.email,
          fullName: member?.name ?? recipient.name ?? "",
          memberName: member?.name ?? recipient.name ?? "",
          school: member?.school ?? "",
          grade: member?.grade ?? "",
          projects: assignments,
        }));
      });
      attachments.forEach((f) => formData.append("attachments", f, f.name));
      const response = await fetch("/api/members/team-email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });
      if (!response.ok) {
        setStatus("Could not send email.");
        return;
      }
      const payload = await response.json() as {
        sent?: number;
        failed?: string[];
        from?: string;
        counts?: { to?: number; cc?: number; bcc?: number };
      };
      const sentCount = payload.sent ?? 0;
      const failedCount = payload.failed?.length ?? 0;
      const counts = payload.counts ?? {};
      const breakdown = `To ${counts.to ?? toRecipients.length} · CC ${counts.cc ?? ccRecipients.length} · BCC ${counts.bcc ?? bccRecipients.length}`;
      setStatus(
        failedCount > 0
          ? `Sent from ${payload.from ?? fromAddress} to ${sentCount}. Failed: ${failedCount}. ${breakdown}`
          : `Sent from ${payload.from ?? fromAddress} to ${sentCount}. ${breakdown}`,
      );

      // Update template usage if a template was loaded
      if (loadedTemplateId && loadedTemplate) {
        try {
          await updateEmailTemplate(loadedTemplateId, {
            usageCount: (loadedTemplate.usageCount ?? 0) + 1,
            lastUsedAt: new Date().toISOString(),
          });
          // Update local state
          setTemplates(prev =>
            prev.map(t =>
              t.id === loadedTemplateId
                ? { ...t, usageCount: (t.usageCount ?? 0) + 1, lastUsedAt: new Date().toISOString() }
                : t
            )
          );
        } catch (error) {
          console.error("Failed to update template usage:", error);
        }
      }
    } catch {
      setStatus("Could not send email.");
    } finally {
      setSending(false);
    }
  };

  if (!canUseEmail) {
    return (
      <MembersLayout>
        <PageHeader title="Member Email" />
        <Empty message="You do not have permission to use bulk member email." />
      </MembersLayout>
    );
  }

  const totalSelected = toRecipients.length + ccRecipients.length + bccRecipients.length;

  return (
    <MembersLayout>
      <PageHeader title="Member Email" />
      <SectionTabs tabs={EMAIL_TABS} />

      <div className="space-y-4">
        <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-white">Recipients</h2>
              <span className="text-xs text-white/50">
                To {toRecipients.length} · CC {ccRecipients.length} · BCC {bccRecipients.length}
              </span>
            </div>

            <div className="members-table-shell members-scroll-hidden max-h-[240px] overflow-x-auto overflow-y-auto bg-[#11151D]">
              <table className="members-grid-table members-email-grid w-full min-w-[960px] table-fixed text-xs [&_td]:overflow-hidden">
                <thead className="bg-[#10131A] sticky top-0 z-[1]">
                  <tr>
                    <th className="text-left px-3 py-2 text-white/45 w-10" aria-label="Select recipient" />
                    <th className="text-left px-3 py-2 text-white/45 w-[280px]">Name</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[340px]">Primary Email</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[280px]">School</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[100px]">HS Class</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[100px]">Mode</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {selectedMembers.map((member) => {
                    const track = getMemberTrack(member);
                    const avatar = getTrackAvatarStyles(track);
                    const indicator = getMemberIndicator(member);
                    const mode = deliveryModeById[member.id] ?? defaultNewRecipientMode;
                    return (
                      <tr key={`selected-${member.id}`} className="hover:bg-white/5 bg-[#85CC17]/6">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked
                            onChange={(e) => {
                              const shiftKey = "shiftKey" in e.nativeEvent
                                ? Boolean((e.nativeEvent as MouseEvent).shiftKey)
                                : false;
                              toggleSelected(member.id, e.target.checked, shiftKey);
                            }}
                            className="members-checkbox"
                          />
                        </td>
                        <td className="px-3 py-2 text-white/75 whitespace-nowrap">
                          <span className="members-no-cell-scroll inline-flex items-center gap-2 min-w-0 max-w-full">
                            <span className={`h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0`} title={indicator.label} />
                            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatar.bg }}>
                              <TrackAvatarIcon track={track} color={avatar.text} />
                            </span>
                            <span className="truncate block max-w-[190px]" title={member.name || "—"}>{member.name || "—"}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-white/65 font-mono whitespace-nowrap truncate" title={member.email || "—"}>{member.email || "—"}</td>
                        <td className="px-3 py-2 text-white/45 whitespace-nowrap truncate" title={member.school || "—"}>{member.school || "—"}</td>
                        <td className="px-3 py-2 text-white/55 whitespace-nowrap">{member.grade || "—"}</td>
                        <td className="px-3 py-2">
                          <div className="members-no-cell-scroll inline-flex rounded-lg border border-white/10 overflow-hidden text-[10px] font-semibold">
                            {(["to", "cc", "bcc"] as const).map((m) => (
                              <button
                                key={m}
                                type="button"
                                onClick={() => setRecipientMode(member.id, m)}
                                className={`px-2 py-1 uppercase transition-colors ${mode === m ? "bg-[#85CC17]/20 text-[#9BE22B]" : "text-white/40 hover:text-white/70 hover:bg-white/5"}`}
                              >
                                {m}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {selectedMembers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-6 text-center text-white/35">No recipients selected yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/35" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members by name, school, or track…"
                className="w-full h-12 rounded-lg border border-white/10 bg-[#0F1014] pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#85CC17]/45"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-white/55">
                {totalSelected} selected · {sortedFilteredMembers.length} matching search
                {sortedFilteredMembers.length !== selectableFilteredMembers.length ? ` · ${sortedFilteredMembers.length - selectableFilteredMembers.length} inactive` : ""}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white/40">Default mode:</span>
                <select
                  value={defaultNewRecipientMode}
                  onChange={(e) => setDefaultNewRecipientMode((e.target.value as DeliveryMode) || "to")}
                  className="h-8 rounded-lg border border-white/10 bg-[#0F1014] px-2.5 text-xs text-white focus:outline-none focus:border-[#85CC17]/45"
                >
                  <option value="to">To</option>
                  <option value="cc">CC</option>
                  <option value="bcc">BCC</option>
                </select>
                <div className="relative">
                  <Btn size="sm" variant="ghost" onClick={() => setShowSortPanel((v) => !v)}>
                    Sort{sortRules.length > 1 ? ` (${sortRules.length})` : ""}
                  </Btn>
                  {showSortPanel && (
                    <div className="absolute top-full right-0 mt-1 bg-[#1C1F26] border border-white/10 rounded-lg shadow-xl z-50 p-3 w-[360px] max-w-[min(92vw,360px)]">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] text-white/45 uppercase tracking-wide">Sort Rules</p>
                        <button
                          type="button"
                          className="text-[10px] text-white/55 hover:text-white transition-colors"
                          onClick={() => setShowSortPanel(false)}
                        >
                          Close
                        </button>
                      </div>
                      {sortRules.map((rule, idx) => (
                        <div key={idx} className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] text-white/45 w-[54px]">{idx === 0 ? "Sort by" : "Then by"}</span>
                          <select
                            value={rule.col}
                            onChange={(e) => updateSortRule(idx, "col", Number(e.target.value))}
                            className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/45"
                          >
                            {EMAIL_SORT_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <select
                            value={rule.dir}
                            onChange={(e) => updateSortRule(idx, "dir", e.target.value)}
                            className="bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#85CC17]/45 w-[72px]"
                          >
                            <option value="asc">A→Z</option>
                            <option value="desc">Z→A</option>
                          </select>
                          {sortRules.length > 1 && (
                            <button
                              onClick={() => removeSortRule(idx)}
                              className="members-icon-btn members-icon-btn-danger h-6 w-6 text-xs"
                              aria-label="Remove sort rule"
                              title="Remove sort rule"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <div className="mt-2 flex items-center justify-between">
                        {sortRules.length < EMAIL_SORT_OPTIONS.length ? (
                          <button onClick={addSortRule} className="text-[10px] text-[#85CC17]/75 hover:text-[#85CC17] transition-colors">
                            + Add sort level
                          </button>
                        ) : <span />}
                        <button
                          type="button"
                          className="text-[10px] text-white/50 hover:text-white/80 transition-colors"
                          onClick={() => setSortRules([...DEFAULT_EMAIL_SORT_RULES])}
                        >
                          Reset default
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="members-table-shell members-scroll-hidden max-h-[260px] overflow-x-auto overflow-y-auto">
              <table className="members-grid-table members-email-grid w-full min-w-[1020px] table-fixed text-xs [&_td]:overflow-hidden">
                <thead className="bg-[#141821] sticky top-0 z-[1]">
                  <tr>
                    <th className="text-left px-3 py-2 text-white/45 w-10" aria-label="Select recipient" />
                    <th className="text-left px-3 py-2 text-white/45 w-[280px]">Name</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[340px]">Primary Email</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[280px]">School</th>
                    <th className="text-left px-3 py-2 text-white/45 w-[120px]">HS Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sortedFilteredMembers.map((member) => {
                    const checked = selectedIds.includes(member.id);
                    const inactive = isInactiveMember(member);
                    const indicator = getMemberIndicator(member);
                    const track = getMemberTrack(member);
                    const avatar = getTrackAvatarStyles(track);
                    return (
                      <tr key={member.id} className={`hover:bg-white/5 ${checked ? "bg-[#85CC17]/6" : ""} ${inactive ? "opacity-50 bg-white/[0.02]" : ""}`}>
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked && !inactive}
                            onChange={(e) => {
                              const shiftKey = "shiftKey" in e.nativeEvent
                                ? Boolean((e.nativeEvent as MouseEvent).shiftKey)
                                : false;
                              toggleSelected(member.id, e.target.checked, shiftKey);
                            }}
                            disabled={inactive}
                            className="members-checkbox"
                          />
                        </td>
                        <td className="px-3 py-2 text-white/75 whitespace-nowrap">
                          <span className="members-no-cell-scroll inline-flex items-center gap-2 min-w-0 max-w-full">
                            <span className={`h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0`} title={indicator.label} />
                            <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: avatar.bg }}>
                              <TrackAvatarIcon track={track} color={avatar.text} />
                            </span>
                            <span className="truncate block max-w-[190px]" title={member.name || "—"}>{member.name || "—"}</span>
                          </span>
                          {inactive && <span className="text-white/35 ml-2">(inactive)</span>}
                        </td>
                        <td className="px-3 py-2 text-white/65 font-mono whitespace-nowrap truncate" title={member.email || "—"}>{member.email || "—"}</td>
                        <td className="px-3 py-2 text-white/45 whitespace-nowrap truncate" title={member.school || "—"}>{member.school || "—"}</td>
                        <td className="px-3 py-2 text-white/55 whitespace-nowrap">{member.grade || "—"}</td>
                      </tr>
                    );
                  })}
                  {sortedFilteredMembers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-white/35">No members match this search.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <ConfirmDialog />

        {/* ── Templates panel ── */}
        <div className="rounded-2xl border border-white/10 bg-[#13161D] p-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">Templates</p>
              <p className="text-xs text-white/55 mt-0.5">
                {loadedTemplate
                  ? <>Loaded: <span className="text-white/85 font-medium">{loadedTemplate.label}</span> — edits will update this template when you click Save.</>
                  : "Click a template to load it into the editor below."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {loadedTemplate && (
                <Btn size="sm" variant="secondary" onClick={() => void saveChangesToLoaded()}>
                  Save changes
                </Btn>
              )}
              <Btn size="sm" variant="primary" onClick={startSaveAsNew} disabled={!subject.trim() && !message.trim()}>
                Save as new
              </Btn>
              {loadedTemplate && (
                <Btn size="sm" variant="ghost" onClick={() => { setLoadedTemplateId(null); setSubject(""); setMessage(""); editorRef.current?.setContent(""); }}>
                  Clear
                </Btn>
              )}
            </div>
          </div>

          {sortedTemplates.length > 0 && (
            <div className="flex flex-wrap gap-1.5 max-h-[120px] overflow-y-auto">
              {sortedTemplates.map((t) => {
                const selected = loadedTemplateId === t.id;
                const isSystem = !t.key.startsWith("custom_");
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => loadTemplate(t)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      selected
                        ? "border-[#85CC17]/55 bg-[#85CC17]/10 text-[#9BE22B]"
                        : "border-white/15 bg-[#11141A] text-white/75 hover:border-white/35"
                    }`}
                    title={t.description || (isSystem ? "System template" : "Custom template")}
                  >
                    {isSystem && <span className="text-[9px] uppercase tracking-wider text-white/45">sys</span>}
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Field label="Subject" required>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
          />
        </Field>
        <Field label="Send from" required>
          <select
            value={fromAddress}
            onChange={(e) => setFromAddress(e.target.value)}
            className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
          >
            {TEAM_EMAIL_FROM_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>
        <Field label="Message" required>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {EMAIL_PLACEHOLDERS.map((placeholder) => (
              <button
                key={placeholder}
                type="button"
                onClick={() => insertPlaceholder(placeholder)}
                className="rounded-full border border-white/12 bg-white/5 px-2 py-1 text-[11px] text-white/65 hover:border-[#85CC17]/35 hover:text-white transition-colors"
              >
                {placeholder}
              </button>
            ))}
          </div>
          <RichTextEditor
            ref={editorRef}
            content={message}
            onChange={setMessage}
            attachments={attachments}
            onAttachmentsChange={setAttachments}
            placeholder="Write your email..."
            minHeight={280}
          />
        </Field>

        {status && <p className="text-xs text-white/60">{status}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <span />
          <Btn
            variant="primary"
            onClick={sendEmail}
            disabled={sending || totalSelected === 0}
          >
            {sending ? "Sending..." : `Send Emails (${totalSelected})`}
          </Btn>
        </div>

        {/* Save-as-new template modal */}
        <Modal open={saveModalOpen} onClose={() => setSaveModalOpen(false)} title="Save as new template">
          <Field label="Template name" required>
            <Input
              value={saveModalLabel}
              onChange={(e) => setSaveModalLabel(e.target.value)}
              placeholder="e.g. Welcome to summer cycle"
            />
          </Field>
          <p className="text-[11px] text-white/45 mt-2">
            Saves the current subject and message as a reusable template. Add as many as you like.
          </p>
          <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-white/8">
            <Btn variant="ghost" onClick={() => setSaveModalOpen(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={() => void submitSaveAsNew()} disabled={!saveModalLabel.trim()}>
              Save
            </Btn>
          </div>
        </Modal>

      </div>
    </MembersLayout>
  );
}
