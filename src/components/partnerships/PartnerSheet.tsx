"use client";

import { useEffect, useRef } from "react";
import type { PublicPartnership } from "@/data/partnerships";
import PartnerDetail from "./PartnerDetail";

export default function PartnerSheet({
  partner,
  partnersById,
  onClose,
}: {
  partner: PublicPartnership;
  partnersById: Map<string, PublicPartnership>;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement || document.activeElement instanceof SVGElement ? document.activeElement : null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={partner.name}
      className="fixed inset-0 z-[80] flex flex-col bg-n-dark"
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
        <p className="font-body text-xs font-bold uppercase tracking-[0.18em] text-white/55">Partner</p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close and return to the map"
          className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path d="M4 4 L16 16 M16 4 L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-12 pt-6 sm:px-8">
        <div className="mx-auto max-w-2xl">
          <PartnerDetail partner={partner} partnersById={partnersById} surface="dark" headingLevel="h2" />
        </div>
      </div>
    </div>
  );
}
