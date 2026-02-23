"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { isValidToken } from "@/lib/interviews";
import type { InterviewInvite, InterviewSlot } from "@/lib/members/storage";

// ── ICS download ──────────────────────────────────────────────────────────────

function downloadICS(slot: InterviewSlot, zoomLink: string) {
  const start = new Date(slot.datetime);
  const end   = new Date(start.getTime() + (slot.durationMinutes ?? 30) * 60000);
  const fmt   = (d: Date) => d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Volta NYC//Interview//EN",
    "BEGIN:VEVENT",
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    "SUMMARY:Interview — Volta NYC",
  ];

  const descParts: string[] = [];
  if (zoomLink) descParts.push(`Join Zoom: ${zoomLink}`);
  descParts.push("Organized by Volta NYC");
  lines.push(`DESCRIPTION:${descParts.join("\\n")}`);
  if (slot.location) lines.push(`LOCATION:${slot.location}`);
  if (zoomLink)      lines.push(`URL:${zoomLink}`);
  lines.push(
    `DTSTAMP:${fmt(new Date())}`,
    `UID:volta-${slot.id}@voltanyc.org`,
    "END:VEVENT",
    "END:VCALENDAR",
  );

  const blob = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "volta-nyc-interview.ics";
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ── Format helpers ────────────────────────────────────────────────────────────

function formatDayTab(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function formatTime(isoDatetime: string): string {
  const d = new Date(isoDatetime);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

function formatConfirmed(iso: string): string {
  const d    = new Date(iso);
  const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
  const mos  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const h    = d.getHours();
  const m    = String(d.getMinutes()).padStart(2, "0");
  return `${days[d.getDay()]}, ${mos[d.getMonth()]} ${d.getDate()} · ${h % 12 || 12}:${m} ${h >= 12 ? "PM" : "AM"}`;
}

// ── Page states ───────────────────────────────────────────────────────────────

type PageState = "loading" | "invalid" | "expired" | "already_booked" | "enter_info" | "choose_slot" | "confirmed" | "error";

// ── Main component ────────────────────────────────────────────────────────────

export default function BookPage() {
  const params = useParams();
  const token  = typeof params.token === "string" ? params.token : "";

  const [state, setState]                 = useState<PageState>("loading");
  const [invite, setInvite]               = useState<InterviewInvite | null>(null);
  const [slots, setSlots]                 = useState<InterviewSlot[]>([]);
  const [zoomLink, setZoomLink]           = useState("");
  const [submitting, setSubmitting]       = useState(false);
  const [confirmedSlot, setConfirmedSlot] = useState<InterviewSlot | null>(null);
  const [copied, setCopied]               = useState(false);

  // Slot selection
  const [selectedDate, setSelectedDate] = useState("");  // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState("");  // full ISO datetime

  // Multi-use invite info
  const [bookerName, setBookerName]   = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [infoError, setInfoError]     = useState("");

  // ── Derived slot data ───────────────────────────────────────────────────────

  const dateSlotMap = useMemo(() => {
    const map: Record<string, InterviewSlot[]> = {};
    for (const s of slots) {
      const day = s.datetime.slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(s);
    }
    return map;
  }, [slots]);

  const sortedDates  = useMemo(() => Object.keys(dateSlotMap).sort(), [dateSlotMap]);
  const timesForDate = dateSlotMap[selectedDate] ?? [];
  const selectedSlot = timesForDate.find(s => s.datetime === selectedTime) ?? null;

  // ── Load invite + slots ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!token || !isValidToken(token)) { setState("invalid"); return; }

    (async () => {
      try {
        const res  = await fetch(`/api/booking/${token}`);
        const data = await res.json() as {
          error?: string;
          invite?: InterviewInvite;
          slots?: InterviewSlot[];
          zoomLink?: string;
        };

        if (!res.ok) {
          if (data.error === "not_found")      { setState("invalid"); return; }
          if (data.error === "expired")        { setState("expired"); return; }
          if (data.error === "already_booked") { setInvite(data.invite ?? null); setState("already_booked"); return; }
          setState("error"); return;
        }

        const inv    = data.invite!;
        const loaded = data.slots ?? [];
        setInvite(inv);
        setSlots(loaded);
        setZoomLink(data.zoomLink ?? "");

        if (loaded.length > 0) {
          const firstDay = loaded[0].datetime.slice(0, 10);
          setSelectedDate(firstDay);
          setSelectedTime(loaded[0].datetime);
        }

        setState(inv.multiUse ? "enter_info" : "choose_slot");
      } catch (err) {
        console.error("Booking page load error:", err);
        setState("error");
      }
    })();
  }, [token]);

  // ── Info form → slot picker ─────────────────────────────────────────────────

  const handleInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookerName.trim())  { setInfoError("Please enter your name."); return; }
    if (!bookerEmail.trim()) { setInfoError("Please enter your email."); return; }
    setInfoError("");
    setState("choose_slot");
  };

  // ── Book selected slot ──────────────────────────────────────────────────────

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

  const handleCopyZoom = async () => {
    try {
      await navigator.clipboard.writeText(zoomLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: do nothing */ }
  };

  const displayName = invite?.multiUse ? bookerName : (invite?.applicantName ?? "");

  // ── Render ──────────────────────────────────────────────────────────────────

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
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Your Name</label>
                <input
                  required value={bookerName}
                  onChange={e => setBookerName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Your Email</label>
                <input
                  required type="email" value={bookerEmail}
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

        {/* Choose a slot */}
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

            {slots.length === 0 ? (
              <div className="text-center py-10 px-6 space-y-2">
                <p className="text-white/40 text-sm font-body">No available times right now.</p>
                <p className="text-white/25 text-xs font-body">Please contact Volta NYC to arrange a time.</p>
              </div>
            ) : (
              <div className="px-6 py-5 space-y-5">

                {/* Day list */}
                <div className="space-y-2">
                  {sortedDates.map(date => (
                    <div key={date}>
                      {/* Day header button */}
                      <button
                        onClick={() => {
                          setSelectedDate(date);
                          const first = dateSlotMap[date]?.[0];
                          if (first) setSelectedTime(first.datetime);
                        }}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all
                          ${selectedDate === date
                            ? "bg-[#85CC17]/10 border-[#85CC17]/30 text-white"
                            : "bg-white/3 border-white/8 text-white/60 hover:bg-white/6 hover:text-white/80"
                          }`}
                      >
                        <span className="text-sm font-semibold font-body">{formatDayTab(date)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-white/30 font-body">
                            {dateSlotMap[date].length} slot{dateSlotMap[date].length !== 1 ? "s" : ""}
                          </span>
                          <svg
                            className={`w-4 h-4 transition-transform ${selectedDate === date ? "rotate-180 text-[#85CC17]" : "text-white/20"}`}
                            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9"/>
                          </svg>
                        </div>
                      </button>

                      {/* Time dropdown — shown when day is selected */}
                      {selectedDate === date && (
                        <div className="mt-2 px-1">
                          <select
                            value={selectedTime}
                            onChange={e => setSelectedTime(e.target.value)}
                            className="w-full bg-[#0F1014] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#85CC17]/40 transition-colors appearance-none cursor-pointer"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23ffffff40' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 14px center" }}
                          >
                            {timesForDate.map(slot => (
                              <option key={slot.id} value={slot.datetime}>
                                {formatTime(slot.datetime)}{slot.durationMinutes ? ` · ${slot.durationMinutes} min` : ""}
                                {slot.location ? ` · ${slot.location}` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Confirm button */}
                <button
                  onClick={handleBook}
                  disabled={!selectedSlot || submitting}
                  className={`w-full py-3 rounded-xl font-display font-bold text-sm transition-all
                    ${selectedSlot && !submitting
                      ? "bg-[#85CC17] text-[#0D0D0D] hover:bg-[#72b314]"
                      : "bg-white/8 text-white/25 cursor-not-allowed"
                    }`}
                >
                  {submitting
                    ? "Booking…"
                    : selectedSlot
                      ? `Confirm · ${formatDayTab(selectedDate)}, ${formatTime(selectedSlot.datetime)}`
                      : "Select a time above"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Confirmed */}
        {state === "confirmed" && confirmedSlot && (
          <div className="bg-[#1C1F26] border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-6 pt-8 pb-5 text-center space-y-3">
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

            {/* Details */}
            <div className="mx-6 mb-5 bg-[#0F1014] border border-white/10 rounded-xl p-4 space-y-2.5">
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
            </div>

            {/* Action buttons */}
            <div className="px-6 pb-5 space-y-2.5">
              <button
                onClick={() => downloadICS(confirmedSlot, zoomLink)}
                className="w-full py-3 rounded-xl bg-white/6 border border-white/10 text-white font-display font-bold text-sm hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                  <line x1="12" y1="15" x2="12" y2="19"/><line x1="10" y1="17" x2="14" y2="17"/>
                </svg>
                Add to Calendar
              </button>

              {zoomLink && (
                <button
                  onClick={handleCopyZoom}
                  className="w-full py-3 rounded-xl bg-[#2D8CFF]/12 border border-[#2D8CFF]/25 text-[#6DB8FF] font-display font-bold text-sm hover:bg-[#2D8CFF]/20 transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                      </svg>
                      Copy Zoom Link
                    </>
                  )}
                </button>
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
