import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Volume2 } from "lucide-react";
import { MascotByName } from "@/components/mascots/MascotSVG";
import { useQuestion } from "@/contexts/QuestionContext";
import { formatQuestion } from "@/lib/parseQuestion";

const TABS = [
  { id: "numberline", label: "Number Line" },
  { id: "pie",        label: "Pie" },
  { id: "bar",        label: "Bar / Column" },
  { id: "equation",   label: "Equation" },
];

const OTHER_APPROACHES = [
  "Get the idea", "Follow the steps", "Explain in words",
  "Do it hands-on", "Real-world example", "Spot the pattern",
  "Teach a friend", "Play a game",
];

function NumberLineView({ a, b, result }: { a: number; b: number; result: number }) {
  const padding = Math.max(4, Math.round((a + b) * 0.1));
  const min = Math.max(0, a - padding);
  const max = result + padding;
  const toX = (n: number) => ((n - min) / (max - min)) * 100;
  const nums = [min, a, Math.min(a + Math.round(b / 2), result - 1), result];
  const midJump = a + Math.round(b / 2);

  return (
    <div className="py-8 px-4">
      <div className="relative h-28">
        <div className="absolute bottom-8 left-0 right-0 h-1.5 bg-muted rounded-full" />
        {[a, midJump, result].map((n, i) => (
          <div
            key={n}
            className="absolute bottom-6 flex flex-col items-center"
            style={{ left: `${toX(n)}%`, transform: "translateX(-50%)" }}
          >
            <div className={`w-4 h-4 rounded-full border-2 -mb-1 ${i === 0 ? "bg-muted-foreground border-muted-foreground" : i === 2 ? "bg-primary border-primary" : "bg-white border-primary"}`} />
            <div className={`text-sm font-extrabold mt-3 ${i === 2 ? "text-primary" : "text-foreground"}`}>{n}</div>
          </div>
        ))}
        <svg className="absolute bottom-7 left-0 right-0 w-full" style={{ height: "60px" }} viewBox="0 0 100 60" preserveAspectRatio="none">
          <path d={`M ${toX(a)} 50 Q ${(toX(a) + toX(midJump)) / 2} 5 ${toX(midJump)} 50`}
            stroke="hsl(260 60% 55%)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <text x={`${(toX(a) + toX(midJump)) / 2}`} y="8" textAnchor="middle" fontSize="5" fill="hsl(260 60% 55%)" fontWeight="bold">
            +{Math.round(b / 2)}
          </text>
          <path d={`M ${toX(midJump)} 50 Q ${(toX(midJump) + toX(result)) / 2} 15 ${toX(result)} 50`}
            stroke="hsl(45 100% 50%)" strokeWidth="0.8" fill="none" strokeLinecap="round" />
          <text x={`${(toX(midJump) + toX(result)) / 2}`} y="19" textAnchor="middle" fontSize="5" fill="hsl(35 90% 45%)" fontWeight="bold">
            +{b - Math.round(b / 2)}
          </text>
        </svg>
      </div>
      <p className="text-sm font-semibold text-muted-foreground text-center mt-2">
        Start at <span className="font-extrabold text-foreground">{a}</span>.
        Jump <span className="text-primary font-extrabold">{Math.round(b / 2)}</span> to <span className="font-extrabold">{midJump}</span>,
        then <span className="text-amber-600 font-extrabold">{b - Math.round(b / 2)}</span> more to <span className="text-primary font-extrabold">{result}</span>.
      </p>
    </div>
  );
}

function PieView({ a, b, result }: { a: number; b: number; result: number }) {
  const r = 58, cx = 80, cy = 75;
  const toRad = (d: number) => (d - 90) * (Math.PI / 180);
  const a1 = (a / result) * 360;
  const arc = (startDeg: number, endDeg: number, color: string) => {
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy + r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg));
    const y2 = cy + r * Math.sin(toRad(endDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} />;
  };
  return (
    <div className="flex items-center gap-8 py-4 justify-center">
      <svg width="160" height="150" viewBox="0 0 160 150">
        {arc(0, a1, "hsl(260 60% 55%)")}
        {arc(a1, 360, "hsl(45 100% 50%)")}
        <text x={cx + r * 0.5 * Math.cos(toRad(a1 / 2))} y={cy + r * 0.5 * Math.sin(toRad(a1 / 2)) + 4}
          textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">{a}</text>
        <text x={cx + r * 0.5 * Math.cos(toRad(a1 + (360 - a1) / 2))}
          y={cy + r * 0.5 * Math.sin(toRad(a1 + (360 - a1) / 2)) + 4}
          textAnchor="middle" fontSize="11" fill="white" fontWeight="bold">{b}</text>
      </svg>
      <div className="space-y-3">
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-primary" /><span className="text-sm font-bold">{a} (start)</span></div>
        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-sm bg-amber-400" /><span className="text-sm font-bold">{b} (added)</span></div>
        <div className="mt-2 pt-2 border-t border-border"><span className="text-xl font-black">= {result} total</span></div>
      </div>
    </div>
  );
}

function BarView({ a, b, result }: { a: number; b: number; result: number }) {
  const bars = [
    { label: String(a), value: a, color: "bg-primary", pct: (a / result) * 100 },
    { label: `+${b}`, value: b, color: "bg-amber-400", pct: (b / result) * 100 },
    { label: `= ${result}`, value: result, color: "bg-foreground", pct: 100 },
  ];
  const maxH = 120;
  return (
    <div className="flex items-end justify-center gap-8 py-6">
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-col items-center gap-2">
          <span className="text-sm font-extrabold">{bar.value}</span>
          <motion.div initial={{ height: 0 }} animate={{ height: (bar.pct / 100) * maxH }}
            transition={{ duration: 0.7, type: "spring" }}
            className={`w-14 rounded-t-xl ${bar.color} shadow-md`} />
          <span className="text-xs font-bold text-muted-foreground">{bar.label}</span>
        </div>
      ))}
    </div>
  );
}

function EquationView({ a, b, displayOp, result }: { a: number; b: number; displayOp: string; result: number }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <div className="text-5xl font-black text-foreground tracking-tight">{a} {displayOp} {b}</div>
      <div className="w-20 h-1 bg-foreground rounded-full" />
      <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        className="text-6xl font-black text-primary">{result}</motion.div>
      <p className="text-sm font-semibold text-muted-foreground">{a} {displayOp} {b} = {result}</p>
    </div>
  );
}

function getSteps(tab: string, a: number, b: number, displayOp: string, result: number): string[] {
  if (tab === "numberline") return [`Start at ${a} on the number line.`, `Jump ${b} forward to land on ${result}.`];
  if (tab === "pie") return [`The whole circle represents the total: ${result}.`, `Purple is ${a}, gold is ${b}. Together they make ${result}.`];
  if (tab === "bar") return [`Each bar shows part of the problem.`, `The last bar shows the full total: ${result}.`];
  return [`Write the numbers: ${a} ${displayOp} ${b}.`, `The answer below the line is ${result}.`];
}

export default function VisualLearning() {
  const [tab, setTab] = useState("numberline");
  const [step, setStep] = useState(0);
  const [openApproach, setOpenApproach] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const { question, suggestion } = useQuestion();

  const q = question ?? { a: 24, b: 18, op: "+", displayOp: "+", result: 42, text: "24 + 18", raw: "24 + 18", type: "addition" as const };
  const steps = getSteps(tab, q.a, q.b, q.displayOp, q.result);
  const isLastStep = step === steps.length - 1;

  const views: Record<string, React.ReactNode> = {
    numberline: <NumberLineView a={q.a} b={q.b} result={q.result} />,
    pie: <PieView a={q.a} b={q.b} result={q.result} />,
    bar: <BarView a={q.a} b={q.b} result={q.result} />,
    equation: <EquationView a={q.a} b={q.b} displayOp={q.displayOp} result={q.result} />,
  };

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="text-xs font-extrabold text-primary uppercase tracking-wider mb-1">Visual Learning</div>
        <h1 className="text-2xl font-extrabold mb-0.5">See a Picture</h1>
        <p className="text-sm text-muted-foreground font-medium mb-4">Four ways to see it. Find the one that clicks!</p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="flex gap-2 flex-wrap">
              {TABS.map((t) => (
                <button key={t.id} onClick={() => { setTab(t.id); setStep(0); }}
                  className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${tab === t.id ? "bg-primary text-primary-foreground border-primary shadow-md" : "bg-card border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-card border-2 border-border rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 pt-4 pb-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-xl font-black text-foreground">{formatQuestion(q)}</span>
                <button className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-primary" />
                </button>
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>
                  {views[tab]}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-1">
                  {steps.map((_, i) => (
                    <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : "w-2 bg-muted"}`} />
                  ))}
                </div>
                <span className="text-xs font-bold text-muted-foreground">Step {step + 1} of {steps.length}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">{steps[step]}</p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 rounded-full font-bold border-2" onClick={() => setLocation("/hub")}>
                Try a different approach
              </Button>
              {isLastStep ? (
                <Button onClick={() => setLocation("/step-complete")} className="flex-1 rounded-full font-bold gap-2">
                  I get it — next step <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={() => setStep(step + 1)} className="flex-1 rounded-full font-bold gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-primary/8 border-2 border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center">
              <MascotByName name={guide} size={70} />
              <p className="text-xs font-semibold text-foreground mt-2 italic leading-relaxed">
                {suggestion ? `"${suggestion.mascotMessage}"` : `"${guide} is here to help you understand!"`}
              </p>
            </div>

            <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Other approaches</span>
              </div>
              <div className="divide-y divide-border">
                {OTHER_APPROACHES.map((a) => (
                  <button key={a} onClick={() => setOpenApproach(openApproach === a ? null : a)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/50 transition-colors text-left">
                    <span>{a}</span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${openApproach === a ? "rotate-180" : ""}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
