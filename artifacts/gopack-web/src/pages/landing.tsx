import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Users, Sparkles, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const steps = [
  { number: "1", label: "Wish", desc: "Everyone drops their dream activities into the group wishlist" },
  { number: "2", label: "Vote", desc: "The group votes on what matters most — democracy with a passport" },
  { number: "3", label: "Go", desc: "AI builds the perfect itinerary from your collective imagination" },
];

const avatarColors = ["#E85D3A", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517"];

const exploreTrips = [
  { dest: "Tokyo", days: 5, rating: 5, review: "The AI nailed our itinerary — every wish made it in.", by: "Razan's pack", vibes: ["Culture", "Foodie"] },
  { dest: "Paris", days: 4, rating: 5, review: "Planning 8 people used to be chaos. GoPack sorted us in minutes.", by: "Noura's crew", vibes: ["Shopping", "Nightlife"] },
  { dest: "Bali", days: 7, rating: 4, review: "Perfect balance of beach and culture. The packing list was a lifesaver.", by: "Sam & friends", vibes: ["Relaxation", "Adventure"] },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={13} className={i <= rating ? "fill-amber-400 text-amber-400" : "text-border fill-border"} />
      ))}
    </div>
  );
}

export default function Landing() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && user) setLocation("/dashboard");
  }, [user, loading, setLocation]);

  const dest = user ? "/dashboard" : "/login";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="font-display font-bold text-2xl tracking-tight">
          go<span className="text-primary">pack</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/explore" className="text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-explore">
            Explore
          </Link>
          <Link href={dest} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-nav-login">
            {user ? "Dashboard" : "Sign in"}
          </Link>
          <Link href={dest} className="bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-full hover:bg-foreground/90 transition-colors" data-testid="link-nav-start">
            Start planning
          </Link>
        </div>
      </nav>

      {/* Hero — two-column on desktop */}
      <section className="px-8 pt-20 pb-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-[1fr_360px] gap-16 items-center">
          {/* Left: headline + CTAs */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
            <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-5">
              Group travel, finally sorted
            </p>
            <h1 className="font-serif text-6xl md:text-7xl font-bold leading-[0.95] mb-7">
              Pack your bags.<br />
              <span className="text-primary">Pack your friends.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md font-sans mb-10 leading-relaxed">
              Turn your group chat chaos into a real trip. Everyone wishes, everyone votes, and AI turns it all into a day-by-day plan.
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-10">
              <Link href={dest} className="inline-flex items-center gap-2 bg-primary text-white font-medium px-7 py-3.5 rounded-full hover:bg-primary/90 transition-colors" data-testid="link-hero-start">
                Create a trip <ArrowRight size={15} />
              </Link>
              <Link href={dest} className="inline-flex items-center gap-2 border border-border font-medium px-7 py-3.5 rounded-full hover:bg-muted/50 transition-colors" data-testid="link-hero-join">
                Join a trip
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {avatarColors.map((color, i) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-background" style={{ backgroundColor: color }} />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">Join thousands of groups planning smarter</span>
            </div>
          </motion.div>

          {/* Right: numbered steps */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.55, delay: 0.1 }} className="flex flex-col gap-4">
            {steps.map((step, i) => (
              <motion.div key={step.number} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4 border border-border rounded-2xl p-5 bg-background hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center font-display font-bold text-lg shrink-0">
                  {step.number}
                </div>
                <div>
                  <p className="font-semibold text-base mb-1">{step.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Explore strip */}
      <section className="border-t border-border px-8 py-16 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between mb-8">
            <div>
              <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-2">Real trips · Real reviews</p>
              <h2 className="font-serif text-3xl font-bold">See where packs are going</h2>
            </div>
            <Link href="/explore" className="text-sm text-primary hover:underline font-medium">
              Explore all →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {exploreTrips.map((trip, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}
                className="border border-border rounded-2xl p-5 bg-background hover:border-primary/30 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base">{trip.dest}</h3>
                    <p className="text-xs text-muted-foreground">{trip.days} days · {trip.vibes.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <MapPin size={10} /> {trip.dest}
                  </div>
                </div>
                <StarRating rating={trip.rating} />
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed italic">"{trip.review}"</p>
                <p className="text-xs text-muted-foreground/60 mt-3">— {trip.by}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-16 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Real-time collaboration</h3>
              <p className="text-sm text-muted-foreground">Everyone sees wishes and votes update live</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">AI itineraries</h3>
              <p className="text-sm text-muted-foreground">AI turns your wishes into a real day-by-day plan</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Smart packing lists</h3>
              <p className="text-sm text-muted-foreground">AI generates packing lists tailored to your destination and vibes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-display font-bold text-lg">go<span className="text-primary">pack</span></div>
          <p className="text-sm text-muted-foreground">Wish · Vote · Go</p>
        </div>
      </footer>
    </div>
  );
}
