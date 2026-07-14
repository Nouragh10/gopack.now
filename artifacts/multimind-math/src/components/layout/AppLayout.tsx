import React from "react";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  BookOpen, 
  Target, 
  TrendingUp, 
  Trophy, 
  User,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { MascotByName } from "@/components/mascots/MascotSVG";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const displayName = localStorage.getItem("mm_displayName") ?? (user?.displayName ?? "Learner");

  const navItems = [
    { name: "Home",     icon: Home,      path: "/hub" },
    { name: "Learn",    icon: BookOpen,  path: "/learn/visual" },
    { name: "Practice", icon: Target,    path: "/practice" },
    { name: "Progress", icon: TrendingUp,path: "/progress" },
    { name: "Rewards",  icon: Trophy,    path: "/rewards" },
    { name: "Profile",  icon: User,      path: "/profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground font-sans">
      <aside className="w-full md:w-64 bg-card border-r border-border p-5 hidden md:flex flex-col gap-2">
        <Link href="/hub">
          <div className="text-xl font-extrabold mb-6 text-primary cursor-pointer flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-black text-primary">
              +
            </div>
            MultiMind Math
          </div>
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + "/");
            return (
              <Link key={item.name} href={item.path}>
                <div className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl font-bold cursor-pointer transition-all text-sm",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex items-center gap-3 px-2">
            {user?.photoURL ? (
              <img src={user.photoURL} className="w-8 h-8 rounded-xl object-cover flex-shrink-0" alt="avatar" />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-extrabold text-primary">{displayName[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-extrabold text-foreground truncate">{displayName}</div>
              <div className="text-[10px] font-medium text-muted-foreground">
                {user?.isAnonymous ? "Guest" : "Signed in"}
              </div>
            </div>
            <MascotByName name={guide} size={24} />
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 w-full max-w-6xl mx-auto overflow-y-auto pb-20 md:pb-0">
        {children}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex justify-around p-2 z-50">
        {navItems.filter((i) => ["Home", "Learn", "Practice", "Rewards", "Profile"].includes(i.name)).map((item) => {
          const isActive = location === item.path || location.startsWith(item.path + "/");
          return (
            <Link key={item.name} href={item.path}>
              <div className={cn(
                "flex flex-col items-center px-3 py-1.5 rounded-xl",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold">{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
