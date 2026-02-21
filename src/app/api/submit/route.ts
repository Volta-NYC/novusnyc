import { NextResponse } from "next/server";

// Server-side proxy to Google Apps Script.
// The browser POSTs to /api/submit (same origin — no CORS).
// This route forwards it to Apps Script server-to-server (no CORS restrictions).
export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;
  if (!url) {
    return NextResponse.json({ error: "Apps Script URL not configured" }, { status: 500 });
  }

  const data = await request.json();

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      redirect: "follow",
    });
  } catch {
    // Log but don't fail — form data was received, Apps Script issue shouldn't block user
    console.error("Apps Script forwarding failed");
  }

  return NextResponse.json({ success: true });
}
