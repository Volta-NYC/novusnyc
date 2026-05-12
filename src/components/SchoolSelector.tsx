"use client";

import { useId } from "react";

interface SchoolSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  isDisabled?: boolean;
  theme?: "light" | "dark";
}

export default function SchoolSelector({
  value,
  onChange,
  options,
  placeholder = "Begin typing your school name",
  isDisabled = false,
  theme = "dark",
}: SchoolSelectorProps) {
  const listId = `school-ac-${useId().replace(/[:]/g, "")}`;
  const query = value.trim().toLowerCase();
  const filteredOptions = query
    ? Array.from(new Set(options.map((o) => o.trim()).filter(Boolean)))
        .filter((o) => o.toLowerCase().includes(query))
        .sort((a, b) => a.localeCompare(b))
    : [];

  const inputClass =
    theme === "light"
      ? "volta-input disabled:cursor-not-allowed disabled:opacity-50"
      : "w-full bg-[#0F1014] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#85CC17]/50 transition-colors disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <>
      <input
        list={listId}
        type="text"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={isDisabled}
        className={inputClass}
      />
      <datalist id={listId}>
        {filteredOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
