import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  inMemoryPersistence,
  initializeAuth,
  onAuthStateChanged,
  reauthenticateWithCredential,
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
import { getBaseUrl } from "@/lib/api-client";

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
  await firebaseSignOut(auth);
  return cred;
};

export const signInGuest = () => signInAnonymously(auth);
export const signOut = () => firebaseSignOut(auth);

export const updateCurrentUserProfile = async (displayName: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user signed in");
  await updateProfile(currentUser, { displayName });
};

async function isSessionRecent(user: User): Promise<boolean> {
  try {
    const tokenResult = await user.getIdTokenResult();
    const authTime = new Date(tokenResult.authTime).getTime();
    return Date.now() - authTime < 4 * 60 * 1000;
  } catch {
    return false;
  }
}

/**
 * Deletes the signed-in user's account through the trusted API service.
 *
 * Firebase requires a "recent" sign-in for this sensitive operation. If the
 * session is stale and the account uses email/password, this throws
 * `auth/needs-password` so the caller can prompt for a password and retry
 * with it before starting the server-side deletion.
 *
 * `wipeData` (if provided) runs only after we're confident deletion will
 * proceed (session confirmed recent, or reauthentication just succeeded),
 * before the server begins deletion. The server persists a retry marker after
 * its atomic RTDB cleanup, then deletes the Firebase Auth user.
 */
export const deleteAccount = async (password?: string) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user signed in");

  const recent = await isSessionRecent(currentUser);

  if (!recent) {
    if (currentUser.email) {
      if (!password) {
        const needsPassword = new Error("Password required to confirm deletion");
        (needsPassword as any).code = "auth/needs-password";
        throw needsPassword;
      }
      const credential = EmailAuthProvider.credential(currentUser.email, password);
      await reauthenticateWithCredential(currentUser, credential);
    } else {
      const recentLoginRequired = new Error("Please start a new guest session before deleting it");
      (recentLoginRequired as any).code = "auth/requires-recent-login";
      throw recentLoginRequired;
    }
  }

  const idToken = await currentUser.getIdToken(true);
  const baseUrl =
    getBaseUrl() ??
    (Platform.OS === "web" ? "" : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`);
  const response = await fetch(`${baseUrl}/api/auth/delete-account`, {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  const result = await response.json().catch(() => ({} as { error?: string }));
  if (!response.ok) {
    const error = new Error(result.error ?? "We couldn't delete your account.");
    (error as any).code = response.status === 401 ? "auth/requires-recent-login" : "account/deletion-failed";
    throw error;
  }

  await firebaseSignOut(auth).catch(() => undefined);
};

export { equalTo, get, onValue, orderByChild, push, query, ref, set, update };
