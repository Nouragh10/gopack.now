import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  getRedirectResult,
} from "firebase/auth";
import { getDatabase } from "firebase/database";

// In production the auth handler is proxied through our own domain via Express
// (/__/auth/* → gopacknow-83d54.firebaseapp.com/__/auth/*). This makes the
// Firebase popup same-origin, so COOP no longer nullifies window.opener and
// signInWithPopup works correctly.
const firebaseConfig = {
  apiKey: 'AIzaSyDtdq065PaOR3xlML_fekm53h2XcPz3NAo',
  authDomain: import.meta.env.PROD ? 'gopack.now' : 'gopacknow-83d54.firebaseapp.com',
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

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

// Keep as a safety net for any in-flight redirect sessions
export const handleGoogleRedirectResult = () => getRedirectResult(auth);

export const signInGuest = () => signInAnonymously(auth);
export const signOut = () => firebaseSignOut(auth);
