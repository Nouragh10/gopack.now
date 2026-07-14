import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Flame, Star, Trophy, Zap } from "lucide-react";

const BADGES = [
  { id: 1, emoji: "🔥", title: "Streak Starter", desc: "3 days in a row", earned: true, category: "Streak" },
  { id: 2, emoji: "⚡", title: "Week Warrior", desc: "7 days in a row", earned: true, category: "Streak" },
  { id: 3, emoji: "💎", title: "Diamond Streak", desc: "30 days in a row", earned: false, category: "Streak" },
  { id: 4, emoji: "➕", title: "Addition Ace", desc: "100% on addition", earned: true, category: "Topic" },
  { id: 5, emoji: "✖️", title: "Times Table Pro", desc: "Master all times tables", earned: false, category: "Topic" },
  { id: 6, emoji: "🔢", title: "Number Ninja", desc: "Complete number line challenges", earned: true, category: "Topic" },
  { id: 7, emoji: "🚀", title: "Speed Demon", desc: "10 correct in 30 seconds", earned: true, category: "Speed" },
  { id: 8, emoji: "💨", title: "Lightning Fast", desc: "20 correct in 30 seconds", earned: false, category: "Speed" },
  { id: 9, emoji: "🌍", title: "Explorer", desc: "Visit every section", earned: true, category: "Explorer" },
  { id: 10, emoji: "🗺️", title: "Adventurer", desc: "Complete 10 different topics", earned: false, category: "Explorer" },
  { id: 11, emoji: "⭐", title: "Star Collector", desc: "Earn 1,000 XP", earned: true, category: "Explorer" },
  { id: 12, emoji: "🌈", title: "Rainbow Master", desc: "Earn all topic badges", earned: false, category: "Explorer" },
];

const LEADERBOARD = [
  { name: "Alex", xp: 1850, rank: 1, avatar: "A", color: "bg-yellow-400" },
  { name: "Sam", xp: 1240, rank: 2, avatar: "S", color: "bg-primary" },
  { name: "Jordan", xp: 980, rank: 3, avatar: "J", color: "bg-green-500" },
  { name: "Riley", xp: 720, rank: 4, avatar: "R", color: "bg-pink-500" },
];

export default function Rewards() {
  const streak = 7;
  const xp = 1240;
  const level = 5;
  const xpForNextLevel = 1500;

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">Rewards & Streaks</h1>
          <p className="text-muted-foreground font-medium">Keep up the amazing work!</p>
        </div>

        {/* Streak + Level */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-orange-400 to-red-500 text-white rounded-3xl p-6 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <Flame className="w-8 h-8 fill-white" />
              <div className="text-sm font-bold opacity-80">Current Streak</div>
            </div>
            <div className="text-6xl font-black mb-1">{streak}</div>
            <div className="text-lg font-bold opacity-90">day streak! 🔥</div>
            <div className="mt-3 text-sm opacity-70 font-medium">Come back tomorrow to keep it going!</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border-2 border-border rounded-3xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                <Star className="w-5 h-5 fill-white text-white" />
              </div>
              <div>
                <div className="text-xs font-bold text-muted-foreground">Level {level}</div>
                <div className="text-xl font-extrabold text-foreground">Math Explorer</div>
              </div>
            </div>
            <div className="text-3xl font-black text-foreground mb-3">{xp.toLocaleString()} XP</div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(xp / xpForNextLevel) * 100}%` }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-full bg-primary rounded-full"
              />
            </div>
            <div className="text-xs font-bold text-muted-foreground">
              {xpForNextLevel - xp} XP to Level {level + 1}
            </div>
          </motion.div>
        </div>

        {/* Badge Collection */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-extrabold text-xl text-foreground">Badge Collection</h2>
            <div className="text-sm font-bold text-muted-foreground">
              {BADGES.filter((b) => b.earned).length}/{BADGES.length} earned
            </div>
          </div>
          {["Streak", "Topic", "Speed", "Explorer"].map((category) => (
            <div key={category} className="mb-6">
              <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-3">{category}</div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {BADGES.filter((b) => b.category === category).map((badge, i) => (
                  <motion.div
                    key={badge.id}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.06, type: "spring" }}
                    data-testid={`badge-${badge.id}`}
                    className="relative group"
                  >
                    <div
                      className={`w-full aspect-square rounded-2xl flex items-center justify-center text-2xl border-2 transition-all cursor-default ${
                        badge.earned
                          ? "bg-accent/10 border-accent/40 shadow-md hover:scale-110"
                          : "bg-muted border-muted grayscale opacity-40"
                      }`}
                    >
                      {badge.emoji}
                    </div>
                    {badge.earned && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                    )}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-foreground text-background text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                      {badge.title}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-5">
            <Trophy className="w-6 h-6 text-primary" />
            <h2 className="font-extrabold text-xl text-foreground">Family Leaderboard</h2>
          </div>
          <div className="space-y-3">
            {LEADERBOARD.map((player, i) => (
              <motion.div
                key={player.name}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className={`flex items-center gap-4 p-3 rounded-2xl ${player.name === "Sam" ? "bg-primary/10 border-2 border-primary/30" : "bg-muted/40"}`}
              >
                <div className="text-lg font-black text-muted-foreground w-6 text-center">
                  {player.rank === 1 ? "🥇" : player.rank === 2 ? "🥈" : player.rank === 3 ? "🥉" : `#${player.rank}`}
                </div>
                <div className={`w-9 h-9 rounded-full ${player.color} flex items-center justify-center font-extrabold text-white text-sm`}>
                  {player.avatar}
                </div>
                <div className="flex-1 font-bold text-foreground">{player.name}</div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-accent fill-accent" />
                  <span className="font-extrabold text-foreground">{player.xp.toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
