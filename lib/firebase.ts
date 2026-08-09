import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db: Firestore = getFirestore(app);

// getAuth() validates the API key's format synchronously and throws if it's
// missing/invalid — unlike getFirestore(), which doesn't. Initializing it
// eagerly at module scope crashes Next's build-time "collect page data" step
// (which imports every route's module graph, including this file via `db`,
// regardless of `force-dynamic`) whenever Firebase env vars aren't
// configured — e.g. a fresh deploy target before real values exist there
// (`.env.local` is gitignored and never ships to a deployment). Deferring
// the call until something actually needs Auth (a client-side event handler
// or effect — never module-evaluation time) avoids that crash entirely.
let cachedAuth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (!cachedAuth) {
    cachedAuth = getAuth(app);
  }
  return cachedAuth;
}

export { app, db };
