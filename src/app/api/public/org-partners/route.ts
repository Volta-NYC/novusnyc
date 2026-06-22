import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Public endpoint — no auth required. Returns the sorted list of active
// partner org names from the bids table. Used by the public contact form
// to populate the "referred by" datalist.

export async function GET() {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("bids")
      .select("name")
      .eq("status", "Active Partner")
      .order("name", { ascending: true });

    if (error || !data) return NextResponse.json({ partners: [] });

    const partners = data.map((r: { name: string }) => r.name);
    return NextResponse.json({ partners }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch {
    return NextResponse.json({ partners: [] });
  }
}
