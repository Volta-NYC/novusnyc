import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Intentionally not force-dynamic — Next.js edge cache will serve subsequent
// requests for the same image without hitting Supabase at all.

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const sb = getSupabaseAdmin();

  // Primary: look up showcase_image_path in businesses table → redirect to Storage URL.
  const { data: biz } = await sb
    .from("businesses")
    .select("showcase_image_path, showcase_image_url")
    .eq("id", id)
    .maybeSingle();

  if (biz?.showcase_image_path) {
    const { data: urlData } = sb.storage
      .from("business-photos")
      .getPublicUrl(biz.showcase_image_path);
    if (urlData?.publicUrl) {
      return NextResponse.redirect(urlData.publicUrl, {
        status: 307,
        headers: {
          "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
        },
      });
    }
  }

  if (biz?.showcase_image_url) {
    return NextResponse.redirect(String(biz.showcase_image_url), { status: 307 });
  }

  return NextResponse.json({ error: "no_image" }, { status: 404 });
}
