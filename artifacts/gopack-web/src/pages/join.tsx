import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useFirebase";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase";

export default function JoinTrip() {
  const [, params] = useRoute("/join/:tripId");
  const tripId = params?.tripId || "";
  const { user, loading: authLoading } = useAuth();
  const { joinTrip } = useTrips();
  const [, setLocation] = useLocation();

  const [tripInfo, setTripInfo] = useState<any>(null);
  const [joining, setJoining] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tripId) return;
    get(ref(db, `trips/${tripId}`))
      .then(snap => {
        if (snap.exists()) setTripInfo({ id: tripId, ...snap.val() });
        else setError("Trip not found. Check your invite code.");
      })
      .catch(() => setError("Could not load trip."))
      .finally(() => setFetching(false));
  }, [tripId]);

  const handleJoin = async () => {
    if (!user) { setLocation("/login"); return; }
    setJoining(true);
    setError("");
    try {
      const name = user.displayName || user.email?.split("@")[0] || "Guest";
      await joinTrip(tripId, name);
      setLocation(`/trip/${tripId}`);
    } catch {
      setError("Failed to join. Please try again.");
      setJoining(false);
    }
  };

  if (fetching || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center gap-4 px-8 py-5 border-b border-border">
        <button onClick={() => setLocation("/")} className="text-muted-foreground hover:text-foreground" data-testid="button-back">
          <ArrowLeft size={20} />
        </button>
        <div className="font-display font-bold text-xl">go<span className="text-primary">pack</span></div>
      </nav>

      <div className="max-w-md mx-auto px-8 py-20">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          {tripInfo ? (
            <>
              <p className="text-xs text-muted-foreground tracking-widest uppercase mb-2">You&apos;re invited</p>
              <h1 className="font-serif text-5xl font-bold mb-8">Join the trip</h1>

              <div className="bg-muted/30 border border-border rounded-2xl p-5 mb-8">
                <div className="font-medium text-lg mb-1">{tripInfo.destination}</div>
                <div className="text-sm text-muted-foreground">
                  {tripInfo.days} days &middot; {(tripInfo.vibes || []).join(", ")}
                </div>
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-lg px-4 py-3 mb-6">
                  {error}
                </div>
              )}

              {!user ? (
                <div className="text-center">
                  <p className="text-muted-foreground mb-6">Sign in to join this trip.</p>
                  <button
                    onClick={() => setLocation(`/login?from=${encodeURIComponent(`/join/${tripId}`)}`)}
                    className="w-full bg-primary text-white font-medium py-4 rounded-full hover:bg-primary/90 transition-colors"
                    data-testid="button-go-login"
                  >
                    Sign in to continue
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 rounded-xl border border-border">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {(user.displayName || user.email || "G")[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.displayName || user.email || "Guest"}</p>
                      <p className="text-xs text-muted-foreground">Joining as this account</p>
                    </div>
                  </div>
                  <button
                    onClick={handleJoin}
                    disabled={joining}
                    className="w-full bg-primary text-white font-medium py-4 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="button-join-confirm"
                  >
                    {joining && <Loader2 size={18} className="animate-spin" />}
                    {joining ? "Joining..." : "Join the trip"}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className="font-serif text-4xl font-bold mb-4">Trip not found</h1>
              <p className="text-muted-foreground mb-8">{error || "Check your invite code and try again."}</p>
              <button
                onClick={() => setLocation("/dashboard")}
                className="bg-primary text-white font-medium px-8 py-4 rounded-full hover:bg-primary/90 transition-colors"
                data-testid="button-go-dashboard"
              >
                Back to dashboard
              </button>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
