"use client";
/* eslint-disable @next/next/no-img-element -- image picker previews a local data URL before it is uploaded */
import { getAuthToken } from "@/lib/members/supabaseAuth";

import { useState, useEffect } from "react";
import Image from "next/image";
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
import { findCommunityPartner } from "@/data";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────

const STATUSES   = ["Active Partner", "In Conversation", "Outreach", "Paused"] as const;
const BOROUGHS   = ["Brooklyn", "Queens", "Manhattan", "Bronx", "Staten Island", "New York (All Boroughs)"];
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

// ── PAGE COMPONENT ────────────────────────────────────────────────────────────

export default function BIDTrackerPage() {
  const [bids, setBids]               = useState<BID[]>([]);
  const [chapters, setChapters]       = useState<Chapter[]>([]);
  const [chapterId, setChapterId]     = useState<string | null>(null);
  const [search, setSearch]           = useState("");
  const [modal, setModal]             = useState<"create" | "edit" | null>(null);
  const [editingBID, setEditingBID]   = useState<BID | null>(null);
  const [form, setForm]               = useState(BLANK_FORM);
  const [pendingLogo, setPendingLogo] = useState<string | null>(null);
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);

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
    setPendingLogo(null);
    setSaveError(null);
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
    setPendingLogo(null);
    setSaveError(null);
    setModal("edit");
  };

  const chooseLogo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setSaveError("Choose an image file (PNG, JPG, WebP, or GIF)."); return; }
    if (file.size > 5 * 1024 * 1024) { setSaveError("That logo is larger than 5 MB. Choose a smaller image."); return; }
    setSaveError(null);
    const reader = new FileReader();
    reader.onload = () => setPendingLogo(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const uploadLogo = async (partnerId: string, dataUrl: string) => {
    const token = await getAuthToken();
    const response = await fetch("/api/members/upload-partner-logo", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ partnerId, dataUrl }),
    });
    if (!response.ok) throw new Error("The logo could not be uploaded. Please try again.");
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
    setSaving(true);
    try {
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

    let partnerId = editingBID?.id;
    if (editingBID) {
      await updateBID(editingBID.id, { ...(form as Partial<BID>), ...legacySync, status: normalizeBidStatus(form.status), ...geocodePatch });
    } else {
      partnerId = await createBID({
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
    if (pendingLogo && partnerId) await uploadLogo(partnerId, pendingLogo);

    if (opts?.addAnother && !editingBID) {
      // Carry the borough selection over since BID tours are typically within one borough.
      setForm({ ...BLANK_FORM, borough });
      setEditingBID(null);
      setModal("create");
    } else {
      setModal(null);
    }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Changes could not be saved. Please try again.");
    } finally {
      setSaving(false);
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
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900"
                }`}
              >
                {c.name}
                <span className="ml-1.5 font-mono tabular-nums text-stone-400">{n}</span>
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

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name or location…" />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sorted.map((bid) => {
          const publicPartner = findCommunityPartner(bid.name);
          const primaryContact = bid.contacts?.[0];
          const contactName = primaryContact?.name || bid.contactName || "";
          const contactEmail = primaryContact?.email || bid.contactEmail || "";
          const initials = bid.name.split(/\s+/).filter(Boolean).slice(0, 2)
            .map((part) => part[0]?.toUpperCase()).join("");
          return (
            <article
              key={bid.id}
              className="group flex min-h-[330px] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative flex h-32 items-center justify-center border-b border-white/8 bg-white px-8 py-5">
                {bid.logoUrl || publicPartner ? (
                  <Image
                    src={bid.logoUrl || publicPartner!.logo}
                    alt={`${bid.name} logo`}
                    fill
                    sizes="(max-width: 640px) 90vw, (max-width: 1280px) 45vw, 30vw"
                    className="object-contain p-6"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F6B78D]/20 text-xl font-bold tracking-tight text-[#8B5E48]">
                    {initials || "ORG"}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-[15px] font-semibold leading-snug text-stone-900">{bid.name}</h2>
                    <p className="mt-1 text-[11px] text-stone-500">{bid.borough || "Location not recorded"}</p>
                  </div>
                  <Badge label={normalizeBidStatus(bid.status)} />
                </div>
                {!isMemberRestricted && (
                  <div className="mb-4 space-y-1 text-[11px] text-stone-600">
                    <p>{contactName || "No primary contact recorded"}</p>
                    {contactEmail && (
                      <a href={`mailto:${contactEmail}`} className="block truncate text-[#8B5E48] hover:underline">
                        {contactEmail}
                      </a>
                    )}
                    {bid.contacts && bid.contacts.length > 1 && (
                      <p className="text-stone-400">{bid.contacts.length - 1} additional contact{bid.contacts.length === 2 ? "" : "s"}</p>
                    )}
                  </div>
                )}
                {!isMemberRestricted && (bid.nextAction || bid.notes) && (
                  <div className="mb-4 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2">
                    <p className="mb-1 text-[9px] font-semibold uppercase tracking-wider text-stone-500">Next action</p>
                    <p className="line-clamp-2 text-[11px] leading-relaxed text-stone-700">{bid.nextAction || bid.notes}</p>
                  </div>
                )}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-stone-100 pt-3">
                  {publicPartner ? (
                    <a href={publicPartner.website} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-[#8B5E48] hover:underline">
                      Visit website ↗
                    </a>
                  ) : (
                    <span className="text-[10px] text-stone-400">No public logo yet</span>
                  )}
                  {canEdit && <Btn size="sm" variant="secondary" onClick={() => openEdit(bid)}>Edit details</Btn>}
                </div>
              </div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="sm:col-span-2 xl:col-span-3">
            <Empty message="No partners match your filters." action={canEdit ? <Btn variant="primary" onClick={openCreate}>Add first partner</Btn> : undefined} />
          </div>
        )}
      </div>

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
            <div className="col-span-2 rounded-xl border border-stone-200 bg-stone-50 p-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-white">
                  {pendingLogo || editingBID?.logoUrl || findCommunityPartner(editingBID?.name ?? form.name)?.logo ? (
                    <img src={pendingLogo || editingBID?.logoUrl || findCommunityPartner(editingBID?.name ?? form.name)!.logo} alt="Partner logo preview" className="h-full w-full object-contain p-1" />
                  ) : <span className="flex h-full items-center justify-center text-[10px] font-medium text-stone-400">No logo</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-900">Public logo</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-stone-600">Used on this card and across the public partner section on the home page.</p>
                </div>
                <label className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-[#8B5E48] hover:text-[#8B5E48]">
                  Replace logo
                  <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={(event) => chooseLogo(event.target.files?.[0])} />
                </label>
              </div>
              <p className="mt-2 text-[11px] text-stone-500">PNG, JPG, WebP, or GIF · up to 5 MB. Changes update the public site automatically.</p>
            </div>
            <div className="col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wide text-stone-500 font-semibold">Contacts</span>
                <Btn size="sm" variant="secondary" onClick={addContact}>+ Add Contact</Btn>
              </div>
              {(form.contacts ?? []).map((contact, i) => (
                <div key={contact.id} className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wide text-stone-500">{i === 0 ? "Primary Contact" : `Contact ${i + 1}`}</span>
                    {(form.contacts ?? []).length > 1 && (
                      <button className="text-stone-500 hover:text-red-600 text-xs transition-colors" onClick={() => removeContact(contact.id)}>Remove</button>
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

        <div className="flex justify-between items-center gap-3 mt-5 pt-4 border-t border-stone-200">
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
                disabled={!form.name.trim() || saving}
                title="Save this partner and open a new form with the same borough"
              >
                Save &amp; Add Another
              </Btn>
            )}
            <Btn variant="primary" onClick={() => void handleSave()} disabled={!form.name.trim() || saving}>
              {saving ? "Saving…" : editingBID ? "Save Changes" : "Create"}
            </Btn>
          </div>
        </div>
        {saveError && <p role="alert" className="mt-3 text-sm text-red-700">{saveError}</p>}
      </Modal>
    </MembersLayout>
  );
}
