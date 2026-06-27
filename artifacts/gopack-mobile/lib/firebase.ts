import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  onAuthStateChanged,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  User,
} from "firebase/auth";
import {
  equalTo,
  get,
  getDatabase,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  set,
  update,
} from "firebase/database";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyDtdq065PaOR3xlML_fekm53h2XcPz3NAo",
  authDomain: "gopacknow-83d54.firebaseapp.com",
  databaseURL: "https://gopacknow-83d54-default-rtdb.firebaseio.com",
  projectId: "gopacknow-83d54",
  storageBucket: "gopacknow-83d54.firebasestorage.app",
  messagingSenderId: "107013969008",
  appId: "1:107013969008:web:5c6026da49efe7b58510b5",
};

const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence:
      Platform.OS === "web" ? browserLocalPersistence : inMemoryPersistence,
  });
} catch {
  auth = getAuth(app);
}

export { auth, onAuthStateChanged };
export type { User };

export const db = getDatabase(app);
export const storage = getStorage(app);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`;

export const sendBrandedVerificationEmail = async (
  uid: string,
  email: string,
  displayName: string,
): Promise<void> => {
  const url = `${API_BASE}/api/auth/send-verification`;
  console.log("[sendVerification] POST", url);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid, email, displayName }),
  });
  console.log("[sendVerification] status", res.status);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.log("[sendVerification] error body", JSON.stringify(body));
    throw new Error((body as any).error ?? "Failed to send verification email");
  }
};

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  // Send branded email via API server (Resend), then sign out so the
  // routing guard cannot bypass the verify screen.
  await sendBrandedVerificationEmail(cred.user.uid, email, displayName);
  await firebaseSignOut(auth);
  return cred;
};

export const signInGuest = () => signInAnonymously(auth);
export const signOut = () => firebaseSignOut(auth);

export { equalTo, get, onValue, orderByChild, push, query, ref, set, update };
