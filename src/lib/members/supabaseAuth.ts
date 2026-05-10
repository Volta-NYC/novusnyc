// Supabase Auth wrappers for the Volta NYC members portal.
// Replaces firebaseAuth.ts — same sign-in / sign-out interface.

import { supabase } from "@/lib/supabaseClient";

export async function signIn(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// Returns the current session's JWT access token, or "" if not signed in.
// Use this wherever Firebase's user.getIdToken() was called.
export async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? "";
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
