import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: { id: string };
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

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const id = decodeURIComponent(params.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const db = getAdminDB();
  if (!db) {
    return NextResponse.json({ error: "firebase_not_configured" }, { status: 500 });
  }

  const snap = await db.ref(`businesses/${id}`).get();
  if (!snap.exists()) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const row = (snap.val() ?? {}) as Record<string, unknown>;
  const inline = readText(row.showcaseImageData);
  if (inline) {
    const decoded = decodeDataUrl(inline);
    if (!decoded) {
      return NextResponse.json({ error: "invalid_image_data" }, { status: 400 });
    }

    return new Response(decoded.body, {
      status: 200,
      headers: {
        "Content-Type": decoded.mime,
        "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  }

  const remoteUrl = readText(row.showcaseImageUrl);
  if (remoteUrl) {
    return NextResponse.redirect(remoteUrl, { status: 307 });
  }

  return NextResponse.json({ error: "no_image" }, { status: 404 });
}
