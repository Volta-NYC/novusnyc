"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { Fragment, useState, useEffect, useMemo } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Btn, Modal, Field, Input, Select, Empty, SkeletonRows, LoadError, useConfirm,
  ViewPanel, ViewSection, SortPanel, type SortRule,
} from "@/components/members/ui";
import Combobox from "@/components/Combobox";
import {
  subscribeTeam, createTeamMember, updateTeamMember, deleteTeamMember,
  subscribeBusinesses,
  subscribePods, subscribePodMembers, fetchMemberContributions, getSiteSettings,
  fetchDeletedTeamMembers, restoreTeamMember,
  subscribeApplications,
  type TeamMember, type Business, type ApplicationRecord,
  type Pod, type PodMember, type MemberContribution,
} from "@/lib/members/storage";
import { computeGlobalCodes } from "@/lib/members/assignmentCodes";
import { useAuth } from "@/lib/members/authContext";
import TrackAvatar, { getMemberTrack, TRACK_SORT_ORDER, type TrackKey } from "@/components/members/TrackAvatar";
import {
  MEMBER_ROLES, DEFAULT_MEMBER_ROLE, isInactiveMember,
  TIER_ORDER, memberTier, infractionStanding, STANDING_LABEL,
  STANDING_STYLE, DEFAULT_INFRACTION_THRESHOLDS, WORK_SCORE_EXPLAINER,
  type MemberRole, type MemberTier,
} from "@/lib/members/roles";
import { CLASS_GRADE_OPTIONS, gradeToClassOf } from "@/lib/grades";
import MemberDrawer from "@/components/members/MemberDrawer";
import { toCsv, downloadCsv, dateStampedFilename } from "@/lib/csv";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

// Blank form values for creating a new team member.
const BLANK_FORM: Omit<TeamMember, "id" | "createdAt"> = {
  grade: "",
  acceptedDate: "",
  name: "", school: "", divisions: [], role: DEFAULT_MEMBER_ROLE, slackHandle: "",
  email: "", alternateEmail: "", status: "Active", skills: [], joinDate: "",
};

const GRADE_OPTIONS = CLASS_GRADE_OPTIONS;
type AssignmentCodePrefix = "W" | "M" | "F" | "R" | "C";

type MemberAssignmentLink = {
  id: string;
  kind: "Business Project" | "Finance Assignment";
  title: string;
  topic?: string;
  teamNames: string[];
  codePrefix: AssignmentCodePrefix;
  code: string;
  status: string;
  deadline: string;
  href: string;
};

// col 0=Status(activity), 1=Track, 2=Name, 3=School, 4=Role
const DEFAULT_SORT_RULES: { col: number; dir: "asc" | "desc" }[] = [
  { col: 1, dir: "asc" },
  { col: 4, dir: "asc" },
  { col: 2, dir: "asc" },
];

// Colour by the stored title only — leading a pod is a separate fact and gets
// its own chip, so a Developer who runs a pod shows both instead of one
// overwriting the other.
const ROLE_CHIP: Record<MemberTier, string> = {
  board:          "border-amber-400/40 bg-amber-400/10 text-amber-400",
  "chapter-exec": "border-orange-400/40 bg-orange-400/10 text-orange-400",
  leadership:     "border-violet-400/35 bg-violet-400/10 text-violet-300",
  lit:            "border-sky-400/35 bg-sky-400/10 text-sky-300",
  member:         "border-white/15 bg-[#11141A] text-white/80",
};

const SORT_OPTIONS = [
  { value: 0, label: "Status" },
  { value: 1, label: "Track" },
  { value: 2, label: "Name" },
  { value: 3, label: "School" },
  { value: 4, label: "Role" },
  { value: 5, label: "Date Accepted" },
  { value: 6, label: "Work" },
  { value: 7, label: "Hours" },
];

const ADMIN_COLS = [
  { key: "name",           label: "Name",            width: 270, sortCol: 2  as number | null },
  { key: "email",          label: "Email",           width: 330, sortCol: null },
  { key: "school",         label: "School",          width: 280, sortCol: 3  as number | null },
  { key: "hsClass",        label: "HS Class",        width: 80,  sortCol: null },
  { key: "role",           label: "Role",            width: 120, sortCol: 4  as number | null },
  { key: "resume",         label: "Resume",          width: 80,  sortCol: null },
  { key: "acceptedDate",   label: "Date Accepted",   width: 116, sortCol: 5   as number | null },
  { key: "home",           label: "Based in",        width: 130, sortCol: null },
  { key: "work",           label: "Work",            width: 190, sortCol: 6  as number | null },
  { key: "pods",           label: "Pods",            width: 150, sortCol: null },
  { key: "strikes",        label: "Standing",        width: 96,  sortCol: null },
  { key: "actions",        label: "Actions",         width: 148, sortCol: null },
];

const ROLE_OPTIONS = MEMBER_ROLES;
type RoleOption = MemberRole;

// Display the role exactly as stored, so legacy entries (e.g. "Project Lead",
// "Member") still show up faithfully even though they aren't selectable in the popover.
function displayRoleValue(value: unknown): string {
  const raw = String(value ?? "").trim();
  return raw || "—";
}

function normalizeText(v: string): string {
  return v.trim().replace(/\s+/g, " ");
}

function normalizeKey(v: string): string {
  return normalizeText(v).toLowerCase();
}

function truncateCell(value: string, max = 64): string {
  const text = String(value ?? "").trim();
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function TeamPage() {
  const [team, setTeam]               = useState<TeamMember[]>([]);
  const [businesses, setBusinesses]   = useState<Business[]>([]);
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);
  const [showAlternateEmail, setShowAlternateEmail] = useState(false);
  const [sortRules, setSortRules]     = useState<SortRule[]>(DEFAULT_SORT_RULES);
  const [hiddenAdminCols, setHiddenAdminCols] = useState<Set<string>>(new Set());
  const [hideInactive, setHideInactive] = useState(true);
  const [showOnlyInactive, setShowOnlyInactive] = useState(false);
  const [openRolePopoverId, setOpenRolePopoverId] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  // Hours + pods drive the member row; credits were retired.
  const [thresholds, setThresholds] = useState(DEFAULT_INFRACTION_THRESHOLDS);
  const [removed, setRemoved] = useState<TeamMember[]>([]);
  const [showRemoved, setShowRemoved] = useState(false);
  const [contributions, setContributions] = useState<MemberContribution[]>([]);
  const [pods, setPods] = useState<Pod[]>([]);
  const [podMembers, setPodMembers] = useState<PodMember[]>([]);
  const [drawerMember, setDrawerMember] = useState<TeamMember | null>(null);
  const [assignmentQuickView, setAssignmentQuickView] = useState<{ item: MemberAssignmentLink; memberName: string } | null>(null);
  const [inviteStatus, setInviteStatus] = useState<Record<string, "sending" | "sent" | "error">>({});
  const [inviteAllState, setInviteAllState] = useState<"idle" | "running" | "done">("idle");
  const [inviteAllProgress, setInviteAllProgress] = useState({ sent: 0, total: 0 });
  const { ask, Dialog } = useConfirm();
  const { authRole, user } = useAuth();
  const canEdit = authRole === "owner";
  const isMemberRestricted = authRole === "member";
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);

  useEffect(() => {
    const fetchSchoolNames = async () => {
      try {
        const names = await import('@/lib/members/storage').then(mod => mod.getTeamSchoolNames());
        setSchoolOptions(names);
      } catch (error) {
        console.error('Failed to fetch school names:', error);
        setSchoolOptions([]);
      } finally {
        setLoadingSchools(false);
      }
    };

    fetchSchoolNames();
  }, []);

  // Subscribe to real-time team updates; unsubscribe on unmount.
  const [teamLoaded, setTeamLoaded] = useState(false);
  const [teamLoadError, setTeamLoadError] = useState<string | null>(null);
  useEffect(() => subscribeTeam((items, state) => {
    setTeam(items);
    setTeamLoaded(true);
    setTeamLoadError(state.error);
  }), []);

  // Real-time subscriptions for all supporting data — automatic updates when database changes.
  useEffect(() => {
    const unsubscribeBusinesses = subscribeBusinesses(setBusinesses);
    const unsubscribePods = subscribePods(setPods);
    const unsubscribePodMembers = subscribePodMembers(setPodMembers);
    void fetchMemberContributions().then(setContributions);
    void getSiteSettings().then((settings) => setThresholds(settings.infractionThresholds));

    // Cleanup subscriptions on unmount
    return () => {
      unsubscribeBusinesses();
      unsubscribePods();
      unsubscribePodMembers();
    };
  }, []);

  useEffect(() => {
    if (!canEdit) { setRemoved([]); return; }
    void fetchDeletedTeamMembers().then(setRemoved);
  }, [canEdit]);

  useEffect(() => subscribeApplications(setApplications), []);

  // Close the inline role-edit popover on click outside, scroll, or resize.
  useEffect(() => {
    if (!openRolePopoverId) return;
    const close = () => { setOpenRolePopoverId(null); setPopoverPos(null); };
    const timerId = setTimeout(() => document.addEventListener("click", close), 0);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      clearTimeout(timerId);
      document.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openRolePopoverId]);

  const handleQuickRoleChange = async (member: TeamMember, nextRole: RoleOption) => {
    setOpenRolePopoverId(null);
    if (String(member.role ?? "").trim() === nextRole) return;
    setTeam((prev) => prev.map((m) => m.id === member.id ? { ...m, role: nextRole } : m));
    await updateTeamMember(member.id, { role: nextRole });
  };

  const copyText = async (value: string) => {
    const safe = value.trim();
    if (!safe) return;
    try {
      await navigator.clipboard.writeText(safe);
    } catch {
      // no-op
    }
  };

  // Generic field updater used by all form inputs.
  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditingMember(null);
    setShowAlternateEmail(false);
    setModal("create");
  };

  const openEdit = (member: TeamMember) => {
    setForm({
      name:        member.name,
      school:      member.school,
      // Coerce any legacy "Senior"/"Junior" value into the matching Class-of label
      // so the dropdown lands on the right option when editing older records.
      grade:       gradeToClassOf(member.grade ?? "", member.acceptedDate || member.joinDate),
      // Guard against undefined arrays on legacy rows.
      divisions:   member.divisions ?? [],
      role:        member.role,
      slackHandle: member.slackHandle,
      email:       member.email,
      alternateEmail: member.alternateEmail ?? "",
      status:      member.status,
      skills:      member.skills ?? [],
      joinDate:    member.joinDate,
      acceptedDate: member.acceptedDate ?? "",
    });
    setEditingMember(member);
    setShowAlternateEmail(!!(member.alternateEmail ?? "").trim());
    setModal("edit");
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    if (editingMember) {
      setTeam((prev) => prev.map((m) => m.id === editingMember.id ? { ...m, ...(form as Partial<TeamMember>) } : m));
      await updateTeamMember(editingMember.id, form as Partial<TeamMember>);
    } else {
      await createTeamMember(form as Omit<TeamMember, "id" | "createdAt">);
    }
    setModal(null);
  };

  const handleDeleteFromEdit = async () => {
    if (!editingMember) return;
    await ask(
      async () => {
        await deleteTeamMember(editingMember.id);
        setModal(null);
      },
      `Remove ${editingMember.name} from the directory? Their hours and pod history are kept, and an owner can restore the record from the database if this was a mistake.`
    );
  };

  const handleDeleteAccount = async () => {
    if (!editingMember?.authUid) return;
    await ask(
      async () => {
        const token = await getAuthToken();
        const res = await fetch("/api/members/admin/delete-account", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ memberId: editingMember.id }),
        });
        if (!res.ok) {
          const { detail } = await res.json().catch(() => ({})) as { detail?: string };
          throw new Error(detail ?? "Failed to delete account.");
        }
        setModal(null);
      },
      `Delete ${editingMember.name}'s portal account? Their member profile will be kept, but they will need a new invite to access the portal.`
    );
  };

  const handleSendInvite = async (member: TeamMember) => {
    setInviteStatus(s => ({ ...s, [member.id]: "sending" }));
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/admin/invite-member", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ memberId: member.id }),
      });
      setInviteStatus(s => ({ ...s, [member.id]: res.ok ? "sent" : "error" }));
      if (res.ok) setTimeout(() => setInviteStatus(s => { const n = { ...s }; delete n[member.id]; return n; }), 3000);
    } catch {
      setInviteStatus(s => ({ ...s, [member.id]: "error" }));
    }
  };

  const handleInviteAll = async () => {
    const uninvited = team.filter(m =>
      !m.authUid &&
      String(m.status ?? "").toLowerCase() !== "inactive" &&
      (m.email ?? "").trim()
    );
    if (!uninvited.length || inviteAllState === "running") return;
    setInviteAllState("running");
    setInviteAllProgress({ sent: 0, total: uninvited.length });
    const token = await getAuthToken();
    let sent = 0;
    for (const member of uninvited) {
      try {
        const res = await fetch("/api/members/admin/invite-member", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ memberId: member.id }),
        });
        if (res.ok) {
          sent += 1;
          setInviteStatus(s => ({ ...s, [member.id]: "sent" }));
        }
      } catch { /* skip failed rows */ }
      setInviteAllProgress({ sent, total: uninvited.length });
    }
    setInviteAllState("done");
    setTimeout(() => { setInviteAllState("idle"); setInviteAllProgress({ sent: 0, total: 0 }); }, 4000);
  };

  const filtered = team.filter(member => {
    const isInactive = isInactiveMember(member.status);

    if (showOnlyInactive) {
      if (!isInactive) return false;
    } else if (hideInactive) {
      if (isInactive) return false;
    }
    if (!search) return true;
    const q = search.toLowerCase();
    return (member.name ?? "").toLowerCase().includes(q)
      || (member.school ?? "").toLowerCase().includes(q)
      || (member.grade ?? "").toLowerCase().includes(q)
      || gradeToClassOf(member.grade ?? "", member.acceptedDate || member.joinDate).toLowerCase().includes(q)
      || getMemberTrack(member).toLowerCase().includes(q)
      || String(member.role ?? "").toLowerCase().includes(q)
      || (member.email ?? "").toLowerCase().includes(q)
      || (member.alternateEmail ?? "").toLowerCase().includes(q);
  });

  const resumeUrlByEmail = useMemo(() => {
    const map = new Map<string, string>();
    for (const app of applications) {
      if (!app.resumeUrl) continue;
      const email = normalizeKey(app.email ?? "");
      if (email) map.set(email, app.resumeUrl);
    }
    return map;
  }, [applications]);

  // Status dot rank: green=0 (most recent activity) through gray=4 (none).
  const DOT_RANK: Record<string, number> = {
    "bg-emerald-400": 0,
    "bg-yellow-400": 1,
    "bg-orange-400": 2,
    "bg-red-500": 3,
    "bg-gray-400": 4,
  };

  // col 0=Status, 1=Track, 2=Name, 3=School, 4=Role
  const compareMemberByCol = (a: TeamMember, b: TeamMember, col: number): number => {
    switch (col) {
      case 0: {
        const rankA = DOT_RANK[getMemberIndicator(a).colorClass] ?? 5;
        const rankB = DOT_RANK[getMemberIndicator(b).colorClass] ?? 5;
        return rankA - rankB;
      }
      case 1: return (TRACK_SORT_ORDER[getMemberTrack(a)] ?? 9) - (TRACK_SORT_ORDER[getMemberTrack(b)] ?? 9);
      case 2: return (a.name || "").localeCompare(b.name || "");
      case 3: return (a.school || "").localeCompare(b.school || "");
      case 4: {
        // Rank means the display tier — Board, Leadership, LIT, then members
        // ordered by how much work they've actually done.
        const ta = TIER_ORDER.indexOf(tierOf(a));
        const tb = TIER_ORDER.indexOf(tierOf(b));
        if (ta !== tb) return ta - tb;
        const wa = workByMemberId.get(a.id)?.workScore ?? 0;
        const wb = workByMemberId.get(b.id)?.workScore ?? 0;
        if (wa !== wb) return wb - wa;
        return (a.name || "").localeCompare(b.name || "");
      }
      case 6: {
        const wa = workByMemberId.get(a.id)?.workScore ?? 0;
        const wb = workByMemberId.get(b.id)?.workScore ?? 0;
        return wb - wa;
      }
      case 7: {
        const ha = workByMemberId.get(a.id)?.hoursTotal ?? 0;
        const hb = workByMemberId.get(b.id)?.hoursTotal ?? 0;
        return hb - ha;
      }
      case 5: {
        const da = a.acceptedDate || "";
        const db = b.acceptedDate || "";
        if (!da && !db) return 0;
        if (!da) return 1;
        if (!db) return -1;
        return da.localeCompare(db);
      }
      default: return 0;
    }
  };

  const handleSort = (i: number) => {
    const current = sortRules[0];
    if (current && current.col === i) {
      setSortRules([{ col: i, dir: current.dir === "asc" ? "desc" : "asc" }]);
    } else {
      setSortRules([{ col: i, dir: "asc" }]);
    }
  };

  const addSortRule = () => {
    const usedCols = new Set(sortRules.map((r) => r.col));
    const next = SORT_OPTIONS.find((opt) => !usedCols.has(opt.value));
    if (!next) return;
    setSortRules((prev) => [...prev, { col: next.value, dir: "asc" }]);
  };

  const removeSortRule = (idx: number) => {
    setSortRules((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      return next.length === 0
        ? DEFAULT_SORT_RULES
        : next;
    });
  };

  const updateSortRule = (idx: number, field: "col" | "dir", value: number | string) => {
    setSortRules((prev) => prev.map((r, i) => {
      if (i !== idx) return r;
      if (field === "col") return { ...r, col: value as number };
      return { ...r, dir: value as "asc" | "desc" };
    }));
  };

  const setTrack = (track: TrackKey) => {
    if (track === "—") {
      setField("divisions", []);
      return;
    }
    setField("divisions", [track]);
  };

  const globalCodeMaps = useMemo(
    () => computeGlobalCodes(businesses),
    [businesses]
  );

  const _assignmentsByMemberName = useMemo(() => {
    const map = new Map<string, MemberAssignmentLink[]>();
    const pushForMemberKey = (memberKey: string, item: Omit<MemberAssignmentLink, "code">) => {
      const key = normalizeKey(memberKey);
      if (!key) return;
      const current = map.get(key) ?? [];
      current.push({ ...item, code: "" });
      map.set(key, current);
    };
    const pushForMemberName = (memberName: string, item: Omit<MemberAssignmentLink, "code">) => {
      pushForMemberKey(memberName, item);
    };

    for (const business of businesses) {
      const status = String(business.projectStatus ?? "").trim() || "—";
      const trackProjects = business.trackProjects ?? {};
      const requestedTracks = Array.isArray(business.projectTracks)
        ? business.projectTracks.map((track) => String(track ?? "").trim()).filter(Boolean)
        : [];
      const explicitTracks = Object.keys(trackProjects).map((track) => String(track ?? "").trim()).filter(Boolean);
      const allTracks = Array.from(new Set([...requestedTracks, ...explicitTracks]));
      const trackOrder: Array<"Tech" | "Marketing" | "Finance"> = ["Tech", "Marketing", "Finance"];
      const hasTrackSpecificAssignments = allTracks.length > 0;

      if (!hasTrackSpecificAssignments) continue;

      for (const track of trackOrder) {
        if (!allTracks.includes(track)) continue;
        const trackInfo = (trackProjects as Record<string, unknown>)[track];
        const rawMembers = trackInfo && typeof trackInfo === "object"
          ? (trackInfo as { teamMembers?: unknown }).teamMembers
          : [];
        const trackMembers = Array.isArray(rawMembers)
          ? rawMembers.map((name) => String(name ?? "").trim()).filter(Boolean)
          : [];
        const assignedNames = Array.from(new Set(trackMembers));
        if (assignedNames.length === 0) continue;
        const codePrefix: AssignmentCodePrefix = track === "Marketing" ? "M" : track === "Finance" ? "F" : "W";
        const topic =
          track === "Marketing"
            ? "Marketing project"
            : track === "Finance"
              ? "Finance project"
              : "Website project";
        const entry: Omit<MemberAssignmentLink, "code"> = {
          id: `${business.id}-${track.toLowerCase()}`,
          kind: "Business Project",
          title: business.name || "Untitled Project",
          topic,
          teamNames: assignedNames,
          codePrefix,
          status,
          deadline: "—",
          href: `/members/projects?projectId=${encodeURIComponent(business.id)}#project-${business.id}`,
        };
        for (const memberName of assignedNames) pushForMemberName(memberName, entry);
      }
    }


    // Assign global codes using globalCodeMaps
    for (const [key, items] of Array.from(map.entries())) {
      map.set(
        key,
        items
          .slice()
          .map((item) => {
            // Try to look up from globalCodeMaps
            // Finance assignment: id is assignmentId
            const fromAssignment = globalCodeMaps.assignmentCode.get(item.id);
            if (fromAssignment) return { ...item, code: fromAssignment };
            // Business with no track: id is businessId
            const fromBusiness = globalCodeMaps.businessTrackCode.get(item.id);
            if (fromBusiness) return { ...item, code: fromBusiness };
            // Business with track: id is "businessId-trackname" (lowercase), global key is "businessId-Track" (Title case)
            // Reconstruct the capitalized key
            const dashIdx = item.id.lastIndexOf("-");
            if (dashIdx >= 0) {
              const bizId = item.id.slice(0, dashIdx);
              const trackLower = item.id.slice(dashIdx + 1);
              const track = trackLower.charAt(0).toUpperCase() + trackLower.slice(1);
              const fromTrack = globalCodeMaps.businessTrackCode.get(`${bizId}-${track}`);
              if (fromTrack) return { ...item, code: fromTrack };
            }
            // Fallback: use prefix-based relative code
            return { ...item, code: `${item.codePrefix}?` };
          })
          .sort((a, b) => {
            const prefixOrder: Record<string, number> = { W: 0, M: 1, F: 2, R: 3, C: 4, G: 5 };
            const pa = prefixOrder[a.codePrefix] ?? 9;
            const pb = prefixOrder[b.codePrefix] ?? 9;
            if (pa !== pb) return pa - pb;
            const na = parseInt(a.code.slice(1)) || 0;
            const nb = parseInt(b.code.slice(1)) || 0;
            return na - nb;
          }),
      );
    }
    return map;
  }, [businesses, globalCodeMaps]);


  const workByMemberId = useMemo(
    () => new Map(contributions.map((c) => [c.memberId, c])),
    [contributions],
  );

  // LIT is derived from pod leadership, never stored on the member, so the
  // badge can't disagree with who actually runs a pod.
  const tierOf = (member: TeamMember) =>
    memberTier(member.role, workByMemberId.get(member.id)?.podsLed ?? 0);

  const roleTierOf = (member: TeamMember) => memberTier(member.role, 0);
  const leadsAPod = (member: TeamMember) => (workByMemberId.get(member.id)?.podsLed ?? 0) > 0;

  const podsByMemberId = useMemo(() => {
    const map = new Map<string, { name: string; lit: boolean }[]>();
    for (const pm of podMembers) {
      if (pm.leftAt) continue;
      const pod = pods.find((p) => p.id === pm.podId);
      if (!pod) continue;
      const list = map.get(pm.memberId) ?? [];
      list.push({ name: pod.name, lit: pm.role === "lit" });
      map.set(pm.memberId, list);
    }
    return map;
  }, [podMembers, pods]);

  // Recency, not pace. Credits had a per-cycle target to measure against;
  // hours don't, so the useful signal is whether someone is still active.
  const getMemberIndicator = (member: TeamMember): { colorClass: string; label: string } => {
    const work = workByMemberId.get(member.id);
    if (!work || work.noRecordedWork || !work.lastActivity || work.lastActivity < "2000-01-01") {
      return { colorClass: "bg-gray-400", label: "No recorded work yet" };
    }
    const days = Math.floor(
      (Date.now() - new Date(work.lastActivity + "T12:00:00").getTime()) / 86_400_000,
    );
    const hrs = Number(work.hoursTotal ?? 0).toFixed(1);
    if (days <= 21) return { colorClass: "bg-emerald-400", label: `${hrs}h · active ${days}d ago` };
    if (days <= 45) return { colorClass: "bg-yellow-400", label: `${hrs}h · last active ${days}d ago` };
    if (days <= 90) return { colorClass: "bg-orange-400", label: `${hrs}h · quiet for ${days}d` };
    return { colorClass: "bg-red-500", label: `${hrs}h · nothing for ${days}d` };
  };

  const sorted = [...filtered].sort((a, b) => {
    for (const rule of sortRules) {
      const cmp = compareMemberByCol(a, b, rule.col);
      if (cmp !== 0) return rule.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });

  const assignmentQuickViewRestTeam = useMemo(() => {
    if (!assignmentQuickView) return [];
    const currentMemberKey = normalizeKey(assignmentQuickView.memberName);
    return assignmentQuickView.item.teamNames
      .map((name) => String(name ?? "").trim())
      .filter(Boolean)
      .filter((name) => normalizeKey(name) !== currentMemberKey);
  }, [assignmentQuickView]);

  const totalMembersCount = team.length;
  const inactiveMembersCount = team.filter((member) => normalizeKey(member.status ?? "") === "inactive").length;
  const withAccountCount = team.filter((m) => !!m.authUid).length;
  const unregisteredCount = team.filter((m) =>
    !m.authUid && normalizeKey(m.status ?? "") !== "inactive" && (m.email ?? "").trim()
  ).length;


  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Team Directory"
        action={canEdit ? (
          <div className="flex gap-2 items-center">
            {unregisteredCount > 0 && (
              <Btn
                variant="secondary"
                disabled={inviteAllState === "running"}
                onClick={() => void handleInviteAll()}
              >
                {inviteAllState === "running"
                  ? `Inviting… ${inviteAllProgress.sent}/${inviteAllProgress.total}`
                  : inviteAllState === "done"
                    ? `✓ Sent ${inviteAllProgress.sent}`
                    : `Send account invites (${unregisteredCount})`}
              </Btn>
            )}
            <Btn
              variant="secondary"
              onClick={() => {
                // Pods live in their own table now, so flatten them onto the
                // row rather than exporting a column the member record lacks.
                const exportRows = filtered.map((m) => ({
                  ...m,
                  pods: (podsByMemberId.get(m.id) ?? [])
                    .map((p) => (p.lit ? `${p.name} (LIT)` : p.name))
                    .join("; "),
                  hours: Number(workByMemberId.get(m.id)?.hoursTotal ?? 0).toFixed(1),
                  work: Number(workByMemberId.get(m.id)?.workScore ?? 0).toFixed(0),
                  sitesShipped: workByMemberId.get(m.id)?.projectsLive ?? 0,
                  tasksDone: workByMemberId.get(m.id)?.tasksDone ?? 0,
                  meetings: workByMemberId.get(m.id)?.meetingsPresent ?? 0,
                }));
                const csv = toCsv(exportRows, [
                  { key: "name", label: "Name" },
                  { key: "email", label: "Email" },
                  { key: "school", label: "School" },
                  { key: "grade", label: "Grade" },
                  { key: "role", label: "Role" },
                  { key: "homeCity", label: "Home City" },
                  { key: "homeState", label: "Home State" },
                  { key: "status", label: "Status" },
                  { key: "pods", label: "Pods" },
                  { key: "work", label: "Work Score" },
                  { key: "sitesShipped", label: "Sites Shipped" },
                  { key: "tasksDone", label: "Tasks Done" },
                  { key: "meetings", label: "Meetings" },
                  { key: "hours", label: "Hours" },
                  { key: "joinDate", label: "Join Date" },
                  { key: "slackHandle", label: "Slack" },
                ]);
                downloadCsv(dateStampedFilename("team-directory"), csv);
              }}
            >
              Export members
            </Btn>
            <Btn variant="primary" onClick={openCreate}>+ Add Member</Btn>
          </div>
        ) : undefined}
      />
      <div className="flex flex-wrap items-center gap-4 mb-3 text-[11px] text-white/55">
        <span>Total members: <span className="text-white/85 font-semibold">{totalMembersCount}</span></span>
        <span>Portal accounts: <span className="text-emerald-300 font-semibold">{withAccountCount}</span></span>
        <span>Need an account invite: <span className="text-yellow-300 font-semibold">{unregisteredCount}</span></span>
        <span>Inactive: <span className="text-red-300 font-semibold">{inactiveMembersCount}</span></span>
      </div>

      {/* Search controls */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, email, school, or grade…" />
        {!isMemberRestricted && (
          <ViewPanel active={hideInactive || showOnlyInactive || hiddenAdminCols.size > 0 || sortRules.length !== DEFAULT_SORT_RULES.length}>
            <ViewSection label="Filter">
              <div className="space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                  <input
                    type="checkbox"
                    className="members-checkbox"
                    checked={hideInactive}
                    onChange={(e) => { setHideInactive(e.target.checked); if (e.target.checked) setShowOnlyInactive(false); }}
                  />
                  Hide inactive members
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                  <input
                    type="checkbox"
                    className="members-checkbox"
                    checked={showOnlyInactive}
                    onChange={(e) => { setShowOnlyInactive(e.target.checked); if (e.target.checked) setHideInactive(false); }}
                  />
                  Show only inactive
                </label>
              </div>
            </ViewSection>
            <ViewSection label="Sort">
              <SortPanel
                rules={sortRules}
                options={SORT_OPTIONS}
                onChange={updateSortRule}
                onAdd={addSortRule}
                onRemove={removeSortRule}
                onReset={() => setSortRules(DEFAULT_SORT_RULES)}
              />
            </ViewSection>
            <ViewSection label="Columns">
              <div className="space-y-1">
                {ADMIN_COLS.filter((c) => c.key !== "actions").map((col) => (
                  <label key={col.key} className="flex items-center gap-2 cursor-pointer text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.05] transition-colors rounded-md py-0.5 px-1 -mx-1">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={!hiddenAdminCols.has(col.key)}
                      onChange={(e) => setHiddenAdminCols((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.delete(col.key); else next.add(col.key);
                        return next;
                      })}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            </ViewSection>
          </ViewPanel>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4 text-[10px] text-white/55">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Active this month</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-yellow-400" /> Within 6 weeks</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-400" /> Within 3 months</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500" /> Longer than that</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-gray-400" /> Nothing recorded</span>
      </div>
      {/* Team member list */}
      {isMemberRestricted ? (
        <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto relative select-text">
          <table className="table-fixed text-left text-[10px] leading-4" style={{ width: "100%", minWidth: 780 }}>
            <thead className="bg-[#0F1014]">
              <tr className="members-header-sep">
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap w-[280px]">Name</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap">School</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap w-[80px]">HS Class</th>
                <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap w-[110px]">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sorted.map((member) => {
                const track = getMemberTrack(member);
                const indicator = getMemberIndicator(member);
                return (
                  <tr key={member.id} className="hover:bg-white/3 transition-colors">
                    <td className="px-2 py-0 h-8 align-middle overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          className={`members-status-dot h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/35`}
                          title={`${indicator.label} · Click for progress summary`}
                          onClick={() => setDrawerMember(member)}
                          aria-label={`Open ${member.name}’s record`}
                        />
                        <TrackAvatar track={track} />
                        <span className="text-white/90 font-medium truncate whitespace-nowrap" title={member.name}>{truncateCell(member.name, 44)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-0 h-8 align-middle overflow-hidden whitespace-nowrap">
                      <span className="text-white/50 block truncate" title={member.school || ""}>{member.school ? truncateCell(member.school, 64) : "—"}</span>
                    </td>
                    <td className="px-2 py-0 h-8 align-middle whitespace-nowrap">
                      <span className="text-white/50">{gradeToClassOf(member.grade, member.acceptedDate || member.joinDate) || "—"}</span>
                    </td>
                    <td className="px-2 py-0 h-8 align-middle whitespace-nowrap">
                      <span className="text-white/60">{displayRoleValue(member.role)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (() => {
        const visCols = ADMIN_COLS.filter((c) => !hiddenAdminCols.has(c.key));
        const tableWidth = visCols.reduce((s, c) => s + c.width, 0);
        return (
          <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto relative select-text">
            <table className="table-fixed text-left text-[10px] leading-4" style={{ width: "100%", minWidth: tableWidth }}>
              <thead className="bg-[#0F1014]">
                <tr className="members-header-sep">
                  {visCols.map((col) => {
                    const sortable = typeof col.sortCol === "number";
                    const primaryRule = sortRules[0];
                    const isActive = sortable && primaryRule?.col === col.sortCol;
                    const dir = isActive ? primaryRule.dir : "asc";
                    return (
                      <th
                        key={col.key}
                        style={{ width: col.width }}
                        aria-sort={isActive ? (dir === "desc" ? "descending" : "ascending") : undefined}
                        tabIndex={sortable ? 0 : undefined}
                        className={`px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 whitespace-nowrap ${sortable ? "cursor-pointer select-none" : ""}`}
                        onClick={sortable ? () => handleSort(col.sortCol as number) : undefined}
                        onKeyDown={sortable ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            handleSort(col.sortCol as number);
                          }
                        } : undefined}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {col.label}
                          {sortable && (
                            <span className="inline-flex flex-col ml-0.5 leading-none align-middle">
                              <span className={`text-[8px] ${isActive && dir === "asc" ? "text-white/80" : "text-white/20"}`}>▲</span>
                              <span className={`text-[8px] ${isActive && dir === "desc" ? "text-white/80" : "text-white/20"}`}>▼</span>
                            </span>
                          )}
                          {col.key !== "actions" && (
                            <button type="button" aria-label={`Hide ${col.label} column`} className="members-col-hide-btn" onClick={(e) => { e.stopPropagation(); setHiddenAdminCols((p) => new Set([...p, col.key])); }} title={`Hide ${col.label}`}>✕</button>
                          )}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {sorted.map((member) => {
                  const track = getMemberTrack(member);
                  const indicator = getMemberIndicator(member);
                  const _hasPortalAccount = !!member.authUid;
                  return (
                    <tr
                      key={member.id}
                      tabIndex={0}
                      aria-label={`Open ${member.name}`}
                      className="hover:bg-white/3 transition-colors align-middle cursor-pointer"
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest("button,a,input,select")) return;
                        setDrawerMember(member);
                      }}
                      onKeyDown={(event) => {
                        if (event.target !== event.currentTarget) return;
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setDrawerMember(member);
                        }
                      }}
                    >
                      {visCols.map((col) => {
                        switch (col.key) {
                          case "name": return (
                            <td key="name" className="px-3 py-0 h-8 align-middle overflow-hidden">
                              <div className="flex items-center gap-2 min-w-0">
                                <button
                                  type="button"
                                  className={`members-status-dot h-2.5 w-2.5 rounded-full ${indicator.colorClass} flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white/35`}
                                  title={`${indicator.label} · Click for progress summary`}
                                  onClick={() => setDrawerMember(member)}
                                  aria-label={`Open ${member.name}’s record`}
                                />
                                <TrackAvatar track={track} />
                                <span className="text-white/90 font-medium truncate whitespace-nowrap" title={member.name}>{truncateCell(member.name, 56)}</span>
                              </div>
                            </td>
                          );
                          case "email": return (
                            <td key="email" className="px-3 py-0 h-8 align-middle overflow-hidden whitespace-nowrap">
                              <div className="font-mono inline-flex items-center gap-1.5 max-w-full">
                                {member.email || member.alternateEmail ? (
                                  <a
                                    href={`mailto:${member.email || member.alternateEmail}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-white/55 hover:text-white block truncate underline-offset-2 hover:underline"
                                    title={[member.email, member.alternateEmail].filter(Boolean).join(" · ")}
                                  >
                                    {truncateCell([member.email, member.alternateEmail].filter(Boolean).join(" · "), 92)}
                                  </a>
                                ) : (
                                  <span className="text-white/30">—</span>
                                )}
                                {(member.email || member.alternateEmail) && (
                                  <button type="button" className="members-copy-btn" onClick={() => void copyText(member.email || member.alternateEmail || "")} title="Copy email" aria-label="Copy email">
                                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                                      <rect x="9" y="9" width="11" height="11" rx="2" />
                                      <path d="M5 15V6a2 2 0 0 1 2-2h9" />
                                    </svg>
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                          case "school": return (
                            <td key="school" className="px-3 py-0 h-8 align-middle overflow-hidden whitespace-nowrap">
                              <span className="text-white/50 block truncate" title={member.school || ""}>{member.school ? truncateCell(member.school, 72) : "—"}</span>
                            </td>
                          );
                          case "hsClass": return (
                            <td key="hsClass" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              <span className="text-white/50">{gradeToClassOf(member.grade, member.acceptedDate || member.joinDate) || "—"}</span>
                            </td>
                          );
                          case "role": return (
                            <td key="role" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              <span className="inline-flex items-center gap-1">
                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (openRolePopoverId === member.id) {
                                        setOpenRolePopoverId(null);
                                        setPopoverPos(null);
                                      } else {
                                        const r = e.currentTarget.getBoundingClientRect();
                                        setPopoverPos({ top: r.bottom + 4, left: r.left });
                                        setOpenRolePopoverId(member.id);
                                      }
                                    }}
                                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors hover:brightness-110 ${ROLE_CHIP[roleTierOf(member)]}`}
                                    title="Click to change role"
                                  >
                                    {displayRoleValue(member.role)}
                                  </button>
                                ) : (
                                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${ROLE_CHIP[roleTierOf(member)]}`}>
                                    {displayRoleValue(member.role)}
                                  </span>
                                )}
                                {leadsAPod(member) && (
                                  <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${ROLE_CHIP.lit}`} title="Leads a pod">
                                    LIT
                                  </span>
                                )}
                              </span>
                            </td>
                          );
                          case "resume": return (
                            <td key="resume" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              {(() => {
                                const emailKey = normalizeKey(member.email ?? "");
                                const altEmailKey = normalizeKey(member.alternateEmail ?? "");
                                const resumeUrl = resumeUrlByEmail.get(emailKey) ?? resumeUrlByEmail.get(altEmailKey);
                                return resumeUrl ? (
                                  <a href={resumeUrl} target="_blank" rel="noopener noreferrer" className="text-[#F6B78D]/80 hover:text-[#F6B78D] underline whitespace-nowrap">Resume</a>
                                ) : (
                                  <span className="text-white/30">—</span>
                                );
                              })()}
                            </td>
                          );
                          case "acceptedDate": return (
                            <td key="acceptedDate" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              <span className="text-white/50">{member.acceptedDate || "—"}</span>
                            </td>
                          );
                          case "home": return (
                            <td key="home" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              {(() => {
                                const city = (member.homeCity ?? "").trim();
                                const st   = (member.homeState ?? "").trim();
                                if (!city && !st) return <span className="text-white/25">—</span>;
                                return (
                                  <span className="text-[11px] text-white/60">
                                    {city ? `${city}, ${st}` : st}
                                  </span>
                                );
                              })()}
                            </td>
                          );
                          case "work": return (
                            <td key="work" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              {(() => {
                                const w = workByMemberId.get(member.id);
                                if (!w || w.noRecordedWork) return <span className="text-white/25">—</span>;
                                const parts: string[] = [];
                                if (w.projectsLive > 0)    parts.push(`${w.projectsLive} live`);
                                if (w.projectsActive > 0)  parts.push(`${w.projectsActive} building`);
                                if (w.tasksDone > 0)       parts.push(`${w.tasksDone} tasks`);
                                if (w.meetingsPresent > 0) parts.push(`${w.meetingsPresent} mtgs`);
                                if (w.hoursTotal > 0)      parts.push(`${Number(w.hoursTotal).toFixed(1)}h`);
                                return (
                                  <span className="flex items-baseline gap-2" title={`Work score ${w.workScore} — ${WORK_SCORE_EXPLAINER}`}>
                                    <span className="font-mono text-[11px] tabular-nums text-white/85">
                                      {Number(w.workScore).toFixed(0)}
                                    </span>
                                    <span className="text-[10px] text-white/40">{parts.join(" · ")}</span>
                                  </span>
                                );
                              })()}
                            </td>
                          );
                          case "pods": return (
                            <td key="pods" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              {(() => {
                                const list = podsByMemberId.get(member.id) ?? [];
                                if (list.length === 0) return <span className="text-white/25">—</span>;
                                return (
                                  <span className="text-[11px] text-white/70" title={list.map((p) => p.name).join(", ")}>
                                    {list.map((p) => p.name.replace(/^Novus /, "")).join(", ")}
                                    {list.some((p) => p.lit) && (
                                      <span className="ml-1 text-[9px] uppercase tracking-wide text-[#F3E28D]">LIT</span>
                                    )}
                                  </span>
                                );
                              })()}
                            </td>
                          );
                          case "strikes": return (
                            <td key="strikes" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              {(() => {
                                const points = workByMemberId.get(member.id)?.infractionPoints ?? 0;
                                const standing = infractionStanding(points, thresholds);
                                if (standing === "clear") return <span className="text-white/25">—</span>;
                                return (
                                  <button
                                    type="button"
                                    onClick={() => setDrawerMember(member)}
                                    title={`${points} infraction point${points === 1 ? "" : "s"} — open the member record`}
                                    className={`text-[11px] ${STANDING_STYLE[standing]} hover:underline`}
                                  >
                                    {STANDING_LABEL[standing]} · {points}
                                  </button>
                                );
                              })()}
                            </td>
                          );
                          case "actions": return (
                            <td key="actions" className="px-3 py-0 h-8 align-middle whitespace-nowrap">
                              <div className="members-row-actions">
                                {canEdit && <Btn size="sm" variant="secondary" className="members-pill-btn whitespace-nowrap" onClick={() => setDrawerMember(member)}>Manage</Btn>}
                                {canEdit && <Btn size="sm" variant="ghost" className="members-pill-btn whitespace-nowrap" onClick={() => openEdit(member)}>Edit</Btn>}
                                {canEdit && (member.authUid ? (
                                  <span className="members-pill-btn whitespace-nowrap text-emerald-400 text-xs font-medium" aria-label="Portal account active">✓</span>
                                ) : (() => {
                                  const st = inviteStatus[member.id];
                                  return (
                                    <Btn
                                      size="sm"
                                      variant="ghost"
                                      className="members-pill-btn whitespace-nowrap"
                                      disabled={st === "sending" || st === "sent"}
                                      onClick={() => handleSendInvite(member)}
                                    >
                                      {st === "sending" ? "Sending…" : st === "sent" ? "✓ Sent" : st === "error" ? "Retry" : "Invite"}
                                    </Btn>
                                  );
                                })())}
                              </div>
                            </td>
                          );
                          default: return null;
                        }
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}
      {teamLoadError ? (
        <div className="mt-4">
          <LoadError message={teamLoadError} onRetry={() => window.location.reload()} />
        </div>
      ) : !teamLoaded ? (
        <div className="mt-4"><SkeletonRows rows={8} cols={6} /></div>
      ) : filtered.length === 0 ? (
        <Empty
          message="No team members."
          action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first member</Btn> : undefined}
        />
      ) : null}

      <Modal
        open={!!assignmentQuickView}
        onClose={() => setAssignmentQuickView(null)}
        title={assignmentQuickView ? assignmentQuickView.item.title : "Assignment"}
      >
        {assignmentQuickView && (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-[#0F1014] px-3 py-2">
              <p className="text-[11px] text-white/55">
                {assignmentQuickView.item.kind}{assignmentQuickView.item.topic ? ` · ${assignmentQuickView.item.topic}` : ""}
              </p>
              <p className="text-[11px] text-white/50 mt-1">
                Status: {assignmentQuickView.item.status || "—"}
                {assignmentQuickView.item.deadline && assignmentQuickView.item.deadline !== "—" ? ` · Due ${assignmentQuickView.item.deadline}` : ""}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">Rest of team</p>
              {assignmentQuickViewRestTeam.length === 0 ? (
                <p className="text-xs text-white/45 mt-1">No other members listed.</p>
              ) : (
                <p className="text-xs text-white/60 mt-1">{assignmentQuickViewRestTeam.join(", ")}</p>
              )}
            </div>
          </div>
        )}
        <div className="flex justify-end mt-4 pt-3 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setAssignmentQuickView(null)}>Close</Btn>
        </div>
      </Modal>

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingMember ? "Edit Member" : "New Member"}>
        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-2">
          <Field label="Full Name" required>
            <Input value={form.name} onChange={e => setField("name", e.target.value)} />
          </Field>
          <Field label="Email">
            <div className="flex items-center gap-2">
              <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} />
              {!showAlternateEmail ? (
                <button
                  type="button"
                  className="members-icon-btn h-8 w-8 text-base leading-none"
                  aria-label="Add alternate email"
                  title="Add alternate email"
                  onClick={() => setShowAlternateEmail(true)}
                >
                  +
                </button>
              ) : (
                <button
                  type="button"
                  className="members-icon-btn members-icon-btn-danger h-8 w-8 text-base leading-none"
                  aria-label="Remove alternate email"
                  title="Remove alternate email"
                  onClick={() => {
                    setField("alternateEmail", "");
                    setShowAlternateEmail(false);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </Field>
          {showAlternateEmail && (
            <Field label="Alternate Email">
              <Input type="email" value={form.alternateEmail ?? ""} onChange={e => setField("alternateEmail", e.target.value)} />
            </Field>
          )}
          <Field label="School">
            <Combobox
              value={form.school}
              onChange={(value) => setField("school", value)}
              options={loadingSchools ? [] : schoolOptions}
              placeholder="Type or select a school"
            />
          </Field>
          <Field label="High School Class Year">
            <Select
              value={form.grade ?? ""}
              onChange={e => setField("grade", e.target.value)}
            >
              <option value="">Select class year</option>
              {GRADE_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </Select>
          </Field>
          <Field label="Track">
            <Select
              value={getMemberTrack({ ...(form as TeamMember), id: "", createdAt: "" })}
              onChange={(e) => setTrack(e.target.value as TrackKey)}
            >
              <option value="—">—</option>
              <option value="Tech">Tech</option>
              <option value="Marketing">Marketing</option>
              <option value="Finance">Finance</option>
              <option value="Other">Other</option>
            </Select>
          </Field>
          <Field label="Date Accepted">
            <Input
              type="date"
              value={form.acceptedDate ?? ""}
              onChange={e => setField("acceptedDate", e.target.value)}
            />
          </Field>
          {editingMember && (
            <div className="pt-2 mt-2 border-t border-white/8">
              <label className="inline-flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  className="members-checkbox"
                  checked={normalizeKey(form.status ?? "") === "inactive"}
                  onChange={(e) => setField("status", e.target.checked ? "Inactive" : "Active")}
                />
                Mark member as inactive
              </label>
              <p className="text-[11px] text-white/45 mt-1">
                Inactive members appear with a red status dot and are disabled in mass email selection.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/8">
          {editingMember ? (
            <div className="flex items-center gap-2">
              <Btn variant="danger" onClick={() => void handleDeleteFromEdit()}>
                Delete Member
              </Btn>
              {editingMember.authUid && (
                <Btn variant="danger" onClick={() => void handleDeleteAccount()}>
                  Delete Account
                </Btn>
              )}
            </div>
          ) : <span />}
          <div className="flex items-center gap-3">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn variant="primary" onClick={handleSave}>{editingMember ? "Save" : "Add Member"}</Btn>
          </div>
        </div>
      </Modal>

      {canEdit && removed.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowRemoved((v) => !v)}
            className="text-[11px] text-white/35 transition-colors hover:text-white/70"
          >
            {showRemoved ? "Hide" : "Show"} {removed.length} recently removed
          </button>
          {showRemoved && (
            <div className="mt-2 max-w-2xl divide-y divide-white/5 rounded-lg border border-white/10">
              {removed.map((m) => (
                <div key={m.id} className="flex items-center gap-3 px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] text-white/70">{m.name}</p>
                    <p className="text-[10px] text-white/30">
                      {m.email || "no email"}
                      {m.deletedAt ? ` · removed ${String(m.deletedAt).slice(0, 10)}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => void restoreTeamMember(m.id).then(async () => {
                      setRemoved(await fetchDeletedTeamMembers());
                    })}
                    className="rounded border border-white/15 px-2 py-0.5 text-[11px] text-white/60 transition-colors hover:border-white/35 hover:text-white"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {drawerMember && (
        <MemberDrawer
          member={team.find((m) => m.id === drawerMember.id) ?? drawerMember}
          reviewerLabel={user?.email || user?.id || "admin"}
          canEdit={canEdit}
          canAdjustHours={authRole === "owner" || authRole === "admin"}
          canGenerateLetter={authRole === "owner" || authRole === "admin"}
          canManageInfractions={authRole === "owner"}
          onClose={() => setDrawerMember(null)}
        />
      )}

      {/* Role popover rendered at page root with position: fixed so it escapes
          all ancestor overflow clipping (table cells, overflow-x-auto wraps). */}
      {openRolePopoverId && popoverPos && (() => {
        const member = team.find((m) => m.id === openRolePopoverId);
        if (!member) return null;
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "fixed", top: popoverPos.top, left: popoverPos.left, zIndex: 1000 }}
            className="bg-[#1C1F26] border border-white/15 rounded-lg shadow-xl overflow-hidden min-w-[160px]"
          >
            {ROLE_OPTIONS.map((roleOption) => {
              const isActive = String(member.role ?? "").trim() === roleOption;
              return (
                <Fragment key={roleOption}>
                  <button
                    type="button"
                    onClick={() => void handleQuickRoleChange(member, roleOption)}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-white/8 transition-colors flex items-center gap-2 ${isActive ? "text-[#F6B78D]" : "text-white/70"}`}
                  >
                    <span className="w-3 flex-shrink-0 text-[#F6B78D]">{isActive ? "✓" : ""}</span>
                    {roleOption}
                  </button>

                  {/* LIT sits in the ladder here, but it is earned by leading a
                      pod rather than assigned — shown so the list reads complete,
                      disabled so nobody sets a badge that grants nothing. */}
                  {roleOption === "Team Lead" && (
                    <div
                      aria-disabled="true"
                      title={leadsAPod(member)
                        ? `${member.name} leads a pod, which is what makes them a LIT. Change it on the pod's roster.`
                        : "LIT comes from leading a pod, not from this list. Add them as LIT on a pod's roster and the badge follows."}
                      className={`w-full px-3 py-2 text-xs flex items-center gap-2 cursor-not-allowed ${
                        leadsAPod(member) ? "text-sky-300" : "text-white/25"
                      }`}
                    >
                      <span className="w-3 flex-shrink-0">{leadsAPod(member) ? "✓" : ""}</span>
                      LIT
                      <span className="ml-auto text-[9px] uppercase tracking-wide text-white/30">via pod</span>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        );
      })()}
    </MembersLayout>
  );
}
