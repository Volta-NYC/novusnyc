"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { type User, onAuthStateChanged } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { getAuth, getDB } from "@/lib/firebase";
import { type UserProfile, type AuthRole } from "@/lib/members/storage";

// The hard-coded admin email always receives the admin role, regardless of
// what is stored in the database. This bootstraps the first admin account.
const ADMIN_EMAIL = "ethan@voltanpo.org";

// ── CONTEXT TYPE ──────────────────────────────────────────────────────────────

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

  useEffect(() => {
    const auth = getAuth();
    if (!auth) {
      setLoading(false);
      return;
    }

    // Listen for Firebase auth state changes (sign-in, sign-out, page reload).
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const db = getDB();
        if (db) {
          const profileSnap = await get(ref(db, `userProfiles/${firebaseUser.uid}`));

          if (profileSnap.exists()) {
            const profile = profileSnap.val() as Omit<UserProfile, "id">;

            // Enforce admin role for the designated admin email, even if
            // the database record was somehow changed to a lower role.
            if (firebaseUser.email === ADMIN_EMAIL && profile.authRole !== "admin") {
              await set(ref(db, `userProfiles/${firebaseUser.uid}/authRole`), "admin");
              profile.authRole = "admin";
            }

            setUserProfile({ ...profile, id: firebaseUser.uid });
          } else {
            // First login: create a profile record in the database.
            const newProfile: UserProfile = {
              id:        firebaseUser.uid,
              email:     firebaseUser.email ?? "",
              authRole:  firebaseUser.email === ADMIN_EMAIL ? "admin" : "member",
              active:    true,
              createdAt: new Date().toISOString(),
            };
            await set(ref(db, `userProfiles/${firebaseUser.uid}`), {
              email:     newProfile.email,
              authRole:  newProfile.authRole,
              active:    newProfile.active,
              createdAt: newProfile.createdAt,
            });
            setUserProfile(newProfile);
          }
        }
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Admin email always gets admin role — even if the DB profile hasn't loaded yet.
  // This ensures the admin can access admin pages even when the DB is slow or unavailable.
  const effectiveRole: AuthRole | null =
    user?.email === ADMIN_EMAIL ? "admin" : userProfile?.authRole ?? null;

  return (
    <AuthContext.Provider value={{ user, userProfile, authRole: effectiveRole, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── HOOK ──────────────────────────────────────────────────────────────────────

export function useAuth() {
  return useContext(AuthContext);
}
