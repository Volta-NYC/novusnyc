// Supabase Auth wrappers for the Novus NYC members portal.

import { supabase } from "@/lib/supabaseClient";

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Returns the current session's JWT access token, or "" if not signed in.
// autoRefreshToken: true on the client keeps the access token fresh automatically,
// so getSession() always returns a valid (or just-refreshed) token.  We never
// call refreshSession() manually — rotating refresh tokens race and invalidate
// each other when multiple API calls are in-flight simultaneously.
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

// Sends a password-reset email via our own SMTP pipeline (consistent with
// other auth emails). The server-side route generates the recovery link and
// sends it through our email_templates system.
export async function resetPassword(email: string): Promise<void> {
  const res = await fetch("/api/members/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (res.status === 429) throw new Error("over_email_send_rate_limit");
  if (!res.ok) throw new Error("reset_failed");
}
