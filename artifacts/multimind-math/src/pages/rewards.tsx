import { motion } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Flame, Star, Trophy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProgress } from "@/contexts/ProgressContext";
import { useLocation } from "wouter";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

function buildStreakCalendar(streakDates: Record<string, boolean>) {
  const today = new Date();
  const dayOfWeek = today.getDay(); 
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

  return DAYS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = d.toISOString().split("T")[0];
    const todayKey = today.toISOString().split("T")[0];
    return { label, done: !!streakDates[key], isToday: key === todayKey };
  });
}

const BADGES = [
  { id: "first", label: "First Problem", desc: "Solve your first problem", icon: Star, color: "bg-purple-500", requirement: 1 },
  { id: "streak3", label: "3 Day Streak", desc: "Practice 3 days in a row", icon: Flame, color: "bg-orange-500", requirement: 3, streakBased: true },
  { id: "problems10", label: "Problem Solver", desc: "Solve 10 problems", icon: Trophy, color: "bg-blue-500", requirement: 10 },
  { id: "streak7", label: "Week Warrior", desc: "Practice 7 days in a row", icon: Flame, color: "bg-red-500", requirement: 7, streakBased: true },
  { id: "problems50", label: "Math Master", desc: "Solve 50 problems", icon: Trophy, color: "bg-amber-500", requirement: 50 },
  { id: "problems100", label: "Century Club", desc: "Solve 100 problems", icon: Star, color: "bg-green-500", requirement: 100 },
];

export default function Rewards() {
  const { progress } = useProgress();
  const [, setLocation] = useLocation();

  const cal = buildStreakCalendar(progress?.streakDates ?? {});
  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? 1;
  const streak = progress?.streakDays ?? 0;
  const total = progress?.totalProblems ?? 0;
  const xpInLevel = xp % 100;
  const nextLevelXp = 100;

  const earnedBadges = BADGES.filter((b) =>
    b.streakBased ? streak >= b.requirement : total >= b.requirement
  );

  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-3xl">
        <div className="text-xs font-extrabold text-primary uppercase tracking-wider mb-1">Achievements</div>
        <h1 className="text-2xl font-extrabold mb-5">Rewards & Streaks</h1>

        <div className="bg-card border-2 border-border rounded-3xl p-5 mb-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 bg-orange-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-foreground">{streak} day{streak !== 1 ? "s" : ""}</div>
              <div className="text-sm font-semibold text-muted-foreground">
                {streak === 0 ? "Start your streak today!" : streak < 3 ? "Keep it going!" : streak < 7 ? "Amazing! Keep it going!" : "You're on fire!"}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-between">
            {cal.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold border-2 transition-all ${
                  d.done ? "bg-orange-500 border-orange-500 text-white shadow-md" : d.isToday ? "border-primary text-primary" : "border-border text-muted-foreground"
                }`}>
                  {d.done ? <Check className="w-4 h-4" /> : d.label}
                </div>
                <span className="text-[10px] font-bold text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-5 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="font-extrabold text-foreground">{xp} Stars</span>
            </div>
            <div className="text-sm font-bold text-muted-foreground">Level {level}</div>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden mb-1">
            <motion.div initial={{ width: 0 }} animate={{ width: `${(xpInLevel / nextLevelXp) * 100}%` }}
              transition={{ duration: 0.8, delay: 0.2 }} className="h-full bg-primary rounded-full" />
          </div>
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>Level {level}</span>
            <span>{xpInLevel} / {nextLevelXp} XP to Level {level + 1}</span>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-5 mb-4 shadow-sm">
          <h2 className="text-sm font-extrabold text-foreground mb-4">Badge Collection</h2>
          <div className="grid grid-cols-3 gap-3">
            {BADGES.map((badge) => {
              const Icon = badge.icon;
              const earned = earnedBadges.some((b) => b.id === badge.id);
              return (
                <div key={badge.id} className={`flex flex-col items-center p-3 rounded-2xl border-2 text-center gap-2 transition-all ${earned ? "border-amber-300 bg-amber-50 shadow-sm" : "border-border bg-muted/30 opacity-50"}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${earned ? badge.color : "bg-muted"}`}>
                    <Icon className={`w-5 h-5 ${earned ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <div className="text-xs font-extrabold text-foreground leading-tight">{badge.label}</div>
                  <div className="text-[10px] font-medium text-muted-foreground leading-tight">{badge.desc}</div>
                  {earned && <div className="text-[10px] font-extrabold text-amber-600">Earned!</div>}
                </div>
              );
            })}
          </div>
        </div>

        <Button onClick={() => setLocation("/hub")} className="w-full rounded-full h-12 font-bold">
          Keep Earning Stars
        </Button>
      </div>
    </AppLayout>
  );
}
