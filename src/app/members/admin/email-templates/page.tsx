"use client";

// Admin page A5 — Email templates. Every automated email in the credit system
// pulls its subject + body from this catalog so admins can edit copy without a
// deploy. Tokens like {{memberName}} are substituted at send time.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import MembersLayout from "@/components/members/MembersLayout";
import SectionTabs, { ADMIN_GROUP_TABS } from "@/components/members/SectionTabs";
import {
  PageHeader, Btn, Field, Input, useConfirm,
} from "@/components/members/ui";
import RichTextEditor from "@/components/members/RichTextEditor";
import {
  subscribeEmailTemplates, createEmailTemplate, updateEmailTemplate, deleteEmailTemplate,
  type EmailTemplate, type EmailTemplateKey,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// All templates the system knows how to fire. Keys are stable; admins edit copy
// per template. Adding a new automated email means: add a key here, then call
// the corresponding seed entry below in the admin UI.
const TEMPLATE_DEFINITIONS: Array<{
  key: EmailTemplateKey;
  label: string;
  description: string;
  variables: string[];
  defaultSubject: string;
  defaultBody: string;
}> = [
  {
    key: "orange_pace_warning",
    label: "Orange pace warning",
    description: "Sent when a member crosses into orange (2–3 check-ins behind on credits). No strike issued.",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "checkInsBehind", "daysRemaining"],
    defaultSubject: "Heads up — you're behind pace on {{cycleName}}",
    defaultBody: "<p>Hey {{memberName}},</p><p>You're currently at <strong>{{creditsEarned}} of {{creditsTarget}} credits</strong> for {{cycleName}}, which puts you {{checkInsBehind}} check-ins behind pace. There are {{daysRemaining}} days left in the cycle — please claim something from the marketplace soon.</p><p>This is a heads-up, not a strike.</p>",
  },
  {
    key: "red_pace_strike",
    label: "Red pace — strike issued",
    description: "Sent when a member crosses into red (more than 3 check-ins behind, or zero activity past day 28). Issues a strike.",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "strikeReason", "strikeCount"],
    defaultSubject: "Strike issued — {{cycleName}}",
    defaultBody: "<p>Hi {{memberName}},</p><p>You've been issued a strike for: <strong>{{strikeReason}}</strong>.</p><p>Current standing: {{creditsEarned}} of {{creditsTarget}} credits, {{strikeCount}} strikes total. Please reach out to a senior associate if there's context we should know about.</p>",
  },
  {
    key: "demotion_notice",
    label: "Demotion notice",
    description: "Sent when a member crosses the demotion threshold and their role is automatically lowered.",
    variables: ["memberName", "previousRole", "newRole", "cycleName"],
    defaultSubject: "Role change — {{cycleName}}",
    defaultBody: "<p>Hi {{memberName}},</p><p>Your role has been changed from <strong>{{previousRole}}</strong> to <strong>{{newRole}}</strong> for {{cycleName}} due to accumulated strikes.</p><p>This is recoverable — finish the cycle strong and we'll review at the next cycle start.</p>",
  },
  {
    key: "cycle_start",
    label: "Cycle start announcement",
    description: "Mass email sent at the start of a new cycle introducing targets and timeline.",
    variables: ["cycleName", "startDate", "endDate", "creditsTarget", "pacingPercent"],
    defaultSubject: "{{cycleName}} starts now",
    defaultBody: "<p>Team,</p><p>{{cycleName}} runs from {{startDate}} to {{endDate}}. Your credit target this cycle depends on your role and track — check the portal dashboard for your number.</p><p>Aim for ~{{pacingPercent}}% of your target every two weeks. Browse open assignments in the marketplace and claim what fits.</p>",
  },
  {
    key: "cycle_end_summary",
    label: "Cycle end summary",
    description: "Per-member email at cycle close summarizing earned credits and outcome.",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "outcome", "strikeCount"],
    defaultSubject: "{{cycleName}} — your wrap-up",
    defaultBody: "<p>Hi {{memberName}},</p><p>{{cycleName}} is closed. You earned <strong>{{creditsEarned}} of {{creditsTarget}}</strong> credits with {{strikeCount}} strikes.</p><p>Outcome: {{outcome}}. The next cycle will be announced shortly.</p>",
  },
  {
    key: "assignment_approved",
    label: "Assignment approved",
    description: "Sent when a senior associate or board member approves a submitted assignment.",
    variables: ["memberName", "assignmentTitle", "creditsAwarded", "businessName"],
    defaultSubject: "Approved — {{assignmentTitle}}",
    defaultBody: "<p>Nice work, {{memberName}}.</p><p><strong>{{assignmentTitle}}</strong>{{businessName}} was approved. {{creditsAwarded}} credits added to your ledger.</p>",
  },
  {
    key: "assignment_rejected",
    label: "Assignment rejected",
    description: "Sent when a submission is rejected. Includes the reviewer's reason.",
    variables: ["memberName", "assignmentTitle", "rejectionReason"],
    defaultSubject: "Resubmit needed — {{assignmentTitle}}",
    defaultBody: "<p>Hi {{memberName}},</p><p>Your submission for <strong>{{assignmentTitle}}</strong> needs revision.</p><blockquote>{{rejectionReason}}</blockquote><p>Address the feedback and resubmit when ready.</p>",
  },
  {
    key: "infraction_notice",
    label: "Infraction notice",
    description: "Sent when an admin manually issues an infraction (not pace-driven).",
    variables: ["memberName", "infractionName", "points", "totalPoints", "issuedBy", "note"],
    defaultSubject: "Infraction logged — {{infractionName}}",
    defaultBody: "<p>Hi {{memberName}},</p><p>An infraction was logged: <strong>{{infractionName}}</strong> ({{points}} points). Your total this cycle is now {{totalPoints}}.</p><p>Note from {{issuedBy}}: {{note}}</p>",
  },
  {
    key: "monthly_portal_reminder",
    label: "Monthly portal reminder",
    description: "Replaces per-assignment emails. Reminds members to check the portal for new work.",
    variables: ["memberName", "cycleName", "creditsEarned", "creditsTarget", "openAssignmentCount"],
    defaultSubject: "{{cycleName}} — check the portal",
    defaultBody: "<p>Hey {{memberName}},</p><p>Quick reminder: {{openAssignmentCount}} assignments are open right now. You're at {{creditsEarned}} of {{creditsTarget}} credits this cycle.</p><p>Browse the marketplace on the portal — we'll keep adding new work weekly.</p>",
  },
];

const TEMPLATE_DEFINITION_BY_KEY = new Map(TEMPLATE_DEFINITIONS.map((d) => [d.key, d]));

export default function EmailTemplatesPage() {
  const { authRole, user, userProfile, loading } = useAuth();
  const router = useRouter();
  const { ask, Dialog } = useConfirm();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedKey, setSelectedKey] = useState<EmailTemplateKey | null>(null);
  // Working copy so the editor doesn't write through on every keystroke.
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  // Sample variable values used to render the preview pane.
  const [sampleData, setSampleData] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && authRole !== "admin") router.replace("/members/projects");
  }, [authRole, loading, router]);

  useEffect(() => subscribeEmailTemplates(setTemplates), []);

  // Index live templates by key for fast lookup.
  const templatesByKey = useMemo(() => {
    const map = new Map<EmailTemplateKey, EmailTemplate>();
    for (const t of templates) map.set(t.key, t);
    return map;
  }, [templates]);

  // Default selection: first template that exists, else first definition.
  useEffect(() => {
    if (selectedKey) return;
    setSelectedKey(TEMPLATE_DEFINITIONS[0].key);
  }, [selectedKey]);

  const selectedDefinition = selectedKey ? TEMPLATE_DEFINITION_BY_KEY.get(selectedKey) ?? null : null;
  const selectedRecord = selectedKey ? templatesByKey.get(selectedKey) ?? null : null;

  // Reset the draft whenever the selected template changes.
  useEffect(() => {
    if (!selectedDefinition) {
      setDraft(null);
      return;
    }
    const subject = selectedRecord?.subject ?? selectedDefinition.defaultSubject;
    const body = selectedRecord?.body ?? selectedDefinition.defaultBody;
    setDraft({ subject, body });
    // Seed sample data with placeholders so the preview renders something useful.
    const seed: Record<string, string> = {};
    for (const v of selectedDefinition.variables) seed[v] = sampleValue(v);
    setSampleData(seed);
  }, [selectedKey, selectedRecord, selectedDefinition]);

  const updatedByLabel = userProfile?.email || user?.email || user?.uid || "unknown";

  const handleSave = async () => {
    if (!draft || !selectedDefinition || !selectedKey) return;
    if (selectedRecord) {
      await updateEmailTemplate(selectedRecord.id, {
        subject: draft.subject,
        body: draft.body,
        updatedBy: updatedByLabel,
      });
    } else {
      // First save for this key — write a new record with the current definition.
      await createEmailTemplate({
        key: selectedKey,
        label: selectedDefinition.label,
        description: selectedDefinition.description,
        subject: draft.subject,
        body: draft.body,
        availableVariables: selectedDefinition.variables,
        active: true,
        updatedBy: updatedByLabel,
      });
    }
  };

  const handleResetToDefault = () => {
    if (!selectedDefinition) return;
    void ask(
      async () => {
        setDraft({
          subject: selectedDefinition.defaultSubject,
          body: selectedDefinition.defaultBody,
        });
      },
      "Reset this template's subject and body to the built-in defaults? You'll still need to click Save to persist.",
    );
  };

  const handleDelete = async () => {
    if (!selectedRecord) return;
    await ask(
      async () => {
        await deleteEmailTemplate(selectedRecord.id);
      },
      `Delete saved overrides for “${selectedRecord.label}”? The system falls back to defaults until you save again.`,
    );
  };

  const insertVariable = (variable: string) => {
    if (!draft) return;
    const token = `{{${variable}}}`;
    setDraft((prev) => prev ? { ...prev, body: `${prev.body}${token}` } : prev);
  };

  if (loading || authRole !== "admin") {
    return (
      <MembersLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-6 h-6 border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin" />
        </div>
      </MembersLayout>
    );
  }

  return (
    <MembersLayout>
      <Dialog />
      <SectionTabs tabs={ADMIN_GROUP_TABS} />

      <PageHeader
        title="Email Templates"
        subtitle="Edit the copy for every automated email. Use {{tokens}} to substitute variables at send time."
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-4">
        {/* Template list */}
        <aside className="rounded-2xl border border-white/10 bg-[#13161D] overflow-hidden">
          <div className="px-3 py-2 border-b border-white/8 text-[10px] uppercase tracking-wider font-semibold text-white/45">
            Templates
          </div>
          <ul>
            {TEMPLATE_DEFINITIONS.map((def) => {
              const has = templatesByKey.has(def.key);
              const selected = def.key === selectedKey;
              return (
                <li key={def.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedKey(def.key)}
                    className={`w-full text-left px-3 py-2.5 text-sm border-b border-white/5 transition-colors ${
                      selected ? "bg-[#85CC17]/10 text-white" : "text-white/75 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{def.label}</span>
                      {has ? (
                        <span className="inline-flex items-center rounded-full border border-[#85CC17]/30 bg-[#85CC17]/10 px-1.5 py-0.5 text-[9px] font-semibold text-[#9BE22B] flex-shrink-0">
                          Customized
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-white/15 px-1.5 py-0.5 text-[9px] font-semibold text-white/45 flex-shrink-0">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-white/40 mt-0.5 line-clamp-2">{def.description}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Editor + preview */}
        <section className="space-y-4 min-w-0">
          {selectedDefinition && draft ? (
            <>
              <div className="rounded-2xl border border-white/10 bg-[#13161D] p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h2 className="font-display font-bold text-white text-lg">{selectedDefinition.label}</h2>
                    <p className="text-white/45 text-xs mt-1">{selectedDefinition.description}</p>
                    {selectedRecord && (
                      <p className="text-white/35 text-[11px] mt-1">
                        Last edited {new Date(selectedRecord.updatedAt).toLocaleString()} by {selectedRecord.updatedBy}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    {selectedRecord && (
                      <Btn size="sm" variant="danger" onClick={() => void handleDelete()}>
                        Reset overrides
                      </Btn>
                    )}
                    <Btn size="sm" variant="secondary" onClick={handleResetToDefault}>
                      Restore default copy
                    </Btn>
                    <Btn size="sm" variant="primary" onClick={() => void handleSave()}>
                      Save
                    </Btn>
                  </div>
                </div>

                <Field label="Subject" required>
                  <Input
                    value={draft.subject}
                    onChange={(e) => setDraft((prev) => prev ? { ...prev, subject: e.target.value } : prev)}
                  />
                </Field>

                <div className="mt-4">
                  <Field label="Body">
                    <RichTextEditor
                      content={draft.body}
                      onChange={(html) => setDraft((prev) => prev ? { ...prev, body: html } : prev)}
                      minHeight={260}
                      placeholder="Write the email body. Use {{token}} for variables."
                    />
                  </Field>
                </div>

                {selectedDefinition.variables.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-white/45 mb-2">
                      Available variables — click to insert at end of body
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDefinition.variables.map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => insertVariable(v)}
                          className="inline-flex items-center rounded-full border border-white/15 bg-[#11141A] px-2 py-1 text-[11px] font-mono text-white/75 hover:border-[#85CC17]/45 hover:text-white transition-colors"
                          title={`Insert {{${v}}}`}
                        >
                          {`{{${v}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <PreviewPane
                subject={draft.subject}
                body={draft.body}
                variables={selectedDefinition.variables}
                sampleData={sampleData}
                onSampleChange={(name, value) => setSampleData((prev) => ({ ...prev, [name]: value }))}
              />
            </>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-[#13161D] p-6 text-white/55 text-sm">
              Select a template to edit.
            </div>
          )}
        </section>
      </div>
    </MembersLayout>
  );
}

// ── Preview pane ──────────────────────────────────────────────────────────────

function PreviewPane({
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
  const renderedSubject = useMemo(() => substitute(subject, sampleData), [subject, sampleData]);
  const renderedBody = useMemo(() => substitute(body, sampleData), [body, sampleData]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#13161D] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-white text-base">Preview</h3>
        <p className="text-[11px] text-white/35">Sample values are local only — not sent or saved.</p>
      </div>

      {variables.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
          {variables.map((v) => (
            <label key={v} className="block">
              <span className="text-[10px] uppercase tracking-wider text-white/45 font-mono">{`{{${v}}}`}</span>
              <input
                value={sampleData[v] ?? ""}
                onChange={(e) => onSampleChange(v, e.target.value)}
                className="mt-1 w-full bg-[#0F1014] border border-white/10 rounded-md px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/45"
              />
            </label>
          ))}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white text-black p-4">
        <p className="text-xs text-black/55 mb-1">Subject</p>
        <p className="text-base font-semibold mb-4">{renderedSubject}</p>
        <hr className="border-black/10 mb-3" />
        <div
          className="text-sm leading-relaxed prose prose-sm max-w-none"
          // Body is admin-authored HTML; substitution preserves the markup.
          dangerouslySetInnerHTML={{ __html: renderedBody }}
        />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function substitute(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, name) => data[name] ?? `{{${name}}}`);
}

// Provide reasonable default sample values for each known token. Falling back
// to a humanized version of the variable name itself for anything unknown so
// the preview never shows raw {{x}} unless the admin clears the field.
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
    case "rejectionReason": return "Please add a screenshot showing the mobile breakpoint issue.";
    case "infractionName": return "Did not respond within 48 hours";
    case "points": return "2";
    case "totalPoints": return "5";
    case "issuedBy": return "Ethan Zhang";
    case "note": return "Please reply to client emails by EOD tomorrow.";
    case "openAssignmentCount": return "12";
    default: return variable;
  }
}
