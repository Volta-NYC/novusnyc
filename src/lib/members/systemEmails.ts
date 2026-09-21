import { ACCEPTANCE_PLACEMENTS } from "@/lib/members/acceptancePlacements";

/**
 * Every email the portal's code sends, keyed by its email_templates row.
 *
 * The wording lives only in that row; this list holds what the code decides and
 * the Emails page cannot learn from the database: when the email goes out, which
 * {{variables}} the code fills in, how it is switched off, and what stops
 * working if the row is deleted. A row missing from the database still shows on
 * the Emails page, as not set up, because the code still tries to send it.
 *
 * Adding a send path means adding its entry here, or the page will not know it
 * exists.
 */

// automation: the switch is the automation_configs row named here.
// template:   the switch is the template's own active flag.
// none:       always sent; turning these off would lock people out.
export type EmailSwitch = "automation" | "template" | "none";

export type EmailGroup = "Acceptances" | "Accounts" | "Interviews" | "Members and projects";

export const EMAIL_GROUPS: EmailGroup[] = ["Acceptances", "Accounts", "Interviews", "Members and projects"];

export interface SystemEmail {
  key: string;
  name: string;
  group: EmailGroup;
  trigger: string;
  variables: string[];
  switchType: EmailSwitch;
  automationId?: string;
  // Finishes "Deleting this means …" in the delete confirmation.
  stops: string;
}

const placementEmails: SystemEmail[] = ACCEPTANCE_PLACEMENTS.flatMap((p) => {
  const variables = ["firstName", "applicantName", "portalLink", ...(p.needsWhatsapp ? ["whatsappLink"] : [])];
  return [
    {
      key: p.templateKey,
      name: `Acceptance — ${p.label}`,
      group: "Acceptances" as const,
      trigger: `When you accept an applicant into ${p.label}`,
      variables,
      switchType: "template" as const,
      stops: `accepting someone into ${p.label} sends no welcome email`,
    },
    {
      key: p.interviewTemplateKey,
      name: `Acceptance + interview — ${p.label}`,
      group: "Acceptances" as const,
      trigger: `When you accept an applicant into ${p.label} with Interview? ticked`,
      variables: [...variables, "bookingLink"],
      switchType: "template" as const,
      stops: `accepting someone into ${p.label} with Interview? ticked sends no email`,
    },
  ];
});

export const SYSTEM_EMAILS: SystemEmail[] = [
  ...placementEmails,
  {
    key: "applicant_accepted",
    name: "Acceptance — no team",
    group: "Acceptances",
    trigger: "When you accept an applicant without choosing a team, or accept several at once",
    variables: ["firstName", "applicantName", "link"],
    switchType: "automation",
    automationId: "applicant_accepted",
    stops: "accepting without a team, or several at once, sends no email",
  },
  {
    key: "setup-link",
    name: "Account setup link",
    group: "Accounts",
    trigger: "When a newly accepted member asks for the link that creates their portal account. The welcome email sends them to a page that requests it.",
    variables: ["firstName", "name", "link", "signupUrl"],
    switchType: "none",
    stops: "newly accepted members cannot create their accounts",
  },
  {
    key: "password-reset",
    name: "Password reset",
    group: "Accounts",
    trigger: "When a member asks to reset their password",
    variables: ["firstName", "name", "link"],
    switchType: "none",
    stops: "members cannot reset their passwords",
  },
  {
    key: "invite",
    name: "Member invite",
    group: "Accounts",
    trigger: "When you invite someone to the portal from the Members page",
    variables: ["firstName", "name", "link"],
    switchType: "none",
    stops: "invites from the Members page do not send",
  },
  {
    key: "interview_confirmation",
    name: "Interview booked",
    group: "Interviews",
    trigger: "To the applicant, when they book an interview slot in the portal",
    variables: ["applicantName", "interviewTime", "zoomLink", "zoomDetails", "googleCalendarUrl"],
    switchType: "template",
    stops: "applicants who book a portal interview get no confirmation",
  },
  {
    key: "interview_rescheduled",
    name: "Interview moved",
    group: "Interviews",
    trigger: "To the applicant, when their portal interview is moved",
    variables: ["applicantName", "previousTime", "interviewTime", "zoomLink", "zoomDetails", "googleCalendarUrl"],
    switchType: "template",
    stops: "applicants are not told when their interview moves",
  },
  {
    key: "interview_staff_scheduled",
    name: "Interview assigned (interviewer)",
    group: "Interviews",
    trigger: "To the interviewer, when a portal interview is assigned to them",
    variables: ["interviewerName", "candidateName", "interviewTime", "zoomLink", "zoomDetails"],
    switchType: "template",
    stops: "interviewers are not told about interviews assigned to them",
  },
  {
    key: "interview_staff_rescheduled",
    name: "Interview moved (interviewer)",
    group: "Interviews",
    trigger: "To the interviewer, when their portal interview is moved",
    variables: ["interviewerName", "candidateName", "previousTime", "interviewTime", "zoomLink", "zoomDetails"],
    switchType: "template",
    stops: "interviewers are not told when their interview moves",
  },
  {
    key: "infraction_issued",
    name: "Infraction recorded",
    group: "Members and projects",
    trigger: "To a member, when an infraction is recorded on them",
    variables: ["memberName", "infractionName", "points", "notePart", "totalPoints", "standing", "portalLink"],
    switchType: "automation",
    automationId: "infraction_issued",
    stops: "members are not told about infractions",
  },
  {
    key: "service_hours_summary",
    name: "Service hours summary",
    group: "Members and projects",
    trigger: "Each January and July, to every active member with certified hours",
    variables: ["memberName", "period", "totalHours", "workSummary", "portalLink"],
    switchType: "automation",
    automationId: "service_hours_summary",
    stops: "the January and July hours summaries do not send",
  },
  {
    key: "project_draft_ready",
    name: "Draft ready for review",
    group: "Members and projects",
    trigger: "To tech leads, when a project moves to Draft Ready",
    variables: ["leadName", "businessName", "assigneeNames", "previewUrl", "portalLink"],
    switchType: "automation",
    automationId: "project_draft_ready",
    stops: "tech leads are not told when a draft is ready",
  },
];

export function findSystemEmail(key: string): SystemEmail | undefined {
  return SYSTEM_EMAILS.find((email) => email.key === key);
}
