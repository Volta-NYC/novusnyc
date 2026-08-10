"use client";

import { useState, useRef, useEffect } from "react";
import { CheckIcon } from "@/components/Icons";
import { validateApplicationForm, REFERRAL_NEEDS_NAME, type ApplicationFormValues } from "@/lib/schemas";
import { TRACK_NAMES, MARKETING_TRACK, MARKETING_SUBTRACKS } from "@/data";
import { CLASS_GRADE_OPTIONS } from "@/lib/grades";
import SchoolSelector from "@/components/SchoolSelector";
import SelectMenu from "@/components/SelectMenu";
import { STATE_ABBRS, citiesForState } from "@/lib/usPlaces";
import { EMAIL } from "@/lib/mail";
import { trackEvent, GA_EVENTS } from "@/lib/analytics";

const REFERRAL_OPTIONS = ["School counselor", "Friend", "Social media", "Online", "Referral", "Other"];
const GRADE_OPTIONS = CLASS_GRADE_OPTIONS.filter((grade) => grade !== "Class of 2022");
const RESUME_MAX_MB = 4;
const RESUME_MAX_BYTES = RESUME_MAX_MB * 1024 * 1024;

const EMPTY: ApplicationFormValues = {
  fullName: "", email: "", city: "", state: "", chapter: "", schoolName: "",
  grade: "", referral: "", referralName: "", tracks: [], marketingSubtrack: "",
  hasResume: null, tools: "", accomplishment: "",
};

export default function ApplicationForm({ chapters }: { chapters: string[] }) {
  const [form, setForm] = useState<ApplicationFormValues>(EMPTY);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const [openSubtrack, setOpenSubtrack] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/school-names")
      .then((r) => r.json())
      .then((names: string[]) => setSchoolOptions(names))
      .catch(() => setSchoolOptions([]))
      .finally(() => setLoadingSchools(false));
  }, []);

  const set = <K extends keyof ApplicationFormValues>(k: K, v: ApplicationFormValues[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const clearError = (k: string) =>
    setErrors((p) => { const next = { ...p }; delete next[k]; return next; });

  // Dropping Marketing must also drop the focus area, or a stale one submits.
  const toggleTrack = (t: string) => {
    const next = form.tracks.includes(t) ? form.tracks.filter((x) => x !== t) : [...form.tracks, t];
    setForm((p) => ({
      ...p,
      tracks: next,
      marketingSubtrack: next.includes(MARKETING_TRACK) ? p.marketingSubtrack : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = validateApplicationForm(form);
    if (!result.success) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setStatus("loading");

    // Upload resume to Google Drive via Apps Script if a file was selected.
    let resumeUrl = "";
    const file = fileRef.current?.files?.[0];
    if (form.hasResume === true && !file) {
      setErrors({ resumeUrl: "Attach your resume before submitting" });
      setStatus("idle");
      return;
    }
    if (file && file.size > RESUME_MAX_BYTES) {
      setErrors({ resumeUrl: `Resume must be under ${RESUME_MAX_MB}MB. Please compress it and try again.` });
      setStatus("idle");
      return;
    }
    if (form.hasResume === true && file) {
      setUploadProgress("Uploading resume…");
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/upload-resume", { method: "POST", body: fd });
        const text = await res.text();
        let json: Record<string, unknown> = {};
        try {
          json = JSON.parse(text) as Record<string, unknown>;
        } catch {
          throw new Error("Resume upload failed before reaching Google Drive. Please compress the file and try again.");
        }
        if (!res.ok) {
          throw new Error(typeof json.error === "string" ? json.error : "Resume upload failed");
        }
        resumeUrl = typeof json.url === "string" ? json.url : "";
        if (!resumeUrl) throw new Error("Resume upload did not return a Drive link");
      } catch (err) {
        setUploadProgress("");
        const message = err instanceof Error ? err.message : "Resume upload failed. Please try again.";
        setErrors({ resumeUrl: message });
        setStatus("error");
        return;
      }
      setUploadProgress("");
    }

    const payload: Record<string, string> = {
      formType: "application",
      "Full Name": form.fullName,
      Email: form.email,
      "School Name": form.schoolName,
      Grade: form.grade,
      "City, State": [form.city, form.state].filter(Boolean).join(", "),
      State: form.state,
      City: form.city,
      Chapter: form.chapter,
      "How They Heard": form.referral,
      "Referral Name": REFERRAL_NEEDS_NAME.includes(form.referral) ? form.referralName : "",
      "Tracks Selected": form.tracks.join(", "),
      "Marketing Subtrack": form.tracks.includes(MARKETING_TRACK) ? form.marketingSubtrack : "",
      "Has Resume": form.hasResume ? "Yes" : "No",
      "Resume URL": resumeUrl,
    };
    if (form.hasResume === false) {
      payload["Tools/Software"] = form.tools;
      payload["Accomplishment"] = form.accomplishment;
    }

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("submit_failed");
      setStatus("success");
      // Fired only after the API confirms the write, so this counts real
      // applications rather than attempts.
      trackEvent(GA_EVENTS.applicationSubmitted);
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div role="status" aria-live="polite" className="bg-white border border-n-border rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-n-orange/20 flex items-center justify-center mx-auto mb-5">
          <CheckIcon className="w-8 h-8 text-n-orange" aria-hidden="true" />
        </div>
        <h3 className="font-display font-bold text-2xl text-n-ink mb-3">Application received.</h3>
        <p className="font-body text-n-muted max-w-sm mx-auto">
          We&apos;ll review your application and reach out within a few days to schedule a quick conversation.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-7">

      <div>
        <label className="block font-body text-sm font-semibold text-n-ink mb-2">Full Name *</label>
        <input
          value={form.fullName}
          onChange={(e) => { set("fullName", e.target.value); clearError("fullName"); }}
          className={`novus-input ${errors.fullName ? "border-red-400" : ""}`}
          placeholder="Your full name"
        />
        {errors.fullName && <p className="text-red-500 text-xs mt-1 font-body">{errors.fullName}</p>}
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-n-ink mb-2">Email Address *</label>
        <p className="text-xs text-n-muted/80 mt-1 mb-2 font-body">
          Please use your personal email address, not a school email.
        </p>
        <input
          type="email"
          value={form.email}
          onChange={(e) => { set("email", e.target.value); clearError("email"); }}
          className={`novus-input ${errors.email ? "border-red-400" : ""}`}
          placeholder="you@email.com"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1 font-body">{errors.email}</p>}
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-n-ink mb-2">School Name *</label>
        <p className="text-xs text-n-muted/80 mt-1 mb-2 font-body">
          Don&apos;t see your school? Just type it in.
        </p>
        <SchoolSelector
          value={form.schoolName}
          onChange={(value) => { set("schoolName", value); clearError("schoolName"); }}
          options={loadingSchools ? [] : schoolOptions}
          placeholder="Begin typing your school name"
          isDisabled={status === "loading"}
          theme="light"
        />
        {loadingSchools && (
          <p className="mt-2 flex items-center gap-2 font-body text-xs text-n-muted" aria-live="polite">
            <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-n-orange" />
            Loading school suggestions
          </p>
        )}
        {errors.schoolName && <p className="text-red-500 text-xs mt-1 font-body">{errors.schoolName}</p>}
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-n-ink mb-2">High School Class Year *</label>
        <select
          value={form.grade}
          onChange={(e) => { set("grade", e.target.value); clearError("grade"); }}
          className={`novus-input ${errors.grade ? "border-red-400" : ""}`}
        >
          <option value="">Select your graduation year</option>
          {GRADE_OPTIONS.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
        </select>
        {errors.grade && <p className="text-red-500 text-xs mt-1 font-body">{errors.grade}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block font-body text-sm font-semibold text-n-ink mb-2">State *</label>
          <SelectMenu
            ariaLabel="State"
            value={form.state}
            onChange={(next) => {
              // Cities are state-specific, so a state change invalidates the city.
              setForm((p) => ({ ...p, state: next, city: "" }));
              clearError("state");
            }}
            options={STATE_ABBRS}
            placeholder="Select"
            invalid={!!errors.state}
          />
          {errors.state && <p className="text-red-500 text-xs mt-1 font-body">{errors.state}</p>}
        </div>
        <div>
          <label className="block font-body text-sm font-semibold text-n-ink mb-2">City *</label>
          <SelectMenu
            ariaLabel="City"
            value={form.city}
            onChange={(next) => { set("city", next); clearError("city"); }}
            options={form.state ? citiesForState(form.state) : []}
            placeholder={form.state ? "Select" : "Pick a state first"}
            disabled={!form.state}
            invalid={!!errors.city}
          />
          {errors.city && <p className="text-red-500 text-xs mt-1 font-body">{errors.city}</p>}
        </div>
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-n-ink mb-2">Chapter *</label>
        <p className="font-body text-xs text-n-muted mb-2">
          Not near one of these? Choose New York. You&apos;ll work remotely with the team, and we may
          open a chapter in your area later. Tell us if that interests you.
        </p>
        <SelectMenu
          ariaLabel="Chapter"
          value={form.chapter}
          onChange={(next) => { set("chapter", next); clearError("chapter"); }}
          options={chapters}
          placeholder="Select a chapter"
          invalid={!!errors.chapter}
        />
        {errors.chapter && <p className="text-red-500 text-xs mt-1 font-body">{errors.chapter}</p>}
      </div>

      <div>
        <label className="block font-body text-sm font-semibold text-n-ink mb-2">How did you hear about Novus? *</label>
        <select
          value={form.referral}
          onChange={(e) => { set("referral", e.target.value); clearError("referral"); }}
          className={`novus-input ${errors.referral ? "border-red-400" : ""}`}
        >
          <option value="">Select one</option>
          {REFERRAL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        {errors.referral && <p className="text-red-500 text-xs mt-1 font-body">{errors.referral}</p>}
      </div>

      {REFERRAL_NEEDS_NAME.includes(form.referral) && (
        <div>
          <label className="block font-body text-sm font-semibold text-n-ink mb-2">Who referred you? *</label>
          <input
            type="text"
            value={form.referralName}
            onChange={(e) => { set("referralName", e.target.value); clearError("referralName"); }}
            className={`novus-input ${errors.referralName ? "border-red-400" : ""}`}
            placeholder="Their full name"
          />
          {errors.referralName && <p className="text-red-500 text-xs mt-1 font-body">{errors.referralName}</p>}
        </div>
      )}

      <div>
        <label className="block font-body text-sm font-semibold text-n-ink mb-1">
          Select your track(s) *{" "}
          <a href="/join#tracks" target="_blank" rel="noopener noreferrer" className="text-n-orange font-normal hover:underline text-xs">
            (see what each track does →)
          </a>
        </label>
        <p className="font-body text-xs text-n-muted mb-3">You may select more than one.</p>
        <div className="flex flex-col gap-3">
          {TRACK_NAMES.map((t) => {
            const active = form.tracks.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => { toggleTrack(t); clearError("tracks"); }}
                className={`w-full text-left px-5 py-3 rounded-xl border font-body text-sm font-medium transition-all flex items-center gap-3 ${
                  active ? "bg-n-orange/10 border-n-orange text-n-ink" : "bg-white border-n-border text-n-muted hover:border-n-ink"
                }`}
              >
                <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-all ${active ? "bg-n-orange border-n-orange" : "border-n-border"}`}>
                  {active && <CheckIcon className="w-3 h-3 text-n-ink" />}
                </span>
                {t}
              </button>
            );
          })}
        </div>
        {errors.tracks && <p className="text-red-500 text-xs mt-2 font-body">{errors.tracks}</p>}
      </div>

      {form.tracks.includes(MARKETING_TRACK) && (
        <div>
          <label className="block font-body text-sm font-semibold text-n-ink mb-1">
            Which marketing focus area? *
          </label>
          <p className="font-body text-xs text-n-muted mb-3">
            Select one. Tap a name to read what it involves.
          </p>
          <div className="flex flex-col gap-2">
            {MARKETING_SUBTRACKS.map((sub) => {
              const active = form.marketingSubtrack === sub.title;
              const open = openSubtrack === sub.title;
              return (
                <div
                  key={sub.title}
                  className={`rounded-xl border transition-all ${
                    active ? "bg-n-orange/10 border-n-orange" : "bg-white border-n-border"
                  }`}
                >
                  <div className="flex items-stretch">
                    <button
                      type="button"
                      onClick={() => { set("marketingSubtrack", sub.title); clearError("marketingSubtrack"); }}
                      aria-pressed={active}
                      className="flex flex-1 items-center gap-3 px-5 py-3 text-left font-body text-sm font-medium"
                    >
                      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? "border-n-orange" : "border-n-border"}`}>
                        {active && <span className="w-2 h-2 rounded-full bg-n-orange" />}
                      </span>
                      <span className={active ? "text-n-ink" : "text-n-muted"}>{sub.title}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenSubtrack(open ? null : sub.title)}
                      aria-expanded={open}
                      aria-label={`What ${sub.title} involves`}
                      className="px-4 text-n-muted hover:text-n-ink transition-colors"
                    >
                      <svg
                        viewBox="0 0 20 20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                      >
                        <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </div>
                  {open && (
                    <p className="font-body text-sm leading-relaxed text-n-ink/75 px-5 pb-4 -mt-1">
                      {sub.desc}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {errors.marketingSubtrack && (
            <p className="text-red-500 text-xs mt-2 font-body">{errors.marketingSubtrack}</p>
          )}
        </div>
      )}

      <div>
        <label className="block font-body text-sm font-semibold text-n-ink mb-1">Do you have a resume to attach?</label>
        <p className="font-body text-xs text-n-muted mb-3">
          We strongly encourage you to attach a resume, even if it is not fully fleshed out yet. A resume is required to be considered for any role above the entry-level Analyst position.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { set("hasResume", true); clearError("hasResume"); }}
            className={`flex-1 py-3 rounded-xl border font-body text-sm font-medium transition-all ${form.hasResume === true ? "bg-n-orange border-n-orange text-n-ink" : "bg-white border-n-border text-n-muted hover:border-n-ink"}`}
          >
            Yes — attach resume
          </button>
          <button
            type="button"
            onClick={() => { set("hasResume", false); clearError("hasResume"); }}
            className={`flex-1 py-3 rounded-xl border font-body text-sm font-medium transition-all ${form.hasResume === false ? "bg-n-ink border-n-ink text-white" : "bg-white border-n-border text-n-muted hover:border-n-ink"}`}
          >
            No resume
          </button>
        </div>
        {errors.hasResume && <p className="text-red-500 text-xs mt-2 font-body">{errors.hasResume}</p>}

        {form.hasResume === true && (
          <div className="mt-5">
            <label className="block font-body text-sm font-semibold text-n-ink mb-2">Attach Resume *</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              className="block w-full text-sm text-n-muted file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:font-body file:font-semibold file:text-sm file:bg-n-orange file:text-n-ink hover:file:bg-n-orange-dark cursor-pointer"
            />
            <p className="text-xs text-n-muted/60 mt-1.5">PDF, DOC, or DOCX. Max {RESUME_MAX_MB}MB.</p>
            {uploadProgress && (
              <p className="text-xs text-n-muted mt-2">{uploadProgress}</p>
            )}
            {errors.resumeUrl && <p className="text-red-500 text-xs mt-1 font-body">{errors.resumeUrl}</p>}
          </div>
        )}

        {form.hasResume === false && (
          <div className="mt-6 space-y-6 border-l-2 border-n-orange pl-5">
            <div>
              <label className="block font-body text-sm font-semibold text-n-ink mb-2">
                List any specific tools or software you have experience with *
              </label>
              <textarea
                value={form.tools}
                onChange={(e) => { set("tools", e.target.value); clearError("tools"); }}
                className={`novus-input resize-none ${errors.tools ? "border-red-400" : ""}`}
                rows={3}
                placeholder="e.g. Figma, React, Excel, Canva, Python, Google Ads…"
              />
              {errors.tools && <p className="text-red-500 text-xs mt-1 font-body">{errors.tools}</p>}
            </div>
            <div>
              <label className="block font-body text-sm font-semibold text-n-ink mb-2">
                What is your most impressive accomplishment, or a goal you&apos;re passionate about? *
              </label>
              <textarea
                value={form.accomplishment}
                onChange={(e) => { set("accomplishment", e.target.value); clearError("accomplishment"); }}
                className={`novus-input resize-none ${errors.accomplishment ? "border-red-400" : ""}`}
                rows={5}
                placeholder="Tell us something you're proud of or working toward."
              />
              {errors.accomplishment && <p className="text-red-500 text-xs mt-1 font-body">{errors.accomplishment}</p>}
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full bg-n-orange text-n-ink font-display font-bold text-base py-4 rounded-xl hover:bg-n-orange-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading"
          ? uploadProgress || "Submitting…"
          : "Submit Application →"}
      </button>

      {status === "error" && (
        <p className="text-red-500 text-sm text-center font-body">
          Something went wrong. Email us at {EMAIL.info}
        </p>
      )}
      <p className="text-xs text-n-muted text-center font-body">
        Rolling admissions — we&apos;ll follow up within a few days.
      </p>
    </form>
  );
}
