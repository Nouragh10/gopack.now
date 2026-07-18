import React, { createContext, useContext, useState, useCallback } from "react";
import type { ParsedQuestion } from "@/lib/parseQuestion";

export type { ParsedQuestion };

export interface AISuggestion {
  approach: string;
  reason: string;
  mascotMessage: string;
  tips: string[];
}

interface QuestionContextType {
  question: ParsedQuestion | null;
  setQuestion: (q: ParsedQuestion) => void;
  suggestion: AISuggestion | null;
  suggestionLoading: boolean;
  suggestionError: string | null;
  selectedApproach: string | null;
  setSelectedApproach: (a: string) => void;
  fetchSuggestion: (questionText: string, mascot: string, personality: string) => Promise<void>;
  clearQuestion: () => void;
}

const QuestionContext = createContext<QuestionContextType | null>(null);

function loadFromStorage<T>(key: string): T | null {
  try { return JSON.parse(localStorage.getItem(key) ?? "null"); }
  catch { return null; }
}

export function QuestionProvider({ children }: { children: React.ReactNode }) {
  const [question, setQuestionState] = useState<ParsedQuestion | null>(
    () => loadFromStorage("mm_question")
  );
  const [suggestion, setSuggestionState] = useState<AISuggestion | null>(
    () => loadFromStorage("mm_suggestion")
  );
  const [selectedApproach, setSelectedApproachState] = useState<string | null>(
    () => localStorage.getItem("mm_approach")
  );
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const setQuestion = useCallback((q: ParsedQuestion) => {
    setQuestionState(q);
    setSuggestionState(null);
    setSelectedApproachState(null);
    localStorage.setItem("mm_question", JSON.stringify(q));
    localStorage.removeItem("mm_suggestion");
    localStorage.removeItem("mm_approach");
  }, []);

  const setSelectedApproach = useCallback((a: string) => {
    setSelectedApproachState(a);
    localStorage.setItem("mm_approach", a);
  }, []);

  const fetchSuggestion = useCallback(async (questionText: string, mascot: string, personality: string) => {
    setSuggestionLoading(true);
    setSuggestionError(null);
    try {
      const res = await fetch("/api/ai/multimind/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: questionText, mascot, personality }),
      });
      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data: AISuggestion = await res.json();
      setSuggestionState(data);
      localStorage.setItem("mm_suggestion", JSON.stringify(data));
      setSelectedApproachState(data.approach);
      localStorage.setItem("mm_approach", data.approach);
    } catch (e) {
      setSuggestionError(e instanceof Error ? e.message : "Could not reach the server");
    } finally {
      setSuggestionLoading(false);
    }
  }, []);

  const clearQuestion = useCallback(() => {
    setQuestionState(null);
    setSuggestionState(null);
    setSelectedApproachState(null);
    localStorage.removeItem("mm_question");
    localStorage.removeItem("mm_suggestion");
    localStorage.removeItem("mm_approach");
  }, []);

  return (
    <QuestionContext.Provider value={{
      question, setQuestion,
      suggestion, suggestionLoading, suggestionError,
      selectedApproach, setSelectedApproach,
      fetchSuggestion, clearQuestion,
    }}>
      {children}
    </QuestionContext.Provider>
  );
}

export function useQuestion() {
  const ctx = useContext(QuestionContext);
  if (!ctx) throw new Error("useQuestion must be inside QuestionProvider");
  return ctx;
}
