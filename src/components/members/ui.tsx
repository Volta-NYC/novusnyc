"use client";

import { useState, ReactNode, useEffect, useId, useRef } from "react";

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

export function Modal({ open, onClose, title, children }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
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
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      <div className="fixed inset-0 bg-black/70" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-[#1C1F26] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-3rem)] overflow-y-auto p-4 sm:p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id={titleId} className="font-display font-bold text-white text-lg">{title}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="text-white/40 hover:text-white p-2 transition-colors rounded-lg">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
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
  return (
    <div>
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;
export function Input({ className = "", ...props }: InputProps) {
  return (
    <input
      {...props}
      className={`w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors ${className}`}
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
        className={`w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 pr-10 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors ${className}`}
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
      className={`w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors resize-none ${className}`}
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
        className={`w-full appearance-none bg-[#0F1014] border border-white/10 rounded-lg pl-3 pr-11 py-2.5 text-sm text-white focus:outline-none focus:border-[#85CC17]/50 transition-colors ${className}`}
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
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#1C1F26] border border-white/8 rounded-lg pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#85CC17]/50 transition-colors"
      />
      {local && (
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
      )}
    </div>
  );
}

// ── TYPEAHEAD INPUTS ─────────────────────────────────────────────────────────
// Browser-native datalist typeahead used for member-directory-backed fields.

export function AutocompleteInput({
  value,
  onChange,
  options,
  placeholder = "Start typing…",
  className = "",
  showOnEmpty = false,
}: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  className?: string;
  showOnEmpty?: boolean;
}) {
  const listId = `ac-${useId().replace(/[:]/g, "")}`;
  const normalizedOptions = Array.from(
    new Set(
      (options ?? [])
        .map((option) => option.trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b));
  const query = value.trim().toLowerCase();
  const filteredOptions = query || showOnEmpty
    ? normalizedOptions.filter((option) => option.toLowerCase().includes(query))
    : [];

  return (
    <div className="w-full">
      <input
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors ${className}`}
      />
      <datalist id={listId}>
        {filteredOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </div>
  );
}

export function AutocompleteTagInput({
  values,
  onChange,
  options,
  commitOnBlur = false,
  placeholder = "Type to search, then press Enter",
}: {
  values: string[];
  onChange: (values: string[]) => void;
  options: string[];
  commitOnBlur?: boolean;
  placeholder?: string;
}) {
  const [inputText, setInputText] = useState("");
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

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {safeValues.map((tag) => (
          <span key={tag} className="flex items-center gap-1 text-xs bg-[#85CC17]/15 text-[#85CC17] border border-[#85CC17]/20 px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-red-300 hover:text-red-200 transition-colors">×</button>
          </span>
        ))}
      </div>

      <input
        list={listId}
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
        placeholder={placeholder}
        className="w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50"
      />

      <datalist id={listId}>
        {normalizedOptions
          .filter((option) => !safeValues.includes(option))
          .map((option) => (
            <option key={option} value={option} />
          ))}
      </datalist>
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

export function StatCard({ label, value, color = "text-[#85CC17]" }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="bg-[#1C1F26] border border-white/8 rounded-xl p-4">
      <p className="text-white/40 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
      <p className={`font-display font-bold text-2xl ${color}`}>{value}</p>
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
  primary:   "bg-[#85CC17] text-[#0D0D0D] font-bold hover:bg-[#72b314]",
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
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/70" onClick={cancel} />
        <div className="relative bg-[#1C1F26] border border-white/10 rounded-xl p-6 max-w-sm w-full">
          <p className="text-white font-semibold mb-2">Are you sure?</p>
          <p className="text-white/40 text-sm mb-5">{message ?? "This cannot be undone."}</p>
          {errMsg && (
            <p className="text-red-400 text-xs mb-3 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
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
      </div>
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
          <span key={tag} className="flex items-center gap-1 text-xs bg-[#85CC17]/15 text-[#85CC17] border border-[#85CC17]/20 px-2 py-0.5 rounded-full">
            {tag}
            <button type="button" onClick={() => removeTag(tag)} className="text-red-300 hover:text-red-200 transition-colors">×</button>
          </span>
        ))}
      </div>
      {/* Add tag controls */}
      <div className="flex gap-2">
        <select
          value=""
          onChange={(e) => { if (e.target.value) addTag(e.target.value); }}
          className="bg-[#0F1014] border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-[#85CC17]/50 flex-1"
        >
          <option value="">Add from list…</option>
          {options.filter((opt) => !safeValues.includes(opt)).map((opt) => <option key={opt}>{opt}</option>)}
        </select>
        <input
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
          className="bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 flex-1"
        />
        <button
          type="button"
          onClick={() => addTag(inputText)}
          disabled={!inputText.trim()}
          className="px-3 py-2 rounded-lg text-sm bg-[#85CC17]/20 text-[#85CC17] border border-[#85CC17]/35 hover:bg-[#85CC17]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
    <div className={`${sz} border-2 border-[#85CC17]/30 border-t-[#85CC17] rounded-full animate-spin`} />
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
        <svg className="w-3 h-3 text-[#85CC17]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <div
        onClick={() => onChange(!checked)}
        className={`relative rounded-full flex-shrink-0 cursor-pointer transition-colors ${checked ? "bg-[#85CC17]" : "bg-white/15"}`}
        style={{ height: "22px", width: "40px" }}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </div>
      <span className="text-sm text-white/80 group-hover:text-white transition-colors">{label}</span>
    </label>
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
                onClick={sortable ? () => onSort!(i) : undefined}
                className={`text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider whitespace-nowrap
                  ${sortable ? "cursor-pointer hover:text-white/70 select-none" : ""}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col}
                  {sortable && (
                    <span className="inline-flex flex-col gap-px">
                      <svg className={`w-2 h-2 ${isActive && sortDir === "asc" ? "text-[#85CC17]" : "text-white/20"}`} viewBox="0 0 8 5" fill="currentColor">
                        <path d="M4 0L8 5H0L4 0Z"/>
                      </svg>
                      <svg className={`w-2 h-2 ${isActive && sortDir === "desc" ? "text-[#85CC17]" : "text-white/20"}`} viewBox="0 0 8 5" fill="currentColor">
                        <path d="M4 5L0 0H8L4 5Z"/>
                      </svg>
                    </span>
                  )}
                </span>
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
