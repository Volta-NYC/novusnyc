import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCaller } from "@/lib/server/adminApi";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function tracks(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join(", ");
  return text(value);
}

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"], { allowIfCanInterview: true });
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb.from("applications").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "load_failed" }, { status: 500 });

  const applications = (data ?? []).map((row) => ({
    id: text(row.id),
    fullName: text(row.full_name),
    email: text(row.email).toLowerCase(),
    schoolName: text(row.school_name),
    grade: text(row.grade),
    cityState: text(row.city_state),
    referral: text(row.referral),
    referralName: text(row.referral_name),
    state: text(row.state),
    city: text(row.city),
    chapter: text(row.chapter),
    tracksSelected: tracks(row.tracks_selected),
    marketingSubtrack: text(row.marketing_subtrack),
    hasResume: row.has_resume == null ? "" : String(row.has_resume),
    resumeUrl: text(row.resume_url),
    toolsSoftware: text(row.tools_software),
    accomplishment: text(row.accomplishment),
    status: text(row.status) || "New",
    notes: text(row.notes),
    finalDecisionRole: text(row.final_decision_role),
    memberId: row.member_id ?? null,
    decidedAt: row.decided_at ?? null,
    decidedBy: row.decided_by ?? null,
    source: text(row.source) || undefined,
    sourceTimestampRaw: text(row.source_timestamp_raw),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  }));

  return NextResponse.json({ success: true, applications });
}
