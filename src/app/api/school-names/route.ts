import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("team")
    .select("school")
    .is("deleted_at", null)
    .not("school", "is", null)
    .neq("school", "");

  const names = [...new Set(
    (data ?? [])
      .map((r: { school?: string | null }) => r.school?.trim())
      .filter((n): n is string => Boolean(n))
  )].sort();

  return NextResponse.json(names, {
    headers: { "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600" },
  });
}
