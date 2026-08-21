import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import { auth, onAuthStateChanged, User } from "@/lib/firebase";

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // The web preview does not need to wait for Firebase's persisted-session
  // restoration before showing the sign-in route. Native keeps the short
  // loading gate so an existing session does not flash the auth screen.
  const [loading, setLoading] = useState(Platform.OS !== "web");

  useEffect(() => {
    let active = true;
    const finishLoading = (u: User | null) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
    };

    const fallback = setTimeout(() => finishLoading(auth.currentUser), 6000);
    const unsub = onAuthStateChanged(
      auth,
      (u) => {
        clearTimeout(fallback);
        finishLoading(u);
      },
      () => {
        clearTimeout(fallback);
        finishLoading(null);
      },
    );

    return () => {
      active = false;
      clearTimeout(fallback);
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
