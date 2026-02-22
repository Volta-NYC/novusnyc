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

// All 15-minute time slots from 08:00 to 19:45.
const SLOT_TIMES: string[] = [];
for (let h = 8; h < 20; h++) {
  for (let m = 0; m < 60; m += 15) {
    SLOT_TIMES.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  }
}

// Format a Date as YYYY-MM-DD.
function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// ── BLANK FORMS ───────────────────────────────────────────────────────────────

const BLANK_INVITE_FORM = {
  applicantName: "", applicantEmail: "", role: "", note: "", expiryDays: "7",
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
    if (!inviteForm.applicantName.trim() || !inviteForm.applicantEmail.trim()) return;
    const token     = generateToken();
    const expiresAt = Date.now() + parseInt(inviteForm.expiryDays) * 86400000;
    await createInterviewInvite(token, {
      applicantName:  inviteForm.applicantName.trim(),
      applicantEmail: inviteForm.applicantEmail.trim(),
      role:           inviteForm.role.trim(),
      note:           inviteForm.note.trim(),
      expiresAt,
      status:         "pending",
      createdBy:      user?.uid ?? "",
      createdAt:      Date.now(),
    });
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

  // ── Grid slot toggle handler ──────────────────────────────────────────────

  const toggleSlot = async (date: Date, timeStr: string) => {
    const year  = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day   = String(date.getDate()).padStart(2, "0");
    const dateStr  = `${year}-${month}-${day}`;
    const datetime = `${dateStr}T${timeStr}:00`;
    const key      = `${dateStr}T${timeStr}`;
    const existing = slotMap[key];
    if (existing) {
      if (!existing.bookedBy) await deleteInterviewSlot(existing.id);
    } else {
      await createInterviewSlot({
        datetime,
        durationMinutes: 15,
        available: true,
        location: "",
        createdBy: user?.uid ?? "",
        createdAt: Date.now(),
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
          {sortedInvites.map(invite => (
            <div
              key={invite.id}
              className="bg-[#1C1F26] border border-white/8 rounded-xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium text-sm">{invite.applicantName}</p>
                  {invite.role && <span className="text-white/40 text-xs">{invite.role}</span>}
                  <span className={`text-xs font-medium ${inviteStatusColor(invite.status)}`}>
                    {invite.status.charAt(0).toUpperCase() + invite.status.slice(1)}
                  </span>
                </div>
                <p className="text-white/40 text-xs mt-0.5 font-mono">{invite.applicantEmail}</p>
                {invite.status === "booked" && invite.bookedSlotId && (
                  <p className="text-green-400/70 text-xs mt-0.5">
                    Booked · Slot ID: {invite.bookedSlotId.slice(0, 8)}…
                  </p>
                )}
                {invite.note && (
                  <p className="text-white/30 text-xs mt-1 italic">{invite.note}</p>
                )}
                <p className="text-white/25 text-xs mt-1 font-body">
                  Expires {new Date(invite.expiresAt).toLocaleDateString()} ·
                  Created {new Date(invite.createdAt).toLocaleDateString()}
                </p>
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
          ))}
        </div>
      )}

      {/* ── Availability tab ── */}
      {activeTab === "slots" && (
        <div className="space-y-4">
          {/* Week navigation */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setSlotWeek(w => Math.max(0, w - 1))}
              disabled={slotWeek === 0}
              className="px-3 py-1.5 rounded-lg bg-white/8 text-white/60 hover:text-white hover:bg-white/12 transition-colors text-sm disabled:opacity-30"
            >← Prev</button>
            <span className="text-white/60 text-sm font-body flex-1 text-center">
              Week {slotWeek + 1} of 3
            </span>
            <button
              onClick={() => setSlotWeek(w => Math.min(2, w + 1))}
              disabled={slotWeek === 2}
              className="px-3 py-1.5 rounded-lg bg-white/8 text-white/60 hover:text-white hover:bg-white/12 transition-colors text-sm disabled:opacity-30"
            >Next →</button>
          </div>

          {/* Grid */}
          <div className="bg-[#1C1F26] border border-white/8 rounded-xl overflow-hidden">
            {/* Header row: time label col + day columns */}
            <div className="grid sticky top-0 bg-[#1C1F26] border-b border-white/8 z-10" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
              <div className="p-1" />
              {weekDates.map((day, i) => {
                const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                const isToday = toDateString(day) === toDateString(new Date());
                return (
                  <div key={i} className={`py-2 text-center text-xs font-medium font-body border-l border-white/6 ${isToday ? "text-[#85CC17]" : "text-white/40"}`}>
                    <div>{dayNames[day.getDay()]}</div>
                    <div className={`text-[10px] mt-0.5 ${isToday ? "text-[#85CC17]/70" : "text-white/25"}`}>
                      {day.getMonth() + 1}/{day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Scrollable time rows */}
            <div className="max-h-[480px] overflow-y-auto">
              {SLOT_TIMES.map(timeStr => {
                const isHour = timeStr.endsWith(":00");
                const hStr   = timeStr.split(":")[0];
                const h      = parseInt(hStr);
                const ampm   = h >= 12 ? "PM" : "AM";
                const label  = isHour ? `${h % 12 || 12} ${ampm}` : "";

                return (
                  <div key={timeStr} className={`grid border-b border-white/4 ${isHour ? "border-white/8" : ""}`} style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
                    {/* Time label */}
                    <div className="flex items-center justify-end pr-2 py-0.5">
                      {isHour && <span className="text-[10px] text-white/25 font-body whitespace-nowrap">{label}</span>}
                    </div>
                    {/* Day cells */}
                    {weekDates.map((day, dayIdx) => {
                      const year  = day.getFullYear();
                      const month = String(day.getMonth() + 1).padStart(2, "0");
                      const dayStr = String(day.getDate()).padStart(2, "0");
                      const key   = `${year}-${month}-${dayStr}T${timeStr}`;
                      const slot  = slotMap[key];
                      const isPast = new Date(`${year}-${month}-${dayStr}T${timeStr}`) < new Date();
                      const isBooked    = !!slot?.bookedBy;
                      const isAvailable = !!slot && !isBooked;

                      return (
                        <button
                          key={dayIdx}
                          onClick={() => !isPast && !isBooked && toggleSlot(day, timeStr)}
                          disabled={isPast || isBooked}
                          className={`h-6 border-l border-white/4 transition-colors text-[9px] font-body
                            ${isBooked
                              ? "bg-blue-500/20 text-blue-400 cursor-default"
                              : isAvailable
                                ? "bg-[#85CC17]/20 hover:bg-[#85CC17]/30 cursor-pointer"
                                : isPast
                                  ? "opacity-30 cursor-default"
                                  : "hover:bg-white/5 cursor-pointer"}
                          `}
                        >
                          {isBooked ? "•" : ""}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legend */}
          <div className="flex gap-4 text-xs text-white/40 font-body mt-3">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#85CC17]/20 border border-[#85CC17]/40" />Available</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-400/40" />Booked</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white/5" />Click to add</span>
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
                        {slot.bookedBy ? ` · Booked` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge label={slot.bookedBy ? "Booked" : "Available"} />
                      {!slot.bookedBy && (
                        <Btn size="sm" variant="danger" onClick={() => ask(async () => deleteInterviewSlot(slot.id))}>
                          Remove
                        </Btn>
                      )}
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Role / Position">
              <Input
                value={inviteForm.role}
                onChange={e => setInviteField("role", e.target.value)}
                placeholder="e.g. Tech Consultant"
              />
            </Field>
            <Field label="Link expires in">
              <Select
                options={["3", "7", "14", "30"]}
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
              placeholder="Optional context for this candidate…"
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
