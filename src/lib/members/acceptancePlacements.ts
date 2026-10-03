import { EMAIL } from "@/lib/mail";
import type { MarketingSubtrack } from "@/data";

/**
 * Where an accepted applicant lands, and which acceptance email that earns them.
 *
 * Everyone accepted is copied on the addresses in the "CC on acceptances"
 * setting. The copy is visible on purpose: the templates ask people to "reply
 * all" and the Tech one says it copied Tahmid, so a silent BCC would make the
 * email lie.
 */

export interface AcceptancePlacement {
  id: string;
  label: string;
  department: "Marketing" | "Tech";
  templateKey: string;
  // Same welcome, plus a link to book an interview. Sent when "Interview?" is
  // ticked on accept.
  interviewTemplateKey: string;
  needsWhatsapp: boolean;
  // What gets recorded on the application when someone is accepted here.
  subtrack: MarketingSubtrack | null;
}

export const ACCEPTANCE_PLACEMENTS: AcceptancePlacement[] = [
  {
    id: "outreach",
    label: "Small Business Outreach",
    department: "Marketing",
    templateKey: "acceptance_outreach",
    interviewTemplateKey: "acceptance_interview_outreach",
    needsWhatsapp: true,
    subtrack: "Small Business Outreach",
  },
  {
    id: "social",
    label: "Social Media & Branding",
    department: "Marketing",
    templateKey: "acceptance_social",
    interviewTemplateKey: "acceptance_interview_social",
    needsWhatsapp: true,
    subtrack: "Novus Social Media & Branding",
  },
  {
    id: "grants",
    label: "Grants & Funding",
    department: "Marketing",
    templateKey: "acceptance_grants",
    interviewTemplateKey: "acceptance_interview_grants",
    needsWhatsapp: true,
    subtrack: "Grants & Funding",
  },
  {
    id: "ambassadors",
    label: "Novus Ambassadors",
    department: "Marketing",
    templateKey: "acceptance_ambassadors",
    interviewTemplateKey: "acceptance_interview_ambassadors",
    needsWhatsapp: true,
    subtrack: "Novus Ambassadors",
  },
  {
    id: "tech",
    label: "Digital & Tech",
    department: "Tech",
    templateKey: "acceptance_tech",
    interviewTemplateKey: "acceptance_interview_tech",
    needsWhatsapp: false,
    subtrack: null,
  },
];

export function findAcceptancePlacement(id: string): AcceptancePlacement | undefined {
  return ACCEPTANCE_PLACEMENTS.find((p) => p.id === id);
}

export function acceptanceCcAddress(placement: AcceptancePlacement, marketingCc: string): string {
  // Tech copies Tahmid directly; the Marketing teams copy whoever the "CC on
  // marketing acceptances" setting names. The shared inbox is always copied too,
  // so all three owners see every acceptance without being listed one by one.
  const named = placement.department === "Tech" ? EMAIL.tahmid : marketingCc.trim();
  const alreadyCopiesInbox = named.toLowerCase().includes(EMAIL.info);
  return [named, alreadyCopiesInbox ? "" : EMAIL.info].filter(Boolean).join(", ");
}
