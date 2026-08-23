"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Badge,
  Btn,
  Empty,
  Field,
  Input,
  LoadError,
  Modal,
  SearchBar,
  Select,
  TextArea,
} from "@/components/members/ui";
import {
  CONTENT_STATUSES,
  createPodContentItem,
  deletePodContentItem,
  subscribePodContentItems,
  updatePodContentItem,
  type ContentStatus,
  type Pod,
  type PodContentItem,
  type PodMember,
} from "@/lib/members/storage";

type Draft = {
  title: string;
  platforms: string;
  contentType: string;
  status: ContentStatus;
  ownerMemberId: string;
  reviewerMemberId: string;
  dueOn: string;
  scheduledFor: string;
  canvaUrl: string;
  publishedUrl: string;
  caption: string;
  notes: string;
};

const EMPTY: Draft = {
  title: "",
  platforms: "Instagram",
  contentType: "Post",
  status: "Idea",
  ownerMemberId: "",
  reviewerMemberId: "",
  dueOn: "",
  scheduledFor: "",
  canvaUrl: "",
  publishedUrl: "",
  caption: "",
  notes: "",
};

function toDraft(row: PodContentItem): Draft {
  return {
    title: row.title,
    platforms: row.platforms.join(", "),
    contentType: row.contentType,
    status: row.status,
    ownerMemberId: row.ownerMemberId ?? "",
    reviewerMemberId: row.reviewerMemberId ?? "",
    dueOn: row.dueOn ?? "",
    scheduledFor: row.scheduledFor?.slice(0, 16) ?? "",
    canvaUrl: row.canvaUrl,
    publishedUrl: row.publishedUrl,
    caption: row.caption,
    notes: row.notes,
  };
}

function url(value: string): string {
  const trimmed = value.trim();
  return !trimmed || /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

export default function ContentPipeline({
  pod,
  roster,
  nameById,
  canEdit,
}: {
  pod: Pod;
  roster: PodMember[];
  nameById: Map<string, string>;
  canEdit: boolean;
}) {
  const [rows, setRows] = useState<PodContentItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | ContentStatus>("All");
  const [editing, setEditing] = useState<PodContentItem | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(
    () =>
      subscribePodContentItems((next, state) => {
        setRows(next);
        setLoadError(state.error);
      }),
    [],
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? [])
      .filter((row) => row.podId === pod.id && !row.deletedAt)
      .filter((row) => filter === "All" || row.status === filter)
      .filter(
        (row) =>
          !q ||
          [
            row.title,
            row.contentType,
            row.platforms.join(" "),
            row.caption,
            row.notes,
          ].some((value) => value.toLowerCase().includes(q)),
      )
      .sort((a, b) =>
        (a.dueOn ?? "9999-12-31").localeCompare(b.dueOn ?? "9999-12-31"),
      );
  }, [filter, pod.id, query, rows]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit || !draft.title.trim()) return;
    setSaving(true);
    setSaveError("");
    const value = {
      podId: pod.id,
      title: draft.title.trim(),
      platforms: draft.platforms
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      contentType: draft.contentType.trim() || "Post",
      status: draft.status,
      ownerMemberId: draft.ownerMemberId || null,
      reviewerMemberId: draft.reviewerMemberId || null,
      dueOn: draft.dueOn || null,
      scheduledFor: draft.scheduledFor
        ? new Date(draft.scheduledFor).toISOString()
        : null,
      canvaUrl: url(draft.canvaUrl),
      publishedUrl: url(draft.publishedUrl),
      caption: draft.caption.trim(),
      notes: draft.notes.trim(),
    };
    try {
      if (editing === "new") await createPodContentItem(value);
      else if (editing) await updatePodContentItem(editing.id, value);
      setEditing(null);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "The content item was not saved.",
      );
    } finally {
      setSaving(false);
    }
  };

  const today = new Date().toISOString().slice(0, 10);
  const reviewCount = (rows ?? []).filter(
    (row) =>
      row.podId === pod.id && !row.deletedAt && row.status === "In Review",
  ).length;
  return (
    <section aria-labelledby="content-pipeline-title">
      <div className="mb-4 rounded-xl border border-purple-400/25 bg-purple-400/[0.06] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-purple-300">
              Social workspace
            </p>
            <h2
              id="content-pipeline-title"
              className="mt-1 font-display text-lg font-semibold text-white"
            >
              Content pipeline
            </h2>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-white/50">
              Move each deliverable from draft through review and approval to
              posting. {reviewCount} currently need review.
            </p>
          </div>
          {canEdit && (
            <Btn
              variant="primary"
              onClick={() => {
                setDraft(EMPTY);
                setSaveError("");
                setEditing("new");
              }}
            >
              + Add content
            </Btn>
          )}
        </div>
      </div>
      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Search title, platform, or caption…"
        />
        <Select
          value={filter}
          onChange={(event) =>
            setFilter(event.target.value as "All" | ContentStatus)
          }
        >
          <option value="All">All stages</option>
          {CONTENT_STATUSES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </Select>
      </div>
      {loadError ? (
        <LoadError
          message={loadError}
          onRetry={() => window.location.reload()}
        />
      ) : rows === null ? (
        <div className="h-32 animate-pulse rounded-xl border border-white/10 bg-white/[0.03]" />
      ) : visible.length === 0 ? (
        <Empty
          message={
            query || filter !== "All"
              ? "No content matches those filters."
              : "No content has been added yet."
          }
          action={
            canEdit && !query && filter === "All" ? (
              <Btn
                variant="primary"
                onClick={() => {
                  setDraft(EMPTY);
                  setEditing("new");
                }}
              >
                Add the first item
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-[#15181F]">
          <div className="hidden grid-cols-[minmax(210px,1.3fr)_120px_150px_115px_130px] gap-3 border-b border-white/10 bg-white/[0.025] px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 lg:grid">
            <span>Content</span>
            <span>Platform</span>
            <span>Owner</span>
            <span>Due</span>
            <span>Stage</span>
          </div>
          {visible.map((row) => {
            const overdue =
              !!row.dueOn && row.dueOn < today && row.status !== "Posted";
            return (
              <button
                key={row.id}
                type="button"
                onClick={() => {
                  setDraft(toDraft(row));
                  setSaveError("");
                  setEditing(row);
                }}
                className="grid w-full gap-2 border-b border-white/7 px-4 py-3 text-left last:border-0 hover:bg-white/[0.035] lg:grid-cols-[minmax(210px,1.3fr)_120px_150px_115px_130px] lg:items-center lg:gap-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-white/90">
                    {row.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-white/40">
                    {row.contentType}
                  </span>
                </span>
                <span className="truncate text-[11px] text-white/55">
                  {row.platforms.join(", ") || "—"}
                </span>
                <span className="truncate text-[11px] text-white/55">
                  {row.ownerMemberId
                    ? (nameById.get(row.ownerMemberId) ?? "Unknown")
                    : "Unassigned"}
                </span>
                <span
                  className={`font-mono text-[11px] ${overdue ? "font-semibold text-red-400" : "text-white/60"}`}
                >
                  {row.dueOn || "—"}
                </span>
                <span>
                  <Badge label={row.status} />
                </span>
              </button>
            );
          })}
        </div>
      )}
      <Modal
        open={editing !== null}
        onClose={() => !saving && setEditing(null)}
        title={
          editing === "new"
            ? "Add content"
            : canEdit
              ? "Edit content"
              : "Content details"
        }
      >
        <form onSubmit={save} className="space-y-4">
          <fieldset disabled={!canEdit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title" required>
                <Input
                  autoFocus
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      title: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Stage">
                <Select
                  value={draft.status}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      status: event.target.value as ContentStatus,
                    }))
                  }
                  options={CONTENT_STATUSES}
                />
              </Field>
              <Field label="Content type">
                <Input
                  placeholder="Post, reel, story…"
                  value={draft.contentType}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      contentType: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Platforms">
                <Input
                  placeholder="Instagram, LinkedIn"
                  value={draft.platforms}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      platforms: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Creator">
                <MemberSelect
                  value={draft.ownerMemberId}
                  onChange={(ownerMemberId) =>
                    setDraft((value) => ({ ...value, ownerMemberId }))
                  }
                  roster={roster}
                  nameById={nameById}
                />
              </Field>
              <Field label="Reviewer">
                <MemberSelect
                  value={draft.reviewerMemberId}
                  onChange={(reviewerMemberId) =>
                    setDraft((value) => ({ ...value, reviewerMemberId }))
                  }
                  roster={roster}
                  nameById={nameById}
                />
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={draft.dueOn}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      dueOn: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Scheduled for">
                <Input
                  type="datetime-local"
                  value={draft.scheduledFor}
                  onChange={(event) =>
                    setDraft((value) => ({
                      ...value,
                      scheduledFor: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Field label="Canva or draft link">
              <Input
                type="url"
                value={draft.canvaUrl}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    canvaUrl: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Published link">
              <Input
                type="url"
                value={draft.publishedUrl}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    publishedUrl: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Caption">
              <TextArea
                rows={4}
                value={draft.caption}
                onChange={(event) =>
                  setDraft((value) => ({
                    ...value,
                    caption: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Review notes">
              <TextArea
                rows={3}
                placeholder="Feedback, changes requested, approval notes…"
                value={draft.notes}
                onChange={(event) =>
                  setDraft((value) => ({ ...value, notes: event.target.value }))
                }
              />
            </Field>
          </fieldset>
          {saveError && (
            <p role="alert" className="text-xs text-red-400">
              {saveError}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Btn
                type="submit"
                variant="primary"
                disabled={saving || !draft.title.trim()}
              >
                {saving ? "Saving…" : "Save content"}
              </Btn>
            )}
            <Btn type="button" variant="ghost" onClick={() => setEditing(null)}>
              {canEdit ? "Cancel" : "Close"}
            </Btn>
            {canEdit && editing && editing !== "new" && (
              <Btn
                type="button"
                variant="danger"
                className="sm:ml-auto"
                onClick={async () => {
                  if (!window.confirm(`Remove “${editing.title}”?`)) return;
                  await deletePodContentItem(editing.id);
                  setEditing(null);
                }}
              >
                Remove
              </Btn>
            )}
          </div>
        </form>
      </Modal>
    </section>
  );
}

function MemberSelect({
  value,
  onChange,
  roster,
  nameById,
}: {
  value: string;
  onChange: (value: string) => void;
  roster: PodMember[];
  nameById: Map<string, string>;
}) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">Unassigned</option>
      {roster
        .filter((member) => !member.leftAt)
        .map((member) => (
          <option key={member.memberId} value={member.memberId}>
            {nameById.get(member.memberId) ?? "Unknown"}
          </option>
        ))}
    </Select>
  );
}
