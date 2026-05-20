"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { EMAIL_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Modal, Field, Input, Select, Empty, useConfirm, Spinner,
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
  const { ask, Dialog } = useConfirm();
  const editorRef = useRef<EmailBodyEditorHandle>(null);

  const [automationConfigs, setAutomationConfigs] = useState<AutomationConfig[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);

  // Modal state: which automation is being edited
  const [editingAutomation, setEditingAutomation] = useState<AutomationConfig | null>(null);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");

  // Inline "create new template" sub-form inside the edit modal
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
    await ask(
      async () => updateAutomationConfig(a.automationId, {
        enabled: !a.enabled,
        updatedBy: user.email || user.id || "admin",
      }),
      `${a.enabled ? "Disable" : "Enable"} automation "${a.label}"?`,
    );
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
      <Dialog />
      <PageHeader title="Member Email" />
      <SectionTabs tabs={EMAIL_TABS} />

      {sortedAutomations.length === 0 ? (
        <Empty message="No automation configs found. Run the migration to seed defaults." />
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#13161D] overflow-hidden">
          <table className="w-full text-[11px]">
            <thead className="bg-[#0F1014] border-b border-white/8">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[220px]">Automation</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45">Linked Template</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[72px]">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/45 w-[170px]" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedAutomations.map((a) => {
                const linkedTemplate = templates.find((t) => t.key === a.templateKey);
                return (
                  <tr key={a.automationId} className="hover:bg-white/4 group">
                    <td className="px-4 py-3 align-top">
                      <p className="text-white/90 font-medium">{a.label}</p>
                      {a.description && (
                        <p className="text-white/40 text-[10px] mt-0.5">{a.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {linkedTemplate ? (
                        <span className="text-white/70">{linkedTemplate.label}</span>
                      ) : (
                        <span className="text-white/25 italic">No template</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                        a.enabled
                          ? "border-[#85CC17]/30 bg-[#85CC17]/12 text-[#85CC17]"
                          : "border-white/12 bg-white/5 text-white/40"
                      }`}>
                        {a.enabled ? "on" : "off"}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-1.5 justify-end">
                        <Btn size="sm" variant="secondary" className="members-pill-btn" onClick={() => openEdit(a)}>Configure</Btn>
                        <Btn
                          size="sm"
                          variant={a.enabled ? "danger" : "primary"}
                          className="members-pill-btn"
                          onClick={() => void handleToggleEnabled(a)}
                        >
                          {a.enabled ? "Disable" : "Enable"}
                        </Btn>
                      </div>
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
                  <Select
                    value={selectedTemplateKey}
                    onChange={(e) => setSelectedTemplateKey(e.target.value)}
                  >
                    <option value="">— No template (automation will be skipped) —</option>
                    {activeTemplates.map((t) => (
                      <option key={t.id} value={t.key}>{t.label}</option>
                    ))}
                  </Select>
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
