import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, DollarSign, Sparkles, Star, Loader2 } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

const TAG_COLORS: Record<string, string> = {
  food: "bg-amber-100 text-amber-700 border-amber-200",
  culture: "bg-violet-100 text-violet-700 border-violet-200",
  adventure: "bg-green-100 text-green-700 border-green-200",
  relaxation: "bg-blue-100 text-blue-700 border-blue-200",
  nightlife: "bg-pink-100 text-pink-700 border-pink-200",
  shopping: "bg-orange-100 text-orange-700 border-orange-200",
  travel: "bg-gray-100 text-gray-600 border-gray-200",
};

export default function Itinerary() {
  const [, params] = useRoute("/trip/:tripId/itinerary");
  const tripId = params?.tripId || "";
  const [itinerary, setItinerary] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tripId) return;
    const tripRef = ref(db, `trips/${tripId}`);
    const unsub = onValue(tripRef, snap => {
      const data = snap.val();
      if (data) {
        setTrip(data);
        setItinerary(data.itinerary || null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [tripId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-4">
          <Link href={`/trip/${tripId}`} className="text-muted-foreground hover:text-foreground" data-testid="link-back">
            <ArrowLeft size={20} />
          </Link>
          <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
            go<span className="text-primary">pack</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-8 py-12">
        {!itinerary ? (
          <div className="text-center py-20 text-muted-foreground">
            <Sparkles size={32} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium mb-2">No itinerary yet</p>
            <p className="text-sm mb-6">Go back to the trip hub and generate one.</p>
            <Link href={`/trip/${tripId}`} className="bg-primary text-white font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition-colors" data-testid="link-go-back">
              Back to trip
            </Link>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm text-muted-foreground mb-1">{trip?.destination}</p>
              <h1 className="font-serif text-5xl font-bold mb-2">{itinerary.title}</h1>
              <p className="text-muted-foreground mb-12">{itinerary.days?.length} days planned by AI from your group&apos;s wishes</p>
            </motion.div>

            <div className="flex flex-col gap-12">
              {(itinerary.days || []).map((day: any, di: number) => (
                <motion.div
                  key={di}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: di * 0.1 }}
                  data-testid={`day-${di + 1}`}
                >
                  <div className="flex items-baseline gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-foreground text-background flex items-center justify-center font-display font-bold text-xl shrink-0">
                      {day.dayNumber}
                    </div>
                    <div>
                      <h2 className="font-serif text-2xl font-bold">{day.city}</h2>
                      <p className="text-muted-foreground text-sm">{day.theme}</p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 pl-16">
                    {(day.activities || []).map((act: any, ai: number) => (
                      <div
                        key={ai}
                        className="border border-border rounded-2xl p-5 bg-background hover:border-border/80 transition-colors"
                        data-testid={`activity-${di + 1}-${ai + 1}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Clock size={13} className="text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{act.time}</span>
                              {act.fromWish && (
                                <span className="flex items-center gap-1 text-xs text-primary">
                                  <Star size={11} /> From a wish
                                </span>
                              )}
                            </div>
                            <h3 className="font-medium text-base">{act.name}</h3>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 text-sm text-muted-foreground">
                            <DollarSign size={13} />
                            <span>~${act.estimatedCost}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{act.description}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${TAG_COLORS[act.tag] || TAG_COLORS.travel}`}>
                            {act.tag}
                          </span>
                          {(act.labels || []).map((label: string, li: number) => (
                            <span key={li} className="text-xs px-2.5 py-0.5 rounded-full border border-border text-muted-foreground">
                              {label}
                            </span>
                          ))}
                          {act.suggester && act.suggester !== "AI pick" && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              Suggested by {act.suggester}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
