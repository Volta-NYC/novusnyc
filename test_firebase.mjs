import { readFileSync } from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const env = Object.fromEntries(
  readFileSync('/Users/ethanzhang180/volta/voltanyc/.env.local', 'utf8')
    .split('\n')
    .filter(l => /^[A-Z]/.test(l) && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx), l.slice(idx + 1).replace(/^"|"$/g, '')];
    })
);

const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

initializeApp({
  credential: cert({
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey,
  }),
  databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
});

const snap = await getDatabase().ref('/').limitToFirst(5).get();
console.log('Firebase ✓ connected');
console.log('Root collections:', Object.keys(snap.val() || {}));
