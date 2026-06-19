import { Link } from "wouter";
import { motion } from "framer-motion";
import { MapPin, Star, Users, ArrowLeft, Sparkles } from "lucide-react";

const TRIPS = [
  {
    dest: "Tokyo, Japan", days: 5, rating: 5,
    review: "The AI nailed our wishlist — every single activity made it into the plan. Day 3 in Shibuya was peak chaos (in the best way).",
    by: "Razan's pack", members: 4, vibes: ["Culture", "Foodie", "Nightlife"],
    highlight: "Tsukiji breakfast → teamLab → karaoke until 3am",
  },
  {
    dest: "Paris, France", days: 4, rating: 5,
    review: "Planning 8 people used to be a nightmare. GoPack sorted it in 10 minutes. The itinerary was better than anything we'd have made ourselves.",
    by: "Noura's crew", members: 8, vibes: ["Shopping", "Culture"],
    highlight: "Versailles day trip, Le Marais brunch, Eiffel sunset picnic",
  },
  {
    dest: "Bali, Indonesia", days: 7, rating: 4,
    review: "Perfect mix of beach days and temple visits. The packing list was surprisingly accurate — I actually used everything on it.",
    by: "Sam & friends", members: 5, vibes: ["Relaxation", "Adventure"],
    highlight: "Sunrise hike on Batur, rice terrace walk, Seminyak beach club",
  },
  {
    dest: "New York City", days: 3, rating: 5,
    review: "We had wildly different budgets — GoPack found the sweet spot. The voting made sure nobody felt steamrolled.",
    by: "The Londoners", members: 6, vibes: ["Foodie", "Culture", "Nightlife"],
    highlight: "Brooklyn food tour, Central Park, rooftop dinner in Manhattan",
  },
  {
    dest: "Lisbon, Portugal", days: 6, rating: 5,
    review: "Underrated destination, overrated by our group wishlist in the best way. The sunset at Miradouro da Graça made every vote worth it.",
    by: "Amir's group", members: 3, vibes: ["Culture", "Foodie"],
    highlight: "Alfama fado night, pastéis de nata tour, Sintra day trip",
  },
  {
    dest: "Barcelona, Spain", days: 5, rating: 4,
    review: "Mix of beach and architecture wishes balanced perfectly. Gaudí in the morning, beach in the afternoon — AI figured out the flow.",
    by: "College reunion", members: 9, vibes: ["Adventure", "Foodie", "Nightlife"],
    highlight: "Sagrada Família, La Boqueria, Barceloneta beach",
  },
];

const VIBE_COLORS: Record<string, string> = {
  Culture: "bg-violet-100 text-violet-700 border-violet-200",
  Foodie: "bg-amber-100 text-amber-700 border-amber-200",
  Nightlife: "bg-pink-100 text-pink-700 border-pink-200",
  Shopping: "bg-orange-100 text-orange-700 border-orange-200",
  Relaxation: "bg-blue-100 text-blue-700 border-blue-200",
  Adventure: "bg-green-100 text-green-700 border-green-200",
};

function StarRating({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-border fill-muted"} />
      ))}
    </div>
  );
}

export default function Explore() {
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
              See where groups like yours went — and how GoPack helped them get there.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-border px-8 py-4 bg-background">
        <div className="max-w-5xl mx-auto flex items-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            <span><strong className="text-foreground">2,400+</strong> trips planned</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={14} className="text-primary" />
            <span><strong className="text-foreground">12,000+</strong> travellers</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-primary" />
            <span><strong className="text-foreground">80+</strong> destinations</span>
          </div>
        </div>
      </div>

      {/* Trip grid */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {TRIPS.map((trip, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="border border-border rounded-2xl p-5 bg-background hover:border-primary/30 hover:shadow-sm transition-all flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-base leading-tight">{trip.dest}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{trip.days} days</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users size={11} />
                  <span>{trip.members}</span>
                </div>
              </div>

              {/* Stars */}
              <StarRating rating={trip.rating} />

              {/* Vibes */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {trip.vibes.map(v => (
                  <span key={v} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${VIBE_COLORS[v] || "bg-muted text-muted-foreground border-border"}`}>
                    {v}
                  </span>
                ))}
              </div>

              {/* Highlight */}
              <p className="text-xs text-muted-foreground mt-3 pb-3 border-b border-border/60">
                {trip.highlight}
              </p>

              {/* Review */}
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed flex-1">
                "{trip.review}"
              </p>
              <p className="text-xs text-muted-foreground/60 mt-3">— {trip.by}</p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
