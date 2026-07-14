import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";

const representations = [
  {
    id: "dots",
    label: "Dot Groups",
    description: "See how 5 dots and 3 dots come together",
    render: () => (
      <div className="flex items-center justify-center gap-8 py-6">
        <div className="flex flex-wrap gap-2 max-w-[120px]">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.08 }}
              className="w-10 h-10 rounded-full bg-primary shadow-md"
            />
          ))}
        </div>
        <span className="text-4xl font-extrabold text-muted-foreground">+</span>
        <div className="flex flex-wrap gap-2 max-w-[100px]">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              className="w-10 h-10 rounded-full bg-accent shadow-md"
            />
          ))}
        </div>
        <span className="text-4xl font-extrabold text-muted-foreground">=</span>
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7 }}
          className="text-6xl font-black text-foreground"
        >
          8
        </motion.div>
      </div>
    ),
  },
  {
    id: "blocks",
    label: "Building Blocks",
    description: "Stack blocks to see the total",
    render: () => (
      <div className="flex items-end justify-center gap-6 py-4">
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.07 }}
              className="w-14 h-8 rounded-lg bg-primary border-b-4 border-primary/60 shadow flex items-center justify-center text-primary-foreground font-bold text-sm"
            >
              1
            </motion.div>
          ))}
          <div className="text-center font-bold text-lg mt-1 text-primary">5</div>
        </div>
        <div className="text-4xl font-extrabold text-muted-foreground mb-6">+</div>
        <div className="flex flex-col gap-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scaleY: 0, originY: 1 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.4 + i * 0.07 }}
              className="w-14 h-8 rounded-lg bg-accent border-b-4 border-accent/60 shadow flex items-center justify-center text-accent-foreground font-bold text-sm"
            >
              1
            </motion.div>
          ))}
          <div className="text-center font-bold text-lg mt-1 text-accent-foreground">3</div>
        </div>
        <div className="text-4xl font-extrabold text-muted-foreground mb-6">=</div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-7xl font-black text-foreground mb-4"
        >
          8
        </motion.div>
      </div>
    ),
  },
  {
    id: "numberline",
    label: "Number Line",
    description: "Jump along the number line",
    render: () => (
      <div className="py-8 px-4 overflow-x-auto">
        <div className="relative min-w-[400px]">
          <div className="h-2 bg-muted rounded-full w-full relative">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="absolute -top-3 text-xs font-bold text-muted-foreground"
                style={{ left: `${(i / 8) * 100}%`, transform: "translateX(-50%)" }}
              >
                {i}
              </div>
            ))}
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-muted-foreground"
                style={{ left: `${(i / 8) * 100}%`, transform: "translate(-50%, -50%)" }}
              />
            ))}
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6 }}
              className="absolute top-0 left-0 h-full rounded-full bg-primary"
              style={{ width: `${(5 / 8) * 100}%` }}
            />
            <motion.div
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.6 }}
              className="absolute top-0 h-full rounded-full bg-accent"
              style={{ left: `${(5 / 8) * 100}%`, width: `${(3 / 8) * 100}%` }}
            />
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 1 }}
              className="absolute -top-8 w-8 h-8 bg-foreground text-background rounded-full flex items-center justify-center font-black text-sm shadow-lg"
              style={{ left: `${(8 / 8) * 100}%`, transform: "translateX(-50%)" }}
            >
              8
            </motion.div>
          </div>
          <div className="flex justify-between text-sm font-semibold mt-10 px-1">
            <span className="text-primary">← 5 steps</span>
            <span className="text-accent-foreground">3 more steps →</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: "fingers",
    label: "Finger Counting",
    description: "Count on your fingers",
    render: () => (
      <div className="flex items-center justify-center gap-8 py-4">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center"
        >
          <div className="text-7xl select-none">🖐️</div>
          <div className="font-bold text-xl text-primary mt-2">5</div>
        </motion.div>
        <div className="text-4xl font-extrabold text-muted-foreground">+</div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center"
        >
          <div className="text-7xl select-none" style={{ transform: "scaleX(-1)" }}>
            🤌
          </div>
          <div className="font-bold text-xl text-accent-foreground mt-2">3</div>
        </motion.div>
        <div className="text-4xl font-extrabold text-muted-foreground">=</div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col items-center"
        >
          <div className="text-7xl font-black text-foreground">8</div>
          <div className="font-bold text-primary mt-2">Total!</div>
        </motion.div>
      </div>
    ),
  },
];

export default function VisualLearning() {
  const [active, setActive] = useState(0);
  const [, setLocation] = useLocation();

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-3xl mx-auto">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm font-bold mb-3">
            <span>Visual Learning</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground">Adding 5 + 3</h1>
          <p className="text-muted-foreground mt-2 font-medium">Explore all the ways to see this!</p>
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {representations.map((rep, i) => (
            <button
              key={rep.id}
              data-testid={`tab-${rep.id}`}
              onClick={() => setActive(i)}
              className={`px-4 py-2 rounded-full font-bold text-sm transition-all ${
                active === i
                  ? "bg-primary text-primary-foreground shadow-md scale-105"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {rep.label}
            </button>
          ))}
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-6 min-h-[220px] shadow-sm overflow-hidden">
          <p className="text-sm text-muted-foreground font-medium mb-4">{representations[active].description}</p>
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {representations[active].render()}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <div className="flex gap-2">
            {representations.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all ${
                  i === active ? "w-6 bg-primary" : "w-2 bg-muted"
                }`}
              />
            ))}
          </div>
          {active < representations.length - 1 ? (
            <Button
              data-testid="btn-next-representation"
              onClick={() => setActive(active + 1)}
              className="rounded-full px-6 gap-2"
            >
              Next View <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              data-testid="btn-all-done"
              onClick={() => setLocation("/lesson-complete")}
              className="rounded-full px-6 gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
            >
              All Done! <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
