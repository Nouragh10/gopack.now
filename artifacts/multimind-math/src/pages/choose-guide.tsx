import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { MascotByName, GUIDE_CONFIG } from "@/components/mascots/MascotSVG";
import { useAuth } from "@/contexts/AuthContext";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";

export default function ChooseGuide() {
  const [, setLocation] = useLocation();
  const [selected, setSelected] = useState<string | null>(null);
  const { user } = useAuth();

  const handleContinue = async () => {
    if (!selected) return;
    localStorage.setItem("multimind_guide", selected);
    if (user && !user.isAnonymous) {
      await update(ref(db, `multimind/users/${user.uid}/profile`), { guide: selected });
    }
    setLocation("/hub");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-10 px-4 font-sans">
      <div className="w-full max-w-5xl">
        <div className="mb-2 inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-extrabold uppercase tracking-wider">
          Step 1 of 2
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">
          Choose Your Guide
        </h1>
        <p className="text-muted-foreground font-medium mb-8 max-w-xl">
          Pick a guide. Your whole experience will change to match their vibe!
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {GUIDE_CONFIG.map((guide) => {
            const isSelected = selected === guide.name;
            return (
              <button
                key={guide.name}
                onClick={() => setSelected(guide.name)}
                className={`relative flex flex-col items-center p-4 rounded-3xl border-2 transition-all hover:-translate-y-1 hover:shadow-lg focus:outline-none ${
                  isSelected
                    ? `${guide.border} ${guide.bgLight} shadow-lg -translate-y-1`
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
                <MascotByName name={guide.name} size={80} />
                <div className="mt-2 font-extrabold text-foreground text-sm">{guide.name}</div>
                <div className={`text-xs font-semibold mt-0.5 text-center leading-tight ${guide.textColor}`}>
                  {guide.personality}
                </div>
              </button>
            );
          })}
        </div>

        {selected && (
          <div className="mb-8 p-4 bg-card border-2 border-border rounded-2xl flex items-center gap-4">
            <span className="text-sm font-bold text-muted-foreground">Preview your theme</span>
            <div className="flex gap-2">
              {GUIDE_CONFIG.map((g) => (
                <div
                  key={g.name}
                  className={`w-5 h-5 rounded-full ${g.dot} transition-all ${g.name === selected ? "scale-125 ring-2 ring-offset-1 ring-foreground/30" : "opacity-40"}`}
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-4">
          <Button
            size="lg"
            onClick={handleContinue}
            disabled={!selected}
            className="rounded-full px-10 text-lg font-extrabold h-14 shadow-lg disabled:opacity-40"
          >
            Continue with {selected ?? "a guide"}
          </Button>
          {!selected && (
            <span className="text-sm text-muted-foreground font-medium">Pick one to continue</span>
          )}
        </div>
      </div>
    </div>
  );
}
