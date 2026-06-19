import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, MapPin, Users, Sparkles } from "lucide-react";

const steps = [
  {
    number: "1",
    label: "Wish",
    desc: "Everyone drops their dream activities into the group wishlist",
  },
  {
    number: "2",
    label: "Vote",
    desc: "The group votes on what matters most — democracy with a passport",
  },
  {
    number: "3",
    label: "Go",
    desc: "AI builds the perfect itinerary from your collective imagination",
  },
];

const avatarColors = ["#E85D3A", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517"];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="font-display font-bold text-2xl tracking-tight">
          go<span className="text-primary">pack</span>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            data-testid="link-nav-login"
          >
            Sign in
          </Link>
          <Link
            href="/login"
            className="bg-foreground text-background text-sm font-medium px-5 py-2.5 rounded-full hover:bg-foreground/90 transition-colors"
            data-testid="link-nav-start"
          >
            Start planning
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 py-24 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm font-medium text-primary tracking-widest uppercase mb-6">
            Group travel, finally sorted
          </p>
          <h1 className="font-serif text-7xl md:text-8xl font-bold leading-[0.95] mb-8">
            Pack your bags.<br />
            <span className="text-primary">Pack your friends.</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-xl font-sans mb-10 leading-relaxed">
            Turn your group chat chaos into a real trip. Everyone wishes, everyone
            votes, and AI turns it all into a day-by-day plan.
          </p>

          <div className="flex items-center gap-4 flex-wrap">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-primary text-white font-medium px-8 py-4 rounded-full hover:bg-primary/90 transition-colors"
              data-testid="link-hero-start"
            >
              Create a trip
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-border font-medium px-8 py-4 rounded-full hover:bg-muted/50 transition-colors"
              data-testid="link-hero-join"
            >
              Join a trip
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-3 mt-10">
            <div className="flex -space-x-2">
              {avatarColors.map((color, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-background"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              Join thousands of groups planning smarter
            </span>
          </div>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="px-8 py-20 border-t border-border bg-muted/20">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase mb-3">
            How it works
          </p>
          <h2 className="font-serif text-5xl font-bold mb-16">
            Wish <span className="text-primary">&rarr;</span> Vote{" "}
            <span className="text-primary">&rarr;</span> Go
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="border border-border rounded-2xl p-8 bg-background"
                data-testid={`card-step-${i}`}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-display font-bold text-xl text-primary mb-5">
                  {step.number}
                </div>
                <h3 className="font-display font-bold text-2xl mb-3">
                  {step.label}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-20 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Users size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Real-time collaboration</h3>
              <p className="text-sm text-muted-foreground">Everyone sees wishes and votes update live</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">AI itineraries</h3>
              <p className="text-sm text-muted-foreground">Claude turns your wishes into a real day-by-day plan</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin size={18} className="text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">Smart packing lists</h3>
              <p className="text-sm text-muted-foreground">AI generates packing lists tailored to your destination and vibes</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-8 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="font-display font-bold text-lg">
            go<span className="text-primary">pack</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Wish &middot; Vote &middot; Go
          </p>
        </div>
      </footer>
    </div>
  );
}
