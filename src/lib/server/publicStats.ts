import "server-only";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type PublicStatOverrides = Record<string, string>;

export async function getPublicStatOverrides(): Promise<PublicStatOverrides> {
  try {
    const { data } = await getSupabaseAdmin()
      .from("site_settings")
      .select("public_stat_overrides")
      .eq("id", "singleton")
      .maybeSingle();
    const raw = data?.public_stat_overrides;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, String(value ?? "").trim()]));
  } catch {
    return {};
  }
}

export function publicStat(overrides: PublicStatOverrides, key: string, fallback: string): string {
  return overrides[key] || fallback;
}
