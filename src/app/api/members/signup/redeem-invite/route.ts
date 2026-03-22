import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "@/lib/server/adminApi";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { incrementInviteCodeUsage } from "@/lib/server/inviteCodes";

type RedeemInviteBody = {
  code?: string;
  email?: string;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

async function verifyUser(idToken: string): Promise<{ uid: string; email: string } | null> {
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: normalizeEmail(decoded.email ?? ""),
      };
    } catch {
      return null;
    }
  }

  const apiKey = String(process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "").trim();
  if (!apiKey) return null;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as {
    users?: Array<{ localId?: string; email?: string }>;
  };
  const user = data.users?.[0];
  if (!user?.localId) return null;
  return {
    uid: user.localId,
    email: normalizeEmail(user.email ?? ""),
  };
}

export async function POST(req: NextRequest) {
  const idToken = getBearerToken(req);
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as RedeemInviteBody;
  const code = String(body.code ?? "").trim().toUpperCase();
  const email = normalizeEmail(String(body.email ?? ""));
  if (!code || !email) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const caller = await verifyUser(idToken);
  if (!caller) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (caller.email && caller.email !== email) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
  }

  let tracked = false;
  try {
    tracked = await incrementInviteCodeUsage({ code, email, idToken });
  } catch {
    tracked = false;
  }
  return NextResponse.json({ success: true, tracked });
}
