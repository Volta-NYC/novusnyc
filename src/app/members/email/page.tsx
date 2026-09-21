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
import { EMAIL_GROUPS, SYSTEM_EMAILS, type SystemEmail } from "@/lib/members/systemEmails";

// The list is driven by what the code sends (SYSTEM_EMAILS), not by what rows
// happen to exist, so an email whose wording was deleted still shows, as not
// set up, instead of disappearing while the portal keeps trying to send it.
type Row = {
  key: string;
  name: string;
  group: string;
  trigger: string;
  variables: string[];
  system: SystemEmail | null;
  template: EmailTemplate | null;
  automation: AutomationConfig | null;
  setUp: boolean;
  // null when there is nothing to switch: always sent, not set up, or never sent.
  on: boolean | null;
};

const HAND_WRITTEN = "Not sent automatically";

// One grid on the list, with every row as a subgrid, so the switch and button
// columns are sized once for the whole list. Below md a row wraps: there is no
// room for a name beside a switch and two buttons.
const LIST_GRID = "md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,4fr)_auto_auto] md:gap-x-4";
const ROW = "flex flex-wrap items-center gap-x-4 gap-y-2 md:col-span-full md:grid md:grid-cols-subgrid";

function hasText(html: string): boolean {
  return html.replace(/<[^>]*>/g, "").trim().length > 0;
}

export default function EmailPage() {
  const { authRole, user, loading } = useAuth();
  const router = useRouter();
  const editorRef = useRef<EmailBodyEditorHandle>(null);
  const { ask, Dialog } = useConfirm();

  const [automations, setAutomations] = useState<AutomationConfig[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sweeping, setSweeping] = useState(false);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && authRole === "member") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeAutomationConfigs(setAutomations), []);
  useEffect(() => subscribeEmailTemplates(setTemplates), []);

  const rows = useMemo<Row[]>(() => {
    const byKey = new Map(templates.map((t) => [t.key, t]));
    const byAutomation = new Map(automations.map((a) => [a.automationId, a]));
    const system: Row[] = SYSTEM_EMAILS.map((email) => {
      const template = byKey.get(email.key) ?? null;
      const automation = email.automationId ? byAutomation.get(email.automationId) ?? null : null;
      const setUp = Boolean(template && template.subject.trim() && hasText(template.body));
      const on = !setUp || email.switchType === "none" ? null
        : email.switchType === "automation" ? (automation ? automation.enabled : null)
        : template?.active !== false;
      return {
        key: email.key, name: email.name, group: email.group, trigger: email.trigger,
        variables: email.variables, system: email, template, automation, setUp, on,
      };
    });
    const known = new Set(SYSTEM_EMAILS.map((email) => email.key));
    const handWritten: Row[] = templates
      .filter((t) => !known.has(t.key))
      .sort((a, b) => (a.label || a.key).localeCompare(b.label || b.key))
      .map((t) => ({
        key: t.key, name: t.label || t.key, group: HAND_WRITTEN,
        trigger: "Nothing in the portal sends this. It is kept so the wording is not lost.",
        variables: t.availableVariables, system: null, template: t, automation: null, setUp: true, on: null,
      }));
    return [...system, ...handWritten];
  }, [automations, templates]);

  const groups = useMemo(
    () => [...EMAIL_GROUPS, HAND_WRITTEN]
      .map((group) => ({ group, rows: rows.filter((row) => row.group === group) }))
      .filter((section) => section.rows.length > 0),
    [rows],
  );

  const openEditor = (row: Row) => {
    setEditing(row);
    setDraftSubject(row.template?.subject ?? "");
    setDraftBody(row.template?.body ?? "");
    setError("");
  };

  const setOn = async (row: Row, on: boolean) => {
    setError("");
    try {
      if (row.system?.switchType === "automation" && row.automation) {
        await updateAutomationConfig(row.automation.automationId, { enabled: on, updatedBy: user?.email ?? "" });
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
      if (editing.template) {
        await updateEmailTemplate(editing.template.id, {
          subject: draftSubject,
          body: draftBody,
          updatedBy: user?.email ?? "",
        });
      } else {
        await createEmailTemplate({
          key: editing.key,
          label: editing.name,
          description: editing.trigger,
          subject: draftSubject,
          body: draftBody,
          availableVariables: editing.variables,
          active: true,
          updatedBy: user?.email ?? "",
        });
      }
      setEditing(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The email was not saved.");
    } finally {
      setSaving(false);
    }
  };

  const remove = (row: Row) => {
    const template = row.template;
    if (!template) return;
    ask(
      async () => { await deleteEmailTemplate(template.id); },
      row.system
        ? `${row.name} is deleted. Until you write it again, ${row.system.stops}.`
        : `${row.name} is deleted for good.`,
    );
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
        subtitle={`Every email the portal sends, from ${EMAIL.info}. The wording here is exactly what goes out.`}
      />

      {error && (
        <p role="alert" className="mb-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      )}

      {rows.length === 0 ? (
        <Empty message="No emails yet." />
      ) : (
        <div className={`${LIST_GRID} overflow-hidden rounded-lg border border-white/15`}>
          <div className="hidden border-b border-white/10 px-4 py-2 md:col-span-full md:grid md:grid-cols-subgrid">
            <span className="text-[10px] uppercase tracking-wide text-white/40">Email</span>
            <span className="text-[10px] uppercase tracking-wide text-white/40">Subject</span>
            <span className="text-[10px] uppercase tracking-wide text-white/40">On</span>
            <span />
          </div>
          {groups.map(({ group, rows: groupRows }) => (
            <div key={group} className="contents">
              <p className="border-b border-white/10 bg-white/[0.02] px-4 pb-1.5 pt-3 text-[10px] font-semibold uppercase tracking-wide text-white/50 md:col-span-full">
                {group}
              </p>
              {groupRows.map((row) => (
                <div
                  key={row.key}
                  className={`${ROW} border-b border-white/10 px-4 py-3 hover:bg-white/[0.03]`}
                >
                  <div className="min-w-0 basis-full md:basis-auto">
                    <p className="text-[13px] font-medium text-white/90 md:truncate">{row.name}</p>
                    <p className="text-[11px] text-white/45 md:truncate" title={row.trigger}>{row.trigger}</p>
                  </div>
                  <p className="hidden min-w-0 truncate text-[11px] md:block" title={row.template?.subject ?? ""}>
                    {row.setUp
                      ? <span className="text-white/45">{row.template?.subject}</span>
                      : <span className="text-amber-400">Not set up, so the portal cannot send it</span>}
                  </p>
                  <div className="flex items-center">
                    {row.on !== null ? (
                      <Toggle checked={row.on} onChange={(v) => void setOn(row, v)} ariaLabel={`Send ${row.name}`} />
                    ) : row.setUp && row.system?.switchType === "none" ? (
                      <span className="text-[11px] text-white/40" title="Turning this off would lock people out, so it has no switch.">Always</span>
                    ) : (
                      <span className="text-white/25">—</span>
                    )}
                  </div>
                  <div className="ml-auto flex justify-end gap-2 md:ml-0">
                    <Btn variant={row.setUp ? "secondary" : "primary"} size="sm" onClick={() => openEditor(row)}>
                      {row.setUp ? "Edit wording" : "Write it"}
                    </Btn>
                    <Btn variant="danger" size="sm" disabled={!row.template} onClick={() => remove(row)}>
                      Delete
                    </Btn>
                  </div>
                </div>
              ))}
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

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.name ?? "Email"}>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <p className="text-[11px] text-white/45">{editing?.trigger}</p>
          <Field label="Subject" required>
            <Input value={draftSubject} onChange={(e) => setDraftSubject(e.target.value)} placeholder="Subject line" />
          </Field>
          <Field label="Message">
            <EmailBodyEditor ref={editorRef} content={draftBody} onChange={setDraftBody} />
          </Field>
          {(editing?.variables ?? []).length > 0 && (
            <div>
              <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/40">Filled in when it sends · click to insert</p>
              <div className="flex flex-wrap gap-1.5">
                {(editing?.variables ?? []).map((v) => (
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
          <Btn variant="primary" onClick={() => void save()} disabled={saving || !draftSubject.trim() || !hasText(draftBody)}>
            {saving ? "Saving…" : "Save"}
          </Btn>
        </div>
      </Modal>

      <Dialog />
    </MembersLayout>
  );
}
