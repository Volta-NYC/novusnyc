"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SchoolSelectorProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  isDisabled?: boolean;
}

export default function SchoolSelector({
  value,
  onChange,
  options,
  placeholder = "Type or select a school",
  isDisabled = false,
}: SchoolSelectorProps) {
  const [filteredOptions, setFilteredOptions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [typedValue, setTypedValue] = useState(value);

  // Update filtered options when options or value changes
  useEffect(() => {
    if (!isOpen) return;
    const lowerValue = typedValue.toLowerCase();
    const filtered = options.filter(
      (option) => option.toLowerCase().includes(lowerValue)
    );
    setFilteredOptions(filtered);
  }, [options, typedValue, isOpen]);

  // Open dropdown on focus
  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  // Close dropdown on blur (with delay to allow option click)
  const handleBlur = useCallback(() => {
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  }, []);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTypedValue(newValue);
    setIsOpen(true);
    // Update filtered options immediately
    const lowerValue = newValue.toLowerCase();
    const filtered = options.filter(
      (option) => option.toLowerCase().includes(lowerValue)
    );
    setFilteredOptions(filtered);
  };

  // Handle option selection
  const handleOptionSelect = (option: string) => {
    setTypedValue(option);
    setIsOpen(false);
    onChange(option);
  };

  // Handle enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && typedValue.trim() !== "") {
      setIsOpen(false);
      onChange(typedValue.trim());
    }
  };

  // Handle escape key
  const handleEscape = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      if (inputRef.current) {
        inputRef.current.value = typedValue;
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={typedValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={(e) => {
          handleKeyDown(e);
          handleEscape(e);
        }}
        className={`w-full pl-3 pr-10 py-2 rounded-xl border border-white/10 bg-[#0F1014] text-white text-sm font-body focus:outline-none focus:border-[#85CC17]/50 disabled:cursor-not-allowed disabled:opacity-50`}
        disabled={isDisabled}
        placeholder={placeholder}
      />
      {/* Dropdown arrow icon */}
      <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
        ▼
      </span>
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full rounded-xl border border-white/10 bg-[#0F1014] max-h-[200px] overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <div
                key={option}
                className={`flex items-center px-3 py-2 text-sm text-white/80 cursor-pointer hover:bg-white/5 hover:text-white selected:bg-[#85CC17]/20 selected:text-white`}
                onClick={() => handleOptionSelect(option)}
              >
                {option}
              </div>
            ))
          ) : (
            <div className="px-3 py-2 text-sm text-white/40">
              No matching schools
            </div>
          )}
        </div>
      )}
    </div>
  );
}