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
  const { user } = useAuth();
  const { joinTrip } = useTrips();
  const [, setLocation] = useLocation();

  const [name, setName] = useState(user?.displayName || "");
  const [tripInfo, setTripInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tripId) return;
    get(ref(db, `trips/${tripId}`)).then(snap => {
      if (snap.exists()) setTripInfo({ id: tripId, ...snap.val() });
      else setError("Trip not found. Check your invite code.");
    }).catch(() => setError("Could not load trip.")).finally(() => setFetching(false));
  }, [tripId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!user) { setLocation("/login"); return; }
    setLoading(true);
    setError("");
    try {
      await joinTrip(tripId, name.trim());
      setLocation(`/trip/${tripId}`);
    } catch {
      setError("Failed to join. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
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
              <h1 className="font-serif text-5xl font-bold mb-2">Join the trip</h1>
              <div className="bg-muted/30 border border-border rounded-2xl p-5 mb-10">
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
                  <p className="text-muted-foreground mb-6">You need to sign in first to join a trip.</p>
                  <button
                    onClick={() => setLocation("/login")}
                    className="bg-primary text-white font-medium px-8 py-4 rounded-full hover:bg-primary/90 transition-colors"
                    data-testid="button-go-login"
                  >
                    Sign in to continue
                  </button>
                </div>
              ) : (
                <form onSubmit={handleJoin} className="flex flex-col gap-6">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">
                      Your name in the group
                    </label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="How should we call you?"
                      className="w-full border border-border rounded-xl px-5 py-3.5 text-base bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="input-member-name"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-white font-medium py-4 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="button-join-confirm"
                  >
                    {loading && <Loader2 size={18} className="animate-spin" />}
                    {loading ? "Joining..." : "Join the trip"}
                  </button>
                </form>
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
