import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Module-level singleton — safe to call from client components and server components.
// persistSession must be true so the auth cookie/localStorage token survives page reloads.
export const supabase = createClient(url, key);
