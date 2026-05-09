import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebaseAdmin";

// Intentionally not force-dynamic — Next.js edge cache will serve subsequent
// requests for the same image without hitting Firebase at all.

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function decodeDataUrl(input: string): { mime: string; body: ArrayBuffer } | null {
  const commaIndex = input.indexOf(",");
  if (!input.startsWith("data:") || commaIndex < 0) return null;

  const meta = input.slice(5, commaIndex);
  const payload = input.slice(commaIndex + 1);
  const isBase64 = /;base64$/i.test(meta);
  const mime = (meta.split(";")[0] || "application/octet-stream").trim();

  try {
    if (isBase64) {
      const buffer = Buffer.from(payload, "base64");
      const bytes = Uint8Array.from(buffer);
      return { mime, body: toArrayBuffer(bytes) };
    }

    const decoded = decodeURIComponent(payload);
    const bytes = new TextEncoder().encode(decoded);
    return { mime, body: toArrayBuffer(bytes) };
  } catch {
    return null;
  }
}

function imageResponse(dataUrl: string): NextResponse | null {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;
  return new Response(decoded.body, {
    status: 200,
    headers: {
      "Content-Type": decoded.mime,
      "Cache-Control": "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800",
    },
  }) as unknown as NextResponse;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const db = getAdminDB();
  if (!db) {
    return NextResponse.json({ error: "firebase_not_configured" }, { status: 500 });
  }

  // Primary location: businessImages/{id} (split node, no Base64 in businesses).
  const imageSnap = await db.ref(`businessImages/${id}`).get();
  if (imageSnap.exists()) {
    const val = imageSnap.val() as { data?: string } | null;
    const dataUrl = readText(val?.data);
    if (dataUrl) {
      const res = imageResponse(dataUrl);
      if (res) return res;
    }
  }

  // Legacy fallback: image stored inline in the business record.
  const businessSnap = await db.ref(`businesses/${id}`).get();
  if (!businessSnap.exists()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = (businessSnap.val() ?? {}) as Record<string, unknown>;
  const inline = readText(row.showcaseImageData);
  if (inline) {
    const res = imageResponse(inline);
    if (res) return res;
    return NextResponse.json({ error: "invalid_image_data" }, { status: 400 });
  }

  const remoteUrl = readText(row.showcaseImageUrl);
  if (remoteUrl) {
    return NextResponse.redirect(remoteUrl, { status: 307 });
  }

  return NextResponse.json({ error: "no_image" }, { status: 404 });
}
