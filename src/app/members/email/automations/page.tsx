"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { EMAIL_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Empty, Toggle, Spinner, SearchSelect,
  type SearchSelectOption,
} from "@/components/members/ui";
import EmailBodyEditor, { type EmailBodyEditorHandle } from "@/components/members/EmailBodyEditor";
import {
  subscribeAutomationConfigs,
  subscribeEmailTemplates,
  updateAutomationConfig,
  createEmailTemplate,
  type AutomationConfig,
  type EmailTemplate,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

interface NewTemplateForm {
  label: string;
  subject: string;
  body: string;
}

const BLANK_NEW_TEMPLATE: NewTemplateForm = { label: "", subject: "", body: "" };

export default function AutomationsPage() {
  const { authRole, user, loading } = useAuth();
  const router = useRouter();
  const editorRef = useRef<EmailBodyEditorHandle>(null);

  const [automationConfigs, setAutomationConfigs] = useState<AutomationConfig[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  const [editingAutomation, setEditingAutomation] = useState<AutomationConfig | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");

  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const [newTemplateForm, setNewTemplateForm] = useState<NewTemplateForm>(BLANK_NEW_TEMPLATE);
  const [savingNew, setSavingNew] = useState(false);

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeAutomationConfigs(setAutomationConfigs), []);
  useEffect(() => subscribeEmailTemplates(setTemplates), []);

  const sortedAutomations = useMemo(
    () => [...automationConfigs].sort((a, b) => a.label.localeCompare(b.label)),
    [automationConfigs],
  );

  const activeTemplates = useMemo(
    () => templates.filter((t) => t.active !== false),
    [templates],
  );

  const templateOptions: SearchSelectOption[] = useMemo(
    () => activeTemplates.map((t) => ({
      value: t.key,
      label: t.label,
      subtitle: t.description ?? undefined,
    })),
    [activeTemplates],
  );

  const openEdit = (a: AutomationConfig) => {
    setEditingAutomation(a);
    setSelectedTemplateKey(a.templateKey ?? "");
    setShowNewTemplate(false);
    setNewTemplateForm(BLANK_NEW_TEMPLATE);
    setTimeout(() => editorRef.current?.setContent(""), 50);
  };

  const closeEdit = () => {
    setEditingAutomation(null);
    setShowNewTemplate(false);
    setNewTemplateForm(BLANK_NEW_TEMPLATE);
  };

  const handleToggleEnabled = async (a: AutomationConfig) => {
    if (!user) return;
    await updateAutomationConfig(a.automationId, {
      enabled: !a.enabled,
      updatedBy: user.email || user.id || "admin",
    });
  };

  const handleCreateAndAssign = async () => {
    if (!editingAutomation || !user) return;
    const label = newTemplateForm.label.trim();
    const subject = newTemplateForm.subject.trim();
    if (!label || !subject) return;
    setSavingNew(true);
    try {
      const key = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await createEmailTemplate({
        key,
        label,
        description: `Template for automation: ${editingAutomation.label}`,
        subject,
        body: newTemplateForm.body,
        availableVariables: [],
        active: true,
        updatedBy: user.email || user.id || "admin",
      });
      await updateAutomationConfig(editingAutomation.automationId, {
        templateKey: key,
        updatedBy: user.email || user.id || "admin",
      });
      closeEdit();
    } finally {
      setSavingNew(false);
    }
  };

  const handleSaveTemplateSelection = async () => {
    if (!editingAutomation || !user) return;
    await updateAutomationConfig(editingAutomation.automationId, {
      templateKey: selectedTemplateKey || null,
      updatedBy: user.email || user.id || "admin",
    });
    closeEdit();
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
      <PageHeader title="Member Email" />
      <SectionTabs tabs={EMAIL_TABS} />

      {sortedAutomations.length === 0 ? (
        <Empty message="No automation configs found. Run the migration to seed defaults." />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#13161D] overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-[#0F1014]">
              <tr className="border-b border-white/8">
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[220px]">Automation</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45">Linked Template</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[80px]">Enabled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedAutomations.map((a) => {
                const linkedTemplate = templates.find((t) => t.key === a.templateKey);
                return (
                  <tr key={a.automationId} className="hover:bg-white/4 group">
                    <td className="px-4 py-3 align-middle">
                      <p className="text-white/90 font-medium">{a.label}</p>
                      {a.description && (
                        <p className="text-white/40 text-[10px] mt-0.5">{a.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <button
                        type="button"
                        onClick={() => openEdit(a)}
                        className="flex items-center gap-1.5 text-left group/link"
                      >
                        {linkedTemplate ? (
                          <span className="text-white/70 text-[11px] group-hover/link:text-white transition-colors">{linkedTemplate.label}</span>
                        ) : (
                          <span className="text-white/25 italic text-[11px] group-hover/link:text-white/50 transition-colors">No template — click to assign</span>
                        )}
                        <svg className="w-3 h-3 text-white/20 group-hover/link:text-white/55 transition-colors flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Toggle
                        checked={a.enabled}
                        onChange={() => void handleToggleEnabled(a)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Configure modal */}
      <Modal
        open={editingAutomation !== null}
        onClose={closeEdit}
        title={`Configure: ${editingAutomation?.label ?? ""}`}
      >
        {editingAutomation && (
          <div className="space-y-4">
            {editingAutomation.description && (
              <p className="text-[11px] text-white/45">{editingAutomation.description}</p>
            )}

            {!showNewTemplate ? (
              <>
                <Field label="Template">
                  <SearchSelect
                    value={selectedTemplateKey}
                    onChange={setSelectedTemplateKey}
                    options={templateOptions}
                    placeholder="— No template (automation will be skipped) —"
                    clearable
                  />
                </Field>
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-[10px] text-white/30">or</span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>
                <Btn variant="ghost" size="sm" onClick={() => setShowNewTemplate(true)}>
                  + Create new template &amp; assign
                </Btn>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/8">
                  <Btn variant="ghost" onClick={closeEdit}>Cancel</Btn>
                  <Btn variant="primary" onClick={() => void handleSaveTemplateSelection()}>
                    Save
                  </Btn>
                </div>
              </>
            ) : (
              <>
                <Field label="Template name" required>
                  <Input
                    value={newTemplateForm.label}
                    onChange={(e) => setNewTemplateForm((p) => ({ ...p, label: e.target.value }))}
                    placeholder={`e.g. ${editingAutomation.label} email`}
                  />
                </Field>
                <Field label="Subject" required>
                  <Input
                    value={newTemplateForm.subject}
                    onChange={(e) => setNewTemplateForm((p) => ({ ...p, subject: e.target.value }))}
                    placeholder="Email subject line — use {{variables}} for personalization"
                  />
                </Field>
                <Field label="Body">
                  <EmailBodyEditor
                    ref={editorRef}
                    content={newTemplateForm.body}
                    onChange={(html) => setNewTemplateForm((p) => ({ ...p, body: html }))}
                    placeholder="Write the email body… Use {{memberName}}, {{cycleName}}, etc."
                  />
                </Field>

                <div className="flex justify-end gap-2 pt-3 border-t border-white/8">
                  <Btn variant="ghost" onClick={() => setShowNewTemplate(false)}>Back</Btn>
                  <Btn
                    variant="primary"
                    onClick={() => void handleCreateAndAssign()}
                    disabled={!newTemplateForm.label.trim() || !newTemplateForm.subject.trim() || savingNew}
                  >
                    {savingNew ? "Creating…" : "Create & assign"}
                  </Btn>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </MembersLayout>
  );
}
