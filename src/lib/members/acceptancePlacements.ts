import { EMAIL } from "@/lib/mail";

/**
 * Where an accepted applicant lands, and which acceptance email that earns them.
 *
 * `ccRole` is the address the applicant sees in the CC line. It is visible on
 * purpose: each template's copy refers to whoever is copied ("reply all",
 * "I've CC'd Tahmid Islam"), so a silent BCC there would make the email lie.
 * Marketing placements copy the coordinator address from site_settings, which
 * is a personal Gmail until that person has a Novus mailbox.
 */
export type AcceptanceCcRole = "coordinator" | "tahmid";

export interface AcceptancePlacement {
  id: string;
  label: string;
  department: "Marketing" | "Tech";
  templateKey: string;
  // Same welcome, plus a link to book an interview. Sent when "Interview?" is
  // ticked on accept.
  interviewTemplateKey: string;
  ccRole: AcceptanceCcRole;
  needsWhatsapp: boolean;
}

export const ACCEPTANCE_PLACEMENTS: AcceptancePlacement[] = [
  {
    id: "outreach",
    label: "Small Business Outreach",
    department: "Marketing",
    templateKey: "acceptance_outreach",
    interviewTemplateKey: "acceptance_interview_outreach",
    ccRole: "coordinator",
    needsWhatsapp: true,
  },
  {
    id: "social",
    label: "Social Media & Branding",
    department: "Marketing",
    templateKey: "acceptance_social",
    interviewTemplateKey: "acceptance_interview_social",
    ccRole: "coordinator",
    needsWhatsapp: true,
  },
  {
    id: "grants",
    label: "Grants & Funding",
    department: "Marketing",
    templateKey: "acceptance_grants",
    interviewTemplateKey: "acceptance_interview_grants",
    ccRole: "coordinator",
    needsWhatsapp: true,
  },
  {
    id: "ambassadors",
    label: "Novus Ambassadors",
    department: "Marketing",
    templateKey: "acceptance_ambassadors",
    interviewTemplateKey: "acceptance_interview_ambassadors",
    ccRole: "coordinator",
    needsWhatsapp: true,
  },
  {
    id: "tech",
    label: "Digital & Tech",
    department: "Tech",
    templateKey: "acceptance_tech",
    interviewTemplateKey: "acceptance_interview_tech",
    ccRole: "tahmid",
    needsWhatsapp: false,
  },
];

export function findAcceptancePlacement(id: string): AcceptancePlacement | undefined {
  return ACCEPTANCE_PLACEMENTS.find((p) => p.id === id);
}

export function acceptanceCcAddress(
  placement: AcceptancePlacement,
  coordinatorEmail: string,
): string {
  return placement.ccRole === "tahmid" ? EMAIL.tahmid : coordinatorEmail.trim();
}
