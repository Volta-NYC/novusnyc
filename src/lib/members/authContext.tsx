"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { type AuthRole } from "@/lib/members/storage";

function normalizeAuthRole(value: unknown): AuthRole {
  const raw = String(value ?? "").trim();
  if (raw === "owner") return "owner";
  if (raw === "admin") return "admin";
  return "member";
}

const AUTH_ROLE_TIER: Record<AuthRole, number> = { owner: 2, admin: 1, member: 0 };

function maxAuthRole(a: AuthRole, b: AuthRole): AuthRole {
  return AUTH_ROLE_TIER[a] >= AUTH_ROLE_TIER[b] ? a : b;
}

// ── CONTEXT TYPE ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  authRole: AuthRole;
  canInterview: boolean;
  active: boolean;
}

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  authRole: AuthRole | null;
  canInterview: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  authRole: null,
  canInterview: false,
  loading: true,
});

// ── AUTH PROVIDER ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  // Returns the resolved profile (or null) without touching React state —
  // the caller decides whether to apply it, allowing stale loads to be ignored.
  async function fetchProfile(_authUser: User): Promise<UserProfile | null> {
    try {
      // getUser() calls the Supabase Auth server and returns current app_metadata —
      // avoids stale JWT where app_metadata was updated after the session was created.
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const email = (user.email ?? "").trim().toLowerCase();
      if (!email) return null;

      const { data: rows } = await supabase
        .from("team")
        .select("*")
        .or(`email.eq.${email},alternate_email.eq.${email}`)
        .is("deleted_at", null)
        .limit(1);

      const row = rows?.[0] as Record<string, unknown> | undefined;
      if (!row) return null;

      const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
      const authRole = maxAuthRole(
        normalizeAuthRole(appMeta.auth_role),
        normalizeAuthRole(row.auth_role),
      );
      const canInterview = appMeta.can_interview === true;

      return {
        id:           String(row.id ?? ""),
        email:        String(row.email ?? user.email ?? ""),
        name:         String(row.name ?? ""),
        authRole,
        canInterview,
        active:       String(row.status ?? "Active").toLowerCase() !== "inactive",
      };
    } catch {
      return null;
    }
  }

  useEffect(() => {
    // Single source of truth: onAuthStateChange fires immediately with the
    // current session via INITIAL_SESSION, so a separate getSession() call is
    // not needed. Using both causes a race: two concurrent fetchProfile() calls
    // where whichever finishes last wins, potentially wiping out a valid profile.
    //
    // We use a generation counter so that if a second auth event fires before
    // the first profile load completes, the stale result is discarded.
    let gen = 0;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);

      if (authUser) {
        const myGen = ++gen;
        void fetchProfile(authUser).then((profile) => {
          if (myGen === gen) {          // still the latest event — safe to commit
            setUserProfile(profile);
            setLoading(false);
          }
        });
      } else {
        ++gen;                          // invalidate any in-flight load
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, authRole: userProfile?.authRole ?? null, canInterview: userProfile?.canInterview ?? false, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── HOOK ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
