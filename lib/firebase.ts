import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

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

// Same lazy-init pattern as getFirebaseAuth() above, applied consistently:
// Storage is only ever needed from admin-only client components (image
// upload/delete), so there's no reason to pay its init cost — or risk
// repeating the same class of build-time bug — on every route.
let cachedStorage: FirebaseStorage | null = null;

export function getFirebaseStorage(): FirebaseStorage {
  if (!cachedStorage) {
    cachedStorage = getStorage(app);
  }
  return cachedStorage;
}

export { app, db };
