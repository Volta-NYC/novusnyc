"use client";

import { useState } from "react";
import { CheckIcon } from "@/components/Icons";
import { FORMSPREE_ENDPOINT } from "@/lib/formspree";
import { validateInquiryForm, type InquiryFormValues } from "@/lib/schemas";
import { logToSheets } from "@/lib/sheetsLogger";

const EMPTY: InquiryFormValues = { name: "", email: "", inquiry: "" };

export default function InquiryForm() {
  const [form, setForm] = useState<InquiryFormValues>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof InquiryFormValues, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const clearError = (k: string) =>
    setErrors((p) => { const next = { ...p }; delete next[k]; return next; });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateInquiryForm(form);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setStatus("loading");
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ _subject: `Volta NYC — Inquiry from ${form.name}`, ...form }),
      });
      const ok = res.ok;
      if (ok) logToSheets({ formType: "inquiry", ...form });
      setStatus(ok ? "success" : "error");
      if (ok) setForm(EMPTY);
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
        <h3 className="font-display font-bold text-xl text-v-ink mb-2">Message received.</h3>
        <p className="font-body text-v-muted text-sm">We&apos;ll get back to you within a few days.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="bg-white border border-v-border rounded-2xl p-8 space-y-5">
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label className="block font-body text-sm font-semibold text-v-ink mb-2">Name *</label>
          <input
            value={form.name}
            onChange={(e) => { set("name", e.target.value); clearError("name"); }}
            className={`volta-input ${errors.name ? "border-red-400" : ""}`}
            placeholder="Your name"
          />
          {errors.name && <p className="text-red-500 text-xs mt-1 font-body">{errors.name}</p>}
        </div>
        <div>
          <label className="block font-body text-sm font-semibold text-v-ink mb-2">Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => { set("email", e.target.value); clearError("email"); }}
            className={`volta-input ${errors.email ? "border-red-400" : ""}`}
            placeholder="you@email.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1 font-body">{errors.email}</p>}
        </div>
      </div>
      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-2">Your inquiry *</label>
        <textarea
          value={form.inquiry}
          onChange={(e) => { set("inquiry", e.target.value); clearError("inquiry"); }}
          className={`volta-input resize-none ${errors.inquiry ? "border-red-400" : ""}`}
          rows={4}
          placeholder="What would you like to know or talk about?"
        />
        {errors.inquiry && <p className="text-red-500 text-xs mt-1 font-body">{errors.inquiry}</p>}
      </div>
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-v-blue text-white font-display font-bold text-base py-4 rounded-xl hover:bg-v-blue-dark transition-colors disabled:opacity-60"
      >
        {status === "loading" ? "Sending…" : "Send Message"}
      </button>
      {status === "error" && (
        <p className="text-red-500 text-sm text-center font-body">
          Something went wrong. Email us at volta.newyork@gmail.com
        </p>
      )}
    </form>
  );
}
