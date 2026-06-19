import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  signOut as firebaseSignOut,
  getRedirectResult,
  browserPopupRedirectResolver,
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

// Pass browserPopupRedirectResolver explicitly so Firebase SDK 12 can use its
// built-in BroadcastChannel fallback when window.opener is null under COOP.
export const signInWithGoogle = () =>
  signInWithPopup(auth, googleProvider, browserPopupRedirectResolver);

export const handleGoogleRedirectResult = () =>
  getRedirectResult(auth, browserPopupRedirectResolver);

export const signInGuest = () => signInAnonymously(auth);
export const signOut = () => firebaseSignOut(auth);
