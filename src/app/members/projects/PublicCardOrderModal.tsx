"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn, Modal } from "@/components/members/ui";
import { revalidatePublicPages, updateBusiness, type Business } from "@/lib/members/storage";

type Surface = "showcase" | "home";

function orderValue(business: Business, surface: Surface): number {
  const value = surface === "home" ? business.homeSortIndex : business.showcaseSortIndex;
  return value ?? business.sortIndex ?? Number.MAX_SAFE_INTEGER;
}

export default function PublicCardOrderModal({
  open,
  businesses,
  onClose,
}: {
  open: boolean;
  businesses: Business[];
  onClose: () => void;
}) {
  const [surface, setSurface] = useState<Surface>("showcase");
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const eligible = useMemo(() => businesses
    .filter((business) => business.showcaseEnabled && (surface === "showcase" || business.showcaseFeaturedOnHome))
    .sort((a, b) => orderValue(a, surface) - orderValue(b, surface) || a.name.localeCompare(b.name)),
  [businesses, surface]);

  const byId = useMemo(() => new Map(businesses.map((business) => [business.id, business])), [businesses]);
  const ordered = orderedIds.map((id) => byId.get(id)).filter((business): business is Business => !!business);
  const databaseOrder = eligible.map((business) => business.id);
  const dirty = JSON.stringify(orderedIds) !== JSON.stringify(databaseOrder);

  useEffect(() => {
    if (!open) return;
    setOrderedIds(eligible.map((business) => business.id));
    setError("");
  }, [open, surface, eligible]);

  const move = (fromId: string, toId: string) => {
    if (fromId === toId) return;
    setOrderedIds((current) => {
      const from = current.indexOf(fromId);
      const to = current.indexOf(toId);
      if (from < 0 || to < 0) return current;
      const next = [...current];
      next.splice(from, 1);
      next.splice(to, 0, fromId);
      return next;
    });
  };

  const nudge = (id: string, offset: number) => {
    setOrderedIds((current) => {
      const index = current.indexOf(id);
      const nextIndex = index + offset;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await Promise.all(orderedIds.map((id, index) => updateBusiness(id, surface === "home"
        ? { homeSortIndex: (index + 1) * 1000 }
        : { showcaseSortIndex: (index + 1) * 1000 })));
      if (!(await revalidatePublicPages())) {
        setError("Order saved, but the public pages could not be refreshed. Try again shortly.");
        setSaving(false);
        return;
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The public card order was not saved.");
      setSaving(false);
      return;
    }
    setSaving(false);
    onClose();
  };

  const counts = {
    showcase: businesses.filter((business) => business.showcaseEnabled).length,
    home: businesses.filter((business) => business.showcaseEnabled && business.showcaseFeaturedOnHome).length,
  };

  return (
    <Modal open={open} onClose={onClose} title="Arrange public cards" dismissible={!saving}>
      <div className="mb-4 flex rounded-lg border border-white/10 bg-black/15 p-1">
        {(["showcase", "home"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSurface(key)}
            className={`flex-1 rounded-md px-3 py-2 text-xs font-medium transition-colors ${surface === key
              ? "bg-[#F6B78D] text-[#17171B]"
              : "text-white/55 hover:bg-white/5 hover:text-white/85"}`}
          >
            {key === "showcase" ? "Showcase" : "Home page"} · {counts[key]}
          </button>
        ))}
      </div>

      <p className="mb-3 text-xs leading-relaxed text-white/45">
        Drag cards into place, or use the arrow buttons. This order affects only the {surface === "showcase" ? "full Showcase" : "home-page selection"}.
      </p>

      {ordered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 px-4 py-10 text-center text-sm text-white/35">
          No cards are enabled for this surface yet.
        </div>
      ) : (
        <ol className="grid max-h-[55vh] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
          {ordered.map((business, index) => (
            <li
              key={business.id}
              draggable
              onDragStart={() => setDraggedId(business.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => { if (draggedId) move(draggedId, business.id); setDraggedId(null); }}
              className={`flex items-center gap-2 rounded-xl border bg-[#111319] p-2 transition-colors ${draggedId === business.id
                ? "border-[#F6B78D]/60 opacity-55"
                : "border-white/10 hover:border-white/25"}`}
            >
              <span className="w-6 shrink-0 text-center font-mono text-xs text-white/35">{index + 1}</span>
              <div className="h-11 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                {business.showcaseImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={business.showcaseImageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-lg font-semibold text-white/25">
                    {business.name.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-white/85">{business.name}</p>
                <p className="truncate text-[10px] text-white/35">{business.neighborhood || "No neighborhood"}</p>
              </div>
              <div className="flex shrink-0 flex-col">
                <button type="button" onClick={() => nudge(business.id, -1)} disabled={index === 0}
                  aria-label={`Move ${business.name} earlier`}
                  className="rounded px-1.5 py-0.5 text-xs text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-20">↑</button>
                <button type="button" onClick={() => nudge(business.id, 1)} disabled={index === ordered.length - 1}
                  aria-label={`Move ${business.name} later`}
                  className="rounded px-1.5 py-0.5 text-xs text-white/45 hover:bg-white/10 hover:text-white disabled:opacity-20">↓</button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {error && <p role="alert" className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
      <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4">
        <Btn variant="ghost" onClick={onClose} disabled={saving}>Cancel</Btn>
        <Btn variant="primary" onClick={() => void save()} disabled={!dirty || saving}>
          {saving ? "Saving order…" : "Save order"}
        </Btn>
      </div>
    </Modal>
  );
}
