import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Module-level singleton — safe to call from client components and server components.
//
// Auth options explained:
//   persistSession   — store the session in localStorage so it survives page
//                      reloads and browser restarts (default: true, set explicitly
//                      to make the intent clear)
//   autoRefreshToken — the SDK silently refreshes the access token before it
//                      expires, so the user never gets logged out due to token
//                      expiry as long as the tab is open (default: true)
//   detectSessionInUrl — pick up magic-link / invite tokens from the URL hash
//                        on page load (default: true)
//
// Refresh tokens have no time-based expiry in Supabase unless you configure one
// in the Auth dashboard.  Combined with persistSession + autoRefreshToken the
// user stays signed in indefinitely and is only logged out by an explicit
// signOut() call.
export const supabase = createClient(url, key, {
  auth: {
    persistSession:     true,
    autoRefreshToken:   true,
    detectSessionInUrl: true,
  },
});
