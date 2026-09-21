import { createTransportForFrom, getDefaultFromAddress } from "@/lib/server/smtp";
import { formatInterviewInET, parseInterviewDateTime } from "@/lib/interviews/datetime";
import { renderEmail, type RenderedEmail } from "@/lib/server/templateRenderer";
import { EMAIL } from "@/lib/mail";

type BookingEmailInput = {
  to: string;
  bookerName: string;
  slotId: string;
  datetimeIso: string;
  durationMinutes: number;
  zoomLink: string;
  location?: string;
  organizerName?: string;
  organizerEmail?: string;
};

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function sanitizeEmailAddress(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).trim();
}

function getInterviewInstant(datetimeIso: string): Date {
  const parsed = parseInterviewDateTime(datetimeIso);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildIcs(input: BookingEmailInput): string {
  const start = getInterviewInstant(input.datetimeIso);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);
  const descParts: string[] = [];
  descParts.push(`Candidate: ${input.bookerName}`);
  if (input.zoomLink) descParts.push(`Join Zoom: ${input.zoomLink}`);
  const organizerName = (input.organizerName || "Novus NYC").trim();
  const organizerEmail = sanitizeEmailAddress(input.organizerEmail || getDefaultFromAddress() || "");
  descParts.push(`Interviewer: ${organizerName}`);
  descParts.push("Organized by Novus NYC");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Novus NYC//Interview Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:novus-${input.slotId}@novusnyc.org`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(start)}`,
    `DTEND:${utcStamp(end)}`,
    `SUMMARY:${escapeIcs("Novus interview")}`,
    `DESCRIPTION:${escapeIcs(descParts.join("\n"))}`,
    organizerEmail
      ? `ORGANIZER;CN=${escapeIcs(organizerName)}:mailto:${escapeIcs(organizerEmail)}`
      : `ORGANIZER;CN=${escapeIcs(organizerName)}:mailto:${EMAIL.ethan}`,
    input.location ? `LOCATION:${escapeIcs(input.location)}` : "",
    input.zoomLink ? `URL:${escapeIcs(input.zoomLink)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT30M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs("Novus interview starts in 30 minutes.")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);

  return `${lines.join("\r\n")}\r\n`;
}

function buildGoogleCalendarUrl(input: BookingEmailInput): string {
  const start = getInterviewInstant(input.datetimeIso);
  const end = new Date(start.getTime() + input.durationMinutes * 60_000);
  const dates = `${utcStamp(start)}/${utcStamp(end)}`;
  const details = input.zoomLink
    ? `Join Zoom: ${input.zoomLink}\n\nOrganized by Novus NYC`
    : "Organized by Novus NYC";
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: "Novus interview",
    dates,
    details,
    location: input.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

async function sendInterviewEmail(to: string, email: RenderedEmail, ics: { filename: string; content: string }): Promise<void> {
  const { transporter } = createTransportForFrom(getDefaultFromAddress());
  await transporter.sendMail({
    to,
    ...email,
    attachments: [{ filename: ics.filename, content: ics.content, contentType: "text/calendar; charset=utf-8; method=REQUEST" }],
  });
}

// Interview mail renders from its template like every other email. A template
// switched off in the portal is a deliberate choice, so that is a quiet skip;
// one that is missing is a fault, so it throws and the caller reports the send
// as failed rather than the booking silently going unconfirmed.
async function renderInterviewEmail(key: string, variables: Record<string, string>): Promise<RenderedEmail | null> {
  const rendered = await renderEmail(key, variables);
  if (rendered.ok) return rendered.email;
  if (rendered.reason === "off") return null;
  throw new Error(`email_not_set_up:${key}`);
}

function formatTime(datetimeIso: string): string {
  return formatInterviewInET(datetimeIso, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export async function sendInterviewBookingEmail(input: BookingEmailInput): Promise<void> {
  const email = await renderInterviewEmail("interview_confirmation", {
    applicantName: input.bookerName || "there",
    interviewTime: formatTime(input.datetimeIso),
    zoomLink: input.zoomLink,
    zoomDetails: input.zoomLink || "will be provided separately",
    googleCalendarUrl: buildGoogleCalendarUrl(input),
  });
  if (!email) return;
  await sendInterviewEmail(input.to, email, { filename: "novus-nyc-interview.ics", content: buildIcs(input) });
}

export async function sendInterviewRescheduledEmail(input: BookingEmailInput & {
  previousDatetimeIso: string;
}): Promise<void> {
  const email = await renderInterviewEmail("interview_rescheduled", {
    applicantName: input.bookerName || "there",
    previousTime: formatTime(input.previousDatetimeIso),
    interviewTime: formatTime(input.datetimeIso),
    zoomLink: input.zoomLink,
    zoomDetails: input.zoomLink || "will be provided separately",
    googleCalendarUrl: buildGoogleCalendarUrl(input),
  });
  if (!email) return;
  await sendInterviewEmail(input.to, email, { filename: "novus-nyc-interview-rescheduled.ics", content: buildIcs(input) });
}

export async function sendInterviewStaffNotificationEmail(input: BookingEmailInput & {
  interviewerName: string;
  previousDatetimeIso?: string;
}): Promise<void> {
  const email = await renderInterviewEmail(
    input.previousDatetimeIso ? "interview_staff_rescheduled" : "interview_staff_scheduled",
    {
      interviewerName: input.interviewerName || "there",
      candidateName: input.bookerName || "a candidate",
      interviewTime: formatTime(input.datetimeIso),
      previousTime: input.previousDatetimeIso ? formatTime(input.previousDatetimeIso) : "",
      zoomLink: input.zoomLink,
      zoomDetails: input.zoomLink || "not set",
    },
  );
  if (!email) return;
  await sendInterviewEmail(input.to, email, { filename: "novus-nyc-interview.ics", content: buildIcs(input) });
}
