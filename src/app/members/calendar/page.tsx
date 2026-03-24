"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import { useRouter } from "next/navigation";
import {
  subscribeCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  subscribeTasks, subscribeInterviewSlots, subscribeInterviewInvites, subscribeBusinesses,
  deleteInterviewSlot, type CalendarEvent, type Task, type InterviewSlot, type InterviewInvite, type FinanceAssignment, type Business,
} from "@/lib/members/storage";
import { Btn, Modal, Field, Input, TextArea, useConfirm } from "@/components/members/ui";

// ── CALENDAR HELPERS ──────────────────────────────────────────────────────────

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS   = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Format a Date as a YYYY-MM-DD string for comparison with stored date strings.
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeDeadlineDateString(value: string): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return toDateString(parsed);
}

// Format an ISO datetime string as "9:30am" for display on calendar pills.
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  return `${hours % 12 || 12}:${minutes}${ampm}`;
}

// Format an ISO datetime string as "January 5, 2025" for the detail popup.
function formatDateLabel(isoString: string): string {
  const date = new Date(isoString);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function addMinutesToTime(time: string, minutesToAdd: number): string {
  const [h, m] = time.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return time;
  const total = (h * 60 + m + minutesToAdd + 1440) % 1440;
  const nextH = Math.floor(total / 60);
  const nextM = total % 60;
  return `${String(nextH).padStart(2, "0")}:${String(nextM).padStart(2, "0")}`;
}

function toICSDateTime(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${day}T${hh}${mm}${ss}Z`;
}

function toICSDate(isoString: string): string {
  const d = new Date(isoString);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function getCalendarAssignmentDeadlines(assignment: FinanceAssignment): Array<{ label: string; date: string }> {
  const rawDeadlines = (assignment as { deadlines?: unknown }).deadlines;
  const deadlineRows = Array.isArray(rawDeadlines)
    ? rawDeadlines
    : rawDeadlines && typeof rawDeadlines === "object"
      ? Object.values(rawDeadlines as Record<string, unknown>)
      : [];

  const fromArray = deadlineRows
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as { label?: unknown; date?: unknown };
      const label = String(row.label ?? "").trim();
      const date = String(row.date ?? "").trim();
      if (!label && !date) return null;
      return { label, date };
    })
    .filter((entry): entry is { label: string; date: string } => !!entry);

  if (fromArray.length > 0) return fromArray;

  const legacy: Array<{ label: string; date: string }> = [];
  const finalDate = String(assignment.finalDueDate ?? "").trim();
  const primaryDate = String(assignment.deadline ?? "").trim();
  const firstDraftDate = String(assignment.firstDraftDueDate ?? "").trim();
  const interviewDate = String(assignment.interviewDueDate ?? "").trim();
  if (finalDate) legacy.push({ label: "Final Deadline", date: finalDate });
  if (primaryDate && primaryDate !== finalDate) legacy.push({ label: "Deadline", date: primaryDate });
  if (firstDraftDate && firstDraftDate !== finalDate && firstDraftDate !== primaryDate) {
    legacy.push({ label: "Draft Deadline", date: firstDraftDate });
  }
  if (interviewDate && interviewDate !== finalDate && interviewDate !== primaryDate && interviewDate !== firstDraftDate) {
    legacy.push({ label: "Interview Deadline", date: interviewDate });
  }
  return legacy;
}

function getCalendarBusinessTrackDeadlines(
  business: Business
): Array<{ track: "Tech" | "Marketing" | "Finance"; label: string; date: string; businessName: string; neighborhood: string }> {
  const businessName = String(business.name ?? "").trim() || "Business Project";
  const neighborhood = String(business.neighborhood ?? business.showcaseNeighborhood ?? "").trim();
  const explicitTracks = (Array.isArray(business.projectTracks) ? business.projectTracks : [])
    .filter((track): track is "Tech" | "Marketing" | "Finance" => track === "Tech" || track === "Marketing" || track === "Finance");
  const inferredTracks = Object.keys(business.trackProjects ?? {})
    .filter((track): track is "Tech" | "Marketing" | "Finance" => track === "Tech" || track === "Marketing" || track === "Finance");
  const tracks = Array.from(new Set([...explicitTracks, ...inferredTracks]));

  const out: Array<{ track: "Tech" | "Marketing" | "Finance"; label: string; date: string; businessName: string; neighborhood: string }> = [];
  for (const track of tracks) {
    const info = business.trackProjects?.[track];
    const rawDeadlines = info?.deadlines;
    const deadlines = Array.isArray(rawDeadlines)
      ? rawDeadlines
      : rawDeadlines && typeof rawDeadlines === "object"
        ? Object.values(rawDeadlines as Record<string, unknown>)
        : [];
    deadlines.forEach((item) => {
      const entry = item && typeof item === "object" ? item as { label?: unknown; date?: unknown } : null;
      const date = String(entry?.date ?? "").trim();
      if (!date) return;
      out.push({
        track,
        label: String(entry?.label ?? "").trim() || "Deadline",
        date,
        businessName,
        neighborhood,
      });
    });
  }
  return out;
}

function escapeICSValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function buildICSForEvent(event: CalendarEvent): string {
  const uid = event.iCalUID?.trim() || `volta-${event.id}@voltanyc.org`;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Volta NYC//Members Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toICSDateTime(new Date().toISOString())}`,
    `SUMMARY:${escapeICSValue(event.title)}`,
  ];

  if (event.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${toICSDate(event.start)}`);
    lines.push(`DTEND;VALUE=DATE:${toICSDate(event.end)}`);
  } else {
    lines.push(`DTSTART:${toICSDateTime(event.start)}`);
    lines.push(`DTEND:${toICSDateTime(event.end)}`);
  }

  if (event.description?.trim()) {
    lines.push(`DESCRIPTION:${escapeICSValue(event.description.trim())}`);
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

type ParsedICSDate = { iso: string; allDay: boolean };
type ParsedICSEvent = {
  uid: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  description: string;
};

function parseICSDateValue(raw: string, params: string[]): ParsedICSDate | null {
  const value = raw.trim();
  if (!value) return null;
  const isDateOnly = params.some((p) => p.toUpperCase() === "VALUE=DATE") || /^\d{8}$/.test(value);

  if (isDateOnly) {
    const y = Number.parseInt(value.slice(0, 4), 10);
    const m = Number.parseInt(value.slice(4, 6), 10) - 1;
    const d = Number.parseInt(value.slice(6, 8), 10);
    const date = new Date(y, m, d, 0, 0, 0, 0);
    if (Number.isNaN(date.getTime())) return null;
    return { iso: date.toISOString(), allDay: true };
  }

  const zuluMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (zuluMatch) {
    const [, y, mo, d, h, mi, s] = zuluMatch;
    const date = new Date(Date.UTC(
      Number.parseInt(y, 10),
      Number.parseInt(mo, 10) - 1,
      Number.parseInt(d, 10),
      Number.parseInt(h, 10),
      Number.parseInt(mi, 10),
      Number.parseInt(s, 10)
    ));
    if (Number.isNaN(date.getTime())) return null;
    return { iso: date.toISOString(), allDay: false };
  }

  const localMatch = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/);
  if (localMatch) {
    const [, y, mo, d, h, mi, s] = localMatch;
    const date = new Date(
      Number.parseInt(y, 10),
      Number.parseInt(mo, 10) - 1,
      Number.parseInt(d, 10),
      Number.parseInt(h, 10),
      Number.parseInt(mi, 10),
      Number.parseInt(s, 10)
    );
    if (Number.isNaN(date.getTime())) return null;
    return { iso: date.toISOString(), allDay: false };
  }

  return null;
}

function parseICS(text: string): ParsedICSEvent[] {
  const unfolded = text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const events: ParsedICSEvent[] = [];
  let inside = false;
  let fields: Record<string, { value: string; params: string[] }> = {};

  const flush = () => {
    const uid = fields.UID?.value?.trim() ?? "";
    const title = fields.SUMMARY?.value?.trim() ?? "";
    const description = fields.DESCRIPTION?.value?.replace(/\\n/g, "\n").trim() ?? "";
    const start = fields.DTSTART ? parseICSDateValue(fields.DTSTART.value, fields.DTSTART.params) : null;
    const endRaw = fields.DTEND ? parseICSDateValue(fields.DTEND.value, fields.DTEND.params) : null;
    if (!title || !start) return;

    let end = endRaw;
    if (!end) {
      const fallback = new Date(start.iso);
      fallback.setMinutes(fallback.getMinutes() + (start.allDay ? 24 * 60 : 30));
      end = { iso: fallback.toISOString(), allDay: start.allDay };
    }

    if (start.allDay) {
      // ICS all-day DTEND is usually exclusive; normalize to same-day end when possible.
      const startDate = new Date(start.iso);
      const endDate = new Date(end.iso);
      if (endDate.getTime() > startDate.getTime()) {
        endDate.setDate(endDate.getDate() - 1);
      }
      endDate.setHours(23, 59, 59, 0);
      startDate.setHours(0, 0, 0, 0);
      events.push({
        uid,
        title,
        description,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        allDay: true,
      });
      return;
    }

    events.push({
      uid,
      title,
      description,
      start: start.iso,
      end: end.iso,
      allDay: false,
    });
  };

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inside = true;
      fields = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (inside) flush();
      inside = false;
      fields = {};
      continue;
    }
    if (!inside) continue;

    const colonIdx = line.indexOf(":");
    if (colonIdx <= 0) continue;
    const left = line.slice(0, colonIdx);
    const value = line.slice(colonIdx + 1);
    const [name, ...params] = left.split(";");
    const key = name.toUpperCase();
    fields[key] = { value, params };
  }

  return events;
}

// Build the 35-42 day cells for a month grid starting on Sunday.
function buildMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);

  // Extend back to the nearest Sunday before/on the 1st.
  const gridStart = new Date(firstDay);
  gridStart.setDate(1 - firstDay.getDay());

  // Extend forward to the nearest Saturday after/on the last day.
  const gridEnd = new Date(lastDay);
  gridEnd.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const days: Date[] = [];
  const current = new Date(gridStart);
  while (current <= gridEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// Maps task status to a hex color for rendering tasks on the calendar.
const TASK_STATUS_COLORS: Record<string, string> = {
  "To Do":       "#6B7280",
  "On Hold":     "#F59E0B",
  "In Progress": "#60A5FA", // legacy support
  "Blocked":     "#EF4444", // legacy support
  "Done":        "#34D399", // legacy support
};

// ── DISPLAY EVENT TYPE ────────────────────────────────────────────────────────
// Unified shape used to render both CalendarEvents and Task deadlines on the grid.

interface DisplayEvent {
  id: string;
  title: string;
  color: string;
  kind: "event" | "task" | "interview" | "financeDeadline" | "projectDeadline";
  dateStr: string;        // YYYY-MM-DD
  time?: string;          // formatted time string; undefined means all-day
  description?: string;
  isTask: boolean;
  isInterview?: boolean;
  isAssignment?: boolean;
  isBusinessProjectDeadline?: boolean;
  calEvent?: CalendarEvent;
  interviewSlotId?: string; // for deleting booked interview slots
}

// ── FORM STATE ────────────────────────────────────────────────────────────────

const BLANK_EVENT_FORM = {
  title: "", description: "", date: "", startTime: "09:00", endTime: "09:30",
  allDay: false,
};
type EventForm = typeof BLANK_EVENT_FORM;

// ── POPUP POSITION ────────────────────────────────────────────────────────────

interface PopupPosition { top: number; left: number; }

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user, authRole } = useAuth();
  const router = useRouter();
  const canEdit = authRole === "admin";

  useEffect(() => {
    if (authRole && authRole !== "admin") {
      router.replace("/members/projects");
    }
  }, [authRole, router]);

  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [calEvents, setCalEvents]           = useState<CalendarEvent[]>([]);
  const [tasks, setTasks]                   = useState<Task[]>([]);
  const [financeAssignments, setFinanceAssignments] = useState<FinanceAssignment[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [interviewSlots, setInterviewSlots] = useState<InterviewSlot[]>([]);
  const [interviewInvites, setInterviewInvites] = useState<InterviewInvite[]>([]);
  const [visibleKinds, setVisibleKinds] = useState<Record<DisplayEvent["kind"], boolean>>({
    event: true,
    task: true,
    interview: true,
    financeDeadline: true,
    projectDeadline: true,
  });

  const [modal, setModal]               = useState<"create" | "edit" | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm]                 = useState<EventForm>(BLANK_EVENT_FORM);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Popup for viewing event details when a pill is clicked.
  const [popup, setPopup] = useState<{ event: DisplayEvent; pos: PopupPosition } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const popupAnchorRef = useRef<HTMLElement | null>(null);
  const [expandedDayBoxes, setExpandedDayBoxes] = useState<Record<string, boolean>>({});

  const { ask, Dialog } = useConfirm();

  // Subscribe to all data sources; unsubscribe on unmount.
  useEffect(() => {
    const unsubEvents   = subscribeCalendarEvents(setCalEvents);
    const unsubTasks    = subscribeTasks(setTasks);
    const unsubBusinesses = subscribeBusinesses(setBusinesses);
    const unsubISlots   = canEdit ? subscribeInterviewSlots(setInterviewSlots) : () => {};
    const unsubIInvites = canEdit ? subscribeInterviewInvites(setInterviewInvites) : () => {};
    return () => { unsubEvents(); unsubTasks(); unsubBusinesses(); unsubISlots(); unsubIInvites(); };
  }, [canEdit]);

  // Load finance assignments through the same normalized API used by /members/assignments.
  useEffect(() => {
    let mounted = true;

    const loadAssignments = async () => {
      if (!canEdit || !user) {
        if (mounted) setFinanceAssignments([]);
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/members/finance-assignments", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json() as { assignments?: FinanceAssignment[] };
        if (!mounted) return;
        setFinanceAssignments(Array.isArray(data.assignments) ? data.assignments : []);
      } catch {
        // silent: keep existing in-memory assignments
      }
    };

    void loadAssignments();
    const timer = window.setInterval(() => { void loadAssignments(); }, 30000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [canEdit, user]);

  // Close popup when clicking outside of it.
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPopup(null);
      }
    };
    if (popup) document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [popup]);

  // Keep popup anchored to its event pill while scrolling/resizing.
  useEffect(() => {
    if (!popup) return;

    const reposition = () => {
      const anchor = popupAnchorRef.current;
      if (!anchor || !anchor.isConnected) {
        setPopup(null);
        return;
      }
      const rect = anchor.getBoundingClientRect();
      setPopup((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pos: { top: rect.bottom + 6, left: rect.left },
        };
      });
    };

    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [popup]);

  // ── Build merged display events ───────────────────────────────────────────

  // Map: invite id → invite (for looking up applicant name on booked slots)
  const inviteMap = useMemo<Record<string, InterviewInvite>>(() => {
    const map: Record<string, InterviewInvite> = {};
    for (const invite of interviewInvites) {
      map[invite.id] = invite;
    }
    return map;
  }, [interviewInvites]);

  // Combine all event sources into one list for grid rendering.
  const displayEvents = useMemo<DisplayEvent[]>(
    () => [
      // Calendar events (admin/leads can create)
      ...calEvents.map((ev): DisplayEvent => ({
        id:          ev.id,
        title:       ev.title,
        color:       "#85CC17",
        kind:        "event",
        dateStr:     ev.start.split("T")[0],
        time:        ev.allDay ? undefined : formatTime(ev.start),
        description: ev.description,
        isTask:      false,
        calEvent:    ev,
      })),
      // Task deadlines (everyone, exclude Done tasks)
      ...tasks
        .filter(t => t.dueDate && t.status !== "Done")
        .map((t): DisplayEvent => ({
          id:          `task-${t.id}`,
          title:       t.name,
          color:       TASK_STATUS_COLORS[t.status] ?? "#6B7280",
          kind:        "task",
          dateStr:     t.dueDate,
          time:        undefined,
          description: `${t.assignedTo} · ${t.status}`,
          isTask:      true,
        })),
      // Assignment deadlines (reports / case studies / grants)
      ...financeAssignments.flatMap((assignment): DisplayEvent[] => {
        const topic = String(assignment.topic ?? "").trim() || String(assignment.title ?? "").trim() || "Assignment";
        const region = String(assignment.region ?? "").trim();
        return getCalendarAssignmentDeadlines(assignment).reduce<DisplayEvent[]>(
          (acc, deadlineItem, index) => {
            const dateStr = normalizeDeadlineDateString(String(deadlineItem?.date ?? ""));
            if (!dateStr) return acc;
            const label = String(deadlineItem?.label ?? "").trim() || "Deadline";
            acc.push({
              id:           `assignment-${assignment.id}-${index}`,
              title:        `${assignment.type}: ${topic}`,
              color:        "#F59E0B",
              kind:         "financeDeadline",
              dateStr,
              time:         undefined,
              description:  [label, region].filter(Boolean).join(" · "),
              isTask:       false,
              isAssignment: true,
            });
            return acc;
          },
          []
        );
      }),
      // Business project deadlines (per-track)
      ...businesses.flatMap((business): DisplayEvent[] => {
        return getCalendarBusinessTrackDeadlines(business)
          .map((entry) => ({ ...entry, date: normalizeDeadlineDateString(entry.date) }))
          .filter((entry) => !!entry.date)
          .map((entry, index) => ({
          id:                       `project-deadline-${business.id}-${entry.track}-${index}`,
          title:                    `${entry.track}: ${entry.businessName}`,
          color:                    "#EF4444",
          kind:                     "projectDeadline",
          dateStr:                  entry.date,
          time:                     undefined,
          description:              [entry.label, entry.neighborhood].filter(Boolean).join(" · "),
          isTask:                   false,
          isAssignment:             true,
          isBusinessProjectDeadline: true,
        }));
      }),
      // Booked interview slots (admin)
      ...(canEdit ? interviewSlots
        .filter(s => !!s.bookedBy)
        .map((s): DisplayEvent => {
          const invite = s.bookedBy ? inviteMap[s.bookedBy] : undefined;
          // Multi-use invites store the booker's name/email on the slot itself.
          const name  = s.bookerName  ?? invite?.applicantName  ?? "Applicant";
          const email = s.bookerEmail ?? invite?.applicantEmail ?? "";
          return {
            id:              `interview-${s.id}`,
            title:           `Interview: ${name}`,
            color:           "#8B5CF6",
            kind:            "interview",
            dateStr:         s.datetime.split("T")[0],
            time:            formatTime(s.datetime),
            description:     [invite?.role, email].filter(Boolean).join(" · "),
            isTask:          false,
            isInterview:     true,
            interviewSlotId: s.id,
          };
        }) : []),
    ],
    [calEvents, tasks, financeAssignments, businesses, canEdit, interviewSlots, inviteMap]
  );

  const filteredDisplayEvents = useMemo(
    () =>
      displayEvents
        .filter((ev) => visibleKinds[ev.kind])
        .sort((a, b) => {
          if (a.dateStr !== b.dateStr) return a.dateStr.localeCompare(b.dateStr);
          if (!a.time && !b.time) return a.title.localeCompare(b.title);
          if (!a.time) return -1;
          if (!b.time) return 1;
          return a.time.localeCompare(b.time);
        }),
    [displayEvents, visibleKinds]
  );

  const eventsForDay = (dateStr: string): DisplayEvent[] =>
    filteredDisplayEvents.filter(ev => ev.dateStr === dateStr);

  // ── Month navigation ──────────────────────────────────────────────────────

  const goToPrevMonth = () => {
    setExpandedDayBoxes({});
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    setExpandedDayBoxes({});
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // ── Create / Edit helpers ─────────────────────────────────────────────────

  // Generic field updater for the event form.
  const setField = (key: keyof EventForm, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = (dateStr?: string) => {
    setForm({ ...BLANK_EVENT_FORM, date: dateStr ?? toDateString(today) });
    setEditingEvent(null);
    setModal("create");
    setPopup(null);
  };

  const openEdit = (ev: CalendarEvent) => {
    const startDate = new Date(ev.start);
    const endDate   = new Date(ev.end);
    setForm({
      title:       ev.title,
      description: ev.description ?? "",
      date:        ev.start.split("T")[0],
      startTime:   `${String(startDate.getHours()).padStart(2, "0")}:${String(startDate.getMinutes()).padStart(2, "0")}`,
      endTime:     `${String(endDate.getHours()).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`,
      allDay:      ev.allDay ?? false,
    });
    setEditingEvent(ev);
    setModal("edit");
    setPopup(null);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.date) return;
    const startIso = form.allDay ? `${form.date}T00:00:00` : `${form.date}T${form.startTime}:00`;
    const endIso   = form.allDay ? `${form.date}T23:59:59` : `${form.date}T${form.endTime}:00`;
    const payload = {
      title:       form.title.trim(),
      description: form.description,
      start:       startIso,
      end:         endIso,
      allDay:      form.allDay,
      color:       "#85CC17",
      iCalUID:     editingEvent?.iCalUID ?? `volta-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@voltanyc.org`,
      createdBy:   user?.uid ?? "",
      createdAt:   Date.now(),
    };
    if (editingEvent) {
      await updateCalendarEvent(editingEvent.id, payload);
    } else {
      await createCalendarEvent(payload);
    }
    setModal(null);
  };

  const handleDelete = (id: string) => {
    ask(async () => { await deleteCalendarEvent(id); setPopup(null); });
  };

  const handleDeleteInterviewSlot = (slotId: string) => {
    ask(async () => { await deleteInterviewSlot(slotId); setPopup(null); });
  };

  const downloadEventICS = (event: CalendarEvent) => {
    const ics = buildICSForEvent(event);
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTitle = event.title.trim().replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "event";
    link.href = url;
    link.download = `${safeTitle}.ics`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportICS = async (file: File) => {
    if (!canEdit) return;
    try {
      const raw = await file.text();
      const parsed = parseICS(raw);
      if (parsed.length === 0) {
        setImportMessage("No valid events found in this .ics file.");
        return;
      }

      const byUID = new Map<string, CalendarEvent>();
      const byTitleStart = new Map<string, CalendarEvent>();
      for (const ev of calEvents) {
        const uid = ev.iCalUID?.trim();
        if (uid) byUID.set(uid, ev);
        byTitleStart.set(`${ev.title.trim().toLowerCase()}|${ev.start}`, ev);
      }

      let created = 0;
      let updated = 0;
      for (const item of parsed) {
        const key = `${item.title.trim().toLowerCase()}|${item.start}`;
        const existing = (item.uid ? byUID.get(item.uid) : undefined) ?? byTitleStart.get(key);
        const payload = {
          title: item.title,
          start: item.start,
          end: item.end,
          allDay: item.allDay,
          description: item.description,
          color: "#85CC17",
          iCalUID: item.uid || existing?.iCalUID || "",
          createdBy: existing?.createdBy ?? (user?.uid ?? ""),
          createdAt: existing?.createdAt ?? Date.now(),
        };

        if (existing) {
          // eslint-disable-next-line no-await-in-loop
          await updateCalendarEvent(existing.id, payload);
          updated += 1;
        } else {
          // eslint-disable-next-line no-await-in-loop
          await createCalendarEvent(payload);
          created += 1;
        }
      }

      setImportMessage(`Imported ${parsed.length} event(s): ${created} created, ${updated} updated.`);
    } catch {
      setImportMessage("Could not import .ics file. Please check file format.");
    } finally {
      if (importInputRef.current) importInputRef.current.value = "";
      setTimeout(() => setImportMessage(null), 3000);
    }
  };

  // Show a detail popup anchored below the clicked event pill.
  const handleEventPillClick = (ev: DisplayEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    popupAnchorRef.current = target;
    const rect = target.getBoundingClientRect();
    setPopup({
      event: ev,
      pos: { top: rect.bottom + 6, left: rect.left },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const monthGrid  = buildMonthGrid(viewYear, viewMonth);
  const monthDays = useMemo(
    () => Array.from({ length: new Date(viewYear, viewMonth + 1, 0).getDate() }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
    [viewYear, viewMonth]
  );
  const todayStr   = toDateString(today);

  return (
    <MembersLayout>
      <Dialog />

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Calendar</h1>
          <p className="text-white/40 text-sm mt-1 font-body">Tasks, deadlines, and team events.</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".ics,text/calendar"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleImportICS(file);
              }}
            />
            <Btn variant="secondary" onClick={() => importInputRef.current?.click()}>Import .ics</Btn>
            <Btn variant="primary" onClick={() => openCreate()}>+ Add Event</Btn>
          </div>
        )}
      </div>
      {importMessage && (
        <div className="mb-4 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white/70 font-body">
          {importMessage}
        </div>
      )}

      {/* Month navigation bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={goToPrevMonth}
          className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <h2 className="font-display font-bold text-white text-xl min-w-[160px] text-center">
          {MONTHS[viewMonth]} {viewYear}
        </h2>
        <button
          onClick={goToNextMonth}
          className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white transition-colors flex items-center justify-center"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
        <button
          onClick={() => {
            setExpandedDayBoxes({});
            setViewYear(today.getFullYear());
            setViewMonth(today.getMonth());
          }}
          className="text-xs text-white/40 hover:text-white/70 transition-colors font-body"
        >
          Today
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: "event", label: "Events", color: "#85CC17" },
          { key: "task", label: "Tasks", color: "#60A5FA" },
          { key: "financeDeadline", label: "Finance Deadlines", color: "#F59E0B" },
          { key: "projectDeadline", label: "Tech & Marketing Deadlines", color: "#EF4444" },
          ...(canEdit ? [{ key: "interview", label: "Interviews", color: "#8B5CF6" }] : []),
        ].map((item) => {
          const eventType = item.key as DisplayEvent["kind"];
          return (
            <label
              key={item.key}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#1C1F26] text-xs text-white/70 font-body"
            >
              <input
                type="checkbox"
                checked={visibleKinds[eventType]}
                onChange={(e) => {
                  setVisibleKinds((prev) => ({ ...prev, [eventType]: e.target.checked }));
                }}
                className="members-checkbox"
              />
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </label>
          );
        })}
      </div>

      {/* Desktop / tablet month grid */}
      <div className="hidden md:block bg-[#1C1F26] border border-white/8 rounded-xl overflow-hidden">

        {/* Weekday header row */}
        <div className="grid grid-cols-7 border-b border-white/8">
          {WEEKDAYS.map(day => (
            <div key={day} className="py-2 text-center text-xs font-medium text-white/30 font-body uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {monthGrid.map((day, index) => {
            const dateStr  = toDateString(day);
            const inMonth  = day.getMonth() === viewMonth;
            const isToday  = dateStr === todayStr;
            const dayEvents = eventsForDay(dateStr);
            const hasOverflow = dayEvents.length > 3;
            const isExpanded = !!expandedDayBoxes[dateStr];
            const visibleEvents = isExpanded ? dayEvents : dayEvents.slice(0, 3);
            const overflowCount = Math.max(0, dayEvents.length - 3);

            return (
              <div
                key={index}
                onClick={canEdit ? () => openCreate(dateStr) : undefined}
                className={`min-h-[110px] border-b border-r border-white p-1.5
                  ${index % 7 === 6 ? "border-r-0" : ""}
                  ${index >= monthGrid.length - 7 ? "border-b-0" : ""}
                  ${canEdit ? "cursor-pointer hover:bg-white/3 transition-colors" : ""}
                `}
              >
                {/* Day number */}
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 font-body
                  ${isToday ? "bg-[#85CC17] text-[#0D0D0D] font-bold" : (inMonth ? "text-white/50" : "text-white/25")}`}>
                  {day.getDate()}
                </div>

                {/* Event pills */}
                <div className="space-y-0.5">
                  {visibleEvents.map(ev => (
                    <button
                      key={ev.id}
                      onClick={e => handleEventPillClick(ev, e)}
                      className="w-full text-left px-1.5 py-1 rounded text-xs truncate font-body transition-opacity hover:opacity-80 font-medium"
                      style={{ backgroundColor: ev.color + "44", color: ev.color, borderLeft: `3px solid ${ev.color}` }}
                    >
                      {ev.time && <span className="opacity-60 mr-1">{ev.time}</span>}
                      {ev.title}
                    </button>
                  ))}
                  {hasOverflow && !isExpanded && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDayBoxes((prev) => ({ ...prev, [dateStr]: true }));
                      }}
                      className="text-xs text-white/40 pl-1 font-body hover:text-white/70 transition-colors"
                    >
                      +{overflowCount} more
                    </button>
                  )}
                  {hasOverflow && isExpanded && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedDayBoxes((prev) => ({ ...prev, [dateStr]: false }));
                      }}
                      className="text-xs text-white/40 pl-1 font-body hover:text-white/70 transition-colors"
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile day list */}
      <div className="md:hidden space-y-2">
        {monthDays.map((day) => {
          const dateStr = toDateString(day);
          const isToday = dateStr === todayStr;
          const dayEvents = eventsForDay(dateStr);
          return (
            <button
              key={dateStr}
              onClick={canEdit ? () => openCreate(dateStr) : undefined}
              className={`w-full text-left bg-[#1C1F26] border border-white/8 rounded-xl px-3 py-3 ${
                canEdit ? "hover:border-[#85CC17]/30 transition-colors" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-2">
                <p className={`text-sm font-semibold font-body ${isToday ? "text-[#85CC17]" : "text-white/85"}`}>
                  {day.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              {dayEvents.length === 0 ? (
                <p className="text-xs text-white/35 font-body">No events</p>
              ) : (
                <div className="space-y-1.5">
                  {dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={(e) => handleEventPillClick(ev, e)}
                      className="w-full text-left px-2 py-1.5 rounded text-xs truncate font-body font-medium"
                      style={{ backgroundColor: `${ev.color}33`, color: ev.color, borderLeft: `3px solid ${ev.color}` }}
                    >
                      {ev.time && <span className="opacity-60 mr-1">{ev.time}</span>}
                      {ev.title}
                    </div>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Event detail popup */}
      {popup && (
        <div
          ref={popupRef}
          className="fixed z-50 w-72 bg-[#1C1F26] border border-white/12 rounded-xl shadow-2xl p-4"
          style={{ top: popup.pos.top, left: Math.min(popup.pos.left, window.innerWidth - 300) }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: popup.event.color }} />
              <p className="text-white font-medium text-sm truncate">{popup.event.title}</p>
            </div>
            <button onClick={() => setPopup(null)} className="text-white/30 hover:text-white/60 flex-shrink-0 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="text-xs text-white/40 font-body space-y-1 mb-3">
            <p>{formatDateLabel(popup.event.calEvent?.start ?? popup.event.dateStr + "T00:00")}</p>
            {!popup.event.isTask && popup.event.time && <p>{popup.event.time}</p>}
            {popup.event.description && (
              <p className="text-white/55 mt-1">{popup.event.description}</p>
            )}
            {popup.event.isTask && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/8 text-white/40">Task deadline</span>
            )}
            {popup.event.isInterview && (
              <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#8B5CF6]/15 text-[#8B5CF6]">Interview</span>
            )}
            {popup.event.isAssignment && (
              popup.event.isBusinessProjectDeadline ? (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#EF4444]/20 text-[#EF4444]">
                  Tech & marketing deadline
                </span>
              ) : (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-[#F59E0B]/20 text-[#F59E0B]">
                  Finance deadline
                </span>
              )
            )}
          </div>

          {canEdit && !popup.event.isTask && !popup.event.isInterview && popup.event.calEvent && (
            <div className="flex gap-2 pt-2 border-t border-white/8">
              <Btn size="sm" variant="secondary" onClick={() => downloadEventICS(popup.event.calEvent!)}>Download .ics</Btn>
              <Btn size="sm" variant="ghost" onClick={() => openEdit(popup.event.calEvent!)}>Edit</Btn>
              <Btn size="sm" variant="danger" onClick={() => handleDelete(popup.event.id)}>Delete</Btn>
            </div>
          )}
          {canEdit && popup.event.isInterview && popup.event.interviewSlotId && (
            <div className="flex gap-2 pt-2 border-t border-white/8">
              <Btn size="sm" variant="danger" onClick={() => handleDeleteInterviewSlot(popup.event.interviewSlotId!)}>Cancel Slot</Btn>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit event modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={editingEvent ? "Edit Event" : "New Event"}>
        <div className="space-y-4">
          <Field label="Title" required>
            <Input value={form.title} onChange={e => setField("title", e.target.value)} placeholder="Team meeting, deadline…" />
          </Field>
          <Field label="Date" required>
            <Input type="date" value={form.date} onChange={e => setField("date", e.target.value)} />
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allday"
              checked={form.allDay}
              onChange={e => setField("allDay", e.target.checked)}
              className="members-checkbox"
            />
            <label htmlFor="allday" className="text-sm text-white/60 font-body">All-day event</label>
          </div>

          {!form.allDay && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start time">
                <Input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setForm((prev) => ({
                      ...prev,
                      startTime: nextStart,
                      endTime: addMinutesToTime(nextStart, 30),
                    }));
                  }}
                />
              </Field>
              <Field label="End time">
                <Input type="time" value={form.endTime} onChange={e => setField("endTime", e.target.value)} />
              </Field>
            </div>
          )}

          <Field label="Description">
            <TextArea rows={3} value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Optional notes…" />
          </Field>
        </div>

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleSave}>{editingEvent ? "Save" : "Create"}</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
