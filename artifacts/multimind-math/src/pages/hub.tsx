import React from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/layout/AppLayout";
import { Star, Flame, ArrowRight, PlayCircle } from "lucide-react";

export default function Hub() {
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const name = localStorage.getItem("multimind_player_name") || "Explorer";

  return (
    <AppLayout>
      <div className="p-6 md:p-10">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-2">
              Hi, {name}! 👋
            </h1>
            <p className="text-lg text-muted-foreground font-medium">Ready for some math magic?</p>
          </div>
          <div className="flex items-center gap-4 bg-card border-2 border-border rounded-2xl p-3 px-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Flame className="text-orange-500 fill-orange-500 w-6 h-6" />
              <span className="font-bold text-lg">3</span>
            </div>
            <div className="w-px h-6 bg-border"></div>
            <div className="flex items-center gap-2">
              <Star className="text-accent fill-accent w-6 h-6" />
              <span className="font-bold text-lg">120</span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-gradient-to-br from-primary to-primary/80 rounded-3xl p-8 text-primary-foreground shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="relative z-10">
              <div className="inline-block px-3 py-1 bg-white/20 rounded-lg text-sm font-bold mb-4 backdrop-blur-sm">
                Next Up
              </div>
              <h2 className="text-3xl font-extrabold mb-2">Visual Addition</h2>
              <p className="text-primary-foreground/80 mb-8 max-w-sm">
                Let's use blocks and dots to understand how numbers combine!
              </p>
              <Link href="/learn/visual">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 rounded-full px-8 text-lg font-bold shadow-md hover:-translate-y-1 transition-all group">
                  <PlayCircle className="mr-2 w-6 h-6 group-hover:scale-110 transition-transform" />
                  Jump In
                </Button>
              </Link>
            </div>
          </div>

          <div className="bg-card rounded-3xl border-2 border-border p-6 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center text-4xl mb-4">
              {/* Placeholder for guide mascot SVG */}
              {guide[0]}
            </div>
            <h3 className="text-xl font-bold mb-2">{guide}'s Tip</h3>
            <p className="text-sm text-muted-foreground italic bg-muted p-4 rounded-2xl w-full">
              "Remember, making mistakes is how your brain grows stronger!"
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold mt-12 mb-6">Quick Jump</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { title: "Number Line", icon: "📏", color: "bg-blue-100 text-blue-700", path: "/learn/numberline" },
            { title: "Shape Sorter", icon: "⭐", color: "bg-purple-100 text-purple-700", path: "/practice" },
            { title: "My Badges", icon: "🎖️", color: "bg-orange-100 text-orange-700", path: "/rewards" },
            { title: "Daily Quest", icon: "🚀", color: "bg-green-100 text-green-700", path: "/practice" }
          ].map((item, i) => (
            <Link key={i} href={item.path}>
              <div className="bg-card border-2 border-border rounded-2xl p-5 hover:border-primary hover:shadow-md transition-all cursor-pointer group flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3 ${item.color} group-hover:scale-110 transition-transform`}>
                  {item.icon}
                </div>
                <div className="font-bold text-sm">{item.title}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
