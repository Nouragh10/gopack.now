import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Minus, Star } from "lucide-react";

const TARGET = 7;
const MIN = -5;
const MAX = 15;

function MascotWalker({ position }: { position: number }) {
  const pct = ((position - MIN) / (MAX - MIN)) * 100;
  return (
    <motion.div
      animate={{ left: `${pct}%` }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="absolute -top-10 -translate-x-1/2"
      style={{ left: `${pct}%` }}
    >
      <div className="text-3xl select-none drop-shadow-md">🤖</div>
    </motion.div>
  );
}

export default function NumberLine() {
  const [position, setPosition] = useState(0);
  const [celebrated, setCelebrated] = useState(false);
  const [, setLocation] = useLocation();

  const pct = (pos: number) => ((pos - MIN) / (MAX - MIN)) * 100;

  const step = (dir: 1 | -1) => {
    if (celebrated) return;
    setPosition((p) => {
      const next = Math.max(MIN, Math.min(MAX, p + dir));
      if (next === TARGET) setCelebrated(true);
      return next;
    });
  };

  useEffect(() => {
    if (celebrated) {
      const t = setTimeout(() => setLocation("/step-complete"), 2200);
      return () => clearTimeout(t);
    }
  }, [celebrated, setLocation]);

  const ticks = Array.from({ length: MAX - MIN + 1 }, (_, i) => MIN + i);

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-bold mb-3">
            <span>Interactive Number Line</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">Reach number {TARGET}!</h1>
          <p className="text-muted-foreground mt-1 font-medium">Use the buttons to walk along the number line.</p>
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-8 shadow-sm mb-6">
          <div className="flex items-center justify-center gap-6 mb-10">
            <div className="text-center">
              <div className="text-sm font-bold text-muted-foreground mb-1">You are at</div>
              <motion.div
                key={position}
                initial={{ scale: 1.4 }}
                animate={{ scale: 1 }}
                className="text-7xl font-black text-primary"
              >
                {position}
              </motion.div>
            </div>
            <div className="text-3xl text-muted-foreground font-bold">→</div>
            <div className="text-center">
              <div className="text-sm font-bold text-muted-foreground mb-1">Goal</div>
              <div className="text-7xl font-black text-accent-foreground">{TARGET}</div>
            </div>
          </div>

          <div className="relative h-16 mb-2 px-4">
            <MascotWalker position={position} />
            <div
              className="absolute bottom-3 left-4 right-4 h-3 bg-muted rounded-full"
            />
            {/* Target marker */}
            <div
              className="absolute bottom-0 -translate-x-1/2"
              style={{ left: `calc(${pct(TARGET)}% + 16px)` }}
            >
              <div className="w-4 h-6 bg-accent rounded-t-full" />
            </div>
            {ticks.filter((_, i) => i % 2 === 0).map((n) => (
              <div
                key={n}
                className="absolute bottom-0 -translate-x-1/2 text-[10px] font-bold text-muted-foreground"
                style={{ left: `calc(${pct(n)}% + 16px)` }}
              >
                {n}
              </div>
            ))}
          </div>
        </div>

        {celebrated && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-accent/20 border-2 border-accent rounded-3xl p-6 text-center mb-6"
          >
            <div className="text-5xl mb-2">🎉</div>
            <h2 className="text-2xl font-extrabold text-foreground">You reached {TARGET}!</h2>
            <p className="text-muted-foreground font-medium mt-1">Amazing work! Moving to next step…</p>
          </motion.div>
        )}

        <div className="flex gap-4 justify-center">
          <Button
            data-testid="btn-minus"
            onClick={() => step(-1)}
            disabled={position <= MIN || celebrated}
            size="lg"
            variant="outline"
            className="h-16 w-16 rounded-full text-2xl font-black border-2 disabled:opacity-30"
          >
            <Minus className="w-6 h-6" />
          </Button>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex gap-1">
              {Array.from({ length: Math.abs(TARGET - position) }).map((_, i) => (
                <Star key={i} className="w-4 h-4 text-muted fill-muted" />
              ))}
            </div>
          </div>
          <Button
            data-testid="btn-plus"
            onClick={() => step(1)}
            disabled={position >= MAX || celebrated}
            size="lg"
            className="h-16 w-16 rounded-full text-2xl font-black"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
        <p className="text-center text-sm text-muted-foreground font-medium mt-4">
          {Math.abs(TARGET - position) === 0 ? "You're there! 🎉" : `${Math.abs(TARGET - position)} step${Math.abs(TARGET - position) > 1 ? "s" : ""} ${position < TARGET ? "forward" : "back"} to go!`}
        </p>
      </div>
    </AppLayout>
  );
}
