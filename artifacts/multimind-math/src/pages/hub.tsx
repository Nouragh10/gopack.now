import React, { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import {
  Lightbulb, List, Image, MessageSquare, Hand, Globe,
  Search, Users, Gamepad2, ChevronRight, Flame, Star,
  Sparkles, Loader2, AlertCircle, Send,
} from "lucide-react";
import { MascotByName, GUIDE_CONFIG } from "@/components/mascots/MascotSVG";
import { useQuestion } from "@/contexts/QuestionContext";
import { useProgress } from "@/contexts/ProgressContext";
import { parseQuestion } from "@/lib/parseQuestion";
import { motion, AnimatePresence } from "framer-motion";

const APPROACHES = [
  { id: "Get the idea",       icon: Lightbulb,     bg: "bg-blue-100",    color: "text-blue-600",   path: "/learn/visual" },
  { id: "Follow the steps",   icon: List,          bg: "bg-purple-100",  color: "text-purple-600", path: "/learn/visual" },
  { id: "See a picture",      icon: Image,         bg: "bg-green-100",   color: "text-green-600",  path: "/learn/visual" },
  { id: "Explain in words",   icon: MessageSquare, bg: "bg-orange-100",  color: "text-orange-600", path: "/learn/visual" },
  { id: "Do it hands-on",     icon: Hand,          bg: "bg-teal-100",    color: "text-teal-600",   path: "/learn/visual" },
  { id: "Real-world example", icon: Globe,         bg: "bg-sky-100",     color: "text-sky-600",    path: "/learn/visual" },
  { id: "Spot the pattern",   icon: Search,        bg: "bg-indigo-100",  color: "text-indigo-600", path: "/learn/visual" },
  { id: "Teach a friend",     icon: Users,         bg: "bg-pink-100",    color: "text-pink-600",   path: "/learn/visual" },
  { id: "Play a game",        icon: Gamepad2,      bg: "bg-lime-100",    color: "text-lime-600",   path: "/practice"    },
];

export default function Hub() {
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const guideCfg = GUIDE_CONFIG.find((g) => g.name === guide) ?? GUIDE_CONFIG[0];
  const { progress } = useProgress();
  const { question, setQuestion, suggestion, suggestionLoading, suggestionError, fetchSuggestion, setSelectedApproach } = useQuestion();
  const [, setLocation] = useLocation();

  const [inputValue, setInputValue] = useState(question?.text ?? "");
  const [parseError, setParseError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const EXAMPLES = ["24 + 18", "63 − 27", "7 × 8", "48 ÷ 6", "156 + 89", "13 × 12"];

  const handleAsk = async () => {
    const parsed = parseQuestion(inputValue);
    if (!parsed) {
      setParseError("Try something like: 24 + 18, 7 × 8, or 48 ÷ 6");
      return;
    }
    setParseError(null);
    setQuestion(parsed);
    const personality = guideCfg.personality;
    await fetchSuggestion(inputValue, guide, personality);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleAsk();
  };

  const handleStartApproach = (approachId: string) => {
    setSelectedApproach(approachId);
    setLocation("/learn/visual");
  };

  const handleExampleClick = (ex: string) => {
    setInputValue(ex);
    setParseError(null);
    inputRef.current?.focus();
  };

  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-5xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-xs font-extrabold text-muted-foreground uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-primary" />
            Core Learning Experience
          </div>
          <div className="flex items-center gap-3 bg-card border-2 border-border rounded-2xl px-4 py-2 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="font-extrabold text-sm">{progress?.streakDays ?? 0}</span>
            </div>
            <div className="w-px h-4 bg-border" />
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-extrabold text-sm">{progress?.xp ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight mb-1">
                What math are you <span className="text-primary">working on</span> today?
              </h1>
              <p className="text-sm text-muted-foreground font-medium">
                Type any problem and {guide} will suggest the best way to tackle it.
              </p>
            </div>

            <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => { setInputValue(e.target.value); setParseError(null); }}
                    onKeyDown={handleKeyDown}
                    placeholder="e.g. 24 + 18, 7 × 8, 156 − 89…"
                    className={`w-full h-12 px-4 text-lg font-bold bg-background border-2 rounded-xl outline-none transition-colors placeholder:font-normal placeholder:text-muted-foreground/60 ${
                      parseError ? "border-destructive" : "border-border focus:border-primary"
                    }`}
                  />
                </div>
                <Button
                  onClick={handleAsk}
                  disabled={suggestionLoading || !inputValue.trim()}
                  className="h-12 px-5 rounded-xl font-bold gap-2 text-sm flex-shrink-0"
                >
                  {suggestionLoading
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <><Sparkles className="w-4 h-4" />Ask {guide}</>
                  }
                </Button>
              </div>

              {parseError && (
                <div className="flex items-center gap-2 text-sm text-destructive font-semibold">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {parseError}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => handleExampleClick(ex)}
                    className="text-xs font-bold px-2.5 py-1 bg-muted rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <AnimatePresence>
              {suggestion && question && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className={`rounded-2xl border-2 p-4 ${guideCfg.bgLight} ${guideCfg.border}`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <MascotByName name={guide} size={52} />
                    <div className="flex-1">
                      <div className={`text-xs font-extrabold uppercase tracking-wider ${guideCfg.textColor} mb-1`}>
                        {guide}'s Suggestion
                      </div>
                      <div className="text-base font-extrabold text-foreground">
                        Try: <span className={guideCfg.textColor}>"{suggestion.approach}"</span>
                      </div>
                      <p className="text-sm font-medium text-foreground/80 mt-1 italic">
                        "{suggestion.mascotMessage}"
                      </p>
                    </div>
                  </div>

                  {suggestion.tips.length > 0 && (
                    <div className="mb-3 space-y-1">
                      {suggestion.tips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm font-medium text-foreground/80">
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white mt-0.5 flex-shrink-0 ${guideCfg.dot}`}>
                            {i + 1}
                          </div>
                          {tip}
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    onClick={() => handleStartApproach(suggestion.approach)}
                    className="w-full rounded-xl font-bold gap-2"
                  >
                    Start with "{suggestion.approach}"
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </motion.div>
              )}

              {suggestionError && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-destructive/10 border-2 border-destructive/20 rounded-2xl p-4"
                >
                  <p className="text-sm font-semibold text-destructive">{suggestionError}</p>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-extrabold text-foreground">Or choose an approach yourself</div>
                <div className="text-xs text-muted-foreground font-medium">9 ways to learn</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {APPROACHES.map((a) => {
                  const Icon = a.icon;
                  const isAISuggested = suggestion?.approach === a.id;
                  return (
                    <button
                      key={a.id}
                      onClick={() => handleStartApproach(a.id)}
                      disabled={!question && !inputValue.trim()}
                      className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 text-center transition-all hover:shadow-md hover:-translate-y-0.5 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed ${
                        isAISuggested
                          ? `${guideCfg.border} ${guideCfg.bgLight} shadow-md ring-2 ring-offset-1 ${guideCfg.dot.replace("bg-", "ring-")}`
                          : "border-border bg-card"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${a.bg}`}>
                        <Icon className={`w-4 h-4 ${a.color}`} />
                      </div>
                      <span className="text-[11px] font-bold leading-tight text-foreground">
                        {a.id}
                      </span>
                      {isAISuggested && (
                        <span className={`text-[9px] font-extrabold uppercase ${guideCfg.textColor}`}>
                          {guide} Pick
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {!question && (
                <p className="text-xs text-muted-foreground font-medium mt-2 text-center">
                  Enter a question above to unlock the approaches
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className={`rounded-2xl p-4 flex flex-col items-center text-center border-2 ${guideCfg.bgLight} ${guideCfg.border}`}>
              <MascotByName name={guide} size={80} />
              <div className={`mt-2 font-extrabold text-sm ${guideCfg.textColor}`}>{guide}</div>
              <div className="text-xs text-muted-foreground font-medium">{guideCfg.personality}</div>
              <Link href="/choose-guide">
                <button className={`mt-2 text-xs font-bold hover:underline ${guideCfg.textColor}`}>
                  Change guide
                </button>
              </Link>
            </div>

            {question && (
              <div className="bg-card border-2 border-border rounded-2xl p-4 shadow-sm">
                <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">
                  Current Problem
                </div>
                <div className="text-2xl font-black text-foreground">
                  {question.a} {question.displayOp} {question.b} = ?
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-1 truncate" title={question.text}>
                  {question.text}
                </div>
              </div>
            )}

            <div className="bg-card border-2 border-border rounded-2xl p-4">
              <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">
                Quick Jump
              </div>
              <div className="space-y-1">
                {[
                  { label: "My Progress", path: "/progress" },
                  { label: "Rewards", path: "/rewards" },
                  { label: "Practice", path: "/practice" },
                  { label: "Profile", path: "/profile" },
                ].map((item) => (
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
      </div>
    </AppLayout>
  );
}
