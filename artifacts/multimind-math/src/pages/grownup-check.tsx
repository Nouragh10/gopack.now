import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function GrownUpCheck() {
  const [, setLocation] = useLocation();
  const [answer, setAnswer] = useState("");
  const [isError, setIsError] = useState(false);

  const target = 56; // 7 * 8

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
      <div className="max-w-md w-full bg-card rounded-[2.5rem] shadow-xl border border-border p-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
        
        <h1 className="text-3xl font-extrabold mb-2">Grown-Up Check</h1>
        <p className="text-muted-foreground mb-8">Please solve this to access settings</p>

        <div className="bg-muted py-6 px-4 rounded-3xl mb-8">
          <div className="text-4xl font-black mb-4">7 &times; 8 = ?</div>
          <div className={`h-16 w-32 mx-auto bg-background rounded-2xl border-2 flex items-center justify-center text-3xl font-bold transition-all ${isError ? 'border-destructive text-destructive animate-shake' : answer ? 'border-primary text-primary' : 'border-border text-muted-foreground'}`}>
            {answer || "?"}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <Button 
              key={num} 
              variant="outline" 
              className="h-16 text-2xl font-bold rounded-2xl hover:bg-primary/10 hover:text-primary hover:border-primary/30"
              onClick={() => handleKeyPress(num.toString())}
            >
              {num}
            </Button>
          ))}
          <Button 
            variant="outline" 
            className="h-16 text-xl font-bold rounded-2xl bg-muted/50"
            onClick={handleDelete}
          >
            ⌫
          </Button>
          <Button 
            variant="outline" 
            className="h-16 text-2xl font-bold rounded-2xl hover:bg-primary/10 hover:text-primary hover:border-primary/30"
            onClick={() => handleKeyPress("0")}
          >
            0
          </Button>
          <Button 
            className="h-16 text-xl font-bold rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSubmit}
          >
            Go
          </Button>
        </div>
        
        <Button variant="ghost" onClick={() => setLocation("/whose-turn")} className="text-muted-foreground">
          Cancel
        </Button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 0s 2;
        }
      `}} />
    </div>
  );
}
