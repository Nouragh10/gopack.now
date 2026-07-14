import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music, Music2, Type, Users, ChevronRight, Pencil } from "lucide-react";

const AVATARS = [
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "dog", emoji: "🐶", label: "Dog" },
  { id: "fox", emoji: "🦊", label: "Fox" },
  { id: "rabbit", emoji: "🐰", label: "Rabbit" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "owl", emoji: "🦉", label: "Owl" },
];

export default function Profile() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState(localStorage.getItem("multimind_player_name") || "Explorer");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [avatar, setAvatar] = useState("cat");
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [largeText, setLargeText] = useState(false);
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";

  const saveName = () => {
    const n = tempName.trim() || "Explorer";
    setName(n);
    localStorage.setItem("multimind_player_name", n);
    setEditingName(false);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-2">My Profile</h1>
          <p className="text-muted-foreground font-medium">Customize your adventure!</p>
        </div>

        {/* Profile Card */}
        <div className="bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-border rounded-3xl p-6 mb-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative">
            <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-5xl border-4 border-primary/30">
              {AVATARS.find((a) => a.id === avatar)?.emoji}
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            {editingName ? (
              <div className="flex items-center gap-2 mb-2">
                <input
                  data-testid="input-player-name"
                  autoFocus
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  className="text-2xl font-extrabold bg-transparent border-b-2 border-primary outline-none w-full max-w-[200px]"
                />
                <Button data-testid="btn-save-name" onClick={saveName} size="sm" className="rounded-full">Save</Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
                <h2 className="text-2xl font-extrabold text-foreground">{name}</h2>
                <button
                  data-testid="btn-edit-name"
                  onClick={() => { setTempName(name); setEditingName(true); }}
                  className="w-7 h-7 bg-muted rounded-full flex items-center justify-center hover:bg-primary/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            )}
            <div className="text-sm text-muted-foreground font-medium">Level 5 Math Explorer</div>
            <div className="flex items-center gap-4 mt-2 justify-center sm:justify-start">
              <div className="text-sm font-bold"><span className="text-primary">1,240</span> XP</div>
              <div className="text-sm font-bold"><span className="text-orange-500">7</span> 🔥 streak</div>
              <div className="text-sm font-bold"><span className="text-foreground">12</span> badges</div>
            </div>
          </div>
        </div>

        {/* Avatar Picker */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-5 shadow-sm">
          <h3 className="font-extrabold text-lg text-foreground mb-4">Choose Avatar</h3>
          <div className="grid grid-cols-6 gap-3">
            {AVATARS.map((a) => (
              <button
                key={a.id}
                data-testid={`avatar-${a.id}`}
                onClick={() => setAvatar(a.id)}
                className={`aspect-square rounded-2xl text-2xl flex items-center justify-center transition-all border-2 ${
                  avatar === a.id
                    ? "border-primary bg-primary/10 scale-110 shadow-md"
                    : "border-transparent bg-muted hover:bg-muted/70"
                }`}
              >
                {a.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Guide */}
        <div
          className="bg-card border-2 border-border rounded-3xl p-5 mb-5 shadow-sm flex items-center gap-4 cursor-pointer hover:border-primary transition-colors"
          onClick={() => setLocation("/choose-guide")}
          data-testid="btn-change-guide"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
            🤖
          </div>
          <div className="flex-1">
            <div className="font-extrabold text-foreground">My Guide</div>
            <div className="text-sm text-muted-foreground font-medium">{guide} is your guide</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Settings */}
        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-5 shadow-sm space-y-4">
          <h3 className="font-extrabold text-lg text-foreground">Settings</h3>
          {[
            { label: "Sound Effects", icon: soundOn ? Volume2 : VolumeX, on: soundOn, toggle: () => setSoundOn(!soundOn), testId: "toggle-sound" },
            { label: "Background Music", icon: musicOn ? Music : Music2, on: musicOn, toggle: () => setMusicOn(!musicOn), testId: "toggle-music" },
            { label: "Large Text", icon: Type, on: largeText, toggle: () => setLargeText(!largeText), testId: "toggle-large-text" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-4">
              <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center">
                <s.icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 font-bold text-foreground">{s.label}</div>
              <button
                data-testid={s.testId}
                onClick={s.toggle}
                className={`w-12 h-6 rounded-full transition-all relative ${s.on ? "bg-primary" : "bg-muted"}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${s.on ? "left-6" : "left-0.5"}`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Switch Player */}
        <Button
          data-testid="btn-switch-player"
          variant="outline"
          onClick={() => setLocation("/whose-turn")}
          className="w-full rounded-2xl h-14 font-bold border-2 gap-3 text-base"
        >
          <Users className="w-5 h-5" />
          Switch Player
        </Button>
      </div>
    </AppLayout>
  );
}
