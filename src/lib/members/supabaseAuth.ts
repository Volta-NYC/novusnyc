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
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return "";

  // Role changes live in app_metadata. Refresh before API calls so migrated
  // accounts do not keep sending a stale JWT without auth_role.
  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (!error && refreshed.session?.access_token) {
    return refreshed.session.access_token;
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
