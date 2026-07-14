import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { ref, push, update, onValue } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

export interface ProgressData {
  totalProblems: number;
  correctProblems: number;
  streakDays: number;
  lastActiveDateStr: string;
  streakDates: Record<string, boolean>;
  xp: number;
  level: number;
}

export interface HistoryItem {
  id: string;
  question: string;
  approach: string;
  stars: number;
  timestamp: number;
}

interface ProgressContextType {
  progress: ProgressData | null;
  history: HistoryItem[];
  loading: boolean;
  recordCompletion: (question: string, approach: string, stars: number) => Promise<void>;
}

const ProgressContext = createContext<ProgressContextType | null>(null);

const DEFAULT_PROGRESS: ProgressData = {
  totalProblems: 0,
  correctProblems: 0,
  streakDays: 0,
  lastActiveDateStr: "",
  streakDates: {},
  xp: 0,
  level: 1,
};

function todayStr() {
  return new Date().toISOString().split("T")[0];
}
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}
function xpToLevel(xp: number) {
  return Math.floor(xp / 100) + 1;
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProgress(DEFAULT_PROGRESS);
      setHistory([]);
      setLoading(false);
      return;
    }

    const progRef = ref(db, `multimind/users/${user.uid}/progress`);
    const histRef = ref(db, `multimind/users/${user.uid}/history`);

    const unsubProg = onValue(progRef, (snap) => {
      setProgress(snap.val() ?? { ...DEFAULT_PROGRESS });
      setLoading(false);
    }, () => {
      setProgress({ ...DEFAULT_PROGRESS });
      setLoading(false);
    });

    const unsubHist = onValue(histRef, (snap) => {
      const val = snap.val();
      if (!val) { setHistory([]); return; }
      const items: HistoryItem[] = Object.entries(val)
        .map(([id, v]) => ({ id, ...(v as object) } as HistoryItem))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
      setHistory(items);
    }, () => setHistory([]));

    return () => { unsubProg(); unsubHist(); };
  }, [user]);

  const recordCompletion = useCallback(async (question: string, approach: string, stars: number) => {
    if (!user) return;
    const today = todayStr();
    const cur = progress ?? { ...DEFAULT_PROGRESS };
    const xpEarned = stars * 10 + 5;
    const newXp = cur.xp + xpEarned;

    const streakDates = { ...cur.streakDates, [today]: true };
    let streakDays = cur.streakDays;
    if (cur.lastActiveDateStr !== today) {
      streakDays = cur.lastActiveDateStr === yesterdayStr() ? streakDays + 1 : 1;
    }

    await update(ref(db, `multimind/users/${user.uid}/progress`), {
      totalProblems: cur.totalProblems + 1,
      correctProblems: cur.correctProblems + (stars >= 2 ? 1 : 0),
      xp: newXp,
      level: xpToLevel(newXp),
      streakDays,
      lastActiveDateStr: today,
      streakDates,
    });

    await push(ref(db, `multimind/users/${user.uid}/history`), {
      question,
      approach,
      stars,
      timestamp: Date.now(),
    });
  }, [user, progress]);

  return (
    <ProgressContext.Provider value={{ progress, history, loading, recordCompletion }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be inside ProgressProvider");
  return ctx;
}
