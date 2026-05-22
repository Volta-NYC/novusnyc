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
                className="mt-0.5 w-full bg-[#13161D] border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-[#85CC17]/40"
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
    case "memberName": return "Jordan Lee";
    case "cycleName": return "Summer 2026";
    case "startDate": return "June 1, 2026";
    case "endDate": return "September 1, 2026";
    case "creditsEarned": return "6";
    case "creditsTarget": return "12";
    case "creditsAwarded": return "3";
    case "checkInsBehind": return "2";
    case "daysRemaining": return "47";
    case "pacingPercent": return "20";
    case "strikeReason": return "Missed credit pace — 4 check-ins behind";
    case "strikeCount": return "1";
    case "previousRole": return "Associate";
    case "newRole": return "Senior Analyst";
    case "outcome": return "On track for next cycle";
    case "assignmentTitle": return "UI/UX checkup — Petite Dumpling";
    case "businessName": return " for Petite Dumpling";
    case "rejectionReason": return "Please add a screenshot of the mobile breakpoint.";
    case "infractionName": return "Did not respond within 48 hours";
    case "points": return "2";
    case "totalPoints": return "5";
    case "issuedBy": return "Ethan Zhang";
    case "note": return "Please reply to client emails by EOD.";
    case "openAssignmentCount": return "12";
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
            <thead className="bg-[#0F1014] border-b border-white/8">
              <tr>
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
                          : "border-[#85CC17]/25 bg-[#85CC17]/8 text-[#85CC17]/70"
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
              placeholder="e.g. End-of-cycle reminder"
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
              placeholder="Write the email body… Use {{memberName}}, {{cycleName}}, etc."
            />
          </Field>

          {(editing?.availableVariables ?? []).length > 0 ? (
            <>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-1.5">
                  Variables — click to insert into body
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(editing?.availableVariables ?? []).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => editorRef.current?.insertAtCursor(`{{${v}}}`)}
                      className="inline-flex items-center rounded-full border border-white/15 bg-[#11141A] px-2 py-1 text-[11px] font-mono text-white/75 hover:border-[#85CC17]/45 hover:text-white transition-colors"
                    >
                      {`{{${v}}}`}
                    </button>
                  ))}
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
            <p className="text-[11px] text-white/35">
              Use <code className="text-white/55">{"{{memberName}}"}</code>, <code className="text-white/55">{"{{cycleName}}"}</code>, <code className="text-white/55">{"{{creditsEarned}}"}</code>, etc. as placeholders — they are filled in automatically when the email is sent.
            </p>
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
