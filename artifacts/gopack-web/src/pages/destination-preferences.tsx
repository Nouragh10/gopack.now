import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, UserPlus, Check, Minus, Plus, Calendar, MapPin, Zap, RefreshCw, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip } from "@/hooks/useFirebase";
import { submitMemberPreference, storeDestinationSuggestions } from "@/hooks/useFirebase";

const VIBES = [
  "Adventure", "Culture", "Food", "Beach",
  "Nature", "City", "Nightlife", "Relaxation",
  "History", "Art", "Shopping", "Wellness",
];
const BUDGETS = ["Budget", "Midrange", "Luxury"] as const;
const DISTANCES = ["Nearby (< 3h)", "Mid-haul (3–8h)", "Anywhere"] as const;
const PACES = [
  { value: "relaxed", label: "Relaxed", desc: "3–4 acts/day" },
  { value: "balanced", label: "Balanced", desc: "5 acts/day" },
  { value: "packed", label: "Packed", desc: "6–7 acts/day" },
] as const;
const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

function Avatar({ name, index, size = 32 }: { name: string; index: number; size?: number }) {
  const bg = MEMBER_COLORS[index % MEMBER_COLORS.length];
  return (
    <div
      className="flex items-center justify-center rounded-full border-2 border-background font-bold text-white shrink-0"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.36 }}
    >
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

export default function DestinationPreferences() {
  const [, params] = useRoute("/trip/:tripId/destination-preferences");
  const tripId = params?.tripId ?? "";
  const { user } = useAuth();
  const { trip, loading } = useTrip(tripId);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (trip && !trip.packConfirmed) setLocation(`/trip/${tripId}`);
  }, [trip?.packConfirmed, tripId]);

  const myPref = trip?.memberPreferences?.[user?.uid ?? ""];
  const alreadySubmitted = !!myPref;

  const [vibes, setVibes] = useState<string[]>([]);
  const [distance, setDistance] = useState<typeof DISTANCES[number]>("Mid-haul (3–8h)");
  const [budget, setBudget] = useState<"Budget" | "Midrange" | "Luxury">("Midrange");
  const [days, setDays] = useState(5);
  const [startDate, setStartDate] = useState("");
  const [startLocation, setStartLocation] = useState("");
  const [pace, setPace] = useState<"relaxed" | "balanced" | "packed">("balanced");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (myPref) {
      setVibes(myPref.vibes ?? []);
      setDistance((myPref.distance as typeof DISTANCES[number]) ?? "Mid-haul (3–8h)");
      setBudget(((myPref.budget ?? "midrange").charAt(0).toUpperCase() + (myPref.budget ?? "midrange").slice(1)) as any);
      setDays(myPref.days ?? 5);
      setStartDate(myPref.startDate ?? "");
      if (myPref.pace) setPace(myPref.pace as any);
      if (myPref.startLocation) setStartLocation(myPref.startLocation);
    }
  }, [alreadySubmitted]);

  useEffect(() => {
    const isHost = trip?.hostMemberId === user?.uid;
    if (!isHost && trip?.destinationSuggestions?.length) {
      setLocation(`/trip/${tripId}/destination-vote`);
    }
  }, [trip?.destinationSuggestions?.length, trip?.hostMemberId, user?.uid]);

  const members = Object.entries(trip?.members ?? {}) as [string, { name: string }][];
  const memberPrefs = trip?.memberPreferences ?? {};
  const submittedCount = Object.keys(memberPrefs).length;
  const totalMembers = members.length;
  const isCreator = trip?.hostMemberId === user?.uid;

  const toggleVibe = (v: string) =>
    setVibes(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  const handleSubmit = async () => {
    if (vibes.length === 0) { setError("Pick at least one vibe."); return; }
    if (!user || !tripId) return;
    setError("");
    setSubmitting(true);
    try {
      await submitMemberPreference(tripId, user.uid, {
        vibes,
        distance,
        budget: budget.toLowerCase(),
        days,
        startDate: startDate || null,
        startLocation: startLocation.trim() || undefined,
        pace,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!tripId || !trip) return;
    if (totalMembers < 2) {
      setError("You need at least 2 people in the pack before generating destinations. Invite someone first.");
      return;
    }
    setGenerating(true);
    setError("");
    try {
      const memberPrefsList = Object.entries(memberPrefs).map(([uid, pref]: any) => ({
        name: trip.members?.[uid]?.name ?? "Member",
        vibes: pref.vibes,
        distance: pref.distance,
        budget: pref.budget,
        days: pref.days,
        startDate: pref.startDate,
        startLocation: pref.startLocation,
      }));

      const res = await fetch("/api/suggest-destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberPreferences: memberPrefsList }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "AI couldn't generate suggestions.");
      }
      const data = await res.json() as { suggestions: any[] };
      if (!data.suggestions?.length) throw new Error("No suggestions returned.");
      await storeDestinationSuggestions(tripId, data.suggestions);
      setLocation(`/trip/${tripId}/destination-vote`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  const inviteLink = `${window.location.origin}/join/${tripId}`;
  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation(`/trip/${tripId}`)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold tracking-widest text-violet-500">STEP 1 OF 2</div>
          <div className="font-semibold text-sm">Everyone's preferences</div>
        </div>
        <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-400 text-violet-500 text-sm font-medium hover:bg-violet-50 dark:hover:bg-violet-950 transition-colors">
          <UserPlus size={14} />
          Invite
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full bg-violet-500 transition-all duration-500"
          style={{ width: totalMembers > 0 ? `${(submittedCount / totalMembers) * 100}%` : "0%" }}
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        {/* Status card */}
        <div className="mx-4 mt-4 p-4 rounded-xl border border-border bg-card">
          <div className="font-semibold">{submittedCount} of {totalMembers} submitted</div>
          <div className="text-sm text-muted-foreground mt-1">
            Everyone fills in their own preferences — AI finds the best match for the whole pack.
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {members.map(([uid, m], i) => {
              const submitted = !!memberPrefs[uid];
              return (
                <div key={uid} className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <Avatar name={m.name} index={i} size={34} />
                    {submitted && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                        <Check size={8} color="white" />
                      </div>
                    )}
                  </div>
                  <span className={`text-xs max-w-[50px] truncate ${submitted ? "text-foreground" : "text-muted-foreground"}`}>
                    {m.name.split(" ")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generate button — creator only, needs ≥2 members */}
        {isCreator && totalMembers < 2 && (
          <div className="mx-4 mt-3 px-4 py-3 rounded-xl border border-amber-400/40 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2">
            <UserPlus size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Invite at least one more person to the pack before generating destinations.
            </p>
          </div>
        )}
        {isCreator && totalMembers >= 2 && submittedCount >= 1 && (
          <div className="mx-4 mt-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-500 text-white font-semibold text-sm hover:bg-violet-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {generating ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />AI is finding destinations…</>
              ) : (
                <><Zap size={16} />Generate destinations{submittedCount < totalMembers ? ` (${totalMembers - submittedCount} still pending)` : ""}</>
              )}
            </button>
            {submittedCount < totalMembers && (
              <p className="text-xs text-muted-foreground text-center mt-1.5">
                You can generate now or wait for everyone to submit first.
              </p>
            )}
          </div>
        )}

        {error && <div className="mx-4 mt-3 text-sm text-red-500">{error}</div>}

        {/* Preference form */}
        <div className="px-4 mt-4 flex flex-col gap-5">
          <div className="font-semibold text-base">
            {alreadySubmitted ? "Your preferences (edit anytime)" : "Your preferences"}
          </div>

          {alreadySubmitted && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-600 dark:text-green-400">
              <CheckCircle size={14} />
              Submitted — you can still update
            </div>
          )}

          {/* Vibes */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Vibe</div>
            <div className="flex flex-wrap gap-2">
              {VIBES.map(v => {
                const sel = vibes.includes(v);
                return (
                  <button
                    key={v}
                    onClick={() => toggleVibe(v)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${sel ? "bg-violet-500 border-violet-500 text-white" : "bg-muted border-border text-foreground hover:border-violet-400"}`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Distance */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">How far are you willing to travel?</div>
            <div className="flex gap-2 flex-wrap">
              {DISTANCES.map(d => (
                <button
                  key={d}
                  onClick={() => setDistance(d)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${distance === d ? "bg-violet-500 border-violet-500 text-white" : "bg-muted border-border text-foreground hover:border-violet-400"}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Budget */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Budget</div>
            <div className="flex gap-2">
              {BUDGETS.map(b => (
                <button
                  key={b}
                  onClick={() => setBudget(b)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${budget === b ? "bg-violet-500 border-violet-500 text-white" : "bg-muted border-border text-foreground hover:border-violet-400"}`}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          {/* Pace */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Trip pace</div>
            <div className="flex gap-2">
              {PACES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPace(p.value)}
                  className={`flex-1 flex flex-col items-center py-2 px-2 rounded-xl text-sm font-medium border transition-colors ${pace === p.value ? "bg-teal-500 border-teal-500 text-white" : "bg-muted border-border text-foreground hover:border-teal-400"}`}
                >
                  <span className="font-semibold">{p.label}</span>
                  <span className={`text-xs mt-0.5 ${pace === p.value ? "text-white/70" : "text-muted-foreground"}`}>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Days */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">How many days?</div>
            <div className="flex items-center gap-4">
              <button onClick={() => setDays(d => Math.max(1, d - 1))} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <Minus size={16} />
              </button>
              <span className="text-2xl font-bold w-8 text-center">{days}</span>
              <span className="text-muted-foreground">days</span>
              <button onClick={() => setDays(d => Math.min(30, d + 1))} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Start date */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Preferred start date (optional)</div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card">
              <Calendar size={15} className="text-violet-500 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-foreground"
              />
            </div>
          </div>

          {/* Flying from */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Flying from (optional)</div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card">
              <MapPin size={15} className="text-teal-500 shrink-0" />
              <input
                type="text"
                value={startLocation}
                onChange={e => setStartLocation(e.target.value)}
                placeholder="e.g. New York, London"
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-500 text-white font-semibold text-sm hover:bg-violet-600 disabled:opacity-60 transition-colors"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check size={15} />{alreadySubmitted ? "Update preferences" : "Submit preferences"}</>
            )}
          </button>
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowInvite(false)}>
          <div className="w-full max-w-lg bg-card rounded-t-2xl p-6 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-lg">Invite the pack</span>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Share this link so everyone can join and add their own preferences
            </p>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted border border-border mb-3">
              <span className="flex-1 text-sm truncate">{inviteLink}</span>
              <button
                onClick={copyLink}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500 text-white shrink-0"
              >
                {copied ? <Check size={14} /> : <RefreshCw size={14} />}
              </button>
            </div>
            <div className="text-xs text-muted-foreground mb-1 font-bold tracking-widest">TRIP ID</div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted border border-border">
              <span className="flex-1 text-sm font-mono text-violet-500">{tripId}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
