"use client";

import { useState, useRef } from "react";
import { CheckIcon } from "@/components/Icons";

const TRACKS = ["Finance & Operations", "Digital & Tech", "Marketing & Strategy"];
const REFERRAL_OPTIONS = ["School counselor", "Friend", "Social media", "Referral", "Other"];
const FORMSPREE_ENDPOINT = "https://formspree.io/f/xkovzkwz";

export default function ApplicationForm() {
  const [form, setForm] = useState({
    fullName: "", email: "", city: "", education: "", referral: "",
    tracks: [] as string[], hasResume: null as boolean | null,
    tools: "", accomplishment: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));
  const toggleTrack = (t: string) =>
    set("tracks", form.tracks.includes(t) ? form.tracks.filter((x) => x !== t) : [...form.tracks, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    const payload: Record<string, string> = {
      _subject: `Volta NYC — Application from ${form.fullName}`,
      "Full Name": form.fullName, Email: form.email, City: form.city,
      Education: form.education, "How They Heard": form.referral,
      "Tracks Selected": form.tracks.join(", "), "Has Resume": form.hasResume ? "Yes" : "No",
    };
    if (!form.hasResume) {
      payload["Tools/Software"] = form.tools;
      payload["Accomplishment"] = form.accomplishment;
    }
    const fd = new FormData();
    Object.entries(payload).forEach(([k, v]) => fd.append(k, v));
    if (form.hasResume && fileRef.current?.files?.[0]) fd.append("resume", fileRef.current.files[0]);
    try {
      const res = await fetch(FORMSPREE_ENDPOINT, { method: "POST", headers: { Accept: "application/json" }, body: fd });
      setStatus(res.ok ? "success" : "error");
    } catch { setStatus("error"); }
  };

  if (status === "success") {
    return (
      <div className="bg-white border border-v-border rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-v-green/20 flex items-center justify-center mx-auto mb-5">
          <CheckIcon className="w-8 h-8 text-v-green" />
        </div>
        <h3 className="font-display font-bold text-2xl text-v-ink mb-3">Application received.</h3>
        <p className="font-body text-v-muted max-w-sm mx-auto">
          We&apos;ll review your application and reach out within a few days to schedule a quick conversation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-2">Full Name *</label>
        <input required value={form.fullName} onChange={(e) => set("fullName", e.target.value)}
          className="volta-input" placeholder="Your full name" />
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-2">Email Address *</label>
        <input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
          className="volta-input" placeholder="you@email.com" />
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-2">City *</label>
        <input required value={form.city} onChange={(e) => set("city", e.target.value)}
          className="volta-input" placeholder="e.g. New York, NY" />
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-2">Education Level *</label>
        <select required value={form.education} onChange={(e) => set("education", e.target.value)} className="volta-input">
          <option value="">Select one</option>
          <option value="High School">High School</option>
          <option value="College / University">College / University</option>
        </select>
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-2">How did you hear about Volta? *</label>
        <select required value={form.referral} onChange={(e) => set("referral", e.target.value)} className="volta-input">
          <option value="">Select one</option>
          {REFERRAL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-1">
          Select your track(s) *{" "}
          <a href="/showcase" target="_blank" rel="noopener noreferrer" className="text-v-blue font-normal hover:underline text-xs">
            (see what each track does →)
          </a>
        </label>
        <p className="font-body text-xs text-v-muted mb-3">You may select more than one.</p>
        <div className="flex flex-col gap-3">
          {TRACKS.map((t) => {
            const active = form.tracks.includes(t);
            return (
              <button key={t} type="button" onClick={() => toggleTrack(t)}
                className={`w-full text-left px-5 py-3 rounded-xl border font-body text-sm font-medium transition-all flex items-center gap-3 ${
                  active ? "bg-v-green/10 border-v-green text-v-ink" : "bg-white border-v-border text-v-muted hover:border-v-ink"
                }`}>
                <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${active ? "bg-v-green border-v-green" : "border-v-border"}`}>
                  {active && <CheckIcon className="w-3 h-3 text-v-ink" />}
                </span>
                {t}
              </button>
            );
          })}
        </div>
        {form.tracks.length === 0 && (
          <p className="text-xs text-v-muted/60 mt-2">Please select at least one track.</p>
        )}
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-v-ink mb-3">Do you have a resume to attach?</label>
        <div className="flex gap-3">
          <button type="button" onClick={() => set("hasResume", true)}
            className={`flex-1 py-3 rounded-xl border font-body text-sm font-medium transition-all ${form.hasResume === true ? "bg-v-green border-v-green text-v-ink" : "bg-white border-v-border text-v-muted hover:border-v-ink"}`}>
            Yes — attach resume
          </button>
          <button type="button" onClick={() => set("hasResume", false)}
            className={`flex-1 py-3 rounded-xl border font-body text-sm font-medium transition-all ${form.hasResume === false ? "bg-v-ink border-v-ink text-white" : "bg-white border-v-border text-v-muted hover:border-v-ink"}`}>
            No resume
          </button>
        </div>

        {form.hasResume === true && (
          <div className="mt-5">
            <label className="block font-body text-sm font-semibold text-v-ink mb-2">Attach Resume *</label>
            <input ref={fileRef} required type="file" accept=".pdf,.doc,.docx"
              className="block w-full text-sm text-v-muted file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:font-body file:font-semibold file:text-sm file:bg-v-green file:text-v-ink hover:file:bg-v-green-dark cursor-pointer" />
            <p className="text-xs text-v-muted/60 mt-1.5">PDF, DOC, or DOCX. Max 5MB.</p>
          </div>
        )}

        {form.hasResume === false && (
          <div className="mt-6 space-y-6 border-l-2 border-v-green pl-5">
            <div>
              <label className="block font-body text-sm font-semibold text-v-ink mb-2">
                List any specific tools or software you have experience with *
              </label>
              <textarea required value={form.tools} onChange={(e) => set("tools", e.target.value)}
                className="volta-input resize-none" rows={3}
                placeholder="e.g. Figma, React, Excel, Canva, Python, Google Ads…" />
            </div>
            <div>
              <label className="block font-body text-sm font-semibold text-v-ink mb-2">
                What is your most impressive accomplishment, or a goal you&apos;re passionate about? *
              </label>
              <textarea required value={form.accomplishment} onChange={(e) => set("accomplishment", e.target.value)}
                className="volta-input resize-none" rows={5}
                placeholder="Tell us something you're proud of or working toward." />
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "loading" || form.tracks.length === 0 || form.hasResume === null}
        className="w-full bg-v-green text-v-ink font-display font-bold text-base py-4 rounded-xl hover:bg-v-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? "Submitting…" : "Submit Application →"}
      </button>

      {status === "error" && (
        <p className="text-red-500 text-sm text-center font-body">
          Something went wrong. Email us at volta.newyork@gmail.com
        </p>
      )}
      <p className="text-xs text-v-muted text-center font-body">
        Rolling admissions — we&apos;ll follow up within a few days.
      </p>
    </form>
  );
}
