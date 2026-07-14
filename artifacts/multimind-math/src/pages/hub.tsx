import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import {
  Lightbulb, List, Image, MessageSquare, Hand, Globe,
  Search, Users, Gamepad2, Volume2, ChevronRight, Flame, Star
} from "lucide-react";
import { MascotByName, GUIDE_CONFIG } from "@/components/mascots/MascotSVG";

const APPROACHES = [
  { id: "idea",    label: "Get the idea",      icon: Lightbulb,     bg: "bg-blue-100",    color: "text-blue-600",   path: "/learn/visual" },
  { id: "steps",   label: "Follow the steps",  icon: List,          bg: "bg-purple-100",  color: "text-purple-600", path: "/learn/visual" },
  { id: "picture", label: "See a picture",     icon: Image,         bg: "bg-green-100",   color: "text-green-600",  path: "/learn/visual" },
  { id: "words",   label: "Explain in words",  icon: MessageSquare, bg: "bg-orange-100",  color: "text-orange-600", path: "/learn/visual" },
  { id: "hands",   label: "Do it hands-on",    icon: Hand,          bg: "bg-teal-100",    color: "text-teal-600",   path: "/learn/visual" },
  { id: "world",   label: "Real-world example",icon: Globe,         bg: "bg-sky-100",     color: "text-sky-600",    path: "/learn/visual" },
  { id: "pattern", label: "Spot the pattern",  icon: Search,        bg: "bg-indigo-100",  color: "text-indigo-600", path: "/learn/visual" },
  { id: "friend",  label: "Teach a friend",    icon: Users,         bg: "bg-pink-100",    color: "text-pink-600",   path: "/learn/visual" },
  { id: "game",    label: "Play a game",        icon: Gamepad2,      bg: "bg-lime-100",    color: "text-lime-600",   path: "/practice" },
];

export default function Hub() {
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const name = localStorage.getItem("multimind_player_name") || "Explorer";
  const guideCfg = GUIDE_CONFIG.find(g => g.name === guide) ?? GUIDE_CONFIG[0];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [, setLocation] = useLocation();

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            CORE LEARNING EXPERIENCE
          </div>
          <div className="flex items-center gap-4 bg-card border-2 border-border rounded-2xl px-4 py-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-extrabold text-base">3</span>
            </div>
            <div className="w-px h-5 bg-border"></div>
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="font-extrabold text-base">120</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2">
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground leading-tight mb-4">
              Solve in the way that<br />makes sense to <span className="text-primary">you!</span>
            </h1>

            <div className="bg-card border-2 border-border rounded-2xl p-4 mb-4 inline-flex items-center gap-4 shadow-sm">
              <span className="text-sm font-bold text-muted-foreground">What is</span>
              <span className="text-3xl font-black text-foreground">24 + 18?</span>
              <button className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                <Volume2 className="w-4 h-4 text-primary" />
              </button>
            </div>

            <div className="mb-3">
              <div className="font-extrabold text-foreground mb-0.5">Choose how you want to learn!</div>
              <div className="text-sm text-muted-foreground font-medium">Pick one, several, or all 9 ways.</div>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {APPROACHES.map((a) => {
                const Icon = a.icon;
                const isSelected = selected.has(a.id);
                return (
                  <button
                    key={a.id}
                    onClick={() => toggle(a.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none ${
                      isSelected
                        ? "border-primary bg-primary/5 shadow-md"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${a.bg} ${isSelected ? "scale-110" : ""} transition-transform`}>
                      <Icon className={`w-5 h-5 ${a.color}`} />
                    </div>
                    <span className={`text-xs font-bold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className={`rounded-3xl p-4 flex flex-col items-center text-center border-2 ${guideCfg.bgLight} ${guideCfg.border}`}>
              <MascotByName name={guide} size={90} />
              <div className={`mt-2 font-extrabold text-sm ${guideCfg.textColor}`}>{guide}'s Tip</div>
              <p className="text-xs text-muted-foreground font-medium italic mt-1 leading-relaxed">
                "Remember, making mistakes is how your brain grows stronger!"
              </p>
            </div>

            <div className="bg-card border-2 border-border rounded-2xl p-4">
              <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Quick Jump</div>
              <div className="space-y-1.5">
                {[
                  { label: "Number Line", path: "/learn/numberline" },
                  { label: "My Progress", path: "/progress" },
                  { label: "Rewards", path: "/rewards" },
                  { label: "Practice", path: "/practice" },
                ].map(item => (
                  <Link key={item.label} href={item.path}>
                    <div className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                      <span className="text-sm font-bold text-foreground">{item.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Link href="/learn/visual">
            <Button size="lg" className="rounded-full px-10 h-14 text-lg font-extrabold shadow-lg gap-2">
              Start Learning
              <ChevronRight className="w-5 h-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground font-medium">
            Nothing is spoiled until you tap!
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
