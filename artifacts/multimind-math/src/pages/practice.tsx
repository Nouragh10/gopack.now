import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Lightbulb, List, Image, MessageSquare, Hand,
  Globe, Search, Users, Gamepad2, ChevronDown, ChevronUp,
  Star, Zap,
} from "lucide-react";
import { MascotByName } from "@/components/mascots/MascotSVG";
import { useQuestion } from "@/contexts/QuestionContext";
import { formatQuestion } from "@/lib/parseQuestion";

const APPROACHES = [
  { id: "Get the idea",       icon: Lightbulb,     color: "text-blue-600",   bg: "bg-blue-100",   xp: 50,  desc: "Get a quick overview of how the problem works — no steps yet, just the big picture.", example: "Understanding what addition really means." },
  { id: "Follow the steps",   icon: List,          color: "text-purple-600", bg: "bg-purple-100", xp: 60,  desc: "Go through each step one by one. Perfect if you like knowing exactly what to do next.", example: "Step 1: Add the ones. Step 2: Add the tens." },
  { id: "See a picture",      icon: Image,         color: "text-green-600",  bg: "bg-green-100",  xp: 55,  desc: "Visualize the math with number lines, pie charts, and bar charts.", example: "Draw 24 dots, then add 18 more." },
  { id: "Explain in words",   icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-100", xp: 65,  desc: "Describe what's happening using plain English — like telling a story.", example: "I have 24 apples and got 18 more." },
  { id: "Do it hands-on",     icon: Hand,          color: "text-teal-600",   bg: "bg-teal-100",   xp: 70,  desc: "Use physical objects — fingers, blocks, or coins — to act out the math.", example: "Count out 24 blocks, then add 18 more." },
  { id: "Real-world example", icon: Globe,         color: "text-sky-600",    bg: "bg-sky-100",    xp: 65,  desc: "Connect the math to something from everyday life.", example: "Like combining two groups of students in a class." },
  { id: "Spot the pattern",   icon: Search,        color: "text-indigo-600", bg: "bg-indigo-100", xp: 75,  desc: "Find the rule that makes this type of math work every time.", example: "Addition always gives a larger number when both are positive." },
  { id: "Teach a friend",     icon: Users,         color: "text-pink-600",   bg: "bg-pink-100",   xp: 80,  desc: "Explain how to solve it to someone else — teaching is the best way to learn!", example: "Tell a friend: start at 24, count up 18 more." },
  { id: "Play a game",        icon: Gamepad2,      color: "text-lime-600",   bg: "bg-lime-100",   xp: 100, desc: "Turn the problem into a challenge or game to make it fun.", example: "Race yourself: how fast can you solve 10 problems?" },
];

export default function Practice() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const { question, setSelectedApproach } = useQuestion();

  const handleTryApproach = (approachId: string) => {
    setSelectedApproach(approachId);
    setLocation("/learn/visual");
  };

  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-3xl">
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs font-extrabold text-primary uppercase tracking-wider">All Approaches Open</div>
          {question && (
            <div className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-3 py-1">
              {formatQuestion(question)}
            </div>
          )}
        </div>
        <h1 className="text-2xl font-extrabold mb-1">Practice</h1>
        <p className="text-sm text-muted-foreground font-medium mb-5">
          Nothing is spoiled until you tap — explore how each approach works!
        </p>

        {!question && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-200 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-amber-700" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900">No problem set yet</div>
              <button className="text-xs font-bold text-amber-700 underline" onClick={() => setLocation("/hub")}>
                Go to the hub to enter a problem
              </button>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-6">
          {APPROACHES.map((a) => {
            const Icon = a.icon;
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className={`bg-card border-2 rounded-2xl overflow-hidden transition-all ${isOpen ? "border-primary/40 shadow-md" : "border-border"}`}>
                <button onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="w-full flex items-center gap-3 px-4 py-4 text-left">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.bg} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${a.color}`} />
                  </div>
                  <span className="flex-1 font-bold text-sm text-foreground">{a.id}</span>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-full">
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-extrabold text-amber-700">{a.xp} XP</span>
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="h-px bg-border" />
                    <p className="text-sm font-medium text-muted-foreground">{a.desc}</p>
                    <div className="bg-muted rounded-xl p-3">
                      <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-1">Example</div>
                      <p className="text-sm font-semibold text-foreground">{a.example}</p>
                    </div>
                    <Button onClick={() => handleTryApproach(a.id)} className="w-full rounded-full font-bold">
                      Try "{a.id}"
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-4 flex items-center gap-4">
          <MascotByName name={guide} size={52} />
          <div>
            <div className="text-sm font-extrabold text-foreground mb-0.5">Daily Challenge</div>
            <p className="text-xs font-medium text-muted-foreground">Try 3 different approaches for the same problem today!</p>
          </div>
          <div className="ml-auto flex-shrink-0 flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span className="text-sm font-extrabold text-amber-600">+100 XP</span>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
