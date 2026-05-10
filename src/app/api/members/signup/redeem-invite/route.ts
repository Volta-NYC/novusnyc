import { NextRequest, NextResponse } from "next/server";
import { getBearerToken } from "@/lib/server/adminApi";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { incrementInviteCodeUsage } from "@/lib/server/inviteCodes";

type RedeemInviteBody = {
  code?: string;
  email?: string;
};

export async function POST(req: NextRequest) {
  const idToken = getBearerToken(req);
  if (!idToken) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data: { user }, error } = await sb.auth.getUser(idToken);
  if (error || !user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as RedeemInviteBody;
  const code = String(body.code ?? "").trim().toUpperCase();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!code || !email) return NextResponse.json({ error: "missing_fields" }, { status: 400 });

  const callerEmail = (user.email ?? "").trim().toLowerCase();
  if (callerEmail && callerEmail !== email) {
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
