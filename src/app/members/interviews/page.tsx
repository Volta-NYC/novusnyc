"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import { useAuth } from "@/lib/members/authContext";
import {
  subscribeInterviewInvites, createInterviewInvite, updateInterviewInvite,
  subscribeInterviewSlots, createInterviewSlot, deleteInterviewSlot,
  type InterviewInvite, type InterviewSlot,
} from "@/lib/members/storage";
import { Btn, Modal, Field, Input, Select, TextArea, Badge, useConfirm } from "@/components/members/ui";
import { generateToken } from "@/lib/interviews";

// ── HELPERS ───────────────────────────────────────────────────────────────────

// Format a Unix-ms or ISO datetime into a readable string like "Jan 5, 2025 · 10:00 AM".
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${hours % 12 || 12}:${minutes} ${ampm}`;
}

// Returns a Tailwind text color class for an interview invite status.
function inviteStatusColor(status: string): string {
  if (status === "booked")    return "text-green-400";
  if (status === "expired")   return "text-white/30";
  if (status === "cancelled") return "text-red-400";
  return "text-[#85CC17]"; // pending
}

// Builds the full booking URL for a given invite token.
function buildBookingUrl(token: string): string {
  if (typeof window === "undefined") return `/book/${token}`;
  return `${window.location.origin}/book/${token}`;
}

// ── GRID HELPERS ──────────────────────────────────────────────────────────────

// Returns the 7 dates (Mon–Sun) for the week offset from today.
function getWeekDates(weekOffset: number): Date[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - dow + 1 + weekOffset * 7); // Start from Monday
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

// Hours displayed in the grid: 8 AM through 7 PM (each row = 1 hour = 4 × 15-min slots).
const GRID_HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // [8, 9, …, 19]

// Format a Date as YYYY-MM-DD.
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Returns all four 15-min slot keys for a given date + hour, e.g. "2025-01-05T09:00".
function hourSlotKeys(date: Date, hour: number): string[] {
  const d = toDateString(date);
  const h = String(hour).padStart(2, "0");
  return ["00", "15", "30", "45"].map(m => `${d}T${h}:${m}`);
}

// "full" = all 4 slots available, "partial" = some, "booked" = at least one booked, "none" = empty.
type HourState = "full" | "partial" | "booked" | "none";
function getHourState(date: Date, hour: number, slotMap: Record<string, InterviewSlot>): HourState {
  const keys = hourSlotKeys(date, hour);
  const slots = keys.map(k => slotMap[k]);
  const booked    = slots.some(s => s?.bookedBy);
  if (booked) return "booked";
  const available = slots.filter(Boolean).length;
  if (available === 4) return "full";
  if (available > 0)  return "partial";
  return "none";
}

// Format hour number → "8 AM", "12 PM", "7 PM".
function fmtHour(h: number): string {
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12} ${ampm}`;
}

// ── BLANK FORMS ───────────────────────────────────────────────────────────────

const BLANK_INVITE_FORM = {
  applicantName: "", applicantEmail: "", note: "", expiryDays: "7", multiUse: false,
};

// ── INTERVIEWS CONTENT (inside AuthProvider via MembersLayout) ────────────────
// useAuth() must be called from inside MembersLayout's AuthProvider — not from
// the page root, which is outside it.

function InterviewsContent() {
  const { user, authRole, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"invites" | "slots">("invites");

  const [invites, setInvites] = useState<InterviewInvite[]>([]);
  const [slots, setSlots]     = useState<InterviewSlot[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm]           = useState(BLANK_INVITE_FORM);
  const [newToken, setNewToken]               = useState<string | null>(null);
  const [linkCopied, setLinkCopied]           = useState(false);

  // Availability grid state
  const [slotWeek, setSlotWeek] = useState(0);
  // (no popover state — grid uses individual bar buttons)

  const { ask, Dialog } = useConfirm();

  // Redirect non-authorized users back to the dashboard.
  useEffect(() => {
    if (!loading && authRole !== "admin" && authRole !== "project_lead") {
      router.replace("/members/dashboard");
    }
  }, [authRole, loading, router]);

  // Subscribe to interview invites and slots; unsubscribe on unmount.
  useEffect(() => {
    const unsubscribeInvites = subscribeInterviewInvites(setInvites);
    const unsubscribeSlots   = subscribeInterviewSlots(setSlots);
    return () => { unsubscribeInvites(); unsubscribeSlots(); };
  }, []);

  if (loading || (authRole !== "admin" && authRole !== "project_lead")) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  // Build a map keyed by first 16 chars of datetime ("YYYY-MM-DDTHH:MM") for O(1) lookup.
  const slotMap: Record<string, InterviewSlot> = {};
  for (const slot of slots) {
    const key = slot.datetime.slice(0, 16);
    slotMap[key] = slot;
  }

  const weekDates = getWeekDates(slotWeek);

  // ── Invite form handlers ──────────────────────────────────────────────────

  // Generic field updater for the invite form.
  const setInviteField = (key: string, value: string) =>
    setInviteForm(prev => ({ ...prev, [key]: value }));

  const handleCreateInvite = async () => {
    if (!inviteForm.multiUse && (!inviteForm.applicantName.trim() || !inviteForm.applicantEmail.trim())) return;
    const token     = generateToken();
    const expiresAt = Date.now() + parseInt(inviteForm.expiryDays) * 86400000;

    // Build data without undefined values — Firebase rejects undefined fields.
    const inviteData: Omit<import("@/lib/members/storage").InterviewInvite, "id"> = {
      role:      "",
      note:      inviteForm.note.trim(),
      multiUse:  inviteForm.multiUse,
      expiresAt,
      status:    "pending",
      createdBy: user?.uid ?? "",
      createdAt: Date.now(),
    };
    if (!inviteForm.multiUse) {
      inviteData.applicantName  = inviteForm.applicantName.trim();
      inviteData.applicantEmail = inviteForm.applicantEmail.trim();
    }

    await createInterviewInvite(token, inviteData);
    setNewToken(token);
    setInviteForm(BLANK_INVITE_FORM);
  };

  const cancelInvite = (token: string) =>
    ask(async () => updateInterviewInvite(token, { status: "cancelled" }));

  const copyInviteLink = (token: string) => {
    navigator.clipboard.writeText(buildBookingUrl(token));
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // ── Grid slot toggle handlers ─────────────────────────────────────────────

  // Toggle all 4 quarter-hour slots within one hour cell.
  const toggleHour = async (date: Date, hour: number) => {
    const keys  = hourSlotKeys(date, hour);
    const state = getHourState(date, hour, slotMap);
    if (state === "booked") return; // never touch booked slots

    if (state === "none") {
      // Create all 4 slots
      const d = toDateString(date);
      const h = String(hour).padStart(2, "0");
      await Promise.all(
        ["00", "15", "30", "45"].map(m =>
          createInterviewSlot({
            datetime: `${d}T${h}:${m}:00`,
            durationMinutes: 15,
            available: true,
            location: "",
            createdBy: user?.uid ?? "",
            createdAt: Date.now(),
          })
        )
      );
    } else {
      // Remove existing (non-booked) slots for this hour
      await Promise.all(
        keys
          .map(k => slotMap[k])
          .filter(s => s && !s.bookedBy)
          .map(s => deleteInterviewSlot(s.id))
      );
    }
  };

  // Toggle all hours in a day column (skip booked).
  const toggleDay = async (date: Date) => {
    const allKeys  = GRID_HOURS.flatMap(h => hourSlotKeys(date, h));
    const existing = allKeys.map(k => slotMap[k]).filter(Boolean);
    const nonBooked = existing.filter(s => !s.bookedBy);

    if (nonBooked.length > 0) {
      // Remove all available slots for this day
      await Promise.all(nonBooked.map(s => deleteInterviewSlot(s.id)));
    } else {
      // Create all slots for this day
      const d = toDateString(date);
      await Promise.all(
        GRID_HOURS.flatMap(hour => {
          const h = String(hour).padStart(2, "0");
          return ["00", "15", "30", "45"].map(m =>
            createInterviewSlot({
              datetime: `${d}T${h}:${m}:00`,
              durationMinutes: 15,
              available: true,
              location: "",
              createdBy: user?.uid ?? "",
              createdAt: Date.now(),
            })
          );
        })
      );
    }
  };

  // Toggle a specific hour across all 7 days in the current week (skip booked, skip past).
  const toggleHourRow = async (hour: number) => {
    const futureDays = weekDates.filter(d => {
      const dt = new Date(toDateString(d) + "T" + String(hour).padStart(2, "0") + ":00");
      return dt >= new Date();
    });
    const existing = futureDays.flatMap(d =>
      hourSlotKeys(d, hour).map(k => slotMap[k]).filter(Boolean)
    );
    const nonBooked = existing.filter(s => !s.bookedBy);

    if (nonBooked.length > 0) {
      await Promise.all(nonBooked.map(s => deleteInterviewSlot(s.id)));
    } else {
      const h = String(hour).padStart(2, "0");
      await Promise.all(
        futureDays.flatMap(date => {
          const d = toDateString(date);
          return ["00", "15", "30", "45"].map(m =>
            createInterviewSlot({
              datetime: `${d}T${h}:${m}:00`,
              durationMinutes: 15,
              available: true,
              location: "",
              createdBy: user?.uid ?? "",
              createdAt: Date.now(),
            })
          );
        })
      );
    }
  };

  // Preset: fill a range of hours across all 7 days in the current week (skip past/booked).
  const applyPreset = async (startHour: number, endHour: number) => {
    const hoursRange = GRID_HOURS.filter(h => h >= startHour && h < endHour);
    await Promise.all(
      weekDates.flatMap(date =>
        hoursRange.map(hour => {
          const isPast = new Date(toDateString(date) + "T" + String(hour).padStart(2, "0") + ":00") < new Date();
          if (isPast) return Promise.resolve();
          return toggleHour(date, hour);
        })
      )
    );
  };

  // Toggle a single 15-minute sub-slot (used by the per-cell popover).
  const toggleMinuteSlot = async (date: Date, hour: number, minute: string) => {
    const d   = toDateString(date);
    const h   = String(hour).padStart(2, "0");
    const key = `${d}T${h}:${minute}`;
    const existing = slotMap[key];
    if (existing) {
      if (!existing.bookedBy) await deleteInterviewSlot(existing.id);
    } else {
      await createInterviewSlot({
        datetime:        `${d}T${h}:${minute}:00`,
        durationMinutes: 15,
        available:       true,
        location:        "",
        createdBy:       user?.uid ?? "",
        createdAt:       Date.now(),
      });
    }
  };

  // Sort invites newest-first; sort slots chronologically.
  const sortedInvites = [...invites].sort((a, b) => b.createdAt - a.createdAt);
  const sortedSlots   = [...slots].sort((a, b) =>
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );
  // Only show upcoming slots in the summary list.
  const upcomingSlots = sortedSlots.filter(s => new Date(s.datetime) >= new Date());

  const TABS: { key: typeof activeTab; label: string }[] = [
    { key: "invites", label: "Invite Links" },
    { key: "slots",   label: "Availability" },
  ];

  return (
    <>
      <Dialog />

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Interviews</h1>
          <p className="text-white/40 text-sm mt-1 font-body">Manage invite links and available time slots.</p>
        </div>
        {activeTab === "invites" && (
          <Btn variant="primary" onClick={() => setShowInviteModal(true)}>+ New Invite</Btn>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-[#1C1F26] border border-white/8 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-medium font-body transition-colors
              ${activeTab === tab.key ? "bg-[#85CC17] text-[#0D0D0D]" : "text-white/50 hover:text-white"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Invite Links tab ── */}
      {activeTab === "invites" && (
        <div className="space-y-3">
          {sortedInvites.length === 0 && (
            <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-8 text-center text-white/30 text-sm font-body">
              No invite links yet. Create one to send to an applicant.
            </div>
          )}
          {sortedInvites.map(invite => {
            // Count how many slots have been booked through this token.
            const bookingCount = slots.filter(s => s.bookedBy === invite.id).length;
            return (
            <div
              key={invite.id}
              className="bg-[#1C1F26] border border-white/8 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {invite.multiUse ? (
                    <>
                      <p className="text-white font-medium text-sm">Multi-use link</p>
                      <span className="text-white/40 text-xs bg-white/6 px-2 py-0.5 rounded-full">
                        {bookingCount} {bookingCount === 1 ? "booking" : "bookings"}
                      </span>
                    </>
                  ) : (
                    <p className="text-white font-medium text-sm">{invite.applicantName}</p>
                  )}
                  <span className={`text-xs font-medium ${inviteStatusColor(invite.status)}`}>
                    {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                  </span>
                </div>
                {!invite.multiUse && (
                  <p className="text-white/40 text-xs mt-0.5 font-mono">{invite.applicantEmail}</p>
                )}
                {invite.status === "booked" && (() => {
                  const bookedSlot = invite.bookedSlotId ? slots.find(s => s.id === invite.bookedSlotId) : null;
                  return bookedSlot ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-green-400/70 text-xs">✓ {formatDateTime(bookedSlot.datetime)}</p>
                      {(bookedSlot.bookerName || bookedSlot.bookerEmail) && (
                        <p className="text-white/50 text-xs font-body">
                          {bookedSlot.bookerName}{bookedSlot.bookerEmail ? ` · ${bookedSlot.bookerEmail}` : ""}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-green-400/70 text-xs mt-0.5">✓ Booked</p>
                  );
                })()}
                {invite.note && (
                  <p className="text-white/30 text-xs mt-1 italic">{invite.note}</p>
                )}
                <p className="text-white/25 text-xs mt-1 font-body">
                  Expires {new Date(invite.expiresAt).toLocaleDateString()} ·
                  Created {new Date(invite.createdAt).toLocaleDateString()}
                </p>
                {invite.multiUse && bookingCount > 0 && (() => {
                  const bookedSlots = slots
                    .filter(s => s.bookedBy === invite.id)
                    .sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
                  return (
                    <div className="mt-2 space-y-1 border-t border-white/6 pt-2">
                      {bookedSlots.map(s => (
                        <p key={s.id} className="text-white/40 text-xs font-body">
                          {formatDateTime(s.datetime)} · {s.bookerName ?? "—"}{s.bookerEmail ? ` · ${s.bookerEmail}` : ""}
                        </p>
                      ))}
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {invite.status === "pending" && (
                  <>
                    <button
                      onClick={() => copyInviteLink(invite.id)}
                      className="text-xs text-[#85CC17]/70 hover:text-[#85CC17] transition-colors font-body px-2 py-1 rounded-lg bg-[#85CC17]/8 hover:bg-[#85CC17]/15"
                    >
                      {linkCopied ? "Copied!" : "Copy Link"}
                    </button>
                    <Btn size="sm" variant="danger" onClick={() => cancelInvite(invite.id)}>Cancel</Btn>
                  </>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}

      {/* ── Availability tab ── */}
      {activeTab === "slots" && (
        <div className="space-y-4">
          {/* Preset quick-fill buttons */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-white/40 text-xs font-body mr-1">Quick fill this week:</span>
            <button
              onClick={() => applyPreset(9, 12)}
              className="px-3 py-1 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white text-xs font-body transition-colors"
            >Morning (9–12)</button>
            <button
              onClick={() => applyPreset(12, 17)}
              className="px-3 py-1 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white text-xs font-body transition-colors"
            >Afternoon (12–5)</button>
            <button
              onClick={() => applyPreset(9, 17)}
              className="px-3 py-1 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white text-xs font-body transition-colors"
            >Business Hours (9–5)</button>
            <button
              onClick={() => applyPreset(8, 20)}
              className="px-3 py-1 rounded-lg bg-white/8 hover:bg-white/12 text-white/60 hover:text-white text-xs font-body transition-colors"
            >All Day (8–8)</button>
          </div>

          {/* Week navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSlotWeek(w => Math.max(0, w - 1))}
              disabled={slotWeek === 0}
              className="px-3 py-1.5 rounded-lg bg-white/8 text-white/60 hover:text-white hover:bg-white/12 transition-colors text-sm disabled:opacity-30"
            >← Prev</button>
            <span className="text-white/60 text-sm font-body flex-1 text-center">
              {weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
              {weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button
              onClick={() => setSlotWeek(w => Math.min(2, w + 1))}
              disabled={slotWeek === 2}
              className="px-3 py-1.5 rounded-lg bg-white/8 text-white/60 hover:text-white hover:bg-white/12 transition-colors text-sm disabled:opacity-30"
            >Next →</button>
          </div>

          {/* Grid */}
          <div className="bg-[#1C1F26] border border-white/8 rounded-xl overflow-hidden">

            {/* Header row: empty corner + day columns */}
            <div className="grid border-b border-white/8" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
              <div className="p-2 text-[10px] text-white/20 font-body text-center">hour</div>
              {weekDates.map((day, i) => {
                const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const isToday = toDateString(day) === toDateString(new Date());
                const isPastDay = day < new Date(new Date().setHours(0,0,0,0));
                return (
                  <button
                    key={i}
                    onClick={() => !isPastDay && toggleDay(day)}
                    disabled={isPastDay}
                    title={isPastDay ? undefined : "Toggle entire day"}
                    className={`py-2 text-center text-xs font-medium font-body border-l border-white/6 transition-colors
                      ${isPastDay ? "opacity-30 cursor-default" : "hover:bg-white/5 cursor-pointer"}
                      ${isToday ? "text-[#85CC17]" : "text-white/40"}`}
                  >
                    <div>{DAY_NAMES[day.getDay()]}</div>
                    <div className={`text-[10px] mt-0.5 ${isToday ? "text-[#85CC17]/70" : "text-white/25"}`}>
                      {day.getMonth() + 1}/{day.getDate()}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Hour rows */}
            {GRID_HOURS.map(hour => (
              <div key={hour} className="grid border-b border-white/4" style={{ gridTemplateColumns: "64px repeat(7, 1fr)" }}>
                {/* Row label — click to toggle this hour across all days */}
                <button
                  onClick={() => toggleHourRow(hour)}
                  title="Toggle this hour across all days"
                  className="flex items-center justify-center py-3 text-[11px] text-white/30 hover:text-white/60 font-body transition-colors cursor-pointer hover:bg-white/5"
                >
                  {fmtHour(hour)}
                </button>

                {/* Day cells — 4 vertical bars (one per 15-min quarter) */}
                {weekDates.map((day, dayIdx) => {
                  const isPast = new Date(toDateString(day) + "T" + String(hour).padStart(2, "0") + ":59") < new Date();
                  const d = toDateString(day);
                  const h = String(hour).padStart(2, "0");

                  return (
                    <div key={dayIdx} className="relative border-l border-white/6">
                      <div className={`flex h-11 gap-px px-0.5 py-1.5 items-stretch ${isPast ? "opacity-20" : ""}`}>
                        {(["00", "15", "30", "45"] as const).map(min => {
                          const key = `${d}T${h}:${min}`;
                          const slot = slotMap[key];
                          const isBooked  = !!slot?.bookedBy;
                          const isAvail   = !!slot && !isBooked;
                          const isPastMin = new Date(`${d}T${h}:${min}`) < new Date();
                          const slotTime  = `${Number(h) % 12 || 12}:${min} ${Number(h) >= 12 ? "PM" : "AM"}`;

                          return (
                            <button
                              key={min}
                              disabled={isPastMin || isBooked}
                              onClick={async () => {
                                if (!isPastMin && !isBooked) await toggleMinuteSlot(day, hour, min);
                              }}
                              title={
                                isBooked  ? `${slotTime} — Booked${slot.bookerName ? ` · ${slot.bookerName}` : ""}` :
                                isAvail   ? `${slotTime} — Available (click to remove)` :
                                isPastMin ? slotTime :
                                            `${slotTime} — Click to add`
                              }
                              className={`flex-1 rounded-[2px] transition-colors ${
                                isBooked  ? "bg-blue-400/70 cursor-default" :
                                isAvail   ? "bg-[#85CC17]/65 hover:bg-[#85CC17]/40 cursor-pointer" :
                                isPastMin ? "bg-white/5 cursor-default" :
                                            "bg-white/10 hover:bg-white/25 cursor-pointer"
                              }`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend + hint */}
          <div className="flex flex-wrap gap-4 text-xs text-white/40 font-body">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#85CC17]/20 border border-[#85CC17]/40" />Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/15 border border-blue-400/30" />Booked</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/8" />Click cell to toggle hour · Click day header to toggle day · Click hour label to toggle row</span>
          </div>

          {/* Upcoming slots summary list */}
          {upcomingSlots.length > 0 && (
            <div className="mt-6">
              <h3 className="text-white/50 text-xs font-body uppercase tracking-wider mb-3">Upcoming Slots</h3>
              <div className="space-y-2">
                {upcomingSlots.map(slot => (
                  <div key={slot.id} className="bg-[#1C1F26] border border-white/8 rounded-xl px-5 py-3 flex items-center gap-4">
                    {/* Status dot: green = available, blue = booked */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: slot.bookedBy ? "#60A5FA" : "#85CC17" }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium">{formatDateTime(slot.datetime)}</p>
                      <p className="text-white/40 text-xs mt-0.5 font-body">
                        {slot.durationMinutes} min
                        {slot.location ? ` · ${slot.location}` : ""}
                        {slot.bookedBy
                          ? ` · ${slot.bookerName ?? "Booked"}${slot.bookerEmail ? ` (${slot.bookerEmail})` : ""}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge label={slot.bookedBy ? "Booked" : "Available"} />
                      <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteInterviewSlot(slot.id))}>
                        {slot.bookedBy ? "Cancel" : "Remove"}
                      </Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Create Invite modal ── */}
      <Modal
        open={showInviteModal && !newToken}
        onClose={() => { setShowInviteModal(false); setNewToken(null); }}
        title="New Invite Link"
      >
        <div className="space-y-4">
          {/* Multi-use toggle */}
          <div className="flex items-center justify-between bg-white/4 border border-white/8 rounded-xl px-4 py-3">
            <div>
              <p className="text-white text-sm font-medium">Multi-use link</p>
              <p className="text-white/40 text-xs mt-0.5 font-body">Anyone with the link can book a slot. Each person enters their own name and email.</p>
            </div>
            <button
              onClick={() => setInviteForm(prev => ({ ...prev, multiUse: !prev.multiUse }))}
              className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${inviteForm.multiUse ? "bg-[#85CC17]" : "bg-white/15"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${inviteForm.multiUse ? "left-5" : "left-1"}`} />
            </button>
          </div>

          {/* Applicant fields — only shown for single-use */}
          {!inviteForm.multiUse && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Applicant Name" required>
                <Input
                  value={inviteForm.applicantName}
                  onChange={e => setInviteField("applicantName", e.target.value)}
                  placeholder="Jane Smith"
                />
              </Field>
              <Field label="Applicant Email" required>
                <Input
                  type="email"
                  value={inviteForm.applicantEmail}
                  onChange={e => setInviteField("applicantEmail", e.target.value)}
                  placeholder="jane@example.com"
                />
              </Field>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Link expires in">
              <Select
                options={["1", "3", "7", "14", "30"]}
                value={inviteForm.expiryDays}
                onChange={e => setInviteField("expiryDays", e.target.value)}
              />
            </Field>
          </div>
          <Field label="Internal note">
            <TextArea
              rows={2}
              value={inviteForm.note}
              onChange={e => setInviteField("note", e.target.value)}
              placeholder="Optional context…"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setShowInviteModal(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleCreateInvite}>Generate Link</Btn>
        </div>
      </Modal>

      {/* ── New link confirmation modal ── */}
      <Modal
        open={!!newToken}
        onClose={() => { setNewToken(null); setShowInviteModal(false); }}
        title="Invite Link Created"
      >
        <div className="space-y-4">
          <p className="text-white/60 text-sm font-body">
            Share this link with the applicant. It expires based on the days you selected.
          </p>
          <div className="bg-[#0F1014] border border-white/10 rounded-xl p-3 font-mono text-sm text-[#85CC17] break-all">
            {newToken ? buildBookingUrl(newToken) : ""}
          </div>
          <button
            onClick={() => newToken && copyInviteLink(newToken)}
            className="w-full py-2.5 rounded-xl bg-[#85CC17] text-[#0D0D0D] font-display font-bold text-sm hover:bg-[#72b314] transition-colors"
          >
            {linkCopied ? "Copied!" : "Copy Link"}
          </button>
        </div>
        <div className="flex justify-end mt-4 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => { setNewToken(null); setShowInviteModal(false); }}>Done</Btn>
        </div>
      </Modal>
    </>
  );
}

// ── PAGE EXPORT ───────────────────────────────────────────────────────────────

export default function InterviewsPage() {
  return (
    <MembersLayout>
      <InterviewsContent />
    </MembersLayout>
  );
}
