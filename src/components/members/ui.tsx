"use client";

import { cloneElement, isValidElement, useState, ReactNode, ReactElement, useCallback, useEffect, useId, useMemo, useRef } from "react";
import Combobox from "@/components/Combobox";

// ── BADGE ─────────────────────────────────────────────────────────────────────
// Maps status/priority/role strings to their Tailwind color classes.

const BADGE_COLORS: Record<string, string> = {
  // project / business status
  Active:              "bg-green-500/15 text-green-400 border-green-500/20",
  Ongoing:             "bg-green-500/15 text-green-400 border-green-500/20",
  "Active Partner":    "bg-green-500/15 text-green-400 border-green-500/20",
  Complete:            "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Completed:           "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Done:                "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Delivered:           "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Planning:            "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Awarded:             "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Submitted:           "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  "In Progress":       "bg-blue-400/15 text-blue-300 border-blue-400/20",
  "In Conversation":   "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  Outreach:            "bg-gray-500/15 text-gray-300 border-gray-500/20",
  Discovery:           "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  Researched:          "bg-indigo-500/15 text-indigo-400 border-indigo-500/20",
  "Cold Outreach":     "bg-gray-500/15 text-gray-400 border-gray-500/20",
  "Not Started":       "bg-gray-500/15 text-gray-400 border-gray-500/20",
  Upcoming:              "bg-gray-500/15 text-gray-400 border-gray-500/20",
  "In Development":      "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
  "Awaiting Client":     "bg-purple-400/15 text-purple-300 border-purple-400/20",
  "Awaiting Deployment": "bg-sky-400/15 text-sky-300 border-sky-400/20",
  "In Planning":         "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
  "Consistent Posts":    "bg-emerald-400/15 text-emerald-300 border-emerald-400/20",
  // tech project pipeline
  Backlog:             "bg-gray-500/15 text-gray-400 border-gray-500/20",
  Assigned:            "bg-indigo-500/15 text-indigo-300 border-indigo-500/20",
  "Draft Ready":       "bg-yellow-400/15 text-yellow-300 border-yellow-400/20",
  "With Client":       "bg-purple-400/15 text-purple-300 border-purple-400/20",
  Live:                "bg-green-500/15 text-green-400 border-green-500/20",
  Dropped:             "bg-red-900/30 text-red-500 border-red-900/20",
  Maybe:               "bg-gray-500/15 text-gray-400 border-gray-500/20",
  // pod attendance
  Present:             "bg-green-500/15 text-green-400 border-green-500/20",
  Excused:             "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Unexcused:           "bg-red-500/15 text-red-400 border-red-500/20",
  lit:                 "bg-[#F3E28D]/15 text-[#F3E28D] border-[#F3E28D]/25",
  Open:                "bg-gray-500/15 text-gray-300 border-gray-500/20",
  Blocked:             "bg-red-500/15 text-red-400 border-red-500/20",
  Rejected:            "bg-red-500/15 text-red-400 border-red-500/20",
  Paused:              "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "On Hold":           "bg-orange-500/15 text-orange-400 border-orange-500/20",
  "In Review":         "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  "Form Sent":         "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Dead:                "bg-red-900/30 text-red-500 border-red-900/20",
  // interview status
  Available:           "bg-green-500/15 text-green-400 border-green-500/20",
  Booked:              "bg-blue-500/15 text-blue-400 border-blue-500/20",
  // priority
  Urgent: "bg-red-500/15 text-red-400 border-red-500/20",
  High:   "bg-orange-500/15 text-orange-400 border-orange-500/20",
  Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
  Low:    "bg-gray-500/15 text-gray-400 border-gray-500/20",
  // auth role
  admin:        "bg-red-500/15 text-red-400 border-red-500/20",
  interviewer:  "bg-cyan-500/15 text-cyan-300 border-cyan-500/20",
  member:       "bg-green-500/15 text-green-400 border-green-500/20",
  viewer:       "bg-gray-500/15 text-gray-400 border-gray-500/20",
  // team role
  "Team Lead": "bg-blue-500/15 text-blue-400 border-blue-500/20",
  Member:      "bg-green-500/15 text-green-400 border-green-500/20",
  Associate:   "bg-purple-500/15 text-purple-400 border-purple-500/20",
  Alumni:      "bg-gray-500/15 text-gray-400 border-gray-500/20",
  Inactive:    "bg-gray-700/40 text-gray-500 border-gray-700/20",
};

export function Badge({ label }: { label: string }) {
  const colorClass = BADGE_COLORS[label] ?? "bg-gray-500/15 text-gray-400 border-gray-500/20";
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${colorClass} whitespace-nowrap`}>
      {label}
    </span>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────

export function Modal({ open, onClose, title, children, dismissible = true }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) { onCloseRef.current(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && dialogRef.current) {
        const form = dialogRef.current.querySelector<HTMLFormElement>("form");
        if (form) { e.preventDefault(); form.requestSubmit(); return; }
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [dismissible, open]);

  // Auto-focus the first real form field when the modal opens. We pick the
  // first input/textarea/select before falling back to a button so the close
  // X (which sits earlier in the DOM) isn't what receives focus.
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const field = root.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]),textarea:not([disabled]),select:not([disabled])'
      );
      const fallback = root.querySelector<HTMLElement>('button:not([disabled]),[tabindex]:not([tabindex="-1"])');
      (field ?? fallback)?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-3 sm:py-8 sm:px-4">
      <div className="fixed inset-0 bg-black/70" onClick={dismissible ? onClose : undefined} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-[#1C1F26] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto p-4 sm:p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="font-display font-bold text-white text-lg">{title}</h2>
          {dismissible && <button type="button" onClick={onClose} aria-label="Close dialog" className="text-white/50 hover:text-white p-2 transition-colors rounded-lg">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>}
        </div>
        {children}
      </div>
    </div>
  );
}

// ── FORM FIELD ────────────────────────────────────────────────────────────────

export function Field({ label, children, required }: {
  label: string;
  children: ReactNode;
  required?: boolean;
}) {
  const generatedId = `members-field-${useId().replace(/:/g, "")}`;
  const labelId = `${generatedId}-label`;
  const controlId = isValidElement(children) && typeof (children.props as { id?: unknown }).id === "string"
    ? (children.props as { id: string }).id
    : generatedId;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: controlId,
        "aria-labelledby": labelId,
      })
    : children;

  return (
    <div>
      <label id={labelId} htmlFor={controlId} className="block text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {control}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full bg-[#0F1014] border border-white/35 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#F6B78D] transition-colors ${className}`}
    />
  );
}

// Input that toggles between `password` and `text` types via an eye icon.
// Accepts the same props as Input, minus `type` (which is forced to password/text).
type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;
export function PasswordInput({ className = "", ...props }: PasswordInputProps) {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="relative w-full">
      <input
        {...props}
        type={reveal ? "text" : "password"}
        className={`w-full bg-[#0F1014] border border-white/35 rounded-lg px-3 pr-10 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#F6B78D] transition-colors ${className}`}
      />
      <button
        type="button"
        onClick={() => setReveal(v => !v)}
        aria-label={reveal ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
      >
        {reveal ? (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export function TextArea({ className = "", ...props }: TextAreaProps) {
  return (
    <textarea
      {...props}
      className={`w-full bg-[#0F1014] border border-white/35 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#F6B78D] transition-colors resize-none ${className}`}
    />
  );
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options?: readonly string[];
  emptyLabel?: string;
  children?: React.ReactNode;
};
export function Select({ options, className = "", emptyLabel = "— Select —", children, ...props }: SelectProps) {
  return (
    <div className="relative w-full">
      <select
        {...props}
        className={`w-full appearance-none bg-[#0F1014] border border-white/35 rounded-lg pl-3 pr-11 py-2.5 text-sm text-white focus:outline-none focus:border-[#F6B78D] transition-colors ${className}`}
      >
        {children ?? (
          <>
            <option value="">{emptyLabel}</option>
            {(options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
          </>
        )}
      </select>
      {/* Custom chevron — positioned well inside the border */}
      <svg
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

// ── SEARCH BAR ────────────────────────────────────────────────────────────────

export function SearchBar({ value, onChange, placeholder = "Search…", debounceMs = 250 }: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}) {
  const [local, setLocal] = useState(value);

  useEffect(() => { setLocal(value); }, [value]);

  useEffect(() => {
    if (!debounceMs) return;
    if (local === value) return;
    const t = setTimeout(() => onChange(local), debounceMs);
    return () => clearTimeout(t);
  }, [local, debounceMs, onChange, value]);

  const handleChange = (next: string) => {
    setLocal(next);
    if (!debounceMs) onChange(next);
  };

  const handleClear = () => {
    setLocal("");
    onChange("");
  };

  return (
    <div className="relative flex-1 min-w-0">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input
        aria-label="Search"
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1C1F26] border border-white/35 rounded-lg pl-9 pr-16 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#F6B78D] transition-colors"
      />
      {local ? (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      ) : null}
    </div>
  );
}

// ── TYPEAHEAD INPUTS ─────────────────────────────────────────────────────────
export function AutocompleteInput({
  id,
  "aria-labelledby": ariaLabelledBy,
  value,
  onChange,
  options,
  placeholder = "Start typing…",
  className = "",
  showOnEmpty = false,
}: {
  id?: string;
  "aria-labelledby"?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  showOnEmpty?: boolean;
}) {
  return <Combobox id={id} ariaLabelledBy={ariaLabelledBy} value={value} onChange={onChange} options={options} placeholder={placeholder} theme="dark" className={className} showOnEmpty={showOnEmpty} />;
}

export function AutocompleteTagInput({
  id,
  "aria-labelledby": ariaLabelledBy,
  values,
  onChange,
  options,
  commitOnBlur = false,
  placeholder = "Type to search, then press Enter",
}: {
  id?: string;
  "aria-labelledby"?: string;
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  commitOnBlur?: boolean;
  placeholder?: string;
}) {
  const [inputText, setInputText] = useState("");
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = `tag-ac-${useId().replace(/[:]/g, "")}`;
  const safeValues = values ?? [];

  const normalizedOptions = Array.from(
    new Set(
      (options ?? [])
        .map((option) => option.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (tag && !safeValues.includes(tag)) onChange([...safeValues, tag]);
    setInputText("");
  };

  const removeTag = (tag: string) => onChange(safeValues.filter((value) => value !== tag));
  const filteredOptions = normalizedOptions.filter((option) => {
    const query = inputText.trim().toLowerCase();
    return !safeValues.includes(option) && (!query || option.toLowerCase().includes(query));
  });

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  const addOption = (option: string) => {
    addTag(option);
    setOpen(false);
    setFocusedIndex(-1);
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="flex flex-wrap gap-1.5 mb-2">
        {safeValues.map((tag) => (
          <span key={tag} className="flex items-center gap-1 text-xs bg-[#F6B78D]/15 text-[#F6B78D] border border-[#F6B78D]/20 px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)} className="text-red-300 hover:text-red-200 transition-colors">×</button>
          </span>
        ))}
      </div>

      <input
        id={id}
        aria-labelledby={ariaLabelledBy}
        role="combobox"
        aria-expanded={open && filteredOptions.length > 0}
        aria-controls={listId}
        aria-activedescendant={focusedIndex >= 0 ? `${listId}-${focusedIndex}` : undefined}
        aria-autocomplete="list"
        value={inputText}
        onChange={(e) => { setInputText(e.target.value); setOpen(true); setFocusedIndex(-1); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setFocusedIndex(-1);
            return;
          }
          if (e.key === "ArrowDown" && filteredOptions.length > 0) {
            e.preventDefault();
            setOpen(true);
            setFocusedIndex((index) => Math.min(index + 1, filteredOptions.length - 1));
            return;
          }
          if (e.key === "ArrowUp" && filteredOptions.length > 0) {
            e.preventDefault();
            setFocusedIndex((index) => Math.max(index - 1, 0));
            return;
          }
          if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
            e.preventDefault();
            if (e.key === "Enter" && focusedIndex >= 0) addOption(filteredOptions[focusedIndex]);
            else addTag(inputText);
          }
        }}
        onBlur={() => {
          if (commitOnBlur) addTag(inputText);
        }}
        placeholder={placeholder}
        className="w-full bg-[#0F1014] border border-white/35 rounded-lg px-3 py-2 text-sm text-white placeholder-white/50 focus:outline-none focus:border-[#F6B78D]"
      />

      {open && filteredOptions.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#13161D] py-1 shadow-xl">
          {filteredOptions.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={focusedIndex === index}
              onMouseEnter={() => setFocusedIndex(index)}
              onMouseDown={(event) => { event.preventDefault(); addOption(option); }}
              className={`cursor-pointer px-3 py-2 text-sm text-white/80 transition-colors ${focusedIndex === index ? "bg-white/10" : "hover:bg-white/5"}`}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── SEARCH SELECT ─────────────────────────────────────────────────────────────
// Searchable dropdown that replaces native <select> for lists with many options.
// Keyboard: ArrowDown/Up to navigate, Enter to commit, Escape to close.

export interface SearchSelectOption {
  value: string;
  label: string;
  subtitle?: string;
}

export function SearchSelect({
  id,
  "aria-labelledby": ariaLabelledBy,
  value,
  onChange,
  options,
  placeholder = "Select…",
  clearable = false,
  emptyLabel = "No matches",
  className = "",
}: {
  id?: string;
  "aria-labelledby"?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchSelectOption[];
  placeholder?: string;
  clearable?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.subtitle?.toLowerCase().includes(q) ?? false),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setFocusedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const openDropdown = () => {
    setQuery("");
    setFocusedIndex(-1);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const commit = (v: string) => {
    onChange(v);
    setOpen(false);
    setQuery("");
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const clearRow = clearable ? 1 : 0;
    const total = filtered.length + clearRow;
    if (e.key === "Escape") { setOpen(false); setQuery(""); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setFocusedIndex((i) => Math.min(i + 1, total - 1)); return; }
    if (e.key === "ArrowUp") { e.preventDefault(); setFocusedIndex((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter") {
      e.preventDefault();
      if (clearable && focusedIndex === 0) { commit(""); return; }
      const item = filtered[focusedIndex - clearRow];
      if (item) commit(item.value);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        id={id}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        type="button"
        onClick={() => (open ? setOpen(false) : openDropdown())}
        className={`w-full flex items-center justify-between bg-[#0F1014] border rounded-lg px-3 py-2.5 text-sm text-left transition-colors ${open ? "border-[#F6B78D]/50" : "border-white/10 hover:border-white/20"}`}
      >
        <span className={selected ? "text-white" : "text-white/30"}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-white/40 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#1C1F26] border border-white/10 rounded-lg shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-white/8">
            <div className="relative">
              <svg
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none"
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => { setQuery(e.target.value); setFocusedIndex(-1); }}
                onKeyDown={handleKeyDown}
                placeholder="Type to filter…"
                className="w-full bg-[#0F1014] border border-white/8 rounded-md pl-8 pr-3 py-1.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#F6B78D]/40"
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1">
            {clearable && (
              <li>
                <button
                  type="button"
                  onClick={() => commit("")}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors text-white/35 hover:bg-white/5 ${focusedIndex === 0 ? "bg-white/8" : ""}`}
                >
                  — None —
                </button>
              </li>
            )}
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-white/25 text-center">{emptyLabel}</li>
            ) : (
              filtered.map((opt, i) => {
                const fi = i + (clearable ? 1 : 0);
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => commit(opt.value)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors ${opt.value === value ? "text-[#F6B78D] bg-[#F6B78D]/8" : "text-white/85 hover:bg-white/5"} ${focusedIndex === fi ? "bg-white/8" : ""}`}
                    >
                      <span className="block">{opt.label}</span>
                      {opt.subtitle && (
                        <span className="block text-[10px] text-white/35 mt-0.5">{opt.subtitle}</span>
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── PAGE HEADER ───────────────────────────────────────────────────────────────
// Renders the page title, optional subtitle, and an optional action area (e.g. "Add" button).
// Uses min-w-0 on the title so it can shrink, and flex-shrink-0 on the action
// so buttons are never compressed or pushed off-screen by long content.

export function PageHeader({ title, subtitle, action }: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="members-page-header mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-start md:justify-between">
      <div className="min-w-0">
        <h1 className="font-display font-bold text-white text-2xl">{title}</h1>
        {subtitle && <p className="text-white/40 text-sm mt-1">{subtitle}</p>}
      </div>
      {action && (
        <div className="members-page-header-action w-full md:w-auto md:flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────

export function StatCard({ label, value, color = "text-[#F6B78D]" }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-4">
      <p className="text-white/55 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-display font-bold text-2xl tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

// ── BUTTON ────────────────────────────────────────────────────────────────────

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: "sm" | "md";
}

const BTN_CLASSES: Record<BtnVariant, string> = {
  primary:   "bg-[#F6B78D] text-[#0D0D0D] font-bold hover:bg-[#E9A77E]",
  secondary: "bg-white/8 text-white hover:bg-white/14 border border-white/10",
  danger:    "bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20",
  ghost:     "text-white/50 hover:text-white hover:bg-white/8",
};

export function Btn({ variant = "secondary", size = "md", className = "", children, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${size === "sm" ? "text-xs px-3 py-1.5" : "text-sm px-4 py-2"}
        ${BTN_CLASSES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────

export function Empty({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="text-center py-16">
      <p className="text-white/30 text-sm mb-3">{message}</p>
      {action}
    </div>
  );
}

// ── CONFIRM DELETE DIALOG ─────────────────────────────────────────────────────
// Returns an `ask` function to trigger the dialog and a `Dialog` component to render it.
// Usage: const { ask, Dialog } = useConfirm();
//        <Dialog /> somewhere in JSX, then ask(() => doDelete()) on button click.

export function useConfirm() {
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [message, setMessage]   = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const [errMsg, setErrMsg]     = useState<string | null>(null);

  const ask = (action: () => Promise<void>, customMessage?: string) => {
    setPendingAction(() => action);
    setMessage(customMessage ?? null);
    setErrMsg(null);
  };

  const confirm = async () => {
    const action = pendingAction;
    if (!action) return;
    setLoading(true);
    setErrMsg(null);
    try {
      await action();
      setPendingAction(null);
      setMessage(null);
      setErrMsg(null);
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const cancel = () => {
    if (loading) return;
    setPendingAction(null);
    setMessage(null);
    setErrMsg(null);
  };

  const Dialog = () =>
    pendingAction ? (
      <Modal open={Boolean(pendingAction)} onClose={cancel} title="Are you sure?">
        <div className="max-w-sm">
          <p className="text-white/40 text-sm mb-5">{message ?? "This cannot be undone."}</p>
          {errMsg && (
            <p role="alert" className="text-red-400 text-xs mb-3 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {errMsg}
            </p>
          )}
          <div className="flex gap-3 justify-end">
            <Btn variant="ghost" size="sm" onClick={cancel} disabled={loading}>Cancel</Btn>
            <Btn variant="danger" size="sm" onClick={() => void confirm()} disabled={loading}>
              {loading ? "Deleting…" : "Delete"}
            </Btn>
          </div>
        </div>
      </Modal>
    ) : null;

  return { ask, Dialog };
}

// ── MULTI-SELECT TAG INPUT ────────────────────────────────────────────────────
// Renders existing tags as removable pills. Users can add tags by picking from
// the dropdown or by typing a custom value and pressing Enter.

export function TagInput({
  values,
  onChange,
  options,
  commitOnBlur = false,
  customPlaceholder = "Or type custom…",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  commitOnBlur?: boolean;
  customPlaceholder?: string;
}) {
  const [inputText, setInputText] = useState("");

  // Guard: legacy rows may return undefined for empty arrays.
  const safeValues = values ?? [];

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (tag && !safeValues.includes(tag)) onChange([...safeValues, tag]);
    setInputText("");
  };

  const removeTag = (tag: string) => onChange(safeValues.filter((v) => v !== tag));

  return (
    <div>
      {/* Current tags */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {safeValues.map((tag) => (
          <span key={tag} className="flex items-center gap-1 text-xs bg-[#F6B78D]/15 text-[#F6B78D] border border-[#F6B78D]/20 px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeTag(tag)} className="text-red-300 hover:text-red-200 transition-colors">×</button>
          </span>
        ))}
      </div>
      {/* Add tag controls */}
      <div className="flex gap-2">
        <select
          aria-label="Add an item from the list"
          value=""
          onChange={(e) => { if (e.target.value) addTag(e.target.value); }}
          className="bg-[#0F1014] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#F6B78D]/50 flex-1"
        >
          <option value="">Add from list…</option>
          {options.filter((opt) => !safeValues.includes(opt)).map((opt) => <option key={opt}>{opt}</option>)}
        </select>
        <input
          aria-label="Add a custom item"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
              e.preventDefault();
              addTag(inputText);
            }
          }}
          onBlur={() => {
            if (commitOnBlur) addTag(inputText);
          }}
          placeholder={customPlaceholder}
          className="bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#F6B78D]/50 flex-1"
        />
        <button
          type="button"
          onClick={() => addTag(inputText)}
          disabled={!inputText.trim()}
          className="px-3 py-2 rounded-lg text-sm bg-[#F6B78D]/20 text-[#F6B78D] border border-[#F6B78D]/35 hover:bg-[#F6B78D]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── SPINNER ───────────────────────────────────────────────────────────────────

export function Spinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sz = size === "sm" ? "w-5 h-5" : size === "lg" ? "w-8 h-8" : "w-6 h-6";
  return (
    <div role="status" aria-label="Loading" className={`${sz} border-2 border-[#F6B78D]/30 border-t-[#F6B78D] rounded-full animate-spin`} />
  );
}

// ── SKELETON ──────────────────────────────────────────────────────────────────
// Placeholder block shown while async data loads.

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-white/5 animate-pulse rounded ${className}`} />;
}

export function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── COPY BUTTON ───────────────────────────────────────────────────────────────
// Small inline icon button — writes the given text to the clipboard, flashes a
// check for 1.5s, then resets.

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied or unsupported — fail silently; this is a UX nicety, not critical.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={label ?? "Copy to clipboard"}
      className="inline-flex items-center justify-center w-5 h-5 rounded text-white/30 hover:text-white hover:bg-white/10 transition-colors"
    >
      {copied ? (
        <svg className="w-3 h-3 text-[#F6B78D]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

// ── TOGGLE ────────────────────────────────────────────────────────────────────

export function Toggle({ checked, onChange, label }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label ? undefined : "Toggle setting"}
      onClick={() => onChange(!checked)}
      className={`group inline-flex w-fit select-none items-center focus-visible:outline-none ${label ? "gap-3" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors duration-200 group-focus-visible:ring-2 group-focus-visible:ring-[#F6B78D]/60 group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-[#1C1F26] ${checked ? "bg-[#F6B78D]" : "bg-white/15"}`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-[3px] top-[3px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ease-out ${checked ? "translate-x-5" : "translate-x-0"}`}
        />
      </span>
      {label && <span className="text-sm text-white/80 transition-colors group-hover:text-white">{label}</span>}
    </button>
  );
}

// ── VIEW PANEL ────────────────────────────────────────────────────────────────
// Unified "View" button + dropdown used by every admin table to host filter,
// sort, and column-visibility controls in one place.

export interface SortRule { col: number; dir: "asc" | "desc" }

export function SortPanel({
  rules,
  options,
  onChange,
  onAdd,
  onRemove,
  onReset,
}: {
  rules: SortRule[];
  options: { value: number; label: string }[];
  onChange: (idx: number, field: "col" | "dir", value: number | string) => void;
  onAdd: () => void;
  onRemove: (idx: number) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-2">
      {rules.map((rule, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="text-[10px] text-white/40 w-[52px] flex-shrink-0">{idx === 0 ? "Sort by" : "Then by"}</span>
          <select
            value={rule.col}
            onChange={(e) => onChange(idx, "col", Number(e.target.value))}
            className="flex-1 bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#F6B78D]/45"
          >
            {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={rule.dir}
            onChange={(e) => onChange(idx, "dir", e.target.value)}
            className="bg-[#0F1014] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#F6B78D]/45 w-[68px]"
          >
            <option value="asc">A→Z</option>
            <option value="desc">Z→A</option>
          </select>
          {rules.length > 1 && (
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className="members-icon-btn members-icon-btn-danger h-5 w-5 text-[10px] flex-shrink-0"
            >✕</button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        {rules.length < options.length ? (
          <button type="button" onClick={onAdd} className="text-[10px] text-[#F6B78D]/75 hover:text-[#F6B78D] transition-colors">
            + Add level
          </button>
        ) : <span />}
        <button type="button" onClick={onReset} className="text-[10px] text-white/40 hover:text-white/65 transition-colors">
          Reset default
        </button>
      </div>
    </div>
  );
}

export function ViewPanel({
  active: _active,
  align = "right",
  children,
}: {
  active?: boolean;
  align?: "left" | "right";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, close]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors border-white/12 bg-transparent text-white/45 hover:text-white/70 hover:border-white/18"
      >
        View
      </button>
      {open && (
        <div
          className={`absolute top-full ${align === "right" ? "right-0" : "left-0"} mt-1.5 bg-[#1C1F26] border border-white/10 rounded-xl shadow-2xl z-50 p-4 w-[310px] max-w-[min(92vw,310px)]`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function ViewSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="pt-3.5 pb-3.5 border-t border-white/8 first:border-t-0 first:pt-0 last:pb-0">
      <p className="text-[10px] uppercase tracking-wider text-white/35 font-semibold mb-2.5">{label}</p>
      {children}
    </div>
  );
}

// ── TABLE PRIMITIVES ──────────────────────────────────────────────────────────
// Shared wrappers used by every admin table for consistent shell + toolbar layout.

export function TableShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#13161D] overflow-x-auto">
      {children}
    </div>
  );
}

export function TableToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {children}
    </div>
  );
}

// ── TABLE ─────────────────────────────────────────────────────────────────────

export function Table({ cols, rows, sortCol, sortDir, onSort, sortableCols }: {
  cols: string[];
  rows: ReactNode[][];
  sortCol?: number;
  sortDir?: "asc" | "desc";
  onSort?: (colIndex: number) => void;
  sortableCols?: number[];
}) {
  return (
    <div className="members-table-shell">
      <table className="members-grid-table w-full min-w-max table-fixed text-sm">
        <thead>
          <tr className="bg-[#1C1F26] border-b border-white/8">
            {cols.map((col, i) => {
              const sortable = sortableCols?.includes(i) && !!onSort;
              const isActive = sortCol === i;
              return (
              <th
                key={col}
                aria-sort={isActive ? (sortDir === "desc" ? "descending" : "ascending") : undefined}
                className={`text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider whitespace-nowrap
                  ${sortable ? "select-none" : ""}`}
              >
                {sortable ? <button type="button" onClick={() => onSort!(i)} className="inline-flex items-center gap-1 rounded hover:text-white/70">
                  {col}
                    <span aria-hidden="true" className="inline-flex flex-col gap-px">
                      <svg className={`w-2 h-2 ${isActive && sortDir === "asc" ? "text-[#F6B78D]" : "text-white/20"}`} viewBox="0 0 8 5" fill="currentColor">
                        <path d="M4 0L8 5H0L4 0Z"/>
                      </svg>
                      <svg className={`w-2 h-2 ${isActive && sortDir === "desc" ? "text-[#F6B78D]" : "text-white/20"}`} viewBox="0 0 8 5" fill="currentColor">
                        <path d="M4 5L0 0H8L4 5Z"/>
                      </svg>
                    </span>
                </button> : <span>{col}</span>}
              </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-white/3 transition-colors group">
              {row.map((cell, colIndex) => (
                <td key={colIndex} className="px-4 py-3 text-white/70 whitespace-nowrap align-middle">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <div className="text-center py-12 text-white/25 text-sm">No records yet</div>
      )}
    </div>
  );
}

// ── BULK SELECT ───────────────────────────────────────────────────────────────

export function useBulkSelect() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);
  const allSelected = useCallback(
    (ids: string[]) => ids.length > 0 && ids.every((id) => selected.has(id)),
    [selected],
  );
  const someSelected = useCallback(
    (ids: string[]) => ids.length > 0 && ids.some((id) => selected.has(id)) && !ids.every((id) => selected.has(id)),
    [selected],
  );

  return { selected, toggle, toggleAll, clear, isSelected, allSelected, someSelected, count: selected.size };
}

// ── BULK ACTION BAR ───────────────────────────────────────────────────────────

export function BulkActionBar({
  count,
  onClear,
  children,
}: {
  count: number;
  onClear: () => void;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl bg-[#1A1D25] border border-white/12 shadow-2xl px-4 py-2.5 whitespace-nowrap">
      <span className="text-xs text-white/55 font-medium">{count} selected</span>
      <div className="h-4 w-px bg-white/12" />
      {children}
      <div className="h-4 w-px bg-white/12" />
      <button
        type="button"
        onClick={onClear}
        className="text-[10px] text-white/35 hover:text-white/65 transition-colors"
      >
        ✕ Clear
      </button>
    </div>
  );
}
