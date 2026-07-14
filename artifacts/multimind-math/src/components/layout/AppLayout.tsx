import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  BookOpen, 
  Target, 
  Gamepad2, 
  TrendingUp, 
  Trophy, 
  User 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { name: "Home", icon: Home, path: "/hub" },
    { name: "Learn", icon: BookOpen, path: "/learn/visual" },
    { name: "Practice", icon: Target, path: "/practice" },
    { name: "Games", icon: Gamepad2, path: "/practice?tab=games" }, // or just keep it simple
    { name: "Progress", icon: TrendingUp, path: "/progress" },
    { name: "Rewards", icon: Trophy, path: "/rewards" },
    { name: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground font-sans">
      <aside className="w-full md:w-64 bg-card border-r border-border p-6 hidden md:flex flex-col gap-2">
        <Link href="/hub">
          <div className="text-2xl font-extrabold mb-8 text-primary cursor-pointer flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-accent text-accent-foreground flex items-center justify-center text-xl shadow-sm rotate-3">
              +
            </div>
            MultiMind
          </div>
        </Link>
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + '/');
            return (
              <Link key={item.name} href={item.path}>
                <div 
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold cursor-pointer transition-all",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-md -translate-y-0.5" 
                      : "text-muted-foreground hover:bg-muted hover:text-foreground hover:-translate-y-0.5"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive ? "text-accent" : "")} />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 w-full max-w-6xl mx-auto overflow-y-auto pb-24 md:pb-0">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-3 z-50 pb-safe">
        {navItems.filter(i => ["Home", "Learn", "Practice", "Rewards"].includes(i.name)).map((item) => {
          const isActive = location === item.path || location.startsWith(item.path + '/');
          return (
            <Link key={item.name} href={item.path}>
              <div className={cn(
                "flex flex-col items-center p-2 rounded-xl",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className={cn("w-6 h-6 mb-1", isActive ? "fill-primary/20" : "")} />
                <span className="text-[10px] font-bold">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
