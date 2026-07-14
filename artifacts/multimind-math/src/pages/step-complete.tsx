import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, RotateCcw } from "lucide-react";

function Confetti() {
  const pieces = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ["#6C4EF4", "#FFD700", "#FF6B9D", "#4ECDC4", "#45B7D1"][i % 5],
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random(),
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", rotate: 720, opacity: 0 }}
          transition={{ delay: p.delay, duration: p.duration, ease: "easeIn" }}
          className="absolute top-0 w-3 h-3 rounded-sm"
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

export default function StepComplete() {
  const [, setLocation] = useLocation();
  const [xp] = useState(25);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 relative">
      <Confetti />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="text-center max-w-md w-full z-20"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="text-8xl mb-6 select-none"
        >
          🌟
        </motion.div>

        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3">
          Awesome Work!
        </h1>
        <p className="text-xl text-muted-foreground font-medium mb-8">
          You completed a step on the number line!
        </p>

        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-accent/20 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-accent fill-accent" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-muted-foreground">XP Earned</div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-black text-accent-foreground"
              >
                +{xp} ⭐
              </motion.div>
            </div>
          </div>

          <div className="text-sm font-bold text-muted-foreground mb-2">Progress to next badge</div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: "40%" }}
              animate={{ width: "65%" }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="h-full bg-primary rounded-full"
            />
          </div>
          <div className="flex justify-between text-xs font-bold text-muted-foreground mt-1">
            <span>40 XP</span>
            <span>100 XP</span>
          </div>
        </div>

        <div className="bg-primary/10 border-2 border-primary/20 rounded-2xl p-4 mb-8">
          <div className="text-2xl mb-1">🤖</div>
          <p className="text-sm font-semibold text-foreground italic">
            "Making mistakes is how your brain grows stronger! Keep going!"
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            data-testid="btn-practice-this"
            variant="outline"
            onClick={() => setLocation("/learn/numberline")}
            className="flex-1 rounded-full h-14 text-base font-bold border-2 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            data-testid="btn-next-step"
            onClick={() => setLocation("/learn/visual")}
            className="flex-1 rounded-full h-14 text-base font-bold gap-2"
          >
            Next Step <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
