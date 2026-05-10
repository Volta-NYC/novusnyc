import { NextRequest, NextResponse } from "next/server";
import { verifyCaller } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Accepts a base64 data URL and uploads to Supabase Storage.
// Returns { path, url } on success.

type UploadBody = {
  businessId?: string;
  dataUrl?: string;
};

function extractMimeAndBuffer(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const commaIndex = dataUrl.indexOf(",");
  if (!dataUrl.startsWith("data:") || commaIndex < 0) return null;

  const meta = dataUrl.slice(5, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  const isBase64 = /;base64$/i.test(meta);
  const mime = (meta.split(";")[0] || "image/jpeg").trim();

  if (!isBase64) return null;

  try {
    const buffer = Buffer.from(payload, "base64");
    return { mime, buffer };
  } catch {
    return null;
  }
}

function mimeToExt(mime: string): string {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function POST(req: NextRequest) {
  const verified = await verifyCaller(req, ["admin", "member"]);
  if (!verified.ok) return NextResponse.json({ error: verified.error }, { status: verified.status });

  const body = (await req.json().catch(() => ({}))) as UploadBody;
  const businessId = (body.businessId ?? "").trim();
  const dataUrl = (body.dataUrl ?? "").trim();

  if (!businessId) return NextResponse.json({ error: "missing_business_id" }, { status: 400 });
  if (!dataUrl) return NextResponse.json({ error: "missing_data_url" }, { status: 400 });

  const decoded = extractMimeAndBuffer(dataUrl);
  if (!decoded) return NextResponse.json({ error: "invalid_data_url" }, { status: 400 });

  const ext = mimeToExt(decoded.mime);
  const path = `${businessId}/showcase.${ext}`;

  const sb = getSupabaseAdmin();
  const { error: uploadError } = await sb.storage
    .from("business-photos")
    .upload(path, decoded.buffer, {
      contentType: decoded.mime,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: "upload_failed", detail: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = sb.storage.from("business-photos").getPublicUrl(path);
  const url = urlData?.publicUrl ?? "";

  // Update businesses table with the new image path and URL.
  await sb.from("businesses").update({
    showcase_image_path: path,
    showcase_image_url: url,
    showcase_image_set: true,
    updated_at: new Date().toISOString(),
  }).eq("id", businessId);

  return NextResponse.json({ success: true, path, url });
}
