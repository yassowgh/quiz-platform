import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
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

export const auth = getAuth(app);
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