import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Zap, ChevronRight } from "lucide-react";

const GAMES = [
  { id: "ninja", title: "Number Ninja", emoji: "🥷", desc: "Quick-fire arithmetic challenges", stars: 2, xp: 30, color: "from-blue-500 to-indigo-600", topic: "Addition" },
  { id: "shape", title: "Shape Sorter", emoji: "⬡", desc: "Identify and sort 2D & 3D shapes", stars: 1, xp: 20, color: "from-purple-500 to-pink-500", topic: "Geometry" },
  { id: "fraction", title: "Fraction Feast", emoji: "🍕", desc: "Match fractions to slices of pizza", stars: 3, xp: 50, color: "from-orange-400 to-red-500", topic: "Fractions" },
  { id: "times", title: "Times Table Tower", emoji: "🗼", desc: "Build the tower with multiplication", stars: 2, xp: 35, color: "from-green-500 to-teal-600", topic: "Multiplication" },
  { id: "word", title: "Word Workshop", emoji: "📖", desc: "Solve story-based math problems", stars: 3, xp: 45, color: "from-yellow-400 to-orange-500", topic: "All" },
  { id: "maze", title: "Math Maze", emoji: "🌀", desc: "Navigate the maze by solving problems", stars: 3, xp: 60, color: "from-pink-500 to-rose-600", topic: "Mixed" },
];

const TOPICS = ["All", "Addition", "Subtraction", "Multiplication", "Fractions", "Geometry", "Mixed"];

export default function Practice() {
  const [filter, setFilter] = useState("All");
  const [, setLocation] = useLocation();

  const filtered = filter === "All" ? GAMES : GAMES.filter((g) => g.topic === filter || g.topic === "Mixed" || g.topic === "All");

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">Practice & Games</h1>
          <p className="text-muted-foreground font-medium">Pick a game and earn XP!</p>
        </div>

        {/* Daily Challenge Banner */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-3xl p-6 mb-8 relative overflow-hidden shadow-lg">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-5 h-5 fill-accent text-accent" />
                <span className="text-sm font-bold opacity-80">Daily Challenge</span>
              </div>
              <h2 className="text-2xl font-extrabold mb-1">Multiplication Blitz</h2>
              <p className="text-sm opacity-80 font-medium">Complete 10 multiplication questions in 60 seconds!</p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black">+100</div>
              <div className="text-xs opacity-80 font-bold">XP TODAY</div>
            </div>
          </div>
          <Button
            data-testid="btn-daily-challenge"
            onClick={() => setLocation("/lesson-complete")}
            className="mt-4 bg-white text-primary hover:bg-white/90 rounded-full font-bold px-6 w-full sm:w-auto gap-2"
          >
            Accept Challenge <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Topic Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
          {TOPICS.map((t) => (
            <button
              key={t}
              data-testid={`filter-${t.toLowerCase()}`}
              onClick={() => setFilter(t)}
              className={`px-4 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${
                filter === t
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Games Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              data-testid={`game-card-${game.id}`}
              onClick={() => setLocation("/step-complete")}
              className="group bg-card border-2 border-border rounded-3xl overflow-hidden cursor-pointer hover:border-primary hover:shadow-lg transition-all hover:-translate-y-1"
            >
              <div className={`bg-gradient-to-br ${game.color} p-6 flex items-center justify-center`}>
                <div className="text-5xl group-hover:scale-110 transition-transform">
                  {game.emoji}
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-extrabold text-lg text-foreground">{game.title}</h3>
                  <Badge variant="secondary" className="text-xs font-bold shrink-0 ml-2">
                    {game.topic}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground font-medium mb-3">{game.desc}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((s) => (
                      <Star
                        key={s}
                        className={`w-4 h-4 ${s <= game.stars ? "text-accent fill-accent" : "text-muted fill-muted"}`}
                      />
                    ))}
                  </div>
                  <div className="text-sm font-extrabold text-primary">+{game.xp} XP</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
