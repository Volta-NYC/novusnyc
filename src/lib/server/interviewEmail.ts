import {
  createTransportForFrom,
  getDefaultFromAddress,
  getDefaultReplyToAddress,
  resolveFromWithName,
} from "@/lib/server/smtp";
import { formatInterviewInET, parseInterviewDateTime } from "@/lib/interviews/datetime";
import { renderAutomationEmail } from "@/lib/server/templateRenderer";
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

async function sendInterviewEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
  ics?: { filename: string; content: string };
}): Promise<void> {
  const configuredFrom = getDefaultFromAddress();
  if (!configuredFrom.trim()) {
    throw new Error("interview_email_from_not_configured");
  }
  const { transporter } = createTransportForFrom(configuredFrom);
  const from = resolveFromWithName(configuredFrom);
  const replyTo = getDefaultReplyToAddress(configuredFrom);

  await transporter.sendMail({
    from,
    to: input.to,
    replyTo,
    subject: input.subject,
    text: input.text,
    html: input.html,
    attachments: input.ics
      ? [
          {
            filename: input.ics.filename,
            content: input.ics.content,
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ]
      : [],
  });
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
  const timeText = formatTime(input.datetimeIso);
  const googleCalendarUrl = buildGoogleCalendarUrl(input);
  const ics = buildIcs(input);

  const rendered = await renderAutomationEmail("interview_confirmation", {
    applicantName:    input.bookerName || "there",
    interviewTime:    timeText,
    zoomLink:         input.zoomLink || "will be provided separately",
    googleCalendarUrl,
  });

  const subject = rendered?.subject ?? "Novus interview confirmation";
  const html    = rendered?.html    ?? `
      <p>Hi ${input.bookerName || "there"},</p>
      <p>Your Novus interview is confirmed.</p>
      <p>
        <strong>Time:</strong> ${timeText}<br/>
        <strong>Zoom:</strong> ${input.zoomLink ? `<a href="${input.zoomLink}">${input.zoomLink}</a>` : "will be provided separately"}
      </p>
      <p>
        <a href="${googleCalendarUrl}">Add to Google Calendar</a><br/>
        A calendar invite (<code>.ics</code>) is attached to this email.
      </p>
      <p>If you need to reschedule, reply to this email and we&apos;ll sort it out.<br/><br/>We look forward to speaking with you.</p>
      <p>Best,<br/>Ethan Zhang</p>
    `;

  await sendInterviewEmail({
    to: input.to,
    subject,
    text: [
      `Hi ${input.bookerName || "there"},`,
      "",
      "Your Novus interview is confirmed.",
      `Time: ${timeText}`,
      input.zoomLink ? `Zoom: ${input.zoomLink}` : "Zoom: (will be provided separately)",
      "",
      `Add to Google Calendar: ${googleCalendarUrl}`,
      "A calendar invite (.ics) is attached to this email.",
      "",
      "If you need to reschedule, reply to this email and we'll sort it out.",
      "",
      "We look forward to speaking with you.",
      "",
      "Best,",
      "Ethan Zhang",
    ].join("\n"),
    html,
    ics: {
      filename: "novus-nyc-interview.ics",
      content: ics,
    },
  });
}

export async function sendInterviewRescheduledEmail(input: BookingEmailInput & {
  previousDatetimeIso: string;
}): Promise<void> {
  const newTimeText = formatTime(input.datetimeIso);
  const oldTimeText = formatTime(input.previousDatetimeIso);
  const googleCalendarUrl = buildGoogleCalendarUrl(input);
  const ics = buildIcs(input);

  const rendered = await renderAutomationEmail("interview_rescheduled", {
    applicantName: input.bookerName || "there",
    previousTime:  oldTimeText,
    interviewTime: newTimeText,
    zoomLink:      input.zoomLink || "will be provided separately",
    googleCalendarUrl,
  });

  const subject = rendered?.subject ?? "Novus interview rescheduled";
  const html    = rendered?.html    ?? `
      <p>Hi ${input.bookerName || "there"},</p>
      <p>Your <strong>Novus interview</strong> has been rescheduled.</p>
      <p>
        <strong>Previous time:</strong> ${oldTimeText}<br/>
        <strong>New time:</strong> ${newTimeText}<br/>
        <strong>Zoom:</strong> ${input.zoomLink ? `<a href="${input.zoomLink}">${input.zoomLink}</a>` : "will be provided separately"}
      </p>
      <p>
        <a href="${googleCalendarUrl}">Open in Google Calendar</a><br/>
        A fresh calendar invite (<code>.ics</code>) is attached.
      </p>
      <p>If you need to reschedule again, reply to this email and we&apos;ll sort it out.<br/><br/>We look forward to speaking with you.</p>
      <p>Best,<br/>Ethan Zhang</p>
    `;

  await sendInterviewEmail({
    to: input.to,
    subject,
    text: [
      `Hi ${input.bookerName || "there"},`,
      "",
      "Your Novus interview has been rescheduled.",
      `Previous time: ${oldTimeText}`,
      `New time: ${newTimeText}`,
      input.zoomLink ? `Zoom: ${input.zoomLink}` : "Zoom: (will be provided separately)",
      "",
      `Google Calendar: ${googleCalendarUrl}`,
      "A fresh calendar invite (.ics) is attached.",
      "",
      "If you need to reschedule again, reply to this email and we'll sort it out.",
      "",
      "We look forward to speaking with you.",
      "",
      "Best,",
      "Ethan Zhang",
    ].join("\n"),
    html,
    ics: {
      filename: "novus-nyc-interview-rescheduled.ics",
      content: ics,
    },
  });
}

export async function sendInterviewStaffNotificationEmail(input: BookingEmailInput & {
  interviewerName: string;
  previousDatetimeIso?: string;
}): Promise<void> {
  const timeText = formatTime(input.datetimeIso);
  const previousTimeText = input.previousDatetimeIso
    ? formatTime(input.previousDatetimeIso)
    : "";
  const isReschedule = Boolean(input.previousDatetimeIso);
  const candidate = escapeHtml(input.bookerName || "Candidate");
  const interviewer = escapeHtml(input.interviewerName || "there");
  const meetingLink = escapeHtml(input.zoomLink);
  const ics = buildIcs(input);

  await sendInterviewEmail({
    to: input.to,
    subject: isReschedule
      ? `Interview rescheduled — ${input.bookerName}`
      : `Interview scheduled — ${input.bookerName}`,
    text: [
      `Hi ${input.interviewerName || "there"},`,
      "",
      `An interview with ${input.bookerName} has ${isReschedule ? "been rescheduled" : "been assigned to you"}.`,
      ...(previousTimeText ? [`Previous time: ${previousTimeText}`] : []),
      `Time: ${timeText}`,
      input.zoomLink ? `Meeting: ${input.zoomLink}` : "Meeting link: (not set)",
      "",
      "The calendar invite is attached. Open the Interviews page in the member portal for notes and status updates.",
    ].join("\n"),
    html: `
      <p>Hi ${interviewer},</p>
      <p>An interview with <strong>${candidate}</strong> has ${isReschedule ? "been rescheduled" : "been assigned to you"}.</p>
      <p>
        ${previousTimeText ? `<strong>Previous time:</strong> ${escapeHtml(previousTimeText)}<br/>` : ""}
        <strong>Time:</strong> ${escapeHtml(timeText)}<br/>
        <strong>Meeting:</strong> ${input.zoomLink ? `<a href="${meetingLink}">${meetingLink}</a>` : "not set"}
      </p>
      <p>The calendar invite is attached. Open the Interviews page in the member portal for notes and status updates.</p>
    `,
    ics: {
      filename: "novus-nyc-interview.ics",
      content: ics,
    },
  });
}
