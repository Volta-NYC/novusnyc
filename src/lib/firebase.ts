// Firebase app initialization for the Volta NYC members portal.
// Lazy-loaded: the public site works without any Firebase env vars set.
// The DB and Auth singletons are cached after first initialization.

import { initializeApp, getApps } from "firebase/app";
import { getDatabase, Database } from "firebase/database";
import { getAuth as firebaseGetAuth, Auth } from "firebase/auth";
import { getStorage as firebaseGetStorage, FirebaseStorage } from "@firebase/storage";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL:       process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Cached instances — initialized at most once per page session.
let db:      Database        | null = null;
let auth:    Auth            | null = null;
let storage: FirebaseStorage | null = null;

// Returns the Firebase App instance, or null if not configured or server-side.
function getFirebaseApp() {
  if (typeof window === "undefined") return null;       // no Firebase in SSR
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) return null; // not configured
  return getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
}

// Returns the Firebase Realtime Database, or null if not configured.
export function getDB(): Database | null {
  if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  if (!db) db = getDatabase(app);
  return db;
}

// Returns the Firebase Auth instance, or null if not configured.
export function getAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) return null;
  if (!auth) auth = firebaseGetAuth(app);
  return auth;
}

// Returns the Firebase Storage instance, or null if not configured.
export function getStorage(): FirebaseStorage | null {
  if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) return null;
  const app = getFirebaseApp();
  if (!app) return null;
  if (!storage) storage = firebaseGetStorage(app);
  return storage;
}

// Returns true if the required Firebase env vars are present.
export function isFirebaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
}
