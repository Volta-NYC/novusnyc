import { NextResponse } from "next/server";
import { consumeRateLimit, getClientIp } from "@/lib/server/rateLimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  validateApplicationForm,
  validateContactForm,
} from "@/lib/schemas";

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function upsertBusinessLeadFromContactForm(data: Record<string, unknown>): Promise<void> {
  const sb = getSupabaseAdmin();

  const businessName = asText(data.businessName);
  const ownerName = asText(data.name);
  const ownerEmail = asText(data.email).toLowerCase();
  const phone = asText(data.phone);
  const neighborhood = asText(data.neighborhood);
  const services = asText(data.services);
  const referredBy = asText(data.referredBy);
  const message = asText(data.message);
  const language = asText(data.language);

  if (!businessName || !ownerName || !ownerEmail) return;

  // Indexed query: check for recent duplicate by owner email.
  const now = Date.now();
  const { data: existing } = await sb
    .from("businesses")
    .select("name, owner_name, created_at")
    .is("deleted_at", null)
    .eq("owner_email", ownerEmail);

  const duplicateRecent = (existing ?? []).some((entry) => {
    const r = entry as Record<string, unknown>;
    const existingName = asText(r.name).toLowerCase();
    const existingOwner = asText(r.owner_name).toLowerCase();
    const createdAt = Date.parse(asText(r.created_at));
    if (!createdAt) return false;
    const within24h = now - createdAt <= 24 * 60 * 60 * 1000;
    return (
      within24h
      && existingName === businessName.toLowerCase()
      && existingOwner === ownerName.toLowerCase()
    );
  });
  if (duplicateRecent) return;

  const timestamp = new Date(now).toISOString();
  const notesParts = [
    "Website form submission",
    neighborhood ? `Neighborhood: ${neighborhood}` : "",
    phone ? `Phone: ${phone}` : "",
    services ? `Services requested: ${services}` : "",
    referredBy ? `Referred by: ${referredBy}` : "",
    language ? `Language: ${language}` : "",
    message ? `Message: ${message}` : "",
  ].filter(Boolean);

  const { error: leadInsertError } = await sb.from("businesses").insert({
    id: crypto.randomUUID(),
    name: businessName,
    bid_id: "",
    owner_name: ownerName,
    owner_email: ownerEmail,
    owner_alternate_email: "",
    phone,
    alternate_phone: "",
    address: "",
    neighborhood,
    website: "",
    project_status: "Upcoming",
    tech_status: "Backlog",
    // The market this lead belongs to. Falls back to the first chapter rather
    // than naming an id, so a new chapter never needs a code change here.
    chapter_id: await defaultChapterId(sb),
    // Services are stored on the record as well as in the note, so the intake
    // answer is queryable instead of only readable.
    active_services: splitCsvToList(services),
    team_lead: "",
    first_contact_date: timestamp.slice(0, 10),
    notes: notesParts.join("\n"),
    sort_index: now,
    referred_by: referredBy,
    intake_source: "website_form",
    showcase_enabled: false,
    showcase_featured_on_home: false,
    created_at: timestamp,
    updated_at: timestamp,
  });

  // A lead that failed to store must not be reported to the business owner as
  // received — they would never follow up, and neither would we.
  if (leadInsertError) throw new Error(leadInsertError.message);
}

// Chapters are rows, not constants: read the first one rather than hardcoding
// an id that a rename would break.
async function defaultChapterId(
  sb: ReturnType<typeof getSupabaseAdmin>,
): Promise<string | null> {
  const { data } = await sb.from("chapters").select("id")
    .neq("status", "Archived").order("sort_order").limit(1);
  return (data ?? [])[0]?.id ?? null;
}

function splitToCsv(values: unknown): string {
  if (Array.isArray(values)) {
    return values.map((item) => asText(item)).filter(Boolean).join(", ");
  }
  return asText(values);
}

function splitCsvToList(values: unknown): string[] {
  const raw = splitToCsv(values);
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

async function upsertApplicationFromForm(data: Record<string, unknown>): Promise<void> {
  const sb = getSupabaseAdmin();

  const fullName = asText(data["Full Name"]);
  const email = asText(data.Email).toLowerCase();
  if (!fullName || !email) return;

  // The contact form has guarded against accidental doubles since it was
  // written; this one never did, so a double-click or a retry on a flaky
  // connection filed the same application twice. A day-long window catches
  // that without blocking someone genuinely reapplying weeks later.
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await sb.from("applications")
    .select("id").eq("email", email).gte("created_at", dayAgo).limit(1);
  if ((recent ?? []).length > 0) return;

  const schoolName = asText(data["School Name"]) || asText(data.Education);
  const cityState = asText(data["City, State"]) || asText(data.City);
  const tracks = splitCsvToList(data["Tracks Selected"]);
  const createdAt = new Date().toISOString();

  const { error } = await sb.from("applications").insert({
    id: crypto.randomUUID(),
    full_name: fullName,
    email,
    school_name: schoolName,
    grade: asText(data.Grade),
    city_state: cityState,
    state: asText(data.State),
    city: asText(data.City),
    chapter: asText(data.Chapter),
    referral: asText(data["How They Heard"]),
    referral_name: asText(data["Referral Name"]),
    tracks_selected: tracks,
    marketing_subtrack: asText(data["Marketing Subtrack"]),
    has_resume: asText(data["Has Resume"]).toLowerCase() === "yes" ? true : asText(data["Has Resume"]).toLowerCase() === "no" ? false : null,
    resume_url: asText(data["Resume URL"]),
    tools_software: asText(data["Tools/Software"]),
    accomplishment: asText(data.Accomplishment),
    status: "New",
    source: "website_form",
    source_timestamp_raw: asText(data.Timestamp),
    notes: "",
    created_at: createdAt,
    updated_at: createdAt,
  });
  if (error) throw new Error(`applications_insert_failed: ${error.message}`);
}

type AppsScriptForwardResult = {
  configured: boolean;
  ok: boolean;
  status?: number;
};

function getAppsScriptUrl(): string {
  return (process.env.APPS_SCRIPT_URL || process.env.NEXT_PUBLIC_APPS_SCRIPT_URL || "").trim();
}

async function forwardToAppsScriptBackup(data: Record<string, unknown>): Promise<AppsScriptForwardResult> {
  const url = getAppsScriptUrl();
  if (!url) return { configured: false, ok: false };
  try {
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      redirect: "follow",
    });
    const text = await upstream.text();
    if (!upstream.ok) {
      console.error("apps_script_backup_failed", upstream.status);
      return { configured: true, ok: false, status: upstream.status };
    }
    try {
      const payload = JSON.parse(text) as Record<string, unknown>;
      if (payload.error || ("ok" in payload && payload.ok !== true)) {
        console.error("apps_script_backup_rejected", payload);
        return { configured: true, ok: false, status: upstream.status };
      }
    } catch {
      // Older Apps Script deployments may not return JSON; HTTP 2xx is enough.
    }
    return { configured: true, ok: true, status: upstream.status };
  } catch (err) {
    console.error("apps_script_backup_unreachable", err);
    return { configured: true, ok: false };
  }
}

export async function POST(request: Request) {
  let data: Record<string, unknown>;
  try {
    data = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const formType = typeof data.formType === "string" ? data.formType : "";
  const isKnownFormType = formType === "application" || formType === "contact";
  if (!isKnownFormType) {
    return NextResponse.json({ error: "unknown_form_type" }, { status: 400 });
  }

  if (formType === "application") {
    const hasResume = asText(data["Has Resume"]).toLowerCase() === "yes"
      ? true
      : asText(data["Has Resume"]).toLowerCase() === "no"
        ? false
        : null;
    const validation = validateApplicationForm({
      fullName: asText(data["Full Name"]),
      email: asText(data.Email),
      city: asText(data.City) || asText(data["City, State"]),
      state: asText(data.State),
      chapter: asText(data.Chapter),
      schoolName: asText(data["School Name"]) || asText(data.Education),
      grade: asText(data.Grade),
      referral: asText(data["How They Heard"]),
      referralName: asText(data["Referral Name"]),
      tracks: splitCsvToList(data["Tracks Selected"]),
      marketingSubtrack: asText(data["Marketing Subtrack"]),
      hasResume,
      tools: asText(data["Tools/Software"]),
      accomplishment: asText(data.Accomplishment),
    });
    if (!validation.success) {
      return NextResponse.json({ error: "invalid_form", fields: validation.errors }, { status: 400 });
    }
    if (hasResume && !asText(data["Resume URL"])) {
      return NextResponse.json(
        { error: "invalid_form", fields: { resumeUrl: "Resume upload is required" } },
        { status: 400 }
      );
    }
  }

  if (formType === "contact") {
    const validation = validateContactForm({
      businessName: asText(data.businessName),
      name: asText(data.name),
      email: asText(data.email),
      phone: asText(data.phone),
      neighborhood: asText(data.neighborhood),
      services: splitCsvToList(data.services),
      referredBy: asText(data.referredBy),
      message: asText(data.message),
    });
    if (!validation.success) {
      return NextResponse.json({ error: "invalid_form", fields: validation.errors }, { status: 400 });
    }
  }

  const ip = getClientIp(request.headers);

  const ipLimit = Number(process.env.FORM_RATE_LIMIT_PER_IP ?? 8);
  const ipWindowSec = Number(process.env.FORM_RATE_LIMIT_WINDOW_SEC ?? 3600);
  const ipCheck = await consumeRateLimit({
    bucket: "form-ip",
    key: ip,
    limit: ipLimit,
    windowSec: ipWindowSec,
  });
  if (!ipCheck.ok) {
    return NextResponse.json(
      { error: "too_many_requests", retryAfterSec: ipCheck.retryAfterSec },
      { status: 429, headers: { "Retry-After": String(ipCheck.retryAfterSec) } }
    );
  }

  const email =
    (typeof data.Email === "string" && data.Email)
    || (typeof data.email === "string" && data.email)
    || "";
  if (email) {
    const emailLimit = Number(process.env.FORM_RATE_LIMIT_PER_EMAIL ?? 5);
    const emailWindowSec = Number(process.env.FORM_RATE_LIMIT_WINDOW_SEC ?? 3600);
    const emailCheck = await consumeRateLimit({
      bucket: "form-email",
      key: email.trim().toLowerCase(),
      limit: emailLimit,
      windowSec: emailWindowSec,
    });
    if (!emailCheck.ok) {
      return NextResponse.json(
        { error: "too_many_requests", retryAfterSec: emailCheck.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(emailCheck.retryAfterSec) } }
      );
    }
  }

  let dbWriteFailed = false;

  if (formType === "contact") {
    try {
      await upsertBusinessLeadFromContactForm(data);
    } catch (err) {
      console.error("contact_db_write_failed", err);
      dbWriteFailed = true;
    }
  }

  if (formType === "application") {
    try {
      await upsertApplicationFromForm(data);
    } catch (err) {
      console.error("application_db_write_failed", err);
      dbWriteFailed = true;
    }
  }

  // Always attempt the Google Sheets forward, especially if DB write fails.
  const sheetsForward = await forwardToAppsScriptBackup(data);

  if (dbWriteFailed) {
    if (sheetsForward.ok) {
      return NextResponse.json({
        success: true,
        stored: "sheets_backup_only",
      });
    }
    return NextResponse.json(
      {
        error: "storage_failed",
        db: "write_failed",
        sheets: sheetsForward.configured ? "forward_failed" : "not_configured",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    sheetsBackupForwarded: sheetsForward.ok,
  });
}
