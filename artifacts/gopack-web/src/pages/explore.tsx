import { Link } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Star, Users, ArrowLeft, Sparkles, Loader2, MessageSquare, CalendarDays } from "lucide-react";
import { usePublicReviews, useGlobalStats } from "@/hooks/useFirebase";

const VIBE_COLORS: Record<string, string> = {
  culture:     "bg-violet-100 text-violet-700 border-violet-200",
  Culture:     "bg-violet-100 text-violet-700 border-violet-200",
  food:        "bg-amber-100 text-amber-700 border-amber-200",
  Foodie:      "bg-amber-100 text-amber-700 border-amber-200",
  nightlife:   "bg-pink-100 text-pink-700 border-pink-200",
  Nightlife:   "bg-pink-100 text-pink-700 border-pink-200",
  shopping:    "bg-orange-100 text-orange-700 border-orange-200",
  Shopping:    "bg-orange-100 text-orange-700 border-orange-200",
  relaxation:  "bg-blue-100 text-blue-700 border-blue-200",
  Relaxation:  "bg-blue-100 text-blue-700 border-blue-200",
  adventure:   "bg-green-100 text-green-700 border-green-200",
  Adventure:   "bg-green-100 text-green-700 border-green-200",
};

const VIBE_LABELS: Record<string, string> = {
  culture: "Culture", food: "Foodie", adventure: "Adventure",
  relaxation: "Relaxation", nightlife: "Nightlife", shopping: "Shopping",
};

const CATEGORY_BORDER: Record<string, string> = {
  culture: "border-l-violet-400", Culture: "border-l-violet-400",
  food: "border-l-amber-400", Foodie: "border-l-amber-400",
  nightlife: "border-l-pink-400", Nightlife: "border-l-pink-400",
  adventure: "border-l-green-400", Adventure: "border-l-green-400",
  relaxation: "border-l-blue-400", Relaxation: "border-l-blue-400",
  shopping: "border-l-orange-400", Shopping: "border-l-orange-400",
};

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} size={size} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-border fill-muted"} />
      ))}
    </div>
  );
}

function ItineraryPreview({ days, tripDays }: { days: any[]; tripDays: number }) {
  return (
    <div className="mt-4 rounded-xl overflow-hidden border border-border/70 text-[11px]">
      {/* Doc header */}
      <div className="bg-foreground text-background px-3 py-2 flex items-center gap-1.5 font-semibold">
        <CalendarDays size={11} />
        <span>{tripDays}-day itinerary</span>
      </div>
      {/* Days */}
      <div className="divide-y divide-border/40 bg-background max-h-40 overflow-y-auto">
        {days.map((d: any, di: number) => (
          <div key={d.day ?? di} className="px-3 py-2">
            <div className="font-semibold text-foreground mb-1">
              Day {d.day ?? di + 1}{d.theme ? `: ${d.theme}` : ""}
            </div>
            {d.activities?.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {d.activities.map((a: any, ai: number) => (
                  <div
                    key={`${di}-${ai}`}
                    className={`pl-2 border-l-2 ${CATEGORY_BORDER[a.category] || "border-l-border"} text-muted-foreground leading-tight`}
                  >
                    {a.time && <span className="text-foreground/50 mr-1">{a.time}</span>}
                    {a.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Explore() {
  const { reviews, loading: reviewsLoading } = usePublicReviews();
  const { stats, loading: statsLoading } = useGlobalStats();

  const loading = reviewsLoading || statsLoading;

  const tripCount = stats.tripCount || reviews.length;
  const memberCount = stats.memberCount;
  const destinationCount = stats.destinationCount;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
            go<span className="text-primary">pack</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Sign in
          </Link>
          <Link href="/login" className="bg-foreground text-background text-sm font-medium px-5 py-2 rounded-full hover:bg-foreground/90 transition-colors">
            Start planning
          </Link>
        </div>
      </nav>

      {/* Header */}
      <div className="border-b border-border px-8 py-14 bg-muted/10">
        <div className="max-w-5xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-3">Community</p>
            <h1 className="font-serif text-5xl font-bold mb-3">Real trips. Real reviews.</h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              See where groups like yours went — and how GoPackNow helped them get there.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stats bar — real numbers from Firebase */}
      {(tripCount > 0 || memberCount > 0 || destinationCount > 0) && (
        <div className="border-b border-border px-8 py-4 bg-background">
          <div className="max-w-5xl mx-auto flex items-center gap-8 text-sm text-muted-foreground">
            {tripCount > 0 && (
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-primary" />
                <span><strong className="text-foreground">{tripCount}</strong> trip{tripCount !== 1 ? "s" : ""} planned</span>
              </div>
            )}
            {memberCount > 0 && (
              <div className="flex items-center gap-2">
                <Users size={14} className="text-primary" />
                <span><strong className="text-foreground">{memberCount}</strong> traveller{memberCount !== 1 ? "s" : ""}</span>
              </div>
            )}
            {destinationCount > 0 && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-primary" />
                <span><strong className="text-foreground">{destinationCount}</strong> destination{destinationCount !== 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reviews grid */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={24} className="animate-spin text-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24">
            <MessageSquare size={40} className="mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="font-serif text-2xl font-bold mb-3">No reviews yet</h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Reviews appear here after a trip ends and members share how it went. Be the first!
            </p>
            <Link href="/login" className="inline-flex items-center gap-2 bg-primary text-white font-medium px-7 py-3 rounded-full hover:bg-primary/90 transition-colors">
              Plan a trip
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {reviews.map((review, i) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="border border-border rounded-2xl p-5 bg-background hover:border-primary/30 hover:shadow-sm transition-all flex flex-col"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-base leading-tight">{review.destination}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{review.days} day{review.days !== 1 ? "s" : ""}</p>
                    </div>
                    {review.memberCount > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                        <Users size={11} />
                        <span>{review.memberCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Stars */}
                  {review.rating > 0 && <StarRating rating={review.rating} />}

                  {/* Vibes */}
                  {review.vibes?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {review.vibes.map((v: string) => (
                        <span key={v} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${VIBE_COLORS[v] || "bg-muted text-muted-foreground border-border"}`}>
                          {VIBE_LABELS[v] || v}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Review quote — shown prominently if non-empty */}
                  {review.text?.trim() && (
                    <blockquote className="mt-4 pl-3 border-l-2 border-primary/40">
                      <p className="text-sm text-foreground leading-relaxed italic">
                        &ldquo;{review.text}&rdquo;
                      </p>
                      {review.memberNames?.length > 0 && (
                        <cite className="not-italic text-xs text-muted-foreground/60 mt-1 block">
                          — {review.memberNames.slice(0, 2).join(" & ")}{review.memberNames.length > 2 ? ` +${review.memberNames.length - 2} more` : ""}
                        </cite>
                      )}
                    </blockquote>
                  )}

                  {/* Highlight */}
                  {review.highlight?.trim() && (
                    <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mt-3">
                      ✨ {review.highlight}
                    </p>
                  )}

                  {/* Mini itinerary preview — shown if itinerary was snapshotted at review time */}
                  {review.itineraryDays?.length > 0 && (
                    <ItineraryPreview days={review.itineraryDays} tripDays={review.days} />
                  )}

                  <div className="flex-1" />

                  {/* Byline fallback (when no quote) */}
                  {!review.text?.trim() && review.memberNames?.length > 0 && (
                    <p className="text-xs text-muted-foreground/60 mt-3">
                      — {review.memberNames.slice(0, 2).join(" & ")}{review.memberNames.length > 2 ? ` +${review.memberNames.length - 2} more` : ""}
                    </p>
                  )}
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-16 border-2 border-dashed border-primary/40 rounded-2xl p-10 text-center bg-primary/3"
            >
              <Sparkles size={28} className="text-primary mx-auto mb-4" />
              <h2 className="font-serif text-3xl font-bold mb-3">Ready to write your own?</h2>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Start a trip, invite your crew, and let the wishlist decide where you go.
              </p>
              <Link href="/login" className="inline-flex items-center gap-2 bg-primary text-white font-medium px-8 py-3.5 rounded-full hover:bg-primary/90 transition-colors">
                Plan your trip <MapPin size={15} />
              </Link>
            </motion.div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-8 mt-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="font-display font-bold text-lg">go<span className="text-primary">pack</span></div>
          <p className="text-sm text-muted-foreground">Wish · Vote · Go</p>
        </div>
      </footer>
    </div>
  );
}
