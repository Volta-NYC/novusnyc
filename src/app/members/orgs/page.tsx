"use client";
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useState, useEffect } from "react";
import MembersLayout from "@/components/members/MembersLayout";
import {
  PageHeader, SearchBar, Badge, Btn, Modal, Field, Input, Select, TextArea,
  Empty, StatCard, useConfirm,
} from "@/components/members/ui";
import {
  subscribeBIDs, createBID, updateBID, deleteBID, subscribeChapters,
  type BID, type BIDContact, type Chapter,
} from "@/lib/members/storage";
import { useAuth } from "@/lib/members/authContext";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES   = ["Active Partner", "In Conversation", "Outreach", "Paused"] as const;
const BOROUGHS   = ["Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island", "New York (All Boroughs)"];
type BidViewMode = "cards" | "compact";

type BidStatusOption = (typeof STATUSES)[number];

const BID_STATUS_SORT_ORDER: Record<BidStatusOption, number> = {
  "Active Partner": 0,
  "In Conversation": 1,
  Outreach: 2,
  Paused: 3,
};

function normalizeBidStatus(status: string): BidStatusOption {
  const value = String(status ?? "").trim();
  if (value === "Active Partner") return "Active Partner";
  if (value === "In Conversation") return "In Conversation";
  if (value === "Outreach") return "Outreach";
  // Legacy "Dead" status maps to Paused so it is no longer selectable.
  return "Paused";
}

function nextSortIndex(items: BID[]): number {
  const max = items.reduce((best, item) => {
    const value = item.sortIndex ?? 0;
    return value > best ? value : best;
  }, 0);
  return max + 1000;
}

const BLANK_CONTACT: BIDContact = { id: "", name: "", email: "", phone: "", role: "" };

// Blank form values for creating a new BID record.
const BLANK_FORM: Omit<BID, "id" | "createdAt" | "updatedAt" | "timeline"> = {
  name: "", status: "Outreach", contacts: [],
  borough: "", address: "", zipCode: "", nextAction: "", priority: "Medium",
};

// ── COLUMN DEFINITIONS (compact view) ─────────────────────────────────────────

const BID_ALL_COLS = [
  { key: "name",       label: "Name",        width: 240, restricted: false, adminOnly: false },
  { key: "status",     label: "Status",      width: 140, restricted: false, adminOnly: false },
  { key: "borough",    label: "Borough / Region", width: 190, restricted: false, adminOnly: false },
  { key: "contact",    label: "Contact",     width: 260, restricted: true,  adminOnly: false },
  { key: "nextAction", label: "Next Action", width: 240, restricted: true,  adminOnly: false },
  { key: "actions",    label: "Actions",     width: 110, restricted: false, adminOnly: true  },
] as const;

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function BIDTrackerPage() {
  const [bids, setBids]               = useState<BID[]>([]);
  const [chapters, setChapters]       = useState<Chapter[]>([]);
  const [chapterId, setChapterId]     = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [viewMode, setViewMode]       = useState<BidViewMode>("cards");
  const [hiddenBidCols, setHiddenBidCols] = useState<Set<string>>(new Set());
  const [bidColsMenuOpen, setBidColsMenuOpen] = useState(false);
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingBID, setEditingBID]   = useState<BID | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);

  const { ask, Dialog } = useConfirm();
  const { authRole, user }    = useAuth();
  const canEdit = authRole === "owner";
  const isMemberRestricted = authRole === "member";

  // Subscribe to real-time BID updates; unsubscribe on unmount.
  useEffect(() => subscribeBIDs(setBids), []);
  useEffect(() => subscribeChapters(setChapters), []);

  // Generic field updater used by all form inputs.
  const setField = (key: string, value: unknown) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const openCreate = () => {
    setForm({ ...BLANK_FORM, contacts: [{ ...BLANK_CONTACT, id: crypto.randomUUID() }] });
    setEditingBID(null);
    setModal("create");
  };

  const openEdit = (bid: BID) => {
    // Prefer the contacts array; fall back to synthesising one from legacy fields.
    const contacts: BIDContact[] =
      bid.contacts && bid.contacts.length > 0
        ? bid.contacts
        : (bid.contactName || bid.contactEmail || bid.phone)
          ? [{ id: crypto.randomUUID(), name: bid.contactName ?? "", email: bid.contactEmail ?? "", phone: bid.phone ?? "", role: "" }]
          : [{ ...BLANK_CONTACT, id: crypto.randomUUID() }];
    setForm({
      name:       bid.name,
      status:     normalizeBidStatus(bid.status),
      contacts,
      borough:    bid.borough,
      address:    bid.address ?? "",
      zipCode:    bid.zipCode ?? "",
      nextAction: bid.nextAction,
      priority:   bid.priority as BID["priority"],
    });
    setEditingBID(bid);
    setModal("edit");
  };

  const addContact = () =>
    setForm(prev => ({ ...prev, contacts: [...(prev.contacts ?? []), { ...BLANK_CONTACT, id: crypto.randomUUID() }] }));

  const removeContact = (id: string) =>
    setForm(prev => ({ ...prev, contacts: (prev.contacts ?? []).filter(c => c.id !== id) }));

  const updateContact = (id: string, field: keyof BIDContact, value: string) =>
    setForm(prev => ({ ...prev, contacts: (prev.contacts ?? []).map(c => c.id === id ? { ...c, [field]: value } : c) }));

  const geocodeBidLocation = async (input: {
    address: string;
    zipCode: string;
    borough: string;
  }): Promise<{ lat: number; lng: number } | null> => {
    if (!user) return null;
    try {
      const token = await getAuthToken();
      const res = await fetch("/api/members/bids/geocode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });
      if (!res.ok) return null;
      const data = await res.json() as { lat?: number; lng?: number };
      if (typeof data.lat !== "number" || typeof data.lng !== "number") return null;
      return { lat: data.lat, lng: data.lng };
    } catch {
      return null;
    }
  };

  const handleSave = async (opts?: { addAnother?: boolean }) => {
    if (!form.name.trim()) return;
    const address = (form.address ?? "").trim();
    const zipCode = (form.zipCode ?? "").trim();
    const borough = (form.borough ?? "").trim();
    const prevAddress = (editingBID?.address ?? "").trim();
    const prevZipCode = (editingBID?.zipCode ?? "").trim();
    const prevBorough = (editingBID?.borough ?? "").trim();
    const locationChanged = !editingBID
      || address !== prevAddress
      || zipCode !== prevZipCode
      || borough !== prevBorough;

    const geocoded = (address || zipCode)
      ? await geocodeBidLocation({ address, zipCode, borough })
      : null;
    const geocodePatch = (address || zipCode)
      ? (geocoded
          ? { lat: geocoded.lat, lng: geocoded.lng }
          : (locationChanged ? { lat: null as unknown as number, lng: null as unknown as number } : {}))
      : ({ lat: null as unknown as number, lng: null as unknown as number });

    // Sync legacy single-contact fields from contacts[0] so existing display code still works.
    const contacts = form.contacts ?? [];
    const legacySync = contacts.length > 0
      ? { contactName: contacts[0].name, contactEmail: contacts[0].email, phone: contacts[0].phone }
      : { contactName: "", contactEmail: "", phone: "" };

    if (editingBID) {
      await updateBID(editingBID.id, { ...(form as Partial<BID>), ...legacySync, status: normalizeBidStatus(form.status), ...geocodePatch });
    } else {
      await createBID({
        ...form,
        ...legacySync,
        status: normalizeBidStatus(form.status),
        ...geocodePatch,
        // Created while looking at a chapter, so it belongs to that chapter.
        // Without this a Chicago partner saved with no chapter and the list,
        // which falls back to the first one, filed it under New York.
        chapterId: chapterId ?? defaultChapterId ?? null,
        sortIndex: nextSortIndex(bids),
      } as Omit<BID, "id" | "createdAt" | "updatedAt" | "timeline">);
    }

    if (opts?.addAnother && !editingBID) {
      // Carry the borough selection over since BID tours are typically within one borough.
      setForm({ ...BLANK_FORM, borough });
      setEditingBID(null);
      setModal("create");
    } else {
      setModal(null);
    }
  };

  const handleDeleteFromEdit = async () => {
    if (!editingBID) return;
    const name = editingBID.name || "this organization";
    await ask(
      async () => {
        await deleteBID(editingBID.id);
        setModal(null);
      },
      `Delete "${name}"? This permanently removes it from Partner Organizations.`,
    );
  };


  const matchesSearch = (bid: BID) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return bid.name.toLowerCase().includes(query)
      || bid.borough.toLowerCase().includes(query);
  };

  const sortBids = (list: BID[]) => {
    return [...list].sort((a, b) => {
      const statusDelta = BID_STATUS_SORT_ORDER[normalizeBidStatus(a.status)] - BID_STATUS_SORT_ORDER[normalizeBidStatus(b.status)];
      if (statusDelta !== 0) return statusDelta;
      return a.name.localeCompare(b.name);
    });
  };

  const defaultChapterId = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.id ?? null;
  const filtered = bids
    .filter((b) => !chapterId || (b.chapterId ?? defaultChapterId) === chapterId)
    .filter(matchesSearch);
  const sorted = sortBids(filtered);

  const inChapter = bids.filter((b) => !chapterId || (b.chapterId ?? defaultChapterId) === chapterId);
  const stats = {
    total:    inChapter.length,
    active:   inChapter.filter(b => b.status === "Active Partner").length,
    pipeline: inChapter.filter(b => ["Outreach", "In Conversation"].includes(b.status)).length,
  };

  return (
    <MembersLayout>
      <Dialog />

      <PageHeader
        title="Partner Organizations"
        action={canEdit ? <Btn variant="primary" onClick={openCreate}>+ New Partner</Btn> : undefined}
      />

      {chapters.length > 1 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          {[{ id: null as string | null, name: "All" },
            ...[...chapters].sort((a, b) => a.sortOrder - b.sortOrder)].map((c) => {
            const n = c.id === null
              ? bids.length
              : bids.filter((b) => (b.chapterId ?? defaultChapterId) === c.id).length;
            return (
              <button
                key={c.id ?? "all"}
                onClick={() => setChapterId(c.id)}
                className={`rounded-full border px-3 py-1 text-[11px] transition-colors ${
                  chapterId === c.id
                    ? "border-[#F3E28D]/45 bg-[#F3E28D]/15 text-[#F3E28D]"
                    : "border-white/10 bg-white/[0.03] text-white/55 hover:border-white/25 hover:text-white/85"
                }`}
              >
                {c.name}
                <span className="ml-1.5 font-mono tabular-nums text-white/35">{n}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Total Partners"  value={stats.total} />
        <StatCard label="Active Partners" value={stats.active} color="text-green-400" />
        <StatCard label="In Pipeline"     value={stats.pipeline} color="text-blue-400" />
      </div>

      {/* Search and filter controls */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or location…" />
        {viewMode === "compact" && (
          <div className="relative">
            <Btn size="sm" variant="ghost" onClick={() => setBidColsMenuOpen((v) => !v)}>
              Columns{hiddenBidCols.size > 0 ? ` (${hiddenBidCols.size} hidden)` : ""}
            </Btn>
            {bidColsMenuOpen && (
              <div className="members-col-panel" onClick={(e) => e.stopPropagation()}>
                <p className="px-2 pb-1 text-[10px] uppercase tracking-wide text-white/40">Show / Hide Columns</p>
                {BID_ALL_COLS.filter((c) => c.key !== "actions" && (!c.restricted || !isMemberRestricted) && (!c.adminOnly || canEdit)).map((col) => (
                  <label key={col.key} className="flex items-center gap-2 px-2 py-1 hover:bg-white/5 cursor-pointer text-xs text-white/70">
                    <input
                      type="checkbox"
                      className="members-checkbox"
                      checked={!hiddenBidCols.has(col.key)}
                      onChange={(e) => setHiddenBidCols((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.delete(col.key); else next.add(col.key);
                        return next;
                      })}
                    />
                    {col.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex gap-1 bg-[#1C1F26] border border-white/8 rounded-xl p-1">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "cards" ? "bg-[#F6B78D] text-[#0D0D0D]" : "text-white/60 hover:text-white"}`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode("compact")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${viewMode === "compact" ? "bg-[#F6B78D] text-[#0D0D0D]" : "text-white/60 hover:text-white"}`}
          >
            Compact
          </button>
        </div>
      </div>

      {viewMode === "cards" && (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {sorted.map((bid) => {
          return (
            <div
              key={bid.id}
              className="bg-[#1C1F26] border border-white/8 rounded-xl p-3 sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2 min-w-0 flex-1">
                  <p className="text-white font-semibold leading-snug break-words">{bid.name}</p>
                  {!isMemberRestricted ? (
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/45">
                      <span>{bid.borough || "No location"}</span>
                      <span>•</span>
                      <span>{(bid.contacts?.[0]?.name || bid.contactName) || "No contact"}</span>
                      {(bid.contacts?.[0]?.email || bid.contactEmail) && (
                        <>
                          <span>•</span>
                          <a href={`mailto:${bid.contacts?.[0]?.email || bid.contactEmail}`} className="text-[#F6B78D]/75 hover:text-[#F6B78D] transition-colors">
                            {bid.contacts?.[0]?.email || bid.contactEmail}
                          </a>
                        </>
                      )}
                      {bid.contacts && bid.contacts.length > 1 && (
                        <span className="text-white/30">+{bid.contacts.length - 1} more</span>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-white/45">
                      {bid.borough || "No location"}
</div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge label={normalizeBidStatus(bid.status)} />
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Btn size="sm" variant="secondary" className="px-2.5 py-1 text-xs" onClick={() => openEdit(bid)}>Edit</Btn>
                  </div>
                )}
              </div>

              {!isMemberRestricted && (bid.nextAction || bid.notes) && (
                <div className="mt-3 bg-white/4 border border-white/6 rounded-lg px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1">Notes / Next Action</p>
                  <p className="text-sm text-white/70">{bid.nextAction}</p>
                </div>
              )}

            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Empty
              message="No partners match your filters."
              action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first partner</Btn> : undefined}
            />
          </div>
        )}
      </div>
      )}
      {viewMode === "compact" && (() => {
        const visCols = BID_ALL_COLS.filter((c) =>
          !hiddenBidCols.has(c.key)
          && (!c.restricted || !isMemberRestricted)
          && (!c.adminOnly || canEdit)
        );
        const tableWidth = visCols.reduce((s, c) => s + c.width, 0);
        return (
          <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto mb-6">
            <table className="table-fixed text-left text-[11px]" style={{ width: tableWidth }}>
              <thead className="bg-[#0F1014]">
                <tr className="members-header-sep">
                  {visCols.map((col) => (
                    <th key={col.key} style={{ width: col.width }} className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/40 whitespace-nowrap">
                      <span className="inline-flex items-center">
                        {col.label}
                        {col.key !== "actions" && (
                          <button className="members-col-hide-btn" onClick={() => setHiddenBidCols((p) => new Set([...p, col.key]))} title={`Hide ${col.label}`}>✕</button>
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((bid) => (
                  <tr key={bid.id} className="border-b border-white/5 hover:bg-white/[0.025]">
                    {visCols.map((col) => {
                      switch (col.key) {
                        case "name": return <td key="name" className="px-3 py-0 h-8 text-white/90 align-middle overflow-hidden"><span className="block truncate" title={bid.name}>{bid.name}</span></td>;
                        case "status": return <td key="status" className="px-3 py-0 h-8 align-middle"><Badge label={normalizeBidStatus(bid.status)} /></td>;
                        case "borough": return (
                          <td key="borough" className="px-3 py-0 h-8 text-white/60 align-middle overflow-hidden">
                            <span className="block truncate" title={bid.borough || "—"}>
                              {bid.borough || "—"}
                            </span>
                          </td>
                        );
                        case "contact": return (
                          <td key="contact" className="px-3 py-0 h-8 text-white/55 align-middle overflow-hidden">
                            {(() => {
                              const primary = bid.contacts?.[0];
                              const name  = primary?.name  || bid.contactName || "";
                              const email = primary?.email || bid.contactEmail || "";
                              const phone = primary?.phone || bid.phone || "";
                              const extra = bid.contacts && bid.contacts.length > 1 ? ` +${bid.contacts.length - 1}` : "";
                              const text  = ([name, email, phone].filter(Boolean).join(" · ") + extra) || "—";
                              return <span className="block truncate" title={text}>{text}</span>;
                            })()}
                          </td>
                        );
                        case "nextAction": return (
                          <td key="nextAction" className="px-3 py-0 h-8 text-white/55 align-middle overflow-hidden">
                            <span className="block truncate" title={bid.nextAction || bid.notes || "—"}>
                              {bid.nextAction || bid.notes || "—"}
                            </span>
                          </td>
                        );
                        case "actions": return (
                          <td key="actions" className="px-3 py-0 h-8 align-middle">
                            <Btn size="sm" variant="secondary" onClick={() => openEdit(bid)}>Edit</Btn>
                          </td>
                        );
                        default: return null;
                      }
                    })}
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr>
                    <td className="px-3 py-4 text-white/40 text-xs" colSpan={visCols.length}>
                      No partners match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Create / Edit modal */}
      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === "create" ? "New Partner Organization" : "Edit Partner Organization"}>
        <div className="max-h-[70vh] overflow-y-auto pr-1 space-y-4">

          {/* Form fields */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Organization Name" required>
              <Input value={form.name} onChange={e => setField("name", e.target.value)} placeholder="e.g. Park Slope BID, NYC Chamber of Commerce" />
            </Field>
            <Field label="Status">
              <Select options={STATUSES} value={form.status} onChange={e => setField("status", e.target.value)} />
            </Field>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">Contacts</span>
                <Btn size="sm" variant="secondary" onClick={addContact}>+ Add Contact</Btn>
              </div>
              {(form.contacts ?? []).map((contact, i) => (
                <div key={contact.id} className="bg-[#0F1014] border border-white/8 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-white/30">{i === 0 ? "Primary Contact" : `Contact ${i + 1}`}</span>
                    {(form.contacts ?? []).length > 1 && (
                      <button className="text-white/30 hover:text-red-400 text-xs transition-colors" onClick={() => removeContact(contact.id)}>Remove</button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Name">
                      <Input value={contact.name} onChange={e => updateContact(contact.id, "name", e.target.value)} placeholder="Full name" />
                    </Field>
                    <Field label="Role">
                      <Input value={contact.role ?? ""} onChange={e => updateContact(contact.id, "role", e.target.value)} placeholder="e.g. Executive Director" />
                    </Field>
                    <Field label="Email">
                      <Input type="email" value={contact.email} onChange={e => updateContact(contact.id, "email", e.target.value)} placeholder="email@example.com" />
                    </Field>
                    <Field label="Phone">
                      <Input value={contact.phone} onChange={e => updateContact(contact.id, "phone", e.target.value)} placeholder="(555) 000-0000" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <Field label="Borough / Region">
              <Select options={["", ...BOROUGHS]} value={form.borough} onChange={e => setField("borough", e.target.value)} />
            </Field>
            <div className="col-span-2">
              <Field label="Address">
                <Input value={form.address ?? ""} onChange={e => setField("address", e.target.value)} placeholder="Street address (optional)" />
              </Field>
            </div>
            <div className="col-span-2">
              <Field label="Notes / Next Action">
                <TextArea rows={3} value={form.nextAction} onChange={e => setField("nextAction", e.target.value)} placeholder="Next steps, context, notes…" />
              </Field>
            </div>
          </div>

        </div>

        <div className="flex justify-between items-center gap-3 mt-5 pt-4 border-t border-white/8">
          <div>
            {editingBID && (
              <Btn variant="danger" onClick={() => void handleDeleteFromEdit()}>
                Delete Partner
              </Btn>
            )}
          </div>
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            {!editingBID && (
              <Btn
                variant="secondary"
                onClick={() => void handleSave({ addAnother: true })}
                disabled={!form.name.trim()}
                title="Save this partner and open a new form with the same borough"
              >
                Save &amp; Add Another
              </Btn>
            )}
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.name.trim()}>
              {editingBID ? "Save Changes" : "Create"}
            </Btn>
          </div>
        </div>
      </Modal>
    </MembersLayout>
  );
}
