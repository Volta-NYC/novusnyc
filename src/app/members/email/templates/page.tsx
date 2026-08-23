"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { EMAIL_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Empty, useConfirm, Spinner,
} from "@/components/members/ui";
import EmailBodyEditor, { type EmailBodyEditorHandle } from "@/components/members/EmailBodyEditor";
import {
  subscribeEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplate,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── Preview pane ──────────────────────────────────────────────────────────────

function TemplatePreview({
  subject,
  body,
  variables,
  sampleData,
  onSampleChange,
}: {
  subject: string;
  body: string;
  variables: string[];
  sampleData: Record<string, string>;
  onSampleChange: (name: string, value: string) => void;
}) {
  const renderedSubject = useMemo(() => substituteForPreview(subject, sampleData), [subject, sampleData]);
  const renderedBody = useMemo(() => substituteForPreview(body, sampleData), [body, sampleData]);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0F1014] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45">Preview</p>
        <p className="text-[10px] text-white/30">Sample values are local only</p>
      </div>

      {variables.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {variables.map((v) => (
            <label key={v} className="block">
              <span className="text-[10px] font-mono text-white/40">{`{{${v}}}`}</span>
              <input
                value={sampleData[v] ?? ""}
                onChange={(e) => onSampleChange(v, e.target.value)}
                className="mt-0.5 w-full bg-[#13161D] border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#F6B78D]/40"
              />
            </label>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-white/10 bg-white text-black p-4">
        <p className="text-[10px] text-black/40 mb-0.5">Subject</p>
        <p className="text-sm font-semibold mb-3">{renderedSubject || <span className="text-black/30 italic">No subject</span>}</p>
        <hr className="border-black/10 mb-3" />
        <div
          className="text-sm leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedBody }}
        />
      </div>
    </div>
  );
}

// Reasonable sample values for preview substitution. Falls back to the
// variable name itself so the preview never shows raw {{x}} placeholders.
function sampleValue(variable: string): string {
  switch (variable) {
    // People and places
    case "memberName": case "name": return "Jordan Lee";
    case "firstName": return "Jordan";
    case "applicantName": return "Sam Rivera";
    case "interviewerName": case "leadName": case "litName": return "Alex Chen";
    case "assigneeNames": return "Alex Chen, Sam Rivera";
    case "podName": return "Small Business Outreach";
    case "departments": return "Small Business Outreach, Tech";

    // Pods and tasks
    case "taskTitle": return "Draft the September outreach list";
    case "meetingTitle": return "Fortnightly check-in";
    case "meetingDate": case "dueDate": return "Tuesday, September 9";
    case "dueDatePart": return "Due Tuesday, September 9";

    // Projects
    case "businessName": return "Petite Dumpling";
    case "businessNamePart": return " for Petite Dumpling";
    case "neighborhoodPart": return " in Flushing";
    case "contactPart": return "Wei Zhang · owner@example.com · (212) 555-0142";
    case "previewUrl": return "https://petite-dumpling.vercel.app/";
    case "assignmentTitle": return "UI/UX checkup — Petite Dumpling";
    case "message": case "messageFmt": return "Client asked for the hours block to move above the menu.";

    // Standing and hours
    case "infractionName": return "Unexcused absence";
    case "points": return "2";
    case "totalPoints": return "5";
    case "standing": return "consider this a notice";
    case "notePart": return "Missed the September 9 meeting without notice.";
    case "periodLabel": return "January–June 2026";
    case "totalHours": return "18.5";
    case "breakdown": return "6 meetings · 4 tasks · 1 site shipped";

    // Interviews
    case "interviewTime": return "Tuesday, September 9 at 4:30 PM ET";
    case "previousTime": return "Monday, September 8 at 5:00 PM ET";
    case "zoomLink": case "googleCalendarUrl":
    case "link": case "portalLink": case "magicLink":
      return "https://www.novusnyc.org/members";

    default: return variable;
  }
}

function substituteForPreview(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => data[name] ?? `{{${name}}}`);
}

interface FormState {
  label: string;
  description: string;
  subject: string;
  body: string;
}

const BLANK_FORM: FormState = { label: "", description: "", subject: "", body: "" };

const TEMPLATE_LINK_DESCRIPTIONS: Record<string, string> = {
  invite:              "One-time invite link — recipient clicks to confirm their email and set up their portal account (expires in 24 hrs)",
  applicant_accepted:  "Portal access link — direct sign-in for existing accounts, or a one-time invite link for brand-new members",
  "password-reset":    "Password reset link — recipient clicks to set a new password (expires in 1 hr)",
};

const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  firstName:        "Recipient's first name",
  name:             "Recipient's full name",
  memberName:       "Member's full name",
  applicantName:    "Applicant's full name",
  interviewerName:  "Interviewer's name",
  leadName:         "Tech lead's name",
  litName:          "LIT's name",
  assigneeNames:    "Everyone assigned, comma separated",

  podName:          "Pod the work belongs to",
  taskTitle:        "Title of the task",
  meetingTitle:     "Title of the meeting",
  meetingDate:      "Date of the meeting, written out",
  dueDate:          "Due date, written out",
  dueDatePart:      "\"Due <date>\", or a note that none is set",

  businessName:     "Client business name",
  businessNamePart: "\" for <business>\", or empty when there is none",
  neighborhoodPart: "\" in <neighborhood>\", or empty when unknown",
  contactPart:      "Owner name, email and phone on one line",
  previewUrl:       "Vercel preview link for the site",
  assignmentTitle:  "Title of the assignment",
  message:          "Update text, plain",
  messageFmt:       "Update text, formatted",

  infractionName:   "Infraction type",
  points:           "Points for this infraction",
  totalPoints:      "Member's running total",
  standing:         "What that total means, in words",
  notePart:         "Note attached to the infraction, if any",

  periodLabel:      "Period the summary covers",
  totalHours:       "Hours in that period",
  breakdown:        "Meetings, tasks and sites behind the total",
  departments:      "Pods and tracks they worked in",

  interviewTime:    "Interview date and time",
  previousTime:     "Previous interview time, before rescheduling",
  zoomLink:         "Zoom join link",
  googleCalendarUrl:"Add-to-calendar link",
  link:             "Action link for this email",
  portalLink:       "Link into the member portal",
  magicLink:        "One-time sign-in link",
};


const LINK_VARIABLES = [
  {
    variable: "{{portalLink}}",
    description: "Direct link to novusnyc.org/members — static, always works for any recipient",
  },
  {
    variable: "{{magicLink}}",
    description: "One-click sign-in link, generated per-recipient by Supabase at send time — expires in 1 hour",
  },
];

export default function EmailTemplatesPage() {
  const { authRole, user, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();
  const editorRef = useRef<EmailBodyEditorHandle>(null);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);
  const [sampleData, setSampleData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeEmailTemplates(setTemplates), []);

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => {
      const aSystem = !a.key.startsWith("custom_") ? 0 : 1;
      const bSystem = !b.key.startsWith("custom_") ? 0 : 1;
      if (aSystem !== bSystem) return aSystem - bSystem;
      return (a.label || "").localeCompare(b.label || "");
    });
  }, [templates]);

  const openCreate = () => {
    setForm(BLANK_FORM);
    setEditing(null);
    setModal("create");
    setTimeout(() => editorRef.current?.setContent(""), 50);
  };

  const openEdit = (t: EmailTemplate) => {
    setForm({
      label: t.label || "",
      description: t.description || "",
      subject: t.subject || "",
      body: t.body || "",
    });
    setEditing(t);
    setModal("edit");
    const seed: Record<string, string> = {};
    for (const v of (t.availableVariables ?? [])) seed[v] = sampleValue(v);
    setSampleData(seed);
    setTimeout(() => editorRef.current?.setContent(t.body || ""), 50);
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setForm(BLANK_FORM);
    setSampleData({});
  };

  const handleSave = async () => {
    const label = form.label.trim();
    const subject = form.subject.trim();
    if (!label || !subject) return;
    if (!user) return;
    const updatedBy = user.email || user.id || "admin";

    if (modal === "edit" && editing) {
      await updateEmailTemplate(editing.id, {
        label,
        description: form.description.trim(),
        subject,
        body: form.body,
        updatedBy,
      });
    } else {
      const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await createEmailTemplate({
        key,
        label,
        description: form.description.trim(),
        subject,
        body: form.body,
        availableVariables: [],
        active: true,
        updatedBy,
      });
    }
    closeModal();
  };

  const handleDelete = async (t: EmailTemplate) => {
    const isSystem = !t.key.startsWith("custom_");
    await ask(
      async () => deleteEmailTemplate(t.id),
      `Delete template "${t.label}"?${isSystem ? " This is a system template used by automation." : ""}`,
    );
  };

  if (loading || authRole === "member") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner />
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <Dialog />
      <PageHeader
        title="Member Email"
        action={
          <Btn variant="primary" size="sm" onClick={openCreate}>+ New Template</Btn>
        }
      />
      <SectionTabs tabs={EMAIL_TABS} />

      {sortedTemplates.length === 0 ? (
        <Empty message="No email templates yet." action={<Btn variant="primary" onClick={openCreate}>Create first template</Btn>} />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#13161D] overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-[#0F1014]">
              <tr className="members-header-sep">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[220px]">Name</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45">Subject</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[90px]">Type</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[140px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedTemplates.map((t) => {
                const isSystem = !t.key.startsWith("custom_");
                return (
                  <tr key={t.id} className="hover:bg-white/4 group">
                    <td className="px-4 py-3 align-top">
                      <p className="text-white/90 font-medium truncate max-w-[200px]" title={t.label}>{t.label}</p>
                      {t.description && (
                        <p className="text-white/40 text-[10px] mt-0.5 truncate max-w-[200px]">{t.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-white/60 truncate max-w-[380px]" title={t.subject}>
                      {t.subject || <span className="text-white/25 italic">No subject</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[9px] font-semibold ${
                        isSystem
                          ? "border-white/15 bg-[#11141A] text-white/45"
                          : "border-[#F6B78D]/25 bg-[#F6B78D]/8 text-[#F6B78D]/70"
                      }`}>
                        {isSystem ? "system" : "custom"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Btn size="sm" variant="secondary" className="members-pill-btn" onClick={() => openEdit(t)}>Edit</Btn>
                        <Btn size="sm" variant="danger" className="members-pill-btn" onClick={() => void handleDelete(t)}>Delete</Btn>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modal !== null}
        onClose={closeModal}
        title={modal === "edit" ? `Edit: ${editing?.label || "Template"}` : "New Template"}
      >
        <div className="space-y-4">
          <Field label="Template name" required>
            <Input
              value={form.label}
              onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))}
              placeholder="e.g. Monthly member reminder"
            />
          </Field>
          <Field label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Short note on when to use this template"
            />
          </Field>
          <Field label="Subject" required>
            <Input
              value={form.subject}
              onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              placeholder="Email subject line — use {{variables}} for personalization"
            />
          </Field>
          <Field label="Body">
            <EmailBodyEditor
              ref={editorRef}
              content={form.body}
              onChange={(html) => setForm((p) => ({ ...p, body: html }))}
              placeholder="Write the email body… Use variables such as {{memberName}} when they are available."
            />
          </Field>

          {(editing?.availableVariables ?? []).length > 0 ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">
                  Variables — click to insert
                </p>
                <div className="space-y-1.5">
                  {(editing?.availableVariables ?? []).map((v) => {
                    const description = v === "link" && editing?.key
                      ? (TEMPLATE_LINK_DESCRIPTIONS[editing.key] ?? "Resolved link — type depends on where this template is used")
                      : (VARIABLE_DESCRIPTIONS[v] ?? "");
                    return (
                      <div key={v} className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => editorRef.current?.insertAtCursor(`{{${v}}}`)}
                          className="shrink-0 inline-flex items-center rounded-full border border-white/15 bg-[#11141A] px-2 py-1 text-[11px] font-mono text-white/75 hover:border-[#F6B78D]/45 hover:text-white transition-colors"
                        >
                          {`{{${v}}}`}
                        </button>
                        {description && (
                          <span className="text-[11px] text-white/40 font-body">{description}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <TemplatePreview
                subject={form.subject}
                body={form.body}
                variables={editing?.availableVariables ?? []}
                sampleData={sampleData}
                onSampleChange={(name, value) => setSampleData((prev) => ({ ...prev, [name]: value }))}
              />
            </>
          ) : (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">
                Link variables — click to insert
              </p>
              {LINK_VARIABLES.map((lv) => (
                <div key={lv.variable} className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => editorRef.current?.insertAtCursor(lv.variable)}
                    className="shrink-0 inline-flex items-center rounded-full border border-white/15 bg-[#11141A] px-2 py-1 text-[11px] font-mono text-white/75 hover:border-[#F6B78D]/45 hover:text-white transition-colors"
                  >
                    {lv.variable}
                  </button>
                  <span className="text-[11px] text-white/40 font-body">{lv.description}</span>
                </div>
              ))}
              <p className="text-[11px] text-white/30 pt-1">
                Available variables depend on how the message is sent. Common examples are <code className="text-white/50">{"{{memberName}}"}</code> and <code className="text-white/50">{"{{portalLink}}"}</code>.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-3 border-t border-white/8">
          <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
          <Btn
            variant="primary"
            onClick={() => void handleSave()}
            disabled={!form.label.trim() || !form.subject.trim()}
          >
            {modal === "edit" ? "Save changes" : "Create template"}
          </Btn>
        </div>
      </Modal>
    </MembersLayout>
  );
}
