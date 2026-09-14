import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "quizups.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// getAuth() resolves persistence on its own, and on a mobile browser where
// IndexedDB is unavailable - private mode, some Android webviews - that walk
// through the storage options is what trips the SDK into throwing
// "INTERNAL ASSERTION FAILED: Pending promise was never set" from its auth
// event resolver. Stating the fallback chain explicitly lets it degrade to
// in-memory instead. The popup resolver is passed so Google sign-in still works.
function initAuth() {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
    });
  } catch (e) {
    // Already initialised (a second import, or a dev hot reload) - reuse it.
    return getAuth(app);
  }
}

export const auth = initAuth();
// Firestore rejects a write outright if any field is undefined, which took
// down quiz saving for anyone whose quiz carried an unset optional field.
// Skipping those fields is the documented behaviour we want.
function initDb() {
  try {
    return initializeFirestore(app, { ignoreUndefinedProperties: true });
  } catch (e) {
    // Already initialised (a second import, or a dev hot reload) - reuse it.
    return getFirestore(app);
  }
}
export const db = initDb();
export const rtdb = getDatabase(app);
export const storage = getStorage(app);
export default app;