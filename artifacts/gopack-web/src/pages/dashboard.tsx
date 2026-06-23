import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronRight, Compass, X, Sparkles, ThumbsUp, Map } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

function getHour() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: Sparkles,
    title: "Wish",
    desc: "Everyone in the group drops what they want to do — hikes, restaurants, museums, nightlife. No filter, just ideas.",
    color: "bg-amber-500/10 border-amber-500/30 text-amber-600",
    iconBg: "bg-amber-500",
  },
  {
    step: "2",
    icon: ThumbsUp,
    title: "Vote",
    desc: "Thumbs-up the wishes you love. The most-wanted activities rise to the top so everyone's voice counts.",
    color: "bg-violet-500/10 border-violet-500/30 text-violet-600",
    iconBg: "bg-violet-500",
  },
  {
    step: "3",
    icon: Map,
    title: "Go",
    desc: "Hit Generate — Claude reads all your wishes and builds a perfect day-by-day itinerary for the whole group.",
    color: "bg-primary/10 border-primary/30 text-primary",
    iconBg: "bg-primary",
  },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [joinCode, setJoinCode] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);

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
        <div className="flex items-center gap-3">
          <Link href="/explore" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-explore">
            <Compass size={16} /> Explore
          </Link>
          <button
            onClick={() => setHelpOpen(true)}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm font-semibold"
            title="How it works"
            data-testid="button-help"
          >
            ?
          </button>
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium hover:opacity-80 transition-opacity"
            title="Profile"
            data-testid="link-profile"
          >
            {firstName[0].toUpperCase()}
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-8 py-16">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted-foreground text-sm mb-1">{getHour()}, {firstName}</p>
          <h1 className="font-serif text-5xl font-bold mb-4">
            Where&apos;s the pack <span className="text-primary">headed next?</span>
          </h1>
          <p className="text-muted-foreground mb-10">
            Plan your next group trip together — everyone wishes, everyone votes, AI builds the itinerary.
          </p>
        </motion.div>

        {/* Create trip CTA */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Link
            href="/create"
            className="flex items-center gap-4 border-2 border-dashed border-primary/50 rounded-2xl p-5 mb-4 hover:border-primary hover:bg-primary/5 transition-all group"
            data-testid="link-create-trip"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white group-hover:scale-110 transition-transform shrink-0">
              <Plus size={20} />
            </div>
            <div>
              <div className="font-medium text-primary">Plan a new trip</div>
              <div className="text-sm text-muted-foreground">Create a trip and invite your crew</div>
            </div>
            <ChevronRight size={18} className="ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>

        {/* Join trip form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <form onSubmit={handleJoin} className="flex gap-3 mb-16">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Have a code? Join a trip..."
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
        </motion.div>

        {/* How it works */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-5">How it works</p>
          <div className="flex flex-col gap-3">
            {HOW_IT_WORKS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.22 + i * 0.07 }}
                  className={`flex items-start gap-4 border rounded-2xl p-5 ${item.color}`}
                >
                  <div className={`w-9 h-9 rounded-full ${item.iconBg} flex items-center justify-center text-white shrink-0 mt-0.5`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="font-semibold mb-0.5">{item.step}. {item.title}</div>
                    <p className="text-sm opacity-80">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Help modal */}
      <AnimatePresence>
        {helpOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setHelpOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-background border border-border rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-bold">How GoPackNow works</h2>
                <button onClick={() => setHelpOpen(false)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-5 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">1</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Create or join a trip</p>
                    <p>Start a trip with a destination (or let the group decide), then share the invite link with your travel pack.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">2</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Everyone adds wishes</p>
                    <p>Each person drops activities they want to do — "cooking class", "sunrise hike", "rooftop bar". No limits.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0 text-xs">3</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Vote on favourites</p>
                    <p>Thumbs-up the activities you love. The top-voted wishes shape the final plan.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">4</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">AI builds your itinerary</p>
                    <p>Hit "Generate itinerary" — Claude turns your top wishes into a detailed day-by-day plan. Also generates a smart packing list.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">5</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Decide together (optional)</p>
                    <p>No destination yet? Use "Decide with the group" — everyone submits preferences, AI suggests destinations, the group votes.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="mt-8 w-full bg-primary text-white py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
