"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { type AuthRole } from "@/lib/members/storage";

function normalizeAuthRole(value: unknown): AuthRole {
  const raw = String(value ?? "").trim();
  if (raw === "admin") return "admin";
  if (raw === "interviewer") return "interviewer";
  return "member";
}

// ── CONTEXT TYPE ──────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  authRole: AuthRole;
  active: boolean;
}

interface AuthContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  authRole: AuthRole | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  authRole: null,
  loading: true,
});

// ── AUTH PROVIDER ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading]         = useState(true);

  async function loadProfile(authUser: User) {
    try {
      const { data } = await supabase
        .from("team")
        .select("id, email, name, active, auth_role")
        .eq("auth_uid", authUser.id)
        .single();

      if (data) {
        setUserProfile({
          id:       data.id,
          email:    data.email ?? authUser.email ?? "",
          name:     data.name ?? "",
          authRole: normalizeAuthRole(data.auth_role),
          active:   data.active !== false,
        });
      } else {
        // Auth user exists but no linked team row yet (mid-signup or not yet linked).
        setUserProfile(null);
      }
    } catch {
      setUserProfile(null);
    }
  }

  useEffect(() => {
    // Hydrate initial session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      if (authUser) {
        loadProfile(authUser).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen for sign-in / sign-out / token refresh.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const authUser = session?.user ?? null;
      setUser(authUser);
      if (authUser) {
        loadProfile(authUser).finally(() => setLoading(false));
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, authRole: userProfile?.authRole ?? null, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── HOOK ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
