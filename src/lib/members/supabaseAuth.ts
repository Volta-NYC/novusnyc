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
// autoRefreshToken: true on the client keeps the access token fresh automatically,
// so getSession() always returns a valid (or just-refreshed) token.  We never
// call refreshSession() manually — rotating refresh tokens race and invalidate
// each other when multiple API calls are in-flight simultaneously.
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
}

// Sends a password-reset email. The link redirects to /members/reset-password
// which handles the PASSWORD_RECOVERY session and prompts for a new password.
export async function resetPassword(email: string): Promise<void> {
  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/members/reset-password`
      : "https://voltanyc.org/members/reset-password";
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}
