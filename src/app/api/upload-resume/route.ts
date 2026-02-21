import { NextResponse } from "next/server";

// Receives a resume file upload, converts to base64, and forwards to
// Google Apps Script which saves it to Drive and returns a shareable link.
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
  if (!url) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Convert file to base64 for transport to Apps Script.
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formType: "upload",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileData: base64,
      }),
      redirect: "follow",
    });

    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json.url) return NextResponse.json({ url: json.url });
    } catch {
      // Apps Script response wasn't parseable JSON — Drive URL not returned.
    }
  } catch {
    // Network error reaching Apps Script.
  }

  return NextResponse.json({ url: "" });
}
