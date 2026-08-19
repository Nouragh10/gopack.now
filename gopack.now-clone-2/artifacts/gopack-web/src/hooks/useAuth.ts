import { useState, useEffect } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, signInWithGoogle, signInGuest, signOut } from "../lib/firebase";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return {
    user,
    loading,
    signInWithGoogle,
    signInGuest,
    signOut,
  };
}
