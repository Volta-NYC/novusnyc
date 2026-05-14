"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { EMAIL_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Empty, useConfirm, Spinner,
} from "@/components/members/ui";
import RichTextEditor, { type RichTextEditorHandle } from "@/components/members/RichTextEditor";
import {
  subscribeEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  type EmailTemplate,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

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
  const editorRef = useRef<RichTextEditorHandle>(null);

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<FormState>(BLANK_FORM);

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
    setTimeout(() => editorRef.current?.setContent(t.body || ""), 50);
  };

  const closeModal = () => {
    setModal(null);
    setEditing(null);
    setForm(BLANK_FORM);
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
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[120px]" />
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
                      <div className="flex items-center gap-3 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => openEdit(t)}
                          className="text-[11px] text-white/55 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(t)}
                          className="text-[11px] text-red-400/70 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
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
            <RichTextEditor
              ref={editorRef}
              content={form.body}
              onChange={(html) => setForm((p) => ({ ...p, body: html }))}
              placeholder="Write the email body… Use {{memberName}}, {{cycleName}}, etc."
              minHeight={240}
            />
          </Field>
          <p className="text-[11px] text-white/35">
            Use <code className="text-white/55">{"{{memberName}}"}</code>, <code className="text-white/55">{"{{cycleName}}"}</code>, <code className="text-white/55">{"{{creditsEarned}}"}</code>, etc. as placeholders — they are filled in automatically when the email is sent.
          </p>
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
