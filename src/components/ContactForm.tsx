"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/Icons";

const SERVICES = [
  "Website Design & Development",
  "Social Media & Content",
  "Grant Research & Writing",
  "SEO & Google Maps Visibility",
  "Sales & Financial Analysis",
  "Digital Payment Setup",
  "Other",
];

const LANGUAGES = ["English", "Spanish", "Chinese", "Korean", "Arabic", "French"];

const FORMSPREE_ENDPOINT = "https://formspree.io/f/xkovzkwz";

export default function ContactForm() {
  const [formData, setFormData] = useState({
    businessName: "",
    name: "",
    email: "",
    neighborhood: "",
    services: [] as string[],
    languages: [] as string[],
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const toggle = (key: "services" | "languages", val: string) =>
    setFormData((prev) => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter((x) => x !== val) : [...prev[key], val],
    }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...formData,
          services: formData.services.join(", "),
          languages: formData.languages.join(", "),
          _subject: `Volta NYC — Business inquiry from ${formData.businessName}`,
        }),
      });
      if (res.ok) {
        setStatus("success");
        setFormData({ businessName: "", name: "", email: "", neighborhood: "", services: [], languages: [], message: "" });
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-white border border-v-border rounded-2xl p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-v-green/20 flex items-center justify-center mx-auto mb-4">
          <CheckIcon className="w-7 h-7 text-v-green" />
        </div>
        <h3 className="font-display font-bold text-2xl text-v-ink mb-3">Got it. We&apos;ll be in touch.</h3>
        <p className="font-body text-v-muted">We&apos;ll review your submission and reach out within a few days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-v-border rounded-2xl p-8 md:p-10 space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block font-body text-sm font-semibold text-v-ink mb-2">Business Name *</label>
          <input required value={formData.businessName} onChange={(e) => setFormData((p) => ({ ...p, businessName: e.target.value }))}
            className="volta-input" placeholder="e.g. Juliette Floral Design" />
        </div>
        <div>
          <label className="block font-body text-sm font-semibold text-v-ink mb-2">Your Name *</label>
          <input required value={formData.name} onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            className="volta-input" placeholder="Owner or contact name" />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block font-body text-sm font-semibold text-v-ink mb-2">Email *</label>
          <input required type="email" value={formData.email} onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            className="volta-input" placeholder="you@yourbusiness.com" />
        </div>
        <div>
          <label className="block font-body text-sm font-semibold text-v-ink mb-2">Neighborhood</label>
          <input value={formData.neighborhood} onChange={(e) => setFormData((p) => ({ ...p, neighborhood: e.target.value }))}
            className="volta-input" placeholder="e.g. Park Slope, Flushing" />
        </div>
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-2">Languages spoken at your business</label>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((lang) => (
            <button key={lang} type="button" onClick={() => toggle("languages", lang)}
              className={`text-sm font-body font-medium px-4 py-2 rounded-full border transition-all ${
                formData.languages.includes(lang)
                  ? "bg-v-blue border-v-blue text-white"
                  : "bg-white border-v-border text-v-muted hover:border-v-ink"
              }`}>
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-3">What do you need help with?</label>
        <div className="flex flex-wrap gap-2">
          {SERVICES.map((s) => (
            <button key={s} type="button" onClick={() => toggle("services", s)}
              className={`text-sm font-body font-medium px-4 py-2 rounded-full border transition-all ${
                formData.services.includes(s)
                  ? "bg-v-green border-v-green text-v-ink"
                  : "bg-white border-v-border text-v-muted hover:border-v-ink"
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-2">Tell us more</label>
        <textarea value={formData.message} onChange={(e) => setFormData((p) => ({ ...p, message: e.target.value }))}
          className="volta-input resize-none" rows={4}
          placeholder="What's your biggest challenge right now? Any context helps." />
      </div>

      <button type="submit" disabled={status === "loading"}
        className="w-full bg-v-blue text-white font-display font-bold text-base py-4 rounded-xl hover:bg-v-blue-dark transition-colors disabled:opacity-60">
        {status === "loading" ? "Sending…" : "Send Message"}
      </button>

      {status === "error" && (
        <p className="text-red-500 text-sm text-center font-body">Something went wrong. Email us at volta.newyork@gmail.com</p>
      )}
      <p className="text-xs text-v-muted text-center font-body">We typically respond within 2–3 business days. Our services are 100% free.</p>
    </form>
  );
}
