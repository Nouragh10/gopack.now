import React from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import heroIllustration from "../assets/hero-illustration.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center overflow-x-hidden font-sans">
      <header className="w-full max-w-5xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="text-2xl font-bold text-primary flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-accent text-accent-foreground flex items-center justify-center text-xl shadow-sm rotate-3">
            +
          </div>
          MultiMind Math
        </div>
        <Link href="/whose-turn">
          <Button variant="secondary" className="rounded-full px-6 font-semibold border-2 border-primary/10 hover:border-primary/30 transition-all text-primary hover:bg-primary/5">
            Log In
          </Button>
        </Link>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 md:py-24 flex flex-col md:flex-row items-center gap-12 z-10">
        <div className="flex-1 text-center md:text-left space-y-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-accent/20 text-accent-foreground font-bold text-sm border-2 border-accent/30 rotate-1">
            ⭐ For ages 5–10
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-foreground tracking-tight leading-[1.1]">
            Math is a <span className="text-primary relative inline-block">
              magic
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-accent" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0,5 Q50,15 100,5" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
              </svg>
            </span><br/> adventure!
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl mx-auto md:mx-0 font-medium">
            Join your own animated guide friend in a joyful classroom where every mistake is just a step towards learning.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
            <Link href="/choose-guide">
              <Button size="lg" className="h-16 px-10 text-xl rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                Start Learning Now!
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md relative">
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-full blur-3xl -z-10"></div>
          <img src={heroIllustration} alt="Cartoon kids doing math in a magical classroom" className="w-full h-auto rounded-[2rem] shadow-xl border-4 border-white/50 rotate-[-2deg] hover:rotate-0 transition-transform duration-500" />
        </div>
      </main>
    </div>
  );
}
