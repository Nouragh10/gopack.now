import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  onAuthStateChanged,
  sendEmailVerification,
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

export const signUpWithEmail = async (
  email: string,
  password: string,
  displayName: string,
) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  await sendEmailVerification(cred.user);
  // Sign out immediately so the routing guard cannot bypass the verify screen.
  // The user will sign in again after clicking the verification link.
  await firebaseSignOut(auth);
  return cred;
};

export const resendVerificationEmail = async () => {
  const user = auth.currentUser;
  if (user) await sendEmailVerification(user);
};

export const signInGuest = () => signInAnonymously(auth);
export const signOut = () => firebaseSignOut(auth);

export { equalTo, get, onValue, orderByChild, push, query, ref, set, update };
