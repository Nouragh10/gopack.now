import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Lightbulb, List, Image, MessageSquare, Hand, Globe,
  Search, Users, Gamepad2, ChevronDown, Volume2, Lock
} from "lucide-react";
import { MascotByName } from "@/components/mascots/MascotSVG";

const APPROACHES = [
  { id: "idea",    label: "Get the idea",       icon: Lightbulb,     color: "text-blue-600",   bg: "bg-blue-50",   border: "border-blue-200",   content: "Start with a simple explanation of what addition means — combining groups to find the total." },
  { id: "steps",   label: "Follow the steps",   icon: List,          color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", content: "Step 1: Write 24. Step 2: Count up 18 more. Step 3: Stop at 42." },
  { id: "picture", label: "See a picture",      icon: Image,         color: "text-green-600",  bg: "bg-green-50",  border: "border-green-200",  content: "Draw 24 dots, then 18 more dots. Count them all to get 42." },
  { id: "words",   label: "Explain in words",   icon: MessageSquare, color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", content: "Twenty-four plus eighteen equals forty-two. We add the tens first, then the ones." },
  { id: "hands",   label: "Do it hands-on",     icon: Hand,          color: "text-teal-600",   bg: "bg-teal-50",   border: "border-teal-200",   content: "Use blocks, counters, or your fingers to physically combine the two groups." },
  { id: "world",   label: "Real-world example", icon: Globe,         color: "text-sky-600",    bg: "bg-sky-50",    border: "border-sky-200",    content: "You have 24 apples in one basket and 18 in another. Together you have 42 apples!" },
  { id: "pattern", label: "Spot the pattern",   icon: Search,        color: "text-indigo-600", bg: "bg-indigo-50", border: "border-indigo-200", content: "24 + 18: round 18 up to 20, giving 44, then subtract 2. Pattern: round up, then adjust." },
  { id: "friend",  label: "Teach a friend",     icon: Users,         color: "text-pink-600",   bg: "bg-pink-50",   border: "border-pink-200",   content: "Explain it to someone else: 'We have 24, and we're adding 18 more. So we get 42!'" },
  { id: "game",    label: "Play a game",        icon: Gamepad2,      color: "text-lime-600",   bg: "bg-lime-50",   border: "border-lime-200",   content: "Race to 42! Roll dice to move along the number line. First to land on 42 wins!" },
];

export default function Practice() {
  const [open, setOpen] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";

  const toggle = (id: string) => setOpen(prev => prev === id ? null : id);

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xs font-extrabold text-primary uppercase tracking-wider">Practice</div>
        </div>
        <h1 className="text-2xl font-extrabold mb-4">All Approaches Open</h1>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="bg-card border-2 border-border rounded-2xl p-4 mb-4 flex items-center justify-between shadow-sm">
              <span className="text-3xl font-black text-foreground">24 + 18 = ?</span>
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-primary" />
                </button>
                <div className="text-xs font-bold text-muted-foreground bg-muted px-2 py-1 rounded-lg">
                  All 9 approaches
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4">
              {APPROACHES.map((a) => {
                const Icon = a.icon;
                const isOpen = open === a.id;
                return (
                  <div key={a.id} className={`rounded-2xl border-2 overflow-hidden transition-all ${isOpen ? `${a.border} ${a.bg}` : "border-border bg-card"}`}>
                    <button
                      onClick={() => toggle(a.id)}
                      className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-black/3 transition-colors"
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isOpen ? a.bg : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${isOpen ? a.color : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-extrabold leading-tight ${isOpen ? "text-foreground" : "text-foreground"}`}>
                          {a.label}
                        </div>
                        {!isOpen && (
                          <div className="text-[10px] text-muted-foreground font-medium mt-0.5">Tap to open</div>
                        )}
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3">
                            <p className="text-xs font-medium text-foreground/80 leading-relaxed">
                              {a.content}
                            </p>
                            <button
                              onClick={() => setLocation("/step-complete")}
                              className={`mt-2 w-full py-1.5 rounded-lg text-xs font-extrabold ${a.bg} ${a.color} border ${a.border} hover:opacity-80 transition-opacity`}
                            >
                              Try this approach
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              <Lock className="w-4 h-4" />
              Nothing is spoiled until you tap!
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-card border-2 border-border rounded-2xl p-4 flex flex-col items-center text-center">
              <MascotByName name={guide} size={80} />
              <p className="text-xs font-semibold text-foreground mt-2 italic leading-relaxed">
                "Try each approach — the one that clicks is the right one for you!"
              </p>
            </div>

            <div className="bg-primary rounded-2xl p-4 text-primary-foreground">
              <div className="text-xs font-extrabold opacity-80 mb-1">Daily Challenge</div>
              <div className="font-extrabold text-sm mb-1">Multiplication Blitz</div>
              <div className="text-xs opacity-80 mb-3">10 questions in 60 seconds</div>
              <div className="text-2xl font-black mb-2">+100 XP</div>
              <Button
                size="sm"
                onClick={() => setLocation("/step-complete")}
                className="w-full bg-white text-primary hover:bg-white/90 rounded-xl font-bold text-xs"
              >
                Accept Challenge
              </Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
