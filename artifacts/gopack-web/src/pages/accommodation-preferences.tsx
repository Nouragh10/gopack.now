import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Check, Minus, Plus, MapPin, Zap, CheckCircle, Wifi, Dumbbell, UtensilsCrossed, Car, Wind, Coffee, PawPrint, WashingMachine, Home, Key, Users, HelpCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip } from "@/hooks/useFirebase";
import { submitAccommodationPreference, storeAccommodationSuggestions } from "@/hooks/useFirebase";

const TEAL = "#26A69A";

const TYPES = [
  { value: "hotel", label: "Hotel", Icon: Home },
  { value: "airbnb", label: "Airbnb", Icon: Key },
  { value: "hostel", label: "Hostel", Icon: Users },
  { value: "no_preference", label: "No preference", Icon: HelpCircle },
] as const;

const AMENITIES = [
  "WiFi", "Pool", "Kitchen", "Gym", "Parking",
  "AC", "Breakfast", "Pet-friendly", "Washer",
];

const PRIORITIES = [
  { value: "affordability", label: "Best value" },
  { value: "balanced", label: "Balanced" },
  { value: "luxury", label: "Luxury" },
] as const;

const CANCELLATIONS = [
  { value: "free", label: "Free cancellation" },
  { value: "any", label: "Any policy" },
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

export default function AccommodationPreferences() {
  const [, params] = useRoute("/trip/:tripId/accommodation-preferences");
  const tripId = params?.tripId ?? "";
  const { user } = useAuth();
  const { trip, loading } = useTrip(tripId);
  const [, setLocation] = useLocation();

  const myPref = trip?.accommodationPreferences?.[user?.uid ?? ""];
  const alreadySubmitted = !!myPref;

  const [maxCost, setMaxCost] = useState(300);
  const [type, setType] = useState<"hotel" | "airbnb" | "hostel" | "no_preference">("no_preference");
  const [rooms, setRooms] = useState(1);
  const [locPref, setLocPref] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [priority, setPriority] = useState<"affordability" | "balanced" | "luxury">("balanced");
  const [cancellation, setCancellation] = useState<"free" | "any">("any");
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (myPref) {
      setMaxCost(myPref.maxCostPerPerson ?? 300);
      setType(myPref.type ?? "no_preference");
      setRooms(myPref.rooms ?? 1);
      setLocPref(myPref.location ?? "");
      setAmenities(myPref.amenities ?? []);
      setPriority(myPref.priority ?? "balanced");
      setCancellation(myPref.cancellation ?? "any");
    }
  }, [alreadySubmitted]);

  useEffect(() => {
    if (trip?.accommodationSuggestions?.length) {
      setLocation(`/trip/${tripId}/accommodation-vote`);
    }
  }, [trip?.accommodationSuggestions?.length]);

  const members = Object.entries(trip?.members ?? {}) as [string, { name: string }][];
  const memberPrefs = trip?.accommodationPreferences ?? {};
  const submittedCount = Object.keys(memberPrefs).length;
  const totalMembers = members.length;
  const isCreator = trip?.hostMemberId === user?.uid;

  const toggleAmenity = (a: string) =>
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const handleSubmit = async () => {
    if (!user || !tripId) return;
    setError("");
    setSubmitting(true);
    try {
      await submitAccommodationPreference(tripId, user.uid, {
        maxCostPerPerson: maxCost,
        type,
        rooms,
        location: locPref.trim(),
        amenities,
        priority,
        cancellation,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!tripId || !trip) return;
    setGenerating(true);
    setError("");
    try {
      const memberPrefsList = Object.entries(memberPrefs).map(([uid, pref]: any) => ({
        name: trip.members?.[uid]?.name ?? "Member",
        maxCostPerPerson: pref.maxCostPerPerson,
        type: pref.type,
        rooms: pref.rooms,
        location: pref.location,
        amenities: pref.amenities,
        priority: pref.priority,
        cancellation: pref.cancellation,
      }));

      const memberCount = Object.keys(trip.members ?? {}).length;
      const res = await fetch("/api/suggest-accommodations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: trip.destination,
          days: trip.days,
          memberCount,
          memberPreferences: memberPrefsList,
        }),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "AI couldn't generate suggestions.");
      }
      const data = await res.json() as { suggestions: any[] };
      if (!data.suggestions?.length) throw new Error("No suggestions returned.");
      await storeAccommodationSuggestions(tripId, data.suggestions);
      setLocation(`/trip/${tripId}/accommodation-vote`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: TEAL, borderTopColor: "transparent" }} />
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
          <div className="text-xs font-bold tracking-widest" style={{ color: TEAL }}>ACCOMMODATION</div>
          <div className="font-semibold text-sm">Everyone's preferences</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className="h-full transition-all duration-500"
          style={{ backgroundColor: TEAL, width: totalMembers > 0 ? `${(submittedCount / totalMembers) * 100}%` : "0%" }}
        />
      </div>

      <div className="flex-1 overflow-y-auto pb-12">
        {/* Status card */}
        <div className="mx-4 mt-4 p-4 rounded-xl border border-border bg-card">
          <div className="font-semibold">{submittedCount} of {totalMembers} submitted</div>
          <div className="text-sm text-muted-foreground mt-1">
            Everyone tells us what they need — AI finds the best option for the whole group.
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

        {/* Generate button — creator only */}
        {isCreator && submittedCount >= 1 && (
          <div className="mx-4 mt-3">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-colors hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              {generating ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Finding best options…</>
              ) : (
                <><Zap size={16} />Find accommodation{submittedCount < totalMembers ? ` (${totalMembers - submittedCount} still pending)` : ""}</>
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

        {/* Form */}
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

          {/* Accommodation type */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Accommodation type</div>
            <div className="grid grid-cols-2 gap-2">
              {TYPES.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  onClick={() => setType(value)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${type === value ? "text-white border-transparent" : "bg-muted border-border text-foreground hover:border-teal-400"}`}
                  style={type === value ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Max cost per person */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">
              Max budget per person / night: <span className="text-foreground font-semibold">${maxCost}</span>
            </div>
            <input
              type="range"
              min={20}
              max={1000}
              step={10}
              value={maxCost}
              onChange={e => setMaxCost(Number(e.target.value))}
              className="w-full accent-teal-500"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>$20</span><span>$1000</span>
            </div>
          </div>

          {/* Rooms */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Number of rooms</div>
            <div className="flex items-center gap-4">
              <button onClick={() => setRooms(r => Math.max(1, r - 1))} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <Minus size={16} />
              </button>
              <span className="text-2xl font-bold w-8 text-center">{rooms}</span>
              <span className="text-muted-foreground">rooms</span>
              <button onClick={() => setRooms(r => Math.min(10, r + 1))} className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-muted transition-colors">
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Priority */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Priority</div>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${priority === p.value ? "text-white border-transparent" : "bg-muted border-border text-foreground hover:border-teal-400"}`}
                  style={priority === p.value ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cancellation */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Cancellation policy</div>
            <div className="flex gap-2">
              {CANCELLATIONS.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCancellation(c.value)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${cancellation === c.value ? "text-white border-transparent" : "bg-muted border-border text-foreground hover:border-teal-400"}`}
                  style={cancellation === c.value ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Must-have amenities</div>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(a => {
                const sel = amenities.includes(a);
                return (
                  <button
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${sel ? "text-white border-transparent" : "bg-muted border-border text-foreground hover:border-teal-400"}`}
                    style={sel ? { backgroundColor: TEAL, borderColor: TEAL } : {}}
                  >
                    {sel && <Check size={11} />}
                    {a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Location preference */}
          <div>
            <div className="text-sm font-medium text-muted-foreground mb-2">Preferred area / neighborhood (optional)</div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-card">
              <MapPin size={15} style={{ color: TEAL }} className="shrink-0" />
              <input
                type="text"
                value={locPref}
                onChange={e => setLocPref(e.target.value)}
                placeholder="e.g. city center, near the beach"
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-colors hover:opacity-90"
            style={{ backgroundColor: TEAL }}
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <><Check size={15} />{alreadySubmitted ? "Update preferences" : "Submit preferences"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
