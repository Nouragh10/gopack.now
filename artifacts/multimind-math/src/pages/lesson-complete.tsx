import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, Home, Dumbbell, Compass, Trophy } from "lucide-react";
import { MascotByName } from "@/components/mascots/MascotSVG";

function Confetti() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    color: ["#6C4EF4", "#FFD700", "#FF6B9D", "#4ECDC4", "#45B7D1", "#FF9500"][i % 6],
    delay: Math.random() * 0.8,
    duration: 2 + Math.random() * 1.5,
    size: 6 + Math.random() * 8,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-10">
      {pieces.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", rotate: 1080, opacity: 0 }}
          transition={{ delay: p.delay, duration: p.duration, ease: "easeIn" }}
          className="absolute top-0 rounded-sm"
          style={{ backgroundColor: p.color, width: p.size, height: p.size }}
        />
      ))}
    </div>
  );
}

const LEARNED = [
  "Dot groups show addition visually",
  "Blocks stack to show the total",
  "Number lines show jumps forward",
  "The equation shows the pattern clearly",
];

export default function LessonComplete() {
  const [, setLocation] = useLocation();
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden font-sans">
      <Confetti />

      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 50%, #6C4EF4 0%, transparent 60%), radial-gradient(circle at 80% 20%, #FFD700 0%, transparent 60%)",
        }}
      />

      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
        className="text-center max-w-lg w-full z-20"
      >
        <motion.div
          animate={{ y: [0, -12, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          className="flex justify-center mb-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-amber-50 border-4 border-amber-200 flex items-center justify-center shadow-xl">
            <Trophy className="w-10 h-10 text-amber-500" />
          </div>
        </motion.div>

        <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-3">
          Lesson Complete!
        </h1>
        <p className="text-xl text-muted-foreground font-medium mb-8">
          You explored every way to understand this concept!
        </p>

        <div className="flex justify-center gap-3 mb-8">
          {[true, true, true].map((earned, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.4 + i * 0.15, type: "spring" }}
            >
              <Star
                className={`w-12 h-12 ${earned ? "text-accent fill-accent drop-shadow-lg" : "text-muted fill-muted"}`}
              />
            </motion.div>
          ))}
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-5 shadow-sm text-left">
          <h3 className="font-bold text-lg text-foreground mb-4">What you learned today:</h3>
          <ul className="space-y-3">
            {LEARNED.map((item, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="flex items-center gap-3 text-muted-foreground font-medium"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center flex-shrink-0">
                  <Star className="w-3 h-3 text-primary fill-primary" />
                </div>
                {item}
              </motion.li>
            ))}
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="bg-primary/8 border-2 border-primary/20 rounded-2xl p-4 mb-8 flex items-start gap-3 text-left"
        >
          <MascotByName name={guide} size={48} />
          <p className="text-sm font-semibold text-foreground italic pt-2">
            "There's always more than one path! You found them all. I'm so proud of you!"
          </p>
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          <Button
            data-testid="btn-go-home"
            variant="outline"
            onClick={() => setLocation("/hub")}
            className="rounded-2xl h-16 flex flex-col gap-1 font-bold border-2 text-xs"
          >
            <Home className="w-5 h-5" />
            Go Home
          </Button>
          <Button
            data-testid="btn-try-practice"
            onClick={() => setLocation("/practice")}
            className="rounded-2xl h-16 flex flex-col gap-1 font-bold text-xs"
          >
            <Dumbbell className="w-5 h-5" />
            Practice
          </Button>
          <Button
            data-testid="btn-next-topic"
            variant="outline"
            onClick={() => setLocation("/learn/numberline")}
            className="rounded-2xl h-16 flex flex-col gap-1 font-bold border-2 text-xs"
          >
            <Compass className="w-5 h-5" />
            Next Topic
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
