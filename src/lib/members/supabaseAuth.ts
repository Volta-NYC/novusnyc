// Supabase Auth wrappers for the Volta NYC members portal.

import { supabase } from "@/lib/supabaseClient";

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Returns the current session's JWT access token, or "" if not signed in.
// Refresh tokens rotate on every use — calling refreshSession() unconditionally
// on every API call causes concurrent requests to race and invalidate each
// other's tokens, triggering a SIGNED_OUT event.  Only refresh when the token
// is about to expire (within 60 seconds).
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return "";

  const expiresAt = session.expires_at ?? 0;           // Unix seconds
  const nowSec    = Date.now() / 1000;
  const ttl       = expiresAt - nowSec;                // seconds remaining

  if (ttl <= 60) {
    // Token is expired or expiring soon — refresh it.
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (!error && refreshed.session?.access_token) {
      return refreshed.session.access_token;
    }
  }

  return session.access_token;
}

// Sends a password-reset email. Use on the login page's "Forgot password" link.
export async function resetPassword(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/members/login`
      : "https://voltanyc.org/members/login";
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}
