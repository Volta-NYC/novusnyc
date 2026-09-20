"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, Btn, Modal, Field, Input, Empty, Toggle, Spinner, useConfirm,
} from "@/components/members/ui";
import EmailBodyEditor, { type EmailBodyEditorHandle } from "@/components/members/EmailBodyEditor";
import {
  subscribeAutomationConfigs,
  subscribeEmailTemplates,
  updateAutomationConfig,
  updateEmailTemplate,
  createEmailTemplate,
  deleteEmailTemplate,
  type AutomationConfig,
  type EmailTemplate,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";
import { getAuthToken } from "@/lib/members/supabaseAuth";
import { EMAIL } from "@/lib/mail";

// One list, because a template and the automation that sends it are the same
// thing to everyone who works here: an email the portal sends by itself.
type Row = {
  key: string;
  name: string;
  trigger: string;
  scheduled: boolean;
  on: boolean;
  template: EmailTemplate | null;
  automation: AutomationConfig | null;
};

// Templates the portal sends without an automation_configs row: the placement
// letter an admin picks when accepting an applicant, and interview mail.
const TRIGGER_WITHOUT_AUTOMATION: Record<string, string> = {
  acceptance_tech: "When an applicant is accepted into Digital & Tech",
  acceptance_outreach: "When an applicant is accepted into Small Business Outreach",
  acceptance_social: "When an applicant is accepted into Social Media & Branding",
  acceptance_grants: "When an applicant is accepted into Grants & Funding",
  acceptance_ambassadors: "When an applicant is accepted into Novus Ambassadors",
  interview_confirmation: "When an interview is booked",
  interview_rescheduled: "When an interview is moved",
};

const SCHEDULED: Record<string, string> = {
  service_hours_summary: "On the January and July sweep",
};

export default function EmailPage() {
  const { authRole, user, loading } = useAuth();
  const router = useRouter();
  const editorRef = useRef<EmailBodyEditorHandle>(null);
  const { ask, Dialog } = useConfirm();

  const [automations, setAutomations] = useState<AutomationConfig[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeAutomationConfigs(setAutomations), []);
  useEffect(() => subscribeEmailTemplates(setTemplates), []);

  const rows = useMemo<Row[]>(() => {
    const byKey = new Map(templates.map((t) => [t.key, t]));
    const claimed = new Set<string>();
    const automated: Row[] = automations.map((a) => {
      const template = a.templateKey ? byKey.get(a.templateKey) ?? null : null;
      if (template) claimed.add(template.key);
      return {
        key: a.automationId,
        name: template?.label || a.label,
        trigger: SCHEDULED[a.automationId] ?? a.description,
        scheduled: a.automationId in SCHEDULED,
        on: a.enabled,
        template,
        automation: a,
      };
    });
    const standalone: Row[] = templates
      .filter((t) => !claimed.has(t.key))
      .map((t) => ({
        key: t.key,
        name: t.label,
        trigger: TRIGGER_WITHOUT_AUTOMATION[t.key] ?? t.description ?? "Sent by hand from another screen",
        scheduled: false,
        on: t.active !== false,
        template: t,
        automation: null,
      }));
    return [...automated, ...standalone].sort((a, b) => a.name.localeCompare(b.name));
  }, [automations, templates]);

  const openEditor = (template: EmailTemplate) => {
    setEditing(template);
    setDraftSubject(template.subject ?? "");
    setDraftBody(template.body ?? "");
    setError("");
  };

  const setOn = async (row: Row, on: boolean) => {
    setError("");
    try {
      if (row.automation) {
        await updateAutomationConfig(row.automation.automationId, {
          enabled: on,
          updatedBy: user?.email ?? "",
        });
      } else if (row.template) {
        await updateEmailTemplate(row.template.id, { active: on, updatedBy: user?.email ?? "" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "That switch did not save.");
    }
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      await updateEmailTemplate(editing.id, {
        subject: draftSubject,
        body: draftBody,
        updatedBy: user?.email ?? "",
      });
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The email was not saved.");
    } finally {
      setSaving(false);
    }
  };

  const addTemplate = async () => {
    const label = newName.trim();
    if (!label) return;
    setSaving(true);
    setError("");
    try {
      await createEmailTemplate({
        key: `custom_${Date.now().toString(36)}`,
        label,
        description: "",
        subject: "",
        body: "",
        availableVariables: [],
        active: true,
        updatedBy: user?.email ?? "",
      });
      setNewName("");
      setCreating(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The email was not created.");
    } finally {
      setSaving(false);
    }
  };

  const runSweep = async () => {
    setSweeping(true);
    setSweepResult(null);
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/automations/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setSweepResult("The scheduled emails could not run."); return; }
      const data = await res.json() as { report?: Record<string, { sent: number; considered: number }> };
      const parts = Object.entries(data.report ?? {})
        .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v.sent} of ${v.considered}`);
      setSweepResult(parts.length ? parts.join(" · ") : "Nothing was due.");
    } catch {
      setSweepResult("The scheduled emails could not run.");
    } finally {
      setSweeping(false);
    }
  };

  if (loading) return <MembersLayout><div className="p-6"><Spinner /></div></MembersLayout>;
  if (authRole === "member") return null;

  return (
    <MembersLayout>
      <PageHeader
        title="Emails"
        subtitle={`Every message the portal sends on its own, from ${EMAIL.info}.`}
        action={<Btn variant="primary" onClick={() => setCreating(true)}>New email</Btn>}
      />

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      {rows.length === 0 ? (
        <Empty message="No emails yet." />
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/15">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-4 border-b border-white/10 px-4 py-3 last:border-b-0 hover:bg-white/[0.03]"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-white/90">{row.name}</p>
                <p className="truncate text-[11px] text-white/45">
                  {row.trigger || "No trigger recorded"}
                  {row.scheduled && <span className="ml-2 text-white/30">scheduled</span>}
                </p>
              </div>
              <p className="hidden min-w-0 flex-1 truncate text-[11px] text-white/35 md:block" title={row.template?.subject ?? ""}>
                {row.template?.subject || "No subject yet"}
              </p>
              <Toggle checked={row.on} onChange={(v) => void setOn(row, v)} label={`${row.name} on`} />
              <Btn
                variant="secondary"
                size="sm"
                disabled={!row.template}
                onClick={() => row.template && openEditor(row.template)}
              >
                Edit wording
              </Btn>
              {row.template && row.template.key.startsWith("custom_") && (
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => ask(
                    async () => { await deleteEmailTemplate(row.template!.id); },
                    `${row.name} is deleted for good.`,
                  )}
                >
                  Delete
                </Btn>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 px-1">
        <Btn variant="secondary" size="sm" onClick={() => void runSweep()} disabled={sweeping}>
          {sweeping ? "Running…" : "Run scheduled emails now"}
        </Btn>
        <span className="text-[11px] text-white/40">
          {sweepResult ?? "Scheduled emails also run on their own. This is for checking one immediately."}
        </span>
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.label ?? "Email"}>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <p className="text-[11px] text-white/45">
            {rows.find((r) => r.template?.id === editing?.id)?.trigger}
          </p>
          <Field label="Subject" required>
            <Input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} placeholder="Subject line" />
          </Field>
          <Field label="Message">
            <EmailBodyEditor ref={editorRef} content={draftBody} onChange={setDraftBody} />
          </Field>
          {(editing?.availableVariables ?? []).length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/40">Click to insert</p>
              <div className="flex flex-wrap gap-1.5">
                {(editing?.availableVariables ?? []).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => editorRef.current?.insertAtCursor(`{{${v}}}`)}
                    className="rounded border border-white/10 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-white/60 hover:border-white/25 hover:text-white/90"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2 border-t border-white/8 pt-4">
          <Btn variant="ghost" onClick={() => setEditing(null)} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void save()} disabled={saving || !draftSubject.trim()}>
            {saving ? "Saving…" : "Save"}
          </Btn>
        </div>
      </Modal>

      <Modal open={creating} onClose={() => setCreating(false)} title="New email">
        <Field label="What is it called?" required>
          <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Partner follow-up" />
        </Field>
        <p className="mt-2 text-[11px] text-white/40">
          A new email has no trigger. It is available to send by hand until an automation points at it.
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-white/8 pt-4">
          <Btn variant="ghost" onClick={() => setCreating(false)} disabled={saving}>Cancel</Btn>
          <Btn variant="primary" onClick={() => void addTemplate()} disabled={saving || !newName.trim()}>
            {saving ? "Creating…" : "Create"}
          </Btn>
        </div>
      </Modal>

      <Dialog />
    </MembersLayout>
  );
}
