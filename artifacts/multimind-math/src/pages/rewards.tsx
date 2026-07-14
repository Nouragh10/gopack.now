import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Flame, Star, Trophy, ShoppingBag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const COMPLETED_DAYS = [0, 1, 2, 3, 4];

const BADGES = [
  { id: 1, icon: Flame,  title: "Streak Starter",   desc: "3 days in a row",         earned: true,  category: "Streak", color: "text-orange-500 bg-orange-50 border-orange-200" },
  { id: 2, icon: Star,   title: "Week Warrior",      desc: "7 days in a row",         earned: true,  category: "Streak", color: "text-amber-500 bg-amber-50 border-amber-200" },
  { id: 3, icon: Trophy, title: "Diamond Streak",    desc: "30 days in a row",        earned: false, category: "Streak", color: "text-sky-500 bg-sky-50 border-sky-200" },
  { id: 4, icon: Star,   title: "Addition Ace",      desc: "100% on addition",        earned: true,  category: "Topic",  color: "text-violet-500 bg-violet-50 border-violet-200" },
  { id: 5, icon: Star,   title: "Times Table Pro",   desc: "Master all times tables", earned: false, category: "Topic",  color: "text-pink-500 bg-pink-50 border-pink-200" },
  { id: 6, icon: Star,   title: "Number Ninja",      desc: "Number line challenges",  earned: true,  category: "Topic",  color: "text-green-500 bg-green-50 border-green-200" },
  { id: 7, icon: Flame,  title: "Speed Demon",       desc: "10 correct in 30 sec",    earned: true,  category: "Speed",  color: "text-red-500 bg-red-50 border-red-200" },
  { id: 8, icon: Star,   title: "Lightning Fast",    desc: "20 correct in 30 sec",    earned: false, category: "Speed",  color: "text-yellow-500 bg-yellow-50 border-yellow-200" },
];

const LEADERBOARD = [
  { name: "Alex",   xp: 1850, rank: 1, color: "bg-amber-400",  initials: "A" },
  { name: "Sam",    xp: 1240, rank: 2, color: "bg-primary",    initials: "S" },
  { name: "Jordan", xp: 980,  rank: 3, color: "bg-green-500",  initials: "J" },
  { name: "Riley",  xp: 720,  rank: 4, color: "bg-pink-500",   initials: "R" },
];

const RANK_LABELS = ["1st", "2nd", "3rd", "4th"];

export default function Rewards() {
  const streak = 7;
  const xp = 120;
  const level = 4;
  const xpMax = 100;

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xs font-extrabold text-primary uppercase tracking-wider">Rewards</div>
        </div>
        <h1 className="text-3xl font-extrabold mb-6">Rewards &amp; Streaks</h1>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border-2 border-border rounded-3xl p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span className="text-sm font-extrabold text-muted-foreground">Your Streak</span>
                </div>
                <div className="text-5xl font-black text-foreground leading-none">{streak}</div>
                <div className="text-sm font-bold text-muted-foreground mt-1">days</div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-200">
                  Amazing! Keep it going!
                </div>
              </div>
            </div>
            <div className="flex gap-1.5 mt-3">
              {WEEK_DAYS.map((day, i) => (
                <div key={`${day}-${i}`} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-extrabold text-muted-foreground">{day}</span>
                  <div className={`w-full aspect-square rounded-lg flex items-center justify-center border-2 ${
                    COMPLETED_DAYS.includes(i)
                      ? "bg-primary border-primary"
                      : "bg-muted border-border"
                  }`}>
                    {COMPLETED_DAYS.includes(i) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card border-2 border-border rounded-3xl p-5 shadow-sm"
          >
            <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-3">You earned</div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center shadow-md">
                <Star className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <div className="text-2xl font-black text-foreground">{xp} Stars</div>
                <div className="text-xs font-bold text-muted-foreground">Level {level} Explorer</div>
              </div>
            </div>
            <div className="mb-1 flex justify-between text-xs font-bold text-muted-foreground">
              <span>{xp} / {xpMax}</span>
              <span>Level {level + 1}</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden mb-4">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(xp / xpMax) * 100}%` }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-full bg-primary rounded-full"
              />
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-xs font-extrabold text-muted-foreground mb-2">Recent Rewards</div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-extrabold text-foreground">Math Master Badge</div>
                  <div className="text-xs text-muted-foreground font-medium">Earned today</div>
                </div>
              </div>
            </div>

            <Button
              size="sm"
              className="w-full mt-4 rounded-xl font-bold gap-2"
              onClick={() => {}}
            >
              <ShoppingBag className="w-4 h-4" />
              Visit Store
            </Button>
          </motion.div>
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-lg text-foreground">Badge Collection</h2>
            <span className="text-sm font-bold text-muted-foreground">
              {BADGES.filter(b => b.earned).length}/{BADGES.length} earned
            </span>
          </div>
          {["Streak", "Topic", "Speed"].map(cat => (
            <div key={cat} className="mb-4">
              <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-2">{cat}</div>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {BADGES.filter(b => b.category === cat).map((badge, i) => {
                  const Icon = badge.icon;
                  return (
                    <motion.div
                      key={badge.id}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.05 * i, type: "spring" }}
                      title={badge.title}
                      className={`relative aspect-square rounded-2xl border-2 flex items-center justify-center cursor-default ${
                        badge.earned ? badge.color : "bg-muted border-muted text-muted-foreground/30 grayscale opacity-40"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {badge.earned && (
                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="font-extrabold text-lg text-foreground">Family Leaderboard</h2>
          </div>
          <div className="space-y-2">
            {LEADERBOARD.map((player, i) => (
              <motion.div
                key={player.name}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
                className={`flex items-center gap-3 p-3 rounded-2xl ${player.name === "Sam" ? "bg-primary/8 border-2 border-primary/20" : "bg-muted/40"}`}
              >
                <div className="text-xs font-extrabold text-muted-foreground w-6 text-center">{RANK_LABELS[i]}</div>
                <div className={`w-8 h-8 rounded-full ${player.color} flex items-center justify-center font-extrabold text-white text-xs`}>
                  {player.initials}
                </div>
                <div className="flex-1 font-bold text-foreground text-sm">{player.name}</div>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-extrabold text-foreground text-sm">{player.xp.toLocaleString()}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
