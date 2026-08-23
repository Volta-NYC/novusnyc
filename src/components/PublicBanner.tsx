"use client";

import { useState, useEffect, useRef } from "react";
import { getSiteSettings } from "@/lib/members/storage";

export default function PublicBanner() {
  const [message, setMessage] = useState("");
  const [bg, setBg] = useState("#1a1a2e");
  const [text, setText] = useState("#ffffff");
  const [dismissed, setDismissed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSiteSettings().then((s) => {
      if (s.publicBannerEnabled && s.publicBannerMessage.trim()) {
        setMessage(s.publicBannerMessage.trim());
        setBg(s.publicBannerBg);
        setText(s.publicBannerText);
      }
    }).catch((error) => console.error("Public banner settings could not load", error));
  }, []);

  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el || !message || dismissed) {
      root.style.setProperty("--banner-h", "0px");
      return;
    }
    const update = () => root.style.setProperty("--banner-h", el.offsetHeight + "px");
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [message, dismissed]);

  if (!message || dismissed) return null;

  return (
    <div
      ref={ref}
      className="fixed left-0 right-0 z-[60] flex items-center justify-center px-10 py-2.5 text-sm font-body font-semibold text-center"
      style={{ top: 0, backgroundColor: bg, color: text }}
    >
      <span>{message}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
        style={{ color: text }}
      >
        ✕
      </button>
    </div>
  );
}
