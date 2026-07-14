import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Volume2 } from "lucide-react";
import { MascotByName } from "@/components/mascots/MascotSVG";

const TABS = [
  { id: "numberline", label: "Number Line" },
  { id: "pie",        label: "Pie" },
  { id: "bar",        label: "Bar / Column" },
  { id: "equation",   label: "Equation" },
];

const OTHER_APPROACHES = [
  "Get the idea",
  "Follow the steps",
  "Explain in words",
  "Do it hands-on",
  "Real-world example",
  "Spot the pattern",
  "Teach a friend",
  "Play a game",
];

function NumberLineView() {
  const nums = [20, 24, 34, 42];
  const min = 18, max = 46;
  const toX = (n: number) => ((n - min) / (max - min)) * 100;

  return (
    <div className="py-8 px-4">
      <div className="relative h-28">
        <div className="absolute bottom-8 left-0 right-0 h-1.5 bg-muted rounded-full" />
        {nums.map((n, i) => (
          <div
            key={n}
            className="absolute bottom-6 flex flex-col items-center"
            style={{ left: `${toX(n)}%`, transform: "translateX(-50%)" }}
          >
            <div className={`w-4 h-4 rounded-full border-2 -mb-1 ${i === 0 ? "bg-muted-foreground border-muted-foreground" : i === 3 ? "bg-primary border-primary" : "bg-white border-primary"}`} />
            <div className={`text-sm font-extrabold mt-3 ${i === 3 ? "text-primary" : "text-foreground"}`}>{n}</div>
          </div>
        ))}

        <svg className="absolute bottom-7 left-0 right-0 w-full" style={{ height: "60px" }} viewBox="0 0 100 60" preserveAspectRatio="none">
          <path
            d={`M ${toX(24)} 50 Q ${(toX(24) + toX(34)) / 2} 5 ${toX(34)} 50`}
            stroke="hsl(260 60% 55%)" strokeWidth="0.8" fill="none" strokeLinecap="round"
          />
          <text x={`${(toX(24) + toX(34)) / 2}`} y="8" textAnchor="middle" fontSize="5" fill="hsl(260 60% 55%)" fontWeight="bold">+10</text>
          <path
            d={`M ${toX(34)} 50 Q ${(toX(34) + toX(42)) / 2} 15 ${toX(42)} 50`}
            stroke="hsl(45 100% 50%)" strokeWidth="0.8" fill="none" strokeLinecap="round"
          />
          <text x={`${(toX(34) + toX(42)) / 2}`} y="19" textAnchor="middle" fontSize="5" fill="hsl(35 90% 45%)" fontWeight="bold">+8</text>
        </svg>
      </div>
      <p className="text-sm font-semibold text-muted-foreground text-center mt-2">
        Start at <span className="font-extrabold text-foreground">24</span>. Jump <span className="text-primary font-extrabold">10</span> to reach <span className="font-extrabold text-foreground">34</span>, then <span className="text-amber-600 font-extrabold">8</span> more to land on <span className="text-primary font-extrabold">42</span>.
      </p>
    </div>
  );
}

function PieView() {
  const r = 60, cx = 80, cy = 75;
  const total = 42, part1 = 24, part2 = 18;
  const a1 = (part1 / total) * 360;
  const toRad = (d: number) => (d - 90) * (Math.PI / 180);
  const arc = (startDeg: number, endDeg: number, color: string) => {
    const x1 = cx + r * Math.cos(toRad(startDeg));
    const y1 = cy + r * Math.sin(toRad(startDeg));
    const x2 = cx + r * Math.cos(toRad(endDeg));
    const y2 = cy + r * Math.sin(toRad(endDeg));
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return (
      <path d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`} fill={color} />
    );
  };
  return (
    <div className="flex items-center gap-8 py-4 justify-center">
      <svg width="160" height="150" viewBox="0 0 160 150">
        {arc(0, a1, "hsl(260 60% 55%)")}
        {arc(a1, 360, "hsl(45 100% 50%)")}
        <text x="50" y="90" fontSize="11" fill="white" fontWeight="bold">24</text>
        <text x="108" y="60" fontSize="11" fill="#7D5C00" fontWeight="bold">18</text>
      </svg>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-primary"></div>
          <span className="text-sm font-bold text-foreground">24 (start)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-sm bg-amber-400"></div>
          <span className="text-sm font-bold text-foreground">18 (added)</span>
        </div>
        <div className="mt-2 pt-2 border-t border-border">
          <span className="text-xl font-black text-foreground">= 42 total</span>
        </div>
      </div>
    </div>
  );
}

function BarView() {
  const bars = [
    { label: "24", value: 24, color: "bg-primary", pct: (24 / 42) * 100 },
    { label: "+18", value: 18, color: "bg-amber-400", pct: (18 / 42) * 100 },
    { label: "= 42", value: 42, color: "bg-foreground", pct: 100 },
  ];
  const maxH = 120;
  return (
    <div className="flex items-end justify-center gap-8 py-6">
      {bars.map((b) => (
        <div key={b.label} className="flex flex-col items-center gap-2">
          <span className="text-sm font-extrabold text-foreground">{b.value}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: (b.pct / 100) * maxH }}
            transition={{ duration: 0.7, type: "spring" }}
            className={`w-14 rounded-t-xl ${b.color} shadow-md`}
          />
          <span className="text-xs font-bold text-muted-foreground">{b.label}</span>
        </div>
      ))}
    </div>
  );
}

function EquationView() {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4">
      <div className="text-6xl font-black text-foreground tracking-tight">
        24 + 18
      </div>
      <div className="w-24 h-1 bg-foreground rounded-full"></div>
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, type: "spring" }}
        className="text-7xl font-black text-primary"
      >
        42
      </motion.div>
      <p className="text-sm font-semibold text-muted-foreground">24 + 18 = 42</p>
    </div>
  );
}

const VIEWS: Record<string, React.FC> = {
  numberline: NumberLineView,
  pie: PieView,
  bar: BarView,
  equation: EquationView,
};

const STEPS: Record<string, string[]> = {
  numberline: ["We start at 24 on the number line.", "Jump 10 to reach 34, then 8 more to get to 42."],
  pie:        ["The whole circle represents 42.", "The purple slice is 24, and the gold slice is 18."],
  bar:        ["Each bar shows a part of the problem.", "The last bar shows the total: 42."],
  equation:   ["Write the numbers you are adding.", "The answer below the line is 42."],
};

export default function VisualLearning() {
  const [tab, setTab] = useState("numberline");
  const [step, setStep] = useState(0);
  const [openApproach, setOpenApproach] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const View = VIEWS[tab];
  const steps = STEPS[tab];
  const isLastStep = step === steps.length - 1;

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-xs font-extrabold text-primary uppercase tracking-wider">Visual Learning</div>
        </div>
        <h1 className="text-2xl font-extrabold mb-0.5">See a Picture</h1>
        <p className="text-sm text-muted-foreground font-medium mb-4">
          Four ways to see it. We'll help you find the one that clicks!
        </p>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="flex gap-2 flex-wrap">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setStep(0); }}
                  className={`px-4 py-2 rounded-full text-sm font-bold border-2 transition-all ${
                    tab === t.id
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="bg-card border-2 border-border rounded-3xl overflow-hidden shadow-sm">
              <div className="px-5 pt-4 pb-2 border-b border-border bg-muted/30 flex items-center justify-between">
                <span className="text-xl font-black text-foreground">24 + 18 = ?</span>
                <button className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Volume2 className="w-4 h-4 text-primary" />
                </button>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.25 }}
                >
                  <View />
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
              <Button
                variant="outline"
                className="flex-1 rounded-full font-bold border-2"
                onClick={() => setLocation("/learn/visual")}
              >
                Explain that differently
              </Button>
              {isLastStep ? (
                <Button
                  onClick={() => setLocation("/step-complete")}
                  className="flex-1 rounded-full font-bold gap-2"
                >
                  I get it — next step <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={() => setStep(step + 1)}
                  className="flex-1 rounded-full font-bold gap-2"
                >
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-primary/8 border-2 border-primary/20 rounded-2xl p-4 flex flex-col items-center text-center">
              <MascotByName name={guide} size={70} />
              <p className="text-xs font-semibold text-foreground mt-2 italic leading-relaxed">
                "{guide} thinks a Number Line might help you today!"
              </p>
            </div>

            <div className="bg-card border-2 border-border rounded-2xl overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b border-border">
                <span className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider">Your other approaches</span>
              </div>
              <div className="divide-y divide-border">
                {OTHER_APPROACHES.map((a) => (
                  <button
                    key={a}
                    onClick={() => setOpenApproach(openApproach === a ? null : a)}
                    className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-foreground hover:bg-muted/50 transition-colors text-left"
                  >
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
