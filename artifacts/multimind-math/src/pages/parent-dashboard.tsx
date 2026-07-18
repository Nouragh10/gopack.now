import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Clock, Target, TrendingUp, ShieldCheck, ArrowLeft, Bell, BookOpen } from "lucide-react";

const PLAYERS = [
  { name: "Alex", avatar: "A", color: "bg-blue-500", age: 8 },
  { name: "Sam", avatar: "S", color: "bg-primary", age: 6 },
  { name: "Jordan", avatar: "J", color: "bg-green-500", age: 10 },
];

const weekData = [
  { day: "M", mins: 20 },
  { day: "T", mins: 15 },
  { day: "W", mins: 30 },
  { day: "Th", mins: 25 },
  { day: "F", mins: 18 },
  { day: "Sa", mins: 40 },
  { day: "Su", mins: 12 },
];

const topicAccuracy = [
  { topic: "Addition", accuracy: 92, sessions: 14 },
  { topic: "Subtraction", accuracy: 78, sessions: 8 },
  { topic: "Multiplication", accuracy: 61, sessions: 5 },
  { topic: "Fractions", accuracy: 45, sessions: 3 },
  { topic: "Geometry", accuracy: 83, sessions: 7 },
];

const sessions = [
  { date: "Today", duration: "22 min", topics: "Addition, Number Line", xp: 45 },
  { date: "Yesterday", duration: "18 min", topics: "Subtraction, Shapes", xp: 35 },
  { date: "Jul 12", duration: "30 min", topics: "Multiplication", xp: 60 },
  { date: "Jul 11", duration: "15 min", topics: "Fractions", xp: 25 },
];

export default function ParentDashboard() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(20);
  const [notifications, setNotifications] = useState(true);
  const player = PLAYERS[selected];

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <div className="bg-card border-b-2 border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <Button
            data-testid="btn-back"
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/hub")}
            className="rounded-full"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="font-extrabold text-foreground">Parent Dashboard</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 md:p-10">
        {/* Player Selector */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {PLAYERS.map((p, i) => (
            <button
              key={p.name}
              data-testid={`player-tab-${p.name.toLowerCase()}`}
              onClick={() => setSelected(i)}
              className={`flex items-center gap-3 px-5 py-3 rounded-2xl font-bold text-sm transition-all whitespace-nowrap border-2 ${
                selected === i
                  ? "bg-primary text-primary-foreground border-primary shadow-md"
                  : "bg-card text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              <div className={`w-7 h-7 ${p.color} rounded-full flex items-center justify-center text-white font-extrabold text-xs`}>
                {p.avatar}
              </div>
              {p.name} · Age {p.age}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Clock, label: "This Week", value: "2h 40m", color: "text-blue-600 bg-blue-100" },
            { icon: Target, label: "Accuracy", value: "76%", color: "text-green-600 bg-green-100" },
            { icon: TrendingUp, label: "XP This Week", value: "320", color: "text-purple-600 bg-purple-100" },
            { icon: BookOpen, label: "Topics", value: "5", color: "text-orange-600 bg-orange-100" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-card border-2 border-border rounded-2xl p-4"
            >
              <div className={`w-9 h-9 rounded-full ${s.color} flex items-center justify-center mb-2`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div className="text-2xl font-extrabold text-foreground">{s.value}</div>
              <div className="text-xs font-bold text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Weekly Chart */}
          <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-extrabold text-lg text-foreground mb-4">Daily Time (minutes)</h2>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={weekData} barSize={18}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="bg-card border-2 border-border rounded-xl p-2 text-sm font-bold shadow-lg">
                        {payload[0].value} min
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="mins" fill="hsl(260 60% 55%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Topic Accuracy */}
          <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-extrabold text-lg text-foreground mb-4">Topic Accuracy</h2>
            <div className="space-y-3">
              {topicAccuracy.map((t) => (
                <div key={t.topic}>
                  <div className="flex justify-between text-sm font-bold mb-1">
                    <span>{t.topic}</span>
                    <span className={t.accuracy >= 70 ? "text-green-600" : "text-orange-500"}>{t.accuracy}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${t.accuracy >= 70 ? "bg-green-500" : "bg-orange-400"}`}
                      style={{ width: `${t.accuracy}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Session History */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-6 shadow-sm">
          <h2 className="font-extrabold text-lg text-foreground mb-4">Session History</h2>
          <div className="space-y-3">
            {sessions.map((s, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-muted/40 rounded-2xl">
                <div className="text-sm font-bold text-muted-foreground w-16">{s.date}</div>
                <div className="flex-1">
                  <div className="font-bold text-foreground text-sm">{s.topics}</div>
                  <div className="text-xs text-muted-foreground font-medium">{s.duration}</div>
                </div>
                <div className="text-sm font-extrabold text-primary">+{s.xp} XP</div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-extrabold text-lg text-foreground mb-6">Learning Settings for {player.name}</h2>
          <div className="space-y-5">
            <div>
              <label className="block font-bold text-foreground mb-2 text-sm">Daily Goal: {dailyGoal} minutes</label>
              <input
                data-testid="input-daily-goal"
                type="range"
                min={5}
                max={60}
                step={5}
                value={dailyGoal}
                onChange={(e) => setDailyGoal(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-xs font-bold text-muted-foreground mt-1">
                <span>5 min</span><span>60 min</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-foreground text-sm">Daily Reminders</div>
                <div className="text-xs text-muted-foreground font-medium">Notify when it's time to learn</div>
              </div>
              <button
                data-testid="toggle-notifications"
                onClick={() => setNotifications(!notifications)}
                className={`w-12 h-6 rounded-full transition-all relative ${notifications ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifications ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
