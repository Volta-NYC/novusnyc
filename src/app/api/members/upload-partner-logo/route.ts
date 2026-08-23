import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

type UploadBody = { partnerId?: string; dataUrl?: string };

function decodeDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const comma = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || comma < 0) return null;
  const meta = dataUrl.slice(5, comma);
  if (!/;base64$/i.test(meta)) return null;
  const mime = (meta.split(";")[0] || "").trim();
  if (!new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]).has(mime)) return null;
  try { return { mime, buffer: Buffer.from(dataUrl.slice(comma + 1), "base64") }; }
  catch { return null; }
}

function extensionFor(mime: string): string {
  return mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : mime === "image/gif" ? "gif" : "jpg";
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["owner"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as UploadBody;
  const partnerId = body.partnerId?.trim() ?? "";
  const decoded = decodeDataUrl(body.dataUrl?.trim() ?? "");
  if (!partnerId) return NextResponse.json({ error: "missing_partner_id" }, { status: 400 });
  if (!decoded) return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  if (decoded.buffer.byteLength > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "image_too_large", detail: "Logos must be 5 MB or smaller." }, { status: 413 });
  }

  const sb = getSupabaseAdmin();
  const path = `${partnerId}/logo.${extensionFor(decoded.mime)}`;
  const { error: uploadError } = await sb.storage.from("partner-logos").upload(path, decoded.buffer, {
    contentType: decoded.mime,
    upsert: true,
  });
  if (uploadError) return NextResponse.json({ error: "upload_failed", detail: uploadError.message }, { status: 500 });

  const { data: urlData } = sb.storage.from("partner-logos").getPublicUrl(path);
  const logoUrl = urlData.publicUrl;
  const { data: updated, error: updateError } = await sb.from("bids")
    .update({ logo_path: path, logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", partnerId)
    .select("id")
    .maybeSingle();
  if (updateError || !updated) {
    return NextResponse.json({ error: "partner_update_failed", detail: updateError?.message }, { status: 500 });
  }

  revalidatePath("/");
  revalidatePath("/partners");
  return NextResponse.json({ success: true, path, logoUrl });
}
