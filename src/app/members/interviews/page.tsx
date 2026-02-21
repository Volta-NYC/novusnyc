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

// ── BLANK FORMS ───────────────────────────────────────────────────────────────

const BLANK_INVITE_FORM = {
  applicantName: "", applicantEmail: "", role: "", note: "", expiryDays: "7",
};

const BLANK_SLOT_FORM = {
  date: "", time: "10:00", durationMinutes: "30", location: "",
};

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function InterviewsPage() {
  const { user, authRole, loading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"invites" | "slots">("invites");

  const [invites, setInvites] = useState<InterviewInvite[]>([]);
  const [slots, setSlots]     = useState<InterviewSlot[]>([]);

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteForm, setInviteForm]           = useState(BLANK_INVITE_FORM);
  const [newToken, setNewToken]               = useState<string | null>(null);
  const [linkCopied, setLinkCopied]           = useState(false);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm]           = useState(BLANK_SLOT_FORM);

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

  if (loading || (authRole !== "admin" && authRole !== "project_lead")) return null;

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

  // ── Slot form handlers ────────────────────────────────────────────────────

  // Generic field updater for the slot form.
  const setSlotField = (key: string, value: string) =>
    setSlotForm(prev => ({ ...prev, [key]: value }));

  const handleCreateSlot = async () => {
    if (!slotForm.date || !slotForm.time) return;
    await createInterviewSlot({
      datetime:        `${slotForm.date}T${slotForm.time}:00`,
      durationMinutes: parseInt(slotForm.durationMinutes) || 30,
      location:        slotForm.location.trim(),
      available:       true,
      createdBy:       user?.uid ?? "",
      createdAt:       Date.now(),
    });
    setShowSlotModal(false);
    setSlotForm(BLANK_SLOT_FORM);
  };

  // Sort invites newest-first; sort slots chronologically.
  const sortedInvites = [...invites].sort((a, b) => b.createdAt - a.createdAt);
  const sortedSlots   = [...slots].sort((a, b) =>
    new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
  );

  const TABS: { key: typeof activeTab; label: string }[] = [
    { key: "invites", label: "Invite Links" },
    { key: "slots",   label: "Availability" },
  ];

  return (
    <MembersLayout>
      <Dialog />

      {/* Page header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-white text-2xl">Interviews</h1>
          <p className="text-white/40 text-sm mt-1 font-body">Manage invite links and available time slots.</p>
        </div>
        {activeTab === "invites"
          ? <Btn variant="primary" onClick={() => setShowInviteModal(true)}>+ New Invite</Btn>
          : <Btn variant="primary" onClick={() => setShowSlotModal(true)}>+ Add Slot</Btn>
        }
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
        <div className="space-y-3">
          {sortedSlots.length === 0 && (
            <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-8 text-center text-white/30 text-sm font-body">
              No time slots yet. Add slots so applicants can choose a time.
            </div>
          )}
          {sortedSlots.map(slot => (
            <div key={slot.id} className="bg-[#1C1F26] border border-white/8 rounded-xl px-5 py-4 flex items-center gap-4">
              {/* Status dot: green = available, blue = booked, gray = unavailable */}
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: slot.available ? "#85CC17" : (slot.bookedBy ? "#60A5FA" : "#6B7280") }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{formatDateTime(slot.datetime)}</p>
                <p className="text-white/40 text-xs mt-0.5 font-body">
                  {slot.durationMinutes} min
                  {slot.location ? ` · ${slot.location}` : ""}
                  {slot.bookedBy ? ` · Booked by invite ${slot.bookedBy.slice(0, 6)}…` : ""}
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

      {/* ── Add Slot modal ── */}
      <Modal open={showSlotModal} onClose={() => setShowSlotModal(false)} title="Add Time Slot">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required>
              <Input type="date" value={slotForm.date} onChange={e => setSlotField("date", e.target.value)} />
            </Field>
            <Field label="Time" required>
              <Input type="time" value={slotForm.time} onChange={e => setSlotField("time", e.target.value)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration">
              <Select
                options={["15", "30", "45", "60", "90"]}
                value={slotForm.durationMinutes}
                onChange={e => setSlotField("durationMinutes", e.target.value)}
              />
            </Field>
            <Field label="Location">
              <Input
                value={slotForm.location}
                onChange={e => setSlotField("location", e.target.value)}
                placeholder="Zoom / in-person / etc."
              />
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-white/8">
          <Btn variant="ghost" onClick={() => setShowSlotModal(false)}>Cancel</Btn>
          <Btn variant="primary" onClick={handleCreateSlot}>Add Slot</Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
