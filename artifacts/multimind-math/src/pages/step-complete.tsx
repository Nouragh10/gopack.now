import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, ArrowRight, RotateCcw, Trophy } from "lucide-react";
import { MascotByName } from "@/components/mascots/MascotSVG";
import { useQuestion } from "@/contexts/QuestionContext";
import { useProgress } from "@/contexts/ProgressContext";

function Confetti() {
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ["#6C4EF4", "#FFD700", "#FF6B9D", "#4ECDC4", "#45B7D1"][i % 5],
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random(),
    size: 8 + Math.random() * 6,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {pieces.map((p) => (
        <motion.div key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", rotate: 720, opacity: 0 }}
          transition={{ delay: p.delay, duration: p.duration, ease: "easeIn" }}
          className="absolute top-0 rounded-sm"
          style={{ backgroundColor: p.color, width: p.size, height: p.size }} />
      ))}
    </div>
  );
}

export default function StepComplete() {
  const [, setLocation] = useLocation();
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const { question, selectedApproach } = useQuestion();
  const { recordCompletion, progress } = useProgress();
  const recorded = useRef(false);
  const stars = 3;

  useEffect(() => {
    if (!recorded.current) {
      recorded.current = true;
      const qText = question ? `${question.a} ${question.displayOp} ${question.b}` : "math problem";
      const approach = selectedApproach ?? "See a picture";
      recordCompletion(qText, approach, stars);
    }
  }, []);

  const xpEarned = stars * 10 + 5;
  const prevXp = (progress?.xp ?? xpEarned) - xpEarned;
  const nextLevelXp = Math.ceil((prevXp + 1) / 100) * 100;
  const progressPct = Math.min(100, ((progress?.xp ?? 0) % 100));

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 relative font-sans">
      <Confetti />
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="text-center max-w-md w-full z-20"
      >
        <motion.div
          animate={{ rotate: [0, -10, 10, -5, 5, 0], y: [0, -8, 0] }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex justify-center mb-4"
        >
          <MascotByName name={guide} size={96} />
        </motion.div>

        <div className="w-14 h-14 mx-auto bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center mb-4">
          <Trophy className="w-7 h-7 text-amber-500" />
        </div>

        <h1 className="text-4xl font-extrabold text-foreground mb-2">Awesome Work!</h1>

        {question && (
          <div className="text-lg font-bold text-muted-foreground mb-1">
            {question.a} {question.displayOp} {question.b} = <span className="text-primary">{question.result}</span>
          </div>
        )}
        {selectedApproach && (
          <p className="text-sm text-muted-foreground font-medium mb-6">
            Using: <span className="font-bold text-foreground">{selectedApproach}</span>
          </p>
        )}

        <div className="bg-card border-2 border-border rounded-3xl p-5 mb-4 shadow-sm text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
            <div>
              <div className="text-xs font-bold text-muted-foreground">XP Earned</div>
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }} className="text-2xl font-black text-foreground">
                +{xpEarned} Stars
              </motion.div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs font-bold text-muted-foreground">Total XP</div>
              <div className="text-lg font-extrabold text-primary">{progress?.xp ?? xpEarned}</div>
            </div>
          </div>
          <div className="text-xs font-bold text-muted-foreground mb-1.5">Level {progress?.level ?? 1} progress</div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }}
              transition={{ delay: 0.7, duration: 0.8 }} className="h-full bg-primary rounded-full" />
          </div>
          <div className="flex justify-between text-xs font-bold text-muted-foreground mt-1">
            <span>Level {progress?.level ?? 1}</span>
            <span>Level {(progress?.level ?? 1) + 1}</span>
          </div>
        </div>

        <div className="bg-primary/8 border-2 border-primary/20 rounded-2xl p-4 mb-6 text-left">
          <div className="text-xs font-extrabold text-primary mb-1">{guide} says:</div>
          <p className="text-sm font-semibold text-foreground italic">
            "Making mistakes is how your brain grows stronger! Keep going!"
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setLocation("/hub")}
            className="flex-1 rounded-full h-12 text-sm font-bold border-2 gap-2">
            <RotateCcw className="w-4 h-4" />
            New Problem
          </Button>
          <Button onClick={() => setLocation("/learn/visual")}
            className="flex-1 rounded-full h-12 text-sm font-bold gap-2">
            Keep Going <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
