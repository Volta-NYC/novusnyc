"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { isValidToken } from "@/lib/interviews";
import type { InterviewInvite, InterviewSlot } from "@/lib/members/storage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDayHeader(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${m} ${ampm}`;
}

function formatConfirmed(iso: string): string {
  const d = new Date(iso);
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const months = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  return `${weekdays[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()} · ${h % 12 || 12}:${m} ${ampm}`;
}

// Groups a sorted slot array into [[dayLabel, [slots]], ...] preserving order.
function groupByDay(slots: InterviewSlot[]): [string, InterviewSlot[]][] {
  const order: string[] = [];
  const map: Record<string, InterviewSlot[]> = {};
  for (const slot of slots) {
    const key = formatDayHeader(slot.datetime);
    if (!map[key]) { map[key] = []; order.push(key); }
    map[key].push(slot);
  }
  return order.map(k => [k, map[k]]);
}

// ── Page states ───────────────────────────────────────────────────────────────

type PageState = "loading" | "invalid" | "expired" | "already_booked" | "enter_info" | "choose_slot" | "confirmed" | "error";

// ── Main component ────────────────────────────────────────────────────────────

export default function BookPage() {
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const [state, setState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InterviewInvite | null>(null);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<InterviewSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<InterviewSlot | null>(null);

  // Name + email collected from visitor (multi-use links).
  const [bookerName, setBookerName]   = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [infoError, setInfoError]     = useState("");

  // ── Load invite + slots via API ───────────────────────────────────────────

  useEffect(() => {
    if (!token || !isValidToken(token)) { setState("invalid"); return; }

    (async () => {
      try {
        const res = await fetch(`/api/booking/${token}`);
        const data = await res.json() as {
          error?: string;
          invite?: InterviewInvite;
          slots?: InterviewSlot[];
        };

        if (!res.ok) {
          if (data.error === "not_found")      { setState("invalid"); return; }
          if (data.error === "expired")        { setState("expired"); return; }
          if (data.error === "already_booked") { setInvite(data.invite ?? null); setState("already_booked"); return; }
          setState("error"); return;
        }

        const inv = data.invite!;
        setInvite(inv);
        setSlots(data.slots ?? []);
        setState(inv.multiUse ? "enter_info" : "choose_slot");
      } catch (err) {
        console.error("Booking page load error:", err);
        setState("error");
      }
    })();
  }, [token]);

  // ── Proceed from info form to slot selection ──────────────────────────────

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookerName.trim())  { setInfoError("Please enter your name."); return; }
    if (!bookerEmail.trim()) { setInfoError("Please enter your email."); return; }
    setInfoError("");
    setState("choose_slot");
  };

  // ── Book the selected slot via API ────────────────────────────────────────

  const handleBook = async () => {
    if (!selectedSlot || !invite) return;
    setSubmitting(true);
    try {
      const name  = invite.multiUse ? bookerName.trim()  : (invite.applicantName  ?? "");
      const email = invite.multiUse ? bookerEmail.trim() : (invite.applicantEmail ?? "");

      const res = await fetch(`/api/booking/${token}`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slotId: selectedSlot.id, bookerName: name, bookerEmail: email }),
      });

      if (!res.ok) { setState("error"); return; }

      setConfirmedSlot(selectedSlot);
      setState("confirmed");
    } catch (err) {
      console.error("Booking slot error:", err);
      setState("error");
    } finally {
      setSubmitting(false);
    }
  };

  const displayName  = invite?.multiUse ? bookerName  : (invite?.applicantName  ?? "");
  const displayEmail = invite?.multiUse ? bookerEmail : (invite?.applicantEmail ?? "");

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0F1014] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#85CC17] flex items-center justify-center">
              <span className="text-[#0D0D0D] font-bold text-sm">V</span>
            </div>
            <span className="text-white font-bold text-lg tracking-tight">VOLTA NYC</span>
          </div>
          <p className="text-white/40 text-sm font-body">Interview Scheduling</p>
        </div>

        {/* Loading */}
        {state === "loading" && (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl p-8 text-center">
            <div className="w-8 h-8 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/40 text-sm font-body">Loading…</p>
          </div>
        )}

        {/* Invalid / expired */}
        {(state === "invalid" || state === "expired") && (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-white font-bold text-lg">
              {state === "expired" ? "This link has expired" : "Invalid link"}
            </h2>
            <p className="text-white/40 text-sm font-body">
              {state === "expired"
                ? "This scheduling link has expired or been cancelled. Please contact Volta NYC for a new link."
                : "This booking link is not valid. Please check the URL or contact Volta NYC."}
            </p>
          </div>
        )}

        {/* Already booked */}
        {state === "already_booked" && invite && (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-500/15 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-white font-bold text-lg">Already scheduled</h2>
            <p className="text-white/40 text-sm font-body">
              {invite.applicantName ? `Hi ${invite.applicantName}, your` : "Your"} interview is already scheduled.
              Please check your email or contact Volta NYC if you need to reschedule.
            </p>
          </div>
        )}

        {/* Error */}
        {state === "error" && (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/15 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h2 className="text-white font-bold text-lg">Something went wrong</h2>
            <p className="text-white/40 text-sm font-body">Please try refreshing the page or contact Volta NYC.</p>
          </div>
        )}

        {/* Multi-use: collect name + email */}
        {state === "enter_info" && invite && (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/8">
              <h2 className="text-white font-bold text-xl">Schedule an Interview</h2>
              <p className="text-white/50 text-sm mt-1 font-body">
                {invite.role ? `Role: ${invite.role}` : "Select a time that works for you."}
              </p>
            </div>
            <form onSubmit={handleInfoSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Your Name
                </label>
                <input
                  required
                  value={bookerName}
                  onChange={e => setBookerName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                  Your Email
                </label>
                <input
                  required
                  type="email"
                  value={bookerEmail}
                  onChange={e => setBookerEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
                />
              </div>
              {infoError && <p className="text-red-400 text-xs">{infoError}</p>}
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#85CC17] text-[#0D0D0D] font-display font-bold text-sm hover:bg-[#72b314] transition-colors"
              >
                See Available Times →
              </button>
            </form>
          </div>
        )}

        {/* Choose a slot — calendar grouped by day */}
        {state === "choose_slot" && invite && (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-white/8">
              <h2 className="text-white font-bold text-xl">
                {invite.multiUse ? `Hi, ${bookerName}!` : `Hi${invite.applicantName ? `, ${invite.applicantName}` : ""}!`}
              </h2>
              <p className="text-white/50 text-sm mt-1 font-body">
                {invite.role ? `${invite.role} · ` : ""}Pick a time that works for you.
              </p>
            </div>

            <div className="px-6 py-5 max-h-[55vh] overflow-y-auto">
              {slots.length === 0 ? (
                <div className="text-center py-6 space-y-2">
                  <p className="text-white/40 text-sm font-body">No available times right now.</p>
                  <p className="text-white/25 text-xs font-body">Please contact Volta NYC to arrange a time.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {groupByDay(slots).map(([day, daySlots]) => (
                    <div key={day}>
                      <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">{day}</p>
                      <div className="flex flex-wrap gap-2">
                        {daySlots.map(slot => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(selectedSlot?.id === slot.id ? null : slot)}
                            className={`px-3.5 py-2 rounded-lg border text-sm font-body transition-all flex items-center gap-1.5
                              ${selectedSlot?.id === slot.id
                                ? "bg-[#85CC17]/15 border-[#85CC17]/60 text-white"
                                : "bg-white/4 border-white/10 text-white/70 hover:bg-white/8 hover:border-white/20"
                              }`}
                          >
                            {selectedSlot?.id === slot.id && (
                              <svg className="w-3 h-3 text-[#85CC17] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                            <span>{formatTime(slot.datetime)}</span>
                            <span className="text-xs text-white/30">{slot.durationMinutes}m</span>
                          </button>
                        ))}
                      </div>
                      {daySlots[0]?.location && (
                        <p className="text-white/25 text-xs mt-1.5">{daySlots[0].location}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {slots.length > 0 && (
              <div className="px-6 pb-6 pt-2 border-t border-white/8 mt-2">
                <button
                  onClick={handleBook}
                  disabled={!selectedSlot || submitting}
                  className={`w-full py-3 rounded-xl font-display font-bold text-sm transition-all
                    ${selectedSlot && !submitting
                      ? "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"
                      : "bg-white/8 text-white/25 cursor-not-allowed"
                    }`}
                >
                  {submitting ? "Booking…" : selectedSlot ? `Confirm ${formatTime(selectedSlot.datetime)}` : "Select a time above"}
                </button>
                {displayEmail && (
                  <p className="text-white/25 text-xs text-center mt-2 font-body">
                    Confirmation will be sent to {displayEmail}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Confirmed */}
        {state === "confirmed" && confirmedSlot && (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-6 pt-8 pb-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-[#85CC17]/15 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-[#85CC17]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-xl">You&apos;re booked!</h2>
                <p className="text-white/50 text-sm mt-1 font-body">See you soon{displayName ? `, ${displayName}` : ""}.</p>
              </div>
            </div>

            <div className="mx-6 mb-6 bg-[#0F1014] border border-white/10 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2.5 text-sm">
                <svg className="w-4 h-4 text-white/40 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span className="text-white">{formatConfirmed(confirmedSlot.datetime)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <svg className="w-4 h-4 text-white/40 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                <span className="text-white/70">{confirmedSlot.durationMinutes} minutes</span>
              </div>
              {confirmedSlot.location && (
                <div className="flex items-center gap-2.5 text-sm">
                  <svg className="w-4 h-4 text-white/40 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                  <span className="text-white/70">{confirmedSlot.location}</span>
                </div>
              )}
              {displayEmail && (
                <div className="flex items-center gap-2.5 text-sm">
                  <svg className="w-4 h-4 text-white/40 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                  <span className="text-white/70">Confirmation sent to {displayEmail}</span>
                </div>
              )}
            </div>

            <div className="px-6 pb-6">
              <p className="text-white/25 text-xs text-center font-body">
                Need to reschedule? Contact us at <span className="text-white/40">info@voltanyc.org</span>
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
