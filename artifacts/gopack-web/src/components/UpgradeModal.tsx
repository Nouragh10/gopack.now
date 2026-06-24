import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, Check } from "lucide-react";

interface Props {
  open: boolean;
  reason?: string;
  tripId: string;
  onClose: () => void;
}

const FEATURES = [
  "Unlimited AI itinerary regenerations",
  "Up to 20 activity redos",
  "Unlimited packing list regenerations",
  "Styled PDF export",
  "Google Calendar sync for all activities",
  "Up to 20 group members",
];

export function UpgradeModal({ open, reason, tripId, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleUpgrade = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Could not start checkout");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 48, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 48, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 sm:inset-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md"
          >
            <div className="relative bg-background rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border p-8">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground transition-colors"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Sparkles size={22} className="text-primary" />
              </div>

              {reason && (
                <p className="text-xs font-semibold text-primary/70 uppercase tracking-widest mb-1.5">
                  {reason}
                </p>
              )}

              <h2 className="font-serif text-2xl font-bold mb-2 leading-tight">
                Upgrade this Pack
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                One payment unlocks premium planning for everyone on this trip.
              </p>

              <ul className="space-y-2 mb-7">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-foreground/80">
                    <span className="w-4 h-4 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Check size={10} className="text-primary" strokeWidth={3} />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {error && (
                <p className="text-xs text-destructive mb-3 text-center">{error}</p>
              )}

              <button
                onClick={handleUpgrade}
                disabled={loading}
                className="w-full bg-primary text-white font-semibold py-3.5 rounded-full hover:bg-primary/90 transition-colors text-base mb-2.5 disabled:opacity-60"
              >
                {loading ? "Loading…" : "Upgrade — $14.99"}
              </button>
              <button
                onClick={onClose}
                className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
