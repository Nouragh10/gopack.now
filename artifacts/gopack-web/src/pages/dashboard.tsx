import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Plus, MapPin, Users, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useFirebase";

const VIBE_LABELS: Record<string, string> = {
  culture: "Culture",
  food: "Foodie",
  adventure: "Adventure",
  relaxation: "Relaxation",
  nightlife: "Nightlife",
  shopping: "Shopping",
};

const AVATAR_COLORS = ["#E85D3A", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517", "#C4448A"];

function getHour() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const { trips, loading } = useTrips();
  const [, setLocation] = useLocation();
  const [joinCode, setJoinCode] = useState("");

  const firstName = user?.displayName?.split(" ")[0] || "traveller";

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      setLocation(`/join/${joinCode.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <Link href="/" className="font-display font-bold text-2xl" data-testid="link-logo">
          go<span className="text-primary">pack</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium hover:opacity-80 transition-opacity"
            title="Edit profile"
            data-testid="link-profile"
          >
            {firstName[0].toUpperCase()}
          </Link>
          <button
            onClick={() => { signOut(); setLocation("/"); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-signout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-8 py-16">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted-foreground text-sm mb-1">{getHour()}, {firstName}</p>
          <h1 className="font-serif text-5xl font-bold mb-10">
            Where&apos;s the pack <span className="text-primary">headed next?</span>
          </h1>
        </motion.div>

        {/* Create trip CTA */}
        <Link
          href="/create"
          className="flex items-center gap-4 border-2 border-dashed border-primary/50 rounded-2xl p-5 mb-10 hover:border-primary hover:bg-primary/5 transition-all group"
          data-testid="link-create-trip"
        >
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white group-hover:scale-110 transition-transform">
            <Plus size={20} />
          </div>
          <div>
            <div className="font-medium text-primary">Plan a new trip</div>
            <div className="text-sm text-muted-foreground">Create a trip and invite your crew</div>
          </div>
          <ChevronRight size={18} className="ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        </Link>

        {/* Join trip form */}
        <form onSubmit={handleJoin} className="flex gap-3 mb-12">
          <input
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder="Join a trip with a code..."
            className="flex-1 border border-border rounded-full px-5 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            data-testid="input-join-code"
          />
          <button
            type="submit"
            className="bg-foreground text-background text-sm font-medium px-6 py-3 rounded-full hover:bg-foreground/80 transition-colors"
            data-testid="button-join-trip"
          >
            Join
          </button>
        </form>

        {/* Trips */}
        <div>
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-4">Your trips</p>
          {loading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2].map(i => (
                <div key={i} className="border border-border rounded-2xl p-5 animate-pulse bg-muted/20 h-32" />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <MapPin size={32} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium mb-1">No trips yet</p>
              <p className="text-sm">Create your first trip or join one with a code</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {trips.map((trip, i) => {
                const memberCount = trip.members ? Object.keys(trip.members).length : 0;
                const memberColors = AVATAR_COLORS.slice(0, Math.min(memberCount, 4));
                return (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Link
                      href={`/trip/${trip.id}`}
                      className="block border border-border rounded-2xl p-5 hover:border-primary/40 hover:bg-muted/20 transition-all"
                      data-testid={`card-trip-${trip.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-base leading-tight">{trip.destination || "Unnamed trip"}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {trip.days} days &middot; {(trip.vibes || []).map((v: string) => VIBE_LABELS[v] || v).join(", ")}
                          </p>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {trip.hostMemberId === user?.uid ? "Host" : "Member"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <div className="flex -space-x-2">
                          {memberColors.map((color, ci) => (
                            <div
                              key={ci}
                              className="w-6 h-6 rounded-full border-2 border-background"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          <Users size={11} className="inline mr-1" />{memberCount} member{memberCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
              {/* Empty slot */}
              <div className="border border-dashed border-border rounded-2xl p-5 flex items-center justify-center text-muted-foreground/50 text-sm min-h-[120px]">
                More trips coming...
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
