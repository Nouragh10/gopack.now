import AppLayout from "@/components/layout/AppLayout";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { motion } from "framer-motion";
import { Flame, Star, BookOpen, Target } from "lucide-react";
import { Button } from "@/components/ui/button";

const weeklyData = [
  { day: "Mon", problems: 8 },
  { day: "Tue", problems: 14 },
  { day: "Wed", problems: 6 },
  { day: "Thu", problems: 18 },
  { day: "Fri", problems: 12 },
  { day: "Sat", problems: 22 },
  { day: "Sun", problems: 9 },
];

const skillData = [
  { skill: "Addition",    score: 90 },
  { skill: "Subtraction", score: 75 },
  { skill: "Multiply",    score: 60 },
  { skill: "Division",    score: 40 },
  { skill: "Fractions",   score: 55 },
  { skill: "Geometry",    score: 80 },
];

const recentActivity = [
  { problem: "24 + 18 = ?",    approaches: "See a picture, Follow the steps", date: "Today",     stars: 3 },
  { problem: "36 − 17 = ?",    approaches: "Number line, Explain in words",   date: "Yesterday", stars: 2 },
  { problem: "3/4 of 20 = ?",  approaches: "Pie, Real-world example",         date: "May 9",     stars: 3 },
  { problem: "45 ÷ 6 = ?",     approaches: "Bar/column, Follow the steps",    date: "May 8",     stars: 2 },
];

const STATS = [
  { icon: Target, label: "Problems Solved", value: "32",      color: "bg-violet-100 text-violet-600" },
  { icon: Flame,  label: "Day Streak",      value: "7",       color: "bg-orange-100 text-orange-600" },
  { icon: Star,   label: "Most Used",       value: "Picture", color: "bg-amber-100 text-amber-600" },
  { icon: BookOpen,label: "Accuracy",       value: "89%",     color: "bg-green-100 text-green-600" },
];

function StarDots({ count, max = 3 }: { count: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-3.5 h-3.5 ${i < count ? "text-amber-400 fill-amber-400" : "text-muted fill-muted"}`} />
      ))}
    </div>
  );
}

export default function Progress() {
  const name = localStorage.getItem("multimind_player_name") || "Alex";

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xs font-extrabold text-primary uppercase tracking-wider">Progress</div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold">{name}'s Progress</h1>
          <select className="text-sm font-bold border-2 border-border rounded-xl px-3 py-1.5 bg-card text-foreground focus:outline-none focus:border-primary">
            <option>This Week</option>
            <option>This Month</option>
            <option>All Time</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {STATS.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="bg-card border-2 border-border rounded-2xl p-4 text-center shadow-sm"
              >
                <div className={`w-9 h-9 rounded-full ${s.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-2xl font-extrabold text-foreground">{s.value}</div>
                <div className="text-[11px] font-bold text-muted-foreground mt-0.5">{s.label}</div>
              </motion.div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card border-2 border-border rounded-3xl p-5 shadow-sm">
            <h2 className="font-extrabold text-base text-foreground mb-3">Weekly Activity</h2>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={weeklyData} barSize={18}>
                <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="bg-card border-2 border-border rounded-xl p-2 text-xs font-bold shadow-lg">
                        {payload[0].value} problems
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="problems" fill="hsl(260 60% 55%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border-2 border-border rounded-3xl p-5 shadow-sm">
            <h2 className="font-extrabold text-base text-foreground mb-3">Skill Strengths</h2>
            <ResponsiveContainer width="100%" height={150}>
              <RadarChart data={skillData} cx="50%" cy="50%" outerRadius="65%">
                <PolarGrid stroke="hsl(260 20% 90%)" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9, fontWeight: 700 }} />
                <Radar dataKey="score" stroke="hsl(260 60% 55%)" fill="hsl(260 60% 55%)" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-5 mb-4 shadow-sm">
          <h2 className="font-extrabold text-base text-foreground mb-4">Topics Mastered</h2>
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

        <div className="bg-card border-2 border-border rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-extrabold text-base text-foreground">Recent Activity</h2>
            <Button variant="outline" size="sm" className="rounded-xl border-2 font-bold text-xs">
              View All History
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-border">
                  <th className="pb-2 font-extrabold text-muted-foreground text-xs pr-4">Problem</th>
                  <th className="pb-2 font-extrabold text-muted-foreground text-xs pr-4">Approaches</th>
                  <th className="pb-2 font-extrabold text-muted-foreground text-xs pr-4">Date</th>
                  <th className="pb-2 font-extrabold text-muted-foreground text-xs">Stars</th>
                </tr>
              </thead>
              <tbody>
                {recentActivity.map((item, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 pr-4 font-extrabold text-foreground whitespace-nowrap">{item.problem}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground font-medium text-xs max-w-[180px]">{item.approaches}</td>
                    <td className="py-2.5 pr-4 text-muted-foreground font-medium text-xs whitespace-nowrap">{item.date}</td>
                    <td className="py-2.5"><StarDots count={item.stars} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
