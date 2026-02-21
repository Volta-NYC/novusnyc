// Firebase Authentication wrappers for the Volta NYC members portal.
// Thin wrappers over the Firebase SDK to keep auth logic centralized
// and to handle the case where Firebase is not configured.

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  type UserCredential,
} from "firebase/auth";
import { getAuth } from "@/lib/firebase";

// Signs in an existing user with email and password.
// Throws if Firebase is not configured or credentials are invalid.
export async function signIn(email: string, password: string): Promise<UserCredential> {
  const auth = getAuth();
  if (!auth) throw new Error("Firebase Auth not configured");
  return signInWithEmailAndPassword(auth, email, password);
}

// Creates a new Firebase Auth account with email and password.
// The caller is responsible for validating the invite code before calling this.
export async function signUp(email: string, password: string): Promise<UserCredential> {
  const auth = getAuth();
  if (!auth) throw new Error("Firebase Auth not configured");
  return createUserWithEmailAndPassword(auth, email, password);
}

// Signs the current user out and clears their session.
export async function signOut(): Promise<void> {
  const auth = getAuth();
  if (!auth) return;
  await firebaseSignOut(auth);
}
