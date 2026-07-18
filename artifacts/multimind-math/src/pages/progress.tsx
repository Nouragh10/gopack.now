import AppLayout from "@/components/layout/AppLayout";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import { Flame, Star, Target, TrendingUp, BookOpen, Clock } from "lucide-react";
import { useProgress } from "@/contexts/ProgressContext";
import { format } from "date-fns";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildWeekData(streakDates: Record<string, boolean>) {
  const today = new Date();
  return DAYS.map((day, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (today.getDay() === 0 ? 6 : today.getDay() - 1) + i);
    const key = d.toISOString().split("T")[0];
    return { day, problems: streakDates[key] ? Math.floor(Math.random() * 5) + 1 : 0 };
  });
}

export default function Progress() {
  const { progress, history, loading } = useProgress();

  const weekData = buildWeekData(progress?.streakDates ?? {});
  const accuracy = progress && progress.totalProblems > 0
    ? Math.round((progress.correctProblems / progress.totalProblems) * 100)
    : 0;

  const approachCounts: Record<string, number> = {};
  history.forEach((h) => { approachCounts[h.approach] = (approachCounts[h.approach] ?? 0) + 1; });
  const topApproach = Object.entries(approachCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const radarData = [
    { subject: "Addition", A: Math.min(100, (approachCounts["See a picture"] ?? 0) * 20 + 20) },
    { subject: "Subtraction", A: Math.min(100, (approachCounts["Follow the steps"] ?? 0) * 20 + 15) },
    { subject: "Multiply", A: Math.min(100, (approachCounts["Spot the pattern"] ?? 0) * 20 + 10) },
    { subject: "Division", A: Math.min(100, (approachCounts["Real-world example"] ?? 0) * 20 + 5) },
    { subject: "Patterns", A: Math.min(100, (progress?.totalProblems ?? 0) * 5 + 10) },
  ];

  const statCards = [
    { icon: Target, label: "Problems Solved", value: progress?.totalProblems ?? 0, color: "text-blue-600", bg: "bg-blue-100" },
    { icon: Flame, label: "Day Streak", value: progress?.streakDays ?? 0, color: "text-orange-500", bg: "bg-orange-100" },
    { icon: BookOpen, label: "Top Approach", value: topApproach, color: "text-purple-600", bg: "bg-purple-100", small: true },
    { icon: TrendingUp, label: "Accuracy", value: `${accuracy}%`, color: "text-green-600", bg: "bg-green-100" },
  ];

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-extrabold text-primary uppercase tracking-wider">Analytics</div>
          <div className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1 rounded-full">This Week</div>
        </div>
        <h1 className="text-2xl font-extrabold mb-5">My Progress</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm">
                <div className={`w-8 h-8 rounded-xl ${card.bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${card.color}`} />
                </div>
                <div className={`font-extrabold ${card.small ? "text-base" : "text-2xl"} text-foreground truncate`}>{card.value}</div>
                <div className="text-xs font-bold text-muted-foreground mt-0.5">{card.label}</div>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-card border-2 border-border rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-foreground mb-4">Weekly Activity</h2>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={weekData} barSize={24}>
                <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: 12, border: "none", fontSize: 12 }} />
                <Bar dataKey="problems" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-card border-2 border-border rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-foreground mb-4">Skill Strengths</h2>
            <ResponsiveContainer width="100%" height={140}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 700 }} />
                <Radar dataKey="A" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-border">
            <h2 className="text-sm font-extrabold text-foreground">Recent Activity</h2>
          </div>
          {history.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm font-medium text-muted-foreground">
              No activity yet — solve a problem to get started!
            </div>
          ) : (
            <div className="divide-y divide-border">
              {history.slice(0, 10).map((item) => (
                <div key={item.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-foreground truncate">{item.question}</div>
                    <div className="text-xs font-medium text-muted-foreground">{item.approach}</div>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < item.stars ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium flex-shrink-0 hidden sm:block">
                    {format(new Date(item.timestamp), "MMM d")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
