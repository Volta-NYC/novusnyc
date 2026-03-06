"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeCalendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent,
  subscribeTasks, subscribeInterviewSlots, subscribeInterviewInvites, subscribeGrants,
  deleteInterviewSlot,
  type CalendarEvent, type Task, type InterviewSlot, type InterviewInvite, type Grant,
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

// ── EVENT COLORS ──────────────────────────────────────────────────────────────

const EVENT_COLOR_OPTIONS = [
  { label: "Green",  value: "#85CC17" },
  { label: "Blue",   value: "#3B74ED" },
  { label: "Purple", value: "#8B5CF6" },
  { label: "Cyan",   value: "#06B6D4" },
  { label: "Orange", value: "#F59E0B" },
  { label: "Red",    value: "#EF4444" },
];

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
  kind: "event" | "task" | "grant" | "interview";
  dateStr: string;        // YYYY-MM-DD
  time?: string;          // formatted time string; undefined means all-day
  description?: string;
  isTask: boolean;
  isInterview?: boolean;
  calEvent?: CalendarEvent;
  interviewSlotId?: string; // for deleting booked interview slots
}

// ── FORM STATE ────────────────────────────────────────────────────────────────

const BLANK_EVENT_FORM = {
  title: "", description: "", date: "", startTime: "09:00", endTime: "09:30",
  allDay: false, color: "#85CC17",
};
type EventForm = typeof BLANK_EVENT_FORM;

// ── POPUP POSITION ────────────────────────────────────────────────────────────

interface PopupPosition { top: number; left: number; }

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { user, authRole } = useAuth();
  const canEdit = authRole === "admin" || authRole === "project_lead";

  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const [calEvents, setCalEvents]           = useState<CalendarEvent[]>([]);
  const [tasks, setTasks]                   = useState<Task[]>([]);
  const [interviewSlots, setInterviewSlots] = useState<InterviewSlot[]>([]);
  const [interviewInvites, setInterviewInvites] = useState<InterviewInvite[]>([]);
  const [grants, setGrants]                 = useState<Grant[]>([]);
  const [visibleKinds, setVisibleKinds] = useState<Record<DisplayEvent["kind"], boolean>>({
    event: true,
    task: true,
    grant: true,
    interview: true,
  });

  const [modal, setModal]               = useState<"create" | "edit" | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [form, setForm]                 = useState<EventForm>(BLANK_EVENT_FORM);

  // Popup for viewing event details when a pill is clicked.
  const [popup, setPopup] = useState<{ event: DisplayEvent; pos: PopupPosition } | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const { ask, Dialog } = useConfirm();

  // Subscribe to all data sources; unsubscribe on unmount.
  useEffect(() => {
    const unsubEvents   = subscribeCalendarEvents(setCalEvents);
    const unsubTasks    = subscribeTasks(setTasks);
    const unsubGrants   = subscribeGrants(setGrants);
    const unsubISlots   = canEdit ? subscribeInterviewSlots(setInterviewSlots) : () => {};
    const unsubIInvites = canEdit ? subscribeInterviewInvites(setInterviewInvites) : () => {};
    return () => { unsubEvents(); unsubTasks(); unsubGrants(); unsubISlots(); unsubIInvites(); };
  }, [authRole]);

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

  // ── Build merged display events ───────────────────────────────────────────

  // Map: invite id → invite (for looking up applicant name on booked slots)
  const inviteMap: Record<string, InterviewInvite> = {};
  for (const invite of interviewInvites) {
    inviteMap[invite.id] = invite;
  }

  // Combine all event sources into one list for grid rendering.
  const displayEvents: DisplayEvent[] = [
    // Calendar events (admin/leads can create)
    ...calEvents.map(ev => ({
      id:          ev.id,
      title:       ev.title,
      color:       ev.color ?? "#85CC17",
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
      .map(t => ({
        id:          `task-${t.id}`,
        title:       t.name,
        color:       TASK_STATUS_COLORS[t.status] ?? "#6B7280",
        kind:        "task",
        dateStr:     t.dueDate,
        time:        undefined,
        description: `${t.assignedTo} · ${t.status}`,
        isTask:      true,
      })),
    // Grant deadlines (everyone, upcoming statuses only)
    ...grants
      .filter(g => g.deadline && !["Awarded", "Rejected", "Cycle Closed"].includes(g.status))
      .map(g => ({
        id:          `grant-${g.id}`,
        title:       `Grant: ${g.name}`,
        color:       "#F59E0B",
        kind:        "grant",
        dateStr:     g.deadline,
        time:        undefined,
        description: `${g.funder} · ${g.status}`,
        isTask:      false,
      })),
    // Booked interview slots (admin + project_lead)
    ...(canEdit ? interviewSlots
      .filter(s => !!s.bookedBy)
      .map(s => {
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
  ];

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
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
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
      color:       ev.color ?? "#85CC17",
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
      color:       form.color,
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

  // Show a detail popup anchored below the clicked event pill.
  const handleEventPillClick = (ev: DisplayEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPopup({
      event: ev,
      pos: { top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX },
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
          <p className="text-white/40 text-sm mt-1 font-body">Task deadlines and team events.</p>
        </div>
        {canEdit && (
          <Btn variant="primary" onClick={() => openCreate()}>+ Add Event</Btn>
        )}
      </div>

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
          onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); }}
          className="text-xs text-white/40 hover:text-white/70 transition-colors font-body"
        >
          Today
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { key: "event", label: "Events", color: "#85CC17" },
          { key: "task", label: "Tasks", color: "#60A5FA" },
          { key: "grant", label: "Grants", color: "#F59E0B" },
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
                className="accent-[#85CC17] w-4 h-4"
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
            // Show at most 3 pills per cell; indicate overflow with "+N more".
            const visibleEvents = dayEvents.slice(0, 3);
            const overflowCount = dayEvents.length - 3;

            return (
              <div
                key={index}
                onClick={canEdit ? () => openCreate(dateStr) : undefined}
                className={`min-h-[110px] border-b border-r border-white/6 p-1.5
                  ${index % 7 === 6 ? "border-r-0" : ""}
                  ${index >= monthGrid.length - 7 ? "border-b-0" : ""}
                  ${inMonth ? "" : "opacity-30"}
                  ${canEdit ? "cursor-pointer hover:bg-white/3 transition-colors" : ""}
                `}
              >
                {/* Day number */}
                <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 font-body
                  ${isToday ? "bg-[#85CC17] text-[#0D0D0D] font-bold" : "text-white/50"}`}>
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
                  {overflowCount > 0 && (
                    <p className="text-xs text-white/25 pl-1 font-body">+{overflowCount} more</p>
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
                <span className="text-[11px] text-white/35 font-body">
                  {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
                </span>
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

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-white/40 font-body">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#60A5FA]" />Task deadlines
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />Grant deadlines
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#85CC17]" />Team events
        </span>
        {canEdit && (
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />Interviews
          </span>
        )}
        {canEdit && <span className="italic">Click a day to add an event.</span>}
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
          </div>

          {canEdit && !popup.event.isTask && !popup.event.isInterview && popup.event.calEvent && (
            <div className="flex gap-2 pt-2 border-t border-white/8">
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required>
              <Input type="date" value={form.date} onChange={e => setField("date", e.target.value)} />
            </Field>
            <Field label="Color">
              <div className="flex gap-2 mt-2 flex-wrap">
                {EVENT_COLOR_OPTIONS.map(colorOption => (
                  <button
                    key={colorOption.value}
                    title={colorOption.label}
                    onClick={() => setField("color", colorOption.value)}
                    className={`w-6 h-6 rounded-full transition-all ${
                      form.color === colorOption.value ? "ring-2 ring-white ring-offset-2 ring-offset-[#0F1014]" : ""
                    }`}
                    style={{ backgroundColor: colorOption.value }}
                  />
                ))}
              </div>
            </Field>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="allday"
              checked={form.allDay}
              onChange={e => setField("allDay", e.target.checked)}
              className="accent-[#85CC17] w-4 h-4"
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
