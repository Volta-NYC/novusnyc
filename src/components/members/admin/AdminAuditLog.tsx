"use client";

import { useEffect, useState } from "react";
import { Btn, Input, Modal, Select, Spinner } from "@/components/members/ui";
import { getAuthToken } from "@/lib/members/supabaseAuth";
import { formatDate } from "@/lib/format";
import { toCsv, downloadCsv, dateStampedFilename } from "@/lib/csv";

type AuditEntry = {
  id: string;
  timestamp: string;
  action: string;
  collection: string;
  record_id?: string | null;
  actor_uid: string;
  actor_email: string;
  actor_name?: string | null;
  details?: Record<string, unknown> | null;
};

type AuditResponse = {
  entries: AuditEntry[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
};

const COLLECTIONS = [
  ["all", "All areas"],
  ["team", "Members"],
  ["applications", "Applications"],
  ["interviews", "Interviews"],
  ["businesses", "Projects & public cards"],
  ["businesses.publicOrder", "Public card order"],
  ["bids", "Partner organizations"],
  ["chapters", "Chapters"],
  ["pods", "Pods"],
  ["pod_members", "Pod rosters"],
  ["pod_meetings", "Pod meetings"],
  ["pod_attendance", "Attendance"],
  ["assignments", "Pod assignments"],
  ["grant_opportunities", "Grant opportunities"],
  ["hours_adjustments", "Hours adjustments"],
  ["memberStrikes", "Member infractions"],
  ["infractions", "Infraction types"],
  ["emailTemplates", "Email templates"],
  ["automationConfigs", "Email automations"],
  ["handbookPages", "Handbook"],
  ["memberAcknowledgments", "Handbook acknowledgments"],
  ["siteSettings", "Site settings"],
  ["userProfiles", "Portal profiles"],
  ["authUsers", "Portal accounts"],
] as const;

const COLLECTION_LABEL = Object.fromEntries(COLLECTIONS) as Record<string, string>;

function actionStyle(action: string): string {
  if (action === "create" || action === "invite") return "border-emerald-500/25 bg-emerald-500/10 text-emerald-300";
  if (action === "update" || action === "reset") return "border-blue-500/25 bg-blue-500/10 text-blue-300";
  if (action === "delete" || action === "delete_account") return "border-red-500/25 bg-red-500/10 text-red-300";
  return "border-white/15 bg-white/5 text-white/60";
}

function detailSummary(details?: Record<string, unknown> | null): string {
  if (!details || Object.keys(details).length === 0) return "—";
  const fields = Array.isArray(details.fields) ? details.fields.filter((field): field is string => typeof field === "string") : [];
  if (fields.length > 0) return fields.length <= 3 ? fields.join(", ") : `${fields.slice(0, 3).join(", ")} +${fields.length - 3}`;
  if (typeof details.count === "number") return `${details.count} record${details.count === 1 ? "" : "s"}`;
  if (typeof details.title === "string") return details.title;
  if (typeof details.name === "string") return details.name;
  if (typeof details.role === "string") return `Role: ${details.role.toUpperCase()}`;
  return Object.keys(details).slice(0, 3).join(", ");
}

function queryString(filters: { search: string; action: string; collection: string; page?: number; exportAll?: boolean }) {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.action !== "all") params.set("action", filters.action);
  if (filters.collection !== "all") params.set("collection", filters.collection);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.exportAll) params.set("export", "1");
  return params.toString();
}

export default function AdminAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [collection, setCollection] = useState("all");
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError("");
        try {
          const token = await getAuthToken();
          const response = await fetch(`/api/members/admin/audit-logs?${queryString({ search, action, collection })}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          if (!response.ok) throw new Error("audit_load_failed");
          const payload = await response.json() as AuditResponse;
          if (cancelled) return;
          setEntries(payload.entries);
          setTotal(payload.total);
          setPage(0);
          setHasMore(payload.hasMore);
        } catch {
          if (!cancelled) setError("The audit history could not load. Try again.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [search, action, collection]);

  const loadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    setError("");
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/members/admin/audit-logs?${queryString({ search, action, collection, page: nextPage })}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      if (!response.ok) throw new Error("audit_load_failed");
      const payload = await response.json() as AuditResponse;
      setEntries((current) => [...current, ...payload.entries]);
      setPage(nextPage);
      setHasMore(payload.hasMore);
    } catch {
      setError("More audit history could not load. Nothing already shown was removed.");
    } finally {
      setLoadingMore(false);
    }
  };

  const exportMatching = async () => {
    setExporting(true);
    setError("");
    try {
      const token = await getAuthToken();
      const response = await fetch(`/api/members/admin/audit-logs?${queryString({ search, action, collection, exportAll: true })}`, {
        headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
      });
      if (!response.ok) throw new Error("audit_export_failed");
      const payload = await response.json() as AuditResponse;
      const rows = payload.entries.map((entry) => ({
        timestamp: entry.timestamp,
        action: entry.action,
        area: COLLECTION_LABEL[entry.collection] ?? entry.collection,
        collection: entry.collection,
        recordId: entry.record_id ?? "",
        actorName: entry.actor_name ?? "",
        actorEmail: entry.actor_email,
        details: entry.details ?? {},
      }));
      downloadCsv(dateStampedFilename("audit-history"), toCsv(rows, [
        { key: "timestamp", label: "Timestamp" },
        { key: "action", label: "Action" },
        { key: "area", label: "Area" },
        { key: "collection", label: "Collection" },
        { key: "recordId", label: "Record ID" },
        { key: "actorName", label: "Actor Name" },
        { key: "actorEmail", label: "Actor Email" },
        { key: "details", label: "Details" },
      ]));
    } catch {
      setError("The matching audit history could not be exported.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1fr)_180px_240px_auto] xl:items-center">
        <Input aria-label="Search audit history" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search person, email, area, or record ID" className="md:col-span-2 xl:col-span-1" />
        <Select aria-label="Filter by action" value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="all">All actions</option>
          <option value="create">Created</option>
          <option value="update">Updated</option>
          <option value="delete">Deleted</option>
          <option value="invite">Invited</option>
          <option value="reset">Reset</option>
          <option value="decision_email">Decision email</option>
          <option value="delete_account">Account deleted</option>
        </Select>
        <Select aria-label="Filter by area" value={collection} onChange={(event) => setCollection(event.target.value)}>
          {COLLECTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </Select>
        <Btn variant="secondary" className="w-full xl:w-auto" onClick={() => void exportMatching()} disabled={exporting || total === 0}>
          {exporting ? "Exporting…" : "Export results"}
        </Btn>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-white/40">
        <span>{loading ? "Loading…" : `${total.toLocaleString()} matching change${total === 1 ? "" : "s"}`}</span>
        <span>Newest first · history only · no undo</span>
      </div>

      {error && <p role="alert" className="rounded-lg border border-red-500/25 bg-red-500/[0.05] px-3 py-2 text-xs text-red-300">{error}</p>}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Spinner size="sm" /></div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 py-12 text-center text-sm text-white/35">No changes match these filters.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-xs">
              <thead className="bg-[#0F1014] text-[10px] uppercase tracking-wide text-white/40">
                <tr className="members-header-sep">
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                  <th className="px-3 py-2 font-medium">Area</th>
                  <th className="px-3 py-2 font-medium">Person</th>
                  <th className="px-3 py-2 font-medium">What changed</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-white/5 bg-[#1C1F26] last:border-b-0 hover:bg-white/[0.03]">
                    <td className="whitespace-nowrap px-3 py-2 text-white/65" title={entry.timestamp}>{formatDate(entry.timestamp, { withTime: true })}</td>
                    <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${actionStyle(entry.action)}`}>{entry.action.replaceAll("_", " ")}</span></td>
                    <td className="px-3 py-2 text-white/75">{COLLECTION_LABEL[entry.collection] ?? entry.collection}</td>
                    <td className="px-3 py-2"><span className="block text-white/75">{entry.actor_name || entry.actor_email || "System"}</span>{entry.actor_name && entry.actor_email && <span className="block text-[10px] text-white/30">{entry.actor_email}</span>}</td>
                    <td className="px-3 py-2">
                      {entry.details && Object.keys(entry.details).length > 0 ? (
                        <button type="button" onClick={() => setDetailEntry(entry)} className="max-w-xs truncate text-left text-white/55 underline decoration-white/20 underline-offset-2 hover:text-white/85">{detailSummary(entry.details)}</button>
                      ) : <span className="text-white/25">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center"><Btn variant="secondary" onClick={() => void loadMore()} disabled={loadingMore}>{loadingMore ? "Loading…" : `Load more (${entries.length.toLocaleString()} of ${total.toLocaleString()})`}</Btn></div>
      )}

      <Modal open={!!detailEntry} onClose={() => setDetailEntry(null)} title="Change details">
        {detailEntry && (
          <div className="space-y-4">
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 rounded-lg bg-[#0F1014] p-3 text-xs">
              <dt className="text-white/40">Area</dt><dd className="text-white/80">{COLLECTION_LABEL[detailEntry.collection] ?? detailEntry.collection}</dd>
              <dt className="text-white/40">Action</dt><dd className="text-white/80">{detailEntry.action.replaceAll("_", " ")}</dd>
              <dt className="text-white/40">Person</dt><dd className="text-white/80">{detailEntry.actor_name || detailEntry.actor_email || "System"}</dd>
              <dt className="text-white/40">When</dt><dd className="text-white/80">{new Date(detailEntry.timestamp).toLocaleString()}</dd>
              <dt className="text-white/40">Record</dt><dd className="break-all font-mono text-[10px] text-white/55">{detailEntry.record_id || "—"}</dd>
            </dl>
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">Recorded details</p>
              <div className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10">
                {Object.entries(detailEntry.details ?? {}).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-[140px_1fr] gap-3 px-3 py-2 text-xs">
                    <span className="break-words font-mono text-white/40">{key}</span>
                    <span className="break-words text-white/75">{typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-[10px] leading-relaxed text-white/30">Audit history records what was written. It is evidence, not an undo system.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
