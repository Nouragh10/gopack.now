import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function ChooseGuide() {
  const [, setLocation] = useLocation();

  const handleSelect = (guide: string) => {
    localStorage.setItem("multimind_guide", guide);
    setLocation("/whose-turn");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-12 px-6">
      <h1 className="text-4xl font-bold text-center mb-8">Choose Your Guide!</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl w-full">
        {/* Simplified mock items */}
        {["Ziggy", "Pip", "Nova", "Bramble", "Echo", "Luna"].map(name => (
          <div 
            key={name} 
            onClick={() => handleSelect(name)}
            className="p-6 bg-card rounded-3xl shadow-sm border-2 border-border hover:border-primary cursor-pointer hover:shadow-md transition-all text-center"
          >
            <div className="w-24 h-24 mx-auto bg-muted rounded-full mb-4 flex items-center justify-center text-3xl">
              {name[0]}
            </div>
            <h3 className="text-2xl font-bold">{name}</h3>
          </div>
        ))}
      </div>
    </div>
  );
}
