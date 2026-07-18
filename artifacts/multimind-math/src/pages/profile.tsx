import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music, Music2, Type, Users, ChevronRight, Pencil, Flame, Star } from "lucide-react";
import { MascotByName, GUIDE_CONFIG } from "@/components/mascots/MascotSVG";
import { useAuth } from "@/contexts/AuthContext";
import { useProgress } from "@/contexts/ProgressContext";
import { ref, update } from "firebase/database";
import { db } from "@/lib/firebase";

const AVATAR_COLORS = ["bg-purple-500", "bg-blue-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"];

export default function Profile() {
  const [, setLocation] = useLocation();
  const { user, signOut } = useAuth();
  const { progress } = useProgress();

  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const guideCfg = GUIDE_CONFIG.find((g) => g.name === guide) ?? GUIDE_CONFIG[0];

  const defaultName = user?.isAnonymous ? "Guest" : (user?.displayName ?? "Learner");
  const [displayName, setDisplayName] = useState(() => localStorage.getItem("mm_displayName") ?? defaultName);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  const [avatarColor, setAvatarColor] = useState(() => localStorage.getItem("mm_avatarColor") ?? AVATAR_COLORS[0]);
  const [soundEffects, setSoundEffects] = useState(true);
  const [bgMusic, setBgMusic] = useState(false);
  const [largeText, setLargeText] = useState(false);

  const initial = displayName[0]?.toUpperCase() ?? "?";

  const saveName = async () => {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setDisplayName(trimmed);
    localStorage.setItem("mm_displayName", trimmed);
    setEditingName(false);
    if (user && !user.isAnonymous) {
      await update(ref(db, `multimind/users/${user.uid}/profile`), { displayName: trimmed });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/login");
  };

  return (
    <AppLayout>
      <div className="p-5 md:p-8 max-w-xl">
        <div className="text-xs font-extrabold text-primary uppercase tracking-wider mb-1">Settings & Stats</div>
        <h1 className="text-2xl font-extrabold mb-5">My Profile</h1>

        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-4 shadow-sm">
          <div className="flex items-center gap-4 mb-5">
            {user?.photoURL && !user.isAnonymous ? (
              <img src={user.photoURL} className="w-16 h-16 rounded-2xl object-cover" alt="avatar" />
            ) : (
              <div className={`w-16 h-16 rounded-2xl ${avatarColor} flex items-center justify-center`}>
                <span className="text-2xl font-extrabold text-white">{initial}</span>
              </div>
            )}
            <div className="flex-1">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    className="text-lg font-extrabold bg-background border-2 border-primary rounded-xl px-3 py-1 outline-none w-full"
                    autoFocus
                  />
                  <Button size="sm" onClick={saveName} className="rounded-xl shrink-0">Save</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold text-foreground">{displayName}</span>
                  <button onClick={() => { setNameInput(displayName); setEditingName(true); }}
                    className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>
              )}
              {user?.email && !user.isAnonymous && (
                <div className="text-xs text-muted-foreground font-medium mt-0.5">{user.email}</div>
              )}
              {user?.isAnonymous && (
                <div className="text-xs text-muted-foreground font-medium mt-0.5">Guest account</div>
              )}
            </div>
          </div>

          {!user?.photoURL && (
            <div className="mb-4">
              <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-2">Avatar Color</div>
              <div className="flex gap-2">
                {AVATAR_COLORS.map((c) => (
                  <button key={c} onClick={() => { setAvatarColor(c); localStorage.setItem("mm_avatarColor", c); }}
                    className={`w-7 h-7 rounded-full ${c} transition-all ${avatarColor === c ? "scale-125 ring-2 ring-offset-1 ring-foreground/30" : ""}`} />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 py-4 border-y border-border">
            <div className="text-center">
              <div className="text-xl font-extrabold text-foreground">{progress?.totalProblems ?? 0}</div>
              <div className="text-xs font-bold text-muted-foreground">Problems</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-foreground flex items-center justify-center gap-1">
                <Flame className="w-4 h-4 text-orange-500" />{progress?.streakDays ?? 0}
              </div>
              <div className="text-xs font-bold text-muted-foreground">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-extrabold text-foreground flex items-center justify-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />{progress?.xp ?? 0}
              </div>
              <div className="text-xs font-bold text-muted-foreground">Stars</div>
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-4 mb-4">
          <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-3">Your Guide</div>
          <button onClick={() => setLocation("/choose-guide")}
            className="w-full flex items-center gap-3 hover:bg-muted p-2 rounded-xl transition-colors">
            <MascotByName name={guide} size={40} />
            <div className="text-left">
              <div className="font-bold text-sm text-foreground">{guide}</div>
              <div className={`text-xs font-medium ${guideCfg.textColor}`}>{guideCfg.personality}</div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
          </button>
        </div>

        <div className="bg-card border-2 border-border rounded-2xl p-4 mb-4">
          <div className="text-xs font-extrabold text-muted-foreground uppercase tracking-wider mb-3">Settings</div>
          <div className="space-y-3">
            {[
              { icon: soundEffects ? Volume2 : VolumeX, label: "Sound Effects", value: soundEffects, set: setSoundEffects },
              { icon: bgMusic ? Music : Music2, label: "Background Music", value: bgMusic, set: setBgMusic },
              { icon: Type, label: "Large Text", value: largeText, set: setLargeText },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-bold text-foreground">{s.label}</span>
                  </div>
                  <button onClick={() => s.set(!s.value)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${s.value ? "bg-primary" : "bg-muted"}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${s.value ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Button variant="outline" onClick={() => setLocation("/whose-turn")}
            className="w-full rounded-full border-2 font-bold gap-2 h-12">
            <Users className="w-4 h-4" /> Switch Player
          </Button>
          <Button variant="outline" onClick={handleSignOut}
            className="w-full rounded-full border-2 font-bold text-destructive border-destructive/30 hover:bg-destructive/10 h-12">
            Sign Out
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
