import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ZiggyMascot } from "@/components/mascots/MascotSVG";
import { Loader2 } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" className="flex-shrink-0">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}

export default function Login() {
  const { signInWithGoogle, signInAsGuest } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    setError(null);
    try { await signInWithGoogle(); }
    catch (e) { setError("Could not sign in. Try again."); }
    finally { setLoadingGoogle(false); }
  };

  const handleGuest = async () => {
    setLoadingGuest(true);
    setError(null);
    try { await signInAsGuest(); }
    catch (e) { setError("Could not continue as guest. Try again."); }
    finally { setLoadingGuest(false); }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="max-w-sm w-full text-center"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          <ZiggyMascot size={110} className="mx-auto mb-5" />
        </motion.div>

        <h1 className="text-3xl font-extrabold text-foreground mb-2">
          Welcome to MultiMind Math!
        </h1>
        <p className="text-muted-foreground font-medium mb-8">
          Sign in to save your progress, streaks, and rewards across devices.
        </p>

        <div className="space-y-3 mb-4">
          <Button
            size="lg"
            onClick={handleGoogle}
            disabled={loadingGoogle || loadingGuest}
            className="w-full rounded-full h-14 text-base font-bold gap-3 shadow-md"
          >
            {loadingGoogle ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={handleGuest}
            disabled={loadingGoogle || loadingGuest}
            className="w-full rounded-full h-14 text-base font-bold border-2"
          >
            {loadingGuest && <Loader2 className="w-5 h-5 animate-spin mr-2" />}
            Continue as Guest
          </Button>
        </div>

        {error && (
          <p className="text-sm text-destructive font-semibold bg-destructive/10 rounded-xl px-4 py-2">
            {error}
          </p>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          Guest progress is saved for this session only.
        </p>
      </motion.div>
    </div>
  );
}
