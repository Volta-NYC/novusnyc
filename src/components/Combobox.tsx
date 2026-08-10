"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  isDisabled?: boolean;
  theme?: "light" | "dark";
}

/**
 * Type freely, pick from matches, or enter a value that is not on the list
 * at all. Used for schools, neighbourhoods and referral sources.
 *
 * Replaces the native <datalist>, which handed the panel to the browser and so
 * rendered an OS-styled list inside a themed form. SelectMenu cannot cover this
 * case because the value is not constrained to the options.
 */
export default function Combobox({
  value,
  onChange,
  options,
  placeholder = "Start typing",
  isDisabled = false,
  theme = "dark",
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    return Array.from(new Set(options.map((o) => o.trim()).filter(Boolean)))
      .filter((o) => o.toLowerCase().includes(query))
      // An exact match means they have already arrived; no need to offer it back.
      .filter((o) => o.toLowerCase() !== query)
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 50);
  }, [value, options]);

  useEffect(() => {
    if (!open) return;
    const onDocPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocPointer);
    return () => document.removeEventListener("mousedown", onDocPointer);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0 || !listRef.current) return;
    (listRef.current.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const light = theme === "light";

  const inputClass = light
    ? "novus-input disabled:cursor-not-allowed disabled:opacity-50"
    : "w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#F6B78D]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  const panelClass = light
    ? "absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-[10px] border-[1.5px] border-n-border bg-white py-1 shadow-lg"
    : "absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-white/10 bg-[#13161D] py-1 shadow-lg";

  const optionClass = (isActive: boolean) =>
    light
      ? `cursor-pointer px-4 py-2.5 font-body text-[15px] text-n-ink/80 transition-colors ${isActive ? "bg-n-orange/15" : ""}`
      : `cursor-pointer px-3 py-2 text-sm text-white/80 transition-colors ${isActive ? "bg-white/10" : ""}`;

  const commit = (option: string) => {
    onChange(option);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || matches.length === 0) {
      if (e.key === "ArrowDown" && matches.length > 0) { e.preventDefault(); setOpen(true); setActive(0); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); setActive(-1); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, matches.length - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, -1)); return; }
    // Enter accepts a highlighted suggestion, and otherwise leaves the typed
    // text alone so an unlisted value can be submitted as written.
    if (e.key === "Enter" && active >= 0) { e.preventDefault(); commit(matches[active]); }
  };

  return (
    <div ref={rootRef} className="relative">
      <input
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-autocomplete="list"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); setActive(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={isDisabled}
        className={inputClass}
      />

      {open && matches.length > 0 && (
        <ul ref={listRef} id={listId} role="listbox" className={panelClass}>
          {matches.map((option, i) => (
            <li
              key={option}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => { e.preventDefault(); commit(option); }}
              className={optionClass(i === active)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
