"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

/** How long typed characters keep accumulating before the buffer resets. */
const TYPE_AHEAD_MS = 700;

/**
 * A select that looks like the rest of the public form.
 *
 * Native <select> and <datalist> both hand rendering to the browser, which is
 * why the old school field dropped a black OS-styled panel into a light form.
 * This keeps the trigger visually identical to .novus-input so the two sit
 * flush, and renders its own panel at the trigger's width.
 */
export default function SelectMenu({
  value,
  onChange,
  options,
  placeholder = "Select one",
  disabled = false,
  invalid = false,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[];
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const typeAhead = useRef({ text: "", at: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const items = useMemo(() => options.filter(Boolean), [options]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [open]);

  // Keep the highlighted row in view when arrowing through a long city list.
  useEffect(() => {
    if (!open || active < 0 || !listRef.current) return;
    const el = listRef.current.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const openWith = (index: number) => {
    if (disabled) return;
    setActive(index);
    setOpen(true);
  };

  const commit = (index: number) => {
    const next = items[index];
    if (next === undefined) return;
    onChange(next);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const selectedIndex = items.indexOf(value);

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openWith(selectedIndex >= 0 ? selectedIndex : 0);
        return;
      }
      // Typing on a closed trigger opens the menu and seeds the search below,
      // so reaching NY never requires opening the list first.
      if (!(e.key.length === 1 && /\S/.test(e.key))) return;
      setOpen(true);
    }

    if (e.key === "Escape") { e.preventDefault(); setOpen(false); return; }
    if (e.key === "Tab") { setOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, items.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Home") { e.preventDefault(); setActive(0); return; }
    if (e.key === "End") { e.preventDefault(); setActive(items.length - 1); return; }
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(active); return; }

    // Type-ahead. Keystrokes accumulate into a buffer that expires after a
    // pause, which is what makes "NY" reach NY instead of stopping at NC: a
    // per-key search would restart on the Y and match nothing.
    if (e.key.length === 1 && /\S/.test(e.key)) {
      e.preventDefault();
      const now = Date.now();
      const fresh = now - typeAhead.current.at > TYPE_AHEAD_MS;
      const buffer = (fresh ? "" : typeAhead.current.text) + e.key.toLowerCase();
      typeAhead.current = { text: buffer, at: now };

      // A repeated single letter cycles through its matches, the way a native
      // select does; a longer buffer is a prefix and matches from the top.
      const matches = (i: number) => items[i]?.toLowerCase().startsWith(buffer);
      let found = -1;
      if (buffer.length === 1) {
        for (let n = 1; n <= items.length; n += 1) {
          const i = (active + n + items.length) % items.length;
          if (matches(i)) { found = i; break; }
        }
      } else {
        found = items.findIndex((_, i) => matches(i));
      }
      if (found !== -1) setActive(found);
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openWith(Math.max(items.indexOf(value), 0)))}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        className={`novus-input flex items-center justify-between gap-3 text-left ${
          invalid ? "border-red-400" : ""
        } ${disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
      >
        <span className={value ? "text-n-ink" : "text-n-muted"}>{value || placeholder}</span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className={`h-4 w-4 flex-shrink-0 text-n-muted transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-[10px] border-[1.5px] border-n-border bg-white py-1 shadow-lg"
        >
          {items.length === 0 && (
            <li className="px-4 py-2.5 font-body text-sm text-n-muted">Nothing to choose yet</li>
          )}
          {items.map((option, i) => {
            const selected = option === value;
            return (
              <li
                key={option}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); commit(i); }}
                className={`cursor-pointer px-4 py-2.5 font-body text-[15px] transition-colors ${
                  i === active ? "bg-n-orange/15" : ""
                } ${selected ? "font-semibold text-n-ink" : "text-n-ink/80"}`}
              >
                {option}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
