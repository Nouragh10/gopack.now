import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, User } from "lucide-react";

const LEARNERS = [
  { name: "Alex", grade: "4th Grade", color: "bg-violet-400", initial: "A" },
  { name: "Maya", grade: "2nd Grade", color: "bg-sky-400", initial: "M" },
];

export default function WhoseTurn() {
  const [, setLocation] = useLocation();

  const handleSelect = (name: string) => {
    localStorage.setItem("multimind_player_name", name);
    setLocation("/hub");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-foreground mb-1 text-center">
          Whose Turn Is It?
        </h1>
        <p className="text-muted-foreground font-medium text-center mb-8">
          Choose a learner to continue
        </p>

        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-4 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <span className="font-extrabold text-foreground">Choose a learner</span>
            <button className="flex items-center gap-1.5 text-primary text-sm font-bold hover:underline">
              <Plus className="w-4 h-4" />
              Add Child
            </button>
          </div>

          <div className="flex gap-4 justify-center">
            {LEARNERS.map((learner) => (
              <button
                key={learner.name}
                onClick={() => handleSelect(learner.name)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl border-2 border-border bg-background hover:border-primary hover:shadow-md transition-all hover:-translate-y-1 w-32 group focus:outline-none"
              >
                <div className={`w-16 h-16 rounded-full ${learner.color} flex items-center justify-center text-white text-2xl font-extrabold shadow-md group-hover:scale-105 transition-transform`}>
                  {learner.initial}
                </div>
                <div>
                  <div className="font-extrabold text-foreground text-sm">{learner.name}</div>
                  <div className="text-xs text-muted-foreground font-medium">{learner.grade}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-muted/60 border-2 border-border rounded-3xl p-6 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mb-3">
            <User className="w-7 h-7 text-amber-600" />
          </div>
          <div className="font-extrabold text-foreground mb-1">Guest Mode</div>
          <div className="text-sm text-muted-foreground font-medium mb-4">
            Try one problem. No sign in. Nothing saved.
          </div>
          <Button
            variant="outline"
            onClick={() => setLocation("/hub")}
            className="rounded-full px-6 font-bold border-2"
          >
            Continue as Guest
          </Button>
        </div>

        <div className="mt-6 text-center">
          <Link href="/grownup-check">
            <button className="text-sm text-muted-foreground font-medium hover:text-primary hover:underline">
              Parent / Grown-up access
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
