import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useTrip } from "@/hooks/useFirebase";
import { saveItinerary } from "@/hooks/useFirebase";

const STEPS = [
  "Reading everyone's preferences…",
  "Analysing top-voted wishes…",
  "Scouting the perfect activities…",
  "Balancing the schedule…",
  "Writing day-by-day plans…",
  "Adding local gems & tips…",
  "Putting it all together…",
];

export default function Building() {
  const [, params] = useRoute("/trip/:tripId/building");
  const tripId = params?.tripId ?? "";
  const { user } = useAuth();
  const { trip, wishes } = useTrip(tripId);
  const [, setLocation] = useLocation();

  const [stepIdx, setStepIdx] = useState(0);
  const [error, setError] = useState("");
  const started = useRef(false);

  // Cycle through loading steps for animation
  useEffect(() => {
    const iv = setInterval(() => {
      setStepIdx(i => (i + 1) % STEPS.length);
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  // Run itinerary generation once
  useEffect(() => {
    if (started.current || !trip || !user) return;
    started.current = true;

    const memberPrefs = trip.memberPreferences ?? {};
    const prefValues = Object.values(memberPrefs) as any[];

    // Derive days: average of member preferences, fallback to trip.days
    const days = prefValues.length > 0
      ? Math.round(prefValues.reduce((s, p) => s + (p.days ?? 5), 0) / prefValues.length)
      : (trip.days ?? 5);

    // Derive vibes: union from all member preferences
    const vibeSet = new Set<string>();
    prefValues.forEach(p => (p.vibes ?? []).forEach((v: string) => vibeSet.add(v)));
    const vibes = vibeSet.size > 0 ? Array.from(vibeSet) : (trip.vibes ?? []);

    // Pace from member prefs (most common)
    const paceCounts: Record<string, number> = {};
    prefValues.forEach(p => {
      if (p.pace) paceCounts[p.pace] = (paceCounts[p.pace] ?? 0) + 1;
    });
    const pace = Object.keys(paceCounts).sort((a, b) => paceCounts[b] - paceCounts[a])[0] ?? "balanced";

    const budget = prefValues.length > 0
      ? (prefValues[0].budget ?? trip.budget ?? "midrange")
      : (trip.budget ?? "midrange");

    const startDate = prefValues.find(p => p.startDate)?.startDate ?? trip.startDate ?? null;

    const wishList = wishes.map(w => ({ text: w.text, author: w.author, votes: w.votes }));

    fetch("/api/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination: trip.destination,
        days,
        vibes,
        budget,
        startDate,
        pace,
        wishes: wishList,
        memberPreferences: prefValues.map((p, i) => ({
          name: (Object.values(trip.members ?? {}) as any[])[i]?.name ?? "Member",
          ...p,
        })),
      }),
    })
      .then(async res => {
        if (!res.ok) {
          const err = await res.json() as { error?: string };
          throw new Error(err.error ?? "Generation failed");
        }
        return res.json();
      })
      .then(async (result: any) => {
        await saveItinerary(tripId, result);
        setLocation(`/trip/${tripId}/itinerary`);
      })
      .catch(e => {
        setError(e instanceof Error ? e.message : String(e));
      });
  }, [trip, user]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
        <div className="text-4xl">😕</div>
        <div className="text-center">
          <div className="font-semibold text-lg mb-1">Something went wrong</div>
          <div className="text-sm text-muted-foreground">{error}</div>
        </div>
        <button
          onClick={() => setLocation(`/trip/${tripId}`)}
          className="px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm"
        >
          Back to trip
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 px-6">
      {/* Animated globe */}
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute inset-2 rounded-full bg-primary/20 animate-ping" style={{ animationDuration: "2s", animationDelay: "0.4s" }} />
        <div className="absolute inset-4 rounded-full bg-primary flex items-center justify-center text-3xl shadow-lg">
          🌍
        </div>
      </div>

      <div className="text-center">
        <div className="font-display font-bold text-2xl mb-2">
          go<span className="text-primary">pack</span>
        </div>
        <div className="text-base font-semibold text-foreground">Building your itinerary…</div>
        <div className="text-sm text-muted-foreground mt-1 h-5 transition-all duration-500">
          {STEPS[stepIdx]}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === stepIdx % STEPS.length ? "bg-primary scale-125" : "bg-muted"}`}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Claude is reading everyone's wishes and crafting a personalized day-by-day plan for the whole pack.
      </p>
    </div>
  );
}
