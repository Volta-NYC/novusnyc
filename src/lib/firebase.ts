import { initializeApp, getApps } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let db: Database | null = null;

export function getDB(): Database | null {
  if (typeof window === "undefined") return null;
  if (!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL) return null;
  if (!db) {
    const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db;
}

export function isFirebaseConfigured(): boolean {
  return !!process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
}
