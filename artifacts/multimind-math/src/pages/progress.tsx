import AppLayout from "@/components/layout/AppLayout";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
} from "recharts";
import { motion } from "framer-motion";
import { Trophy, Flame, Star, BookOpen } from "lucide-react";

const weeklyData = [
  { day: "Mon", minutes: 18 },
  { day: "Tue", minutes: 25 },
  { day: "Wed", minutes: 12 },
  { day: "Thu", minutes: 30 },
  { day: "Fri", minutes: 22 },
  { day: "Sat", minutes: 35 },
  { day: "Sun", minutes: 15 },
];

const skillData = [
  { skill: "Addition", score: 90 },
  { skill: "Subtraction", score: 75 },
  { skill: "Multiply", score: 60 },
  { skill: "Division", score: 40 },
  { skill: "Fractions", score: 55 },
  { skill: "Geometry", score: 80 },
];

const recentAchievements = [
  { icon: "🔥", title: "7 Day Streak", desc: "Learned 7 days in a row!", date: "Today" },
  { icon: "🌟", title: "Addition Master", desc: "Scored 100% on addition quiz", date: "Yesterday" },
  { icon: "🚀", title: "Speed Demon", desc: "Completed 10 problems in 30 seconds", date: "3 days ago" },
];

const stats = [
  { icon: Flame, label: "Day Streak", value: "7", color: "text-orange-500 bg-orange-100" },
  { icon: Star, label: "Total XP", value: "1,240", color: "text-accent-foreground bg-accent/20" },
  { icon: Trophy, label: "Badges", value: "12", color: "text-purple-600 bg-purple-100" },
  { icon: BookOpen, label: "Topics Done", value: "8", color: "text-blue-600 bg-blue-100" },
];

export default function Progress() {
  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">My Progress</h1>
          <p className="text-muted-foreground font-medium">See how far you've come!</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card border-2 border-border rounded-2xl p-4 text-center"
            >
              <div className={`w-10 h-10 rounded-full ${s.color} flex items-center justify-center mx-auto mb-2`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-extrabold text-foreground">{s.value}</div>
              <div className="text-xs font-bold text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Weekly Activity */}
          <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-extrabold text-lg text-foreground mb-4">This Week's Activity</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklyData} barSize={20}>
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
                <Bar dataKey="minutes" fill="hsl(260 60% 55%)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Skills Radar */}
          <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-sm">
            <h2 className="font-extrabold text-lg text-foreground mb-4">Skill Strengths</h2>
            <ResponsiveContainer width="100%" height={160}>
              <RadarChart data={skillData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke="hsl(260 20% 88%)" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fontWeight: 700 }} />
                <Radar
                  dataKey="score"
                  stroke="hsl(260 60% 55%)"
                  fill="hsl(260 60% 55%)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Topics */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-6 shadow-sm">
          <h2 className="font-extrabold text-lg text-foreground mb-4">Topics</h2>
          <div className="space-y-3">
            {skillData.map((s) => (
              <div key={s.skill}>
                <div className="flex justify-between text-sm font-bold mb-1">
                  <span>{s.skill}</span>
                  <span className="text-muted-foreground">{s.score}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.score}%` }}
                    transition={{ delay: 0.3, duration: 0.8 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Achievements */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 shadow-sm">
          <h2 className="font-extrabold text-lg text-foreground mb-4">Recent Achievements</h2>
          <div className="space-y-3">
            {recentAchievements.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
                className="flex items-center gap-4 p-3 bg-muted/50 rounded-2xl"
              >
                <div className="text-2xl">{a.icon}</div>
                <div className="flex-1">
                  <div className="font-bold text-foreground text-sm">{a.title}</div>
                  <div className="text-xs text-muted-foreground font-medium">{a.desc}</div>
                </div>
                <div className="text-xs font-bold text-muted-foreground">{a.date}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
