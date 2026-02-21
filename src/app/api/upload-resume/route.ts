import { NextResponse } from "next/server";
import { request as undiciRequest } from "undici";

// Receives a resume file upload, converts to base64, and forwards to
// Google Apps Script which saves it to Drive and returns a shareable link.
//
// Why undici instead of fetch: Apps Script responds with a 302 redirect to a
// googleusercontent.com URL that serves the actual JSON response. Node's native
// fetch (WhatWG spec) returns an opaque redirect on redirect:"manual" and hides
// the Location header. undici.request with maxRedirections:0 stops at the 302
// and exposes the Location header so we can follow it manually to read the JSON.
export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
  if (!url) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Convert file to base64 for transport to Apps Script.
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  try {
    // POST to Apps Script; stop before following the redirect.
    const { statusCode, headers } = await undiciRequest(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        formType: "upload",
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileData: base64,
      }),
      maxRedirections: 0,
    });

    // Apps Script returns 302 → googleusercontent.com URL that serves the JSON.
    if (statusCode === 301 || statusCode === 302) {
      const location = Array.isArray(headers.location)
        ? headers.location[0]
        : headers.location;

      if (location) {
        const { body } = await undiciRequest(location);
        const text = await body.text();
        try {
          const json = JSON.parse(text);
          if (json.url) return NextResponse.json({ url: json.url });
        } catch {
          // Response at redirect URL wasn't JSON.
        }
      }
    }
  } catch {
    // Network error or Apps Script unreachable.
  }

  return NextResponse.json({ url: "" });
}
