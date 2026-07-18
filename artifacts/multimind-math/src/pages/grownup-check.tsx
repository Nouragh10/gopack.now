import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

export default function GrownUpCheck() {
  const [, setLocation] = useLocation();
  const [answer, setAnswer] = useState("");
  const [isError, setIsError] = useState(false);

  const question = "7 × 6 − 12 = ?";
  const target = 30;

  const handleKeyPress = (num: string) => {
    if (answer.length < 3) {
      setAnswer(prev => prev + num);
      setIsError(false);
    }
  };

  const handleDelete = () => {
    setAnswer(prev => prev.slice(0, -1));
    setIsError(false);
  };

  const handleSubmit = () => {
    if (parseInt(answer) === target) {
      setLocation("/parent");
    } else {
      setIsError(true);
      setAnswer("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-sm w-full bg-card rounded-[2.5rem] shadow-xl border border-border p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary rounded-t-[2.5rem]"></div>

        <div className="mb-2">
          <div className="text-xs font-extrabold text-primary uppercase tracking-wider mb-2">Parent Sign-in Gate</div>
          <h1 className="text-2xl font-extrabold mb-1">Grown-Up Check</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Solve this to make sure you're a grown-up!
          </p>
        </div>

        <div className="bg-muted py-6 px-4 rounded-3xl my-6">
          <div className="text-3xl font-black mb-4 text-foreground">{question}</div>
          <div
            className={`h-14 w-28 mx-auto bg-background rounded-2xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${
              isError
                ? "border-destructive text-destructive"
                : answer
                ? "border-primary text-primary"
                : "border-border text-muted-foreground"
            } ${isError ? "animate-shake" : ""}`}
          >
            {answer || "?"}
          </div>
          {isError && (
            <p className="text-xs font-bold text-destructive mt-2">Try again!</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <Button
              key={num}
              variant="outline"
              className="h-14 text-xl font-bold rounded-2xl hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              onClick={() => handleKeyPress(num.toString())}
            >
              {num}
            </Button>
          ))}
          <Button
            variant="outline"
            className="h-14 font-bold rounded-2xl bg-muted/50 flex items-center justify-center gap-1"
            onClick={handleDelete}
          >
            <Delete className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            className="h-14 text-xl font-bold rounded-2xl hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            onClick={() => handleKeyPress("0")}
          >
            0
          </Button>
          <Button
            className="h-14 text-base font-extrabold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSubmit}
          >
            Go
          </Button>
        </div>

        <Button variant="ghost" onClick={() => setLocation("/whose-turn")} className="text-muted-foreground text-sm w-full">
          Cancel
        </Button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake { animation: shake 0.2s ease-in-out 0s 2; }
      `}} />
    </div>
  );
}
