import { getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  deleteUser,
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
 * Deletes the signed-in user's Firebase Auth account.
 *
 * Firebase requires a "recent" sign-in for this sensitive operation. If the
 * session is stale and the account uses email/password, this throws
 * `auth/needs-password` so the caller can prompt for a password and retry
 * with it (which reauthenticates before deleting). Anonymous sessions have
 * no credential to reauthenticate with, so a stale anonymous session just
 * gets signed out after `wipeData` runs — the record holds no personal data
 * and can never be signed back into.
 *
 * `wipeData` (if provided) runs only after we're confident deletion will
 * proceed (session confirmed recent, or reauthentication just succeeded),
 * and always before the account is actually removed/signed out.
 */
export const deleteAccount = async (password?: string, wipeData?: () => Promise<void>) => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No user signed in");

  const recent = await isSessionRecent(currentUser);

  if (!recent && currentUser.email) {
    if (!password) {
      const needsPassword = new Error("Password required to confirm deletion");
      (needsPassword as any).code = "auth/needs-password";
      throw needsPassword;
    }
    const credential = EmailAuthProvider.credential(currentUser.email, password);
    await reauthenticateWithCredential(currentUser, credential);
  }

  if (wipeData) await wipeData();

  try {
    await deleteUser(currentUser);
  } catch (e: any) {
    if (e?.code === "auth/requires-recent-login" && currentUser.isAnonymous) {
      await firebaseSignOut(auth);
      return;
    }
    throw e;
  }
};

export { equalTo, get, onValue, orderByChild, push, query, ref, set, update };
