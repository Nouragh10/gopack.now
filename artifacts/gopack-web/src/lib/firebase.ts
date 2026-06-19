import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: 'AIzaSyDtdq065PaOR3xlML_fekm53h2XcPz3NAo',
  authDomain: 'gopacknow-83d54.firebaseapp.com',
  databaseURL: 'https://gopacknow-83d54-default-rtdb.firebaseio.com',
  projectId: 'gopacknow-83d54',
  storageBucket: 'gopacknow-83d54.firebasestorage.app',
  messagingSenderId: '107013969008',
  appId: '1:107013969008:web:5c6026da49efe7b58510b5'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = (savePath?: string) => {
  if (savePath) sessionStorage.setItem("gopack_auth_redirect", savePath);
  return signInWithRedirect(auth, googleProvider);
};

export const handleGoogleRedirectResult = () => getRedirectResult(auth);

export const signInGuest = () => signInAnonymously(auth);
export const signOut = () => firebaseSignOut(auth);
