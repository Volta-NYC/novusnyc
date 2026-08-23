import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCaller } from "@/lib/server/adminApi";
import { resolveInterviewZoomSettings } from "@/lib/interviews/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner", "admin"], { allowIfCanInterview: true });
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("interview_settings")
    .select("zoom_link, zoom_enabled")
    .eq("id", "singleton")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "settings_failed" }, { status: 500 });

  const effective = resolveInterviewZoomSettings(
    data ? { zoomLink: data.zoom_link, zoomEnabled: data.zoom_enabled } : null,
    process.env.INTERVIEW_ZOOM_LINK ?? "",
  );
  return NextResponse.json(effective);
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const zoomLink = typeof body.zoomLink === "string" ? body.zoomLink.trim() : "";
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("interview_settings")
    .upsert({
      id: "singleton",
      zoom_link: zoomLink || null,
      zoom_enabled: true,
      updated_at: new Date().toISOString(),
      updated_by: verified.caller.uid,
    });
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ success: true, zoomLink });
}
