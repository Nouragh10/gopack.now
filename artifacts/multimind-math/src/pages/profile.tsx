import { useState } from "react";
import { useLocation } from "wouter";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Music, Music2, Type, Users, ChevronRight, Pencil, Flame, Star } from "lucide-react";
import { MascotByName, GUIDE_CONFIG } from "@/components/mascots/MascotSVG";

const AVATAR_COLORS = [
  { id: "violet", label: "Violet", bg: "bg-violet-400" },
  { id: "sky",    label: "Sky",    bg: "bg-sky-400" },
  { id: "green",  label: "Green",  bg: "bg-green-400" },
  { id: "amber",  label: "Amber",  bg: "bg-amber-400" },
  { id: "pink",   label: "Pink",   bg: "bg-pink-400" },
  { id: "orange", label: "Orange", bg: "bg-orange-400" },
];

export default function Profile() {
  const [, setLocation] = useLocation();
  const [name, setName] = useState(localStorage.getItem("multimind_player_name") || "Explorer");
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState(name);
  const [avatar, setAvatar] = useState("violet");
  const [soundOn, setSoundOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [largeText, setLargeText] = useState(false);
  const guide = localStorage.getItem("multimind_guide") || "Ziggy";
  const guideCfg = GUIDE_CONFIG.find(g => g.name === guide) ?? GUIDE_CONFIG[0];
  const avatarColor = AVATAR_COLORS.find(a => a.id === avatar) ?? AVATAR_COLORS[0];

  const saveName = () => {
    const n = tempName.trim() || "Explorer";
    setName(n);
    localStorage.setItem("multimind_player_name", n);
    setEditingName(false);
  };

  return (
    <AppLayout>
      <div className="p-6 md:p-8 max-w-2xl mx-auto">
        <div className="mb-6">
          <div className="text-xs font-extrabold text-primary uppercase tracking-wider mb-1">Profile</div>
          <h1 className="text-3xl font-extrabold text-foreground mb-1">Avatar &amp; Profile</h1>
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-6 mb-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex flex-col items-center gap-2">
              <div className={`w-24 h-24 ${avatarColor.bg} rounded-full flex items-center justify-center text-white text-3xl font-extrabold border-4 border-white shadow-lg`}>
                {name[0]?.toUpperCase() ?? "E"}
              </div>
              <button
                onClick={() => {}}
                className="text-xs font-extrabold text-primary hover:underline"
              >
                Change Avatar
              </button>
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
              <div className="text-sm text-muted-foreground font-medium mb-3">Level 5 Math Explorer</div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-muted rounded-xl p-2 text-center">
                  <div className="font-extrabold text-foreground text-sm">183</div>
                  <div className="text-[10px] font-bold text-muted-foreground">Problems</div>
                </div>
                <div className="bg-muted rounded-xl p-2 text-center">
                  <div className="font-extrabold text-foreground text-sm">46</div>
                  <div className="text-[10px] font-bold text-muted-foreground">Lessons</div>
                </div>
                <div className="bg-muted rounded-xl p-2 text-center">
                  <div className="font-extrabold text-foreground text-sm">720</div>
                  <div className="text-[10px] font-bold text-muted-foreground">Stars</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-5 mb-4 shadow-sm">
          <h3 className="font-extrabold text-base text-foreground mb-3">Choose Color</h3>
          <div className="flex gap-2.5 flex-wrap">
            {AVATAR_COLORS.map((a) => (
              <button
                key={a.id}
                data-testid={`avatar-${a.id}`}
                onClick={() => setAvatar(a.id)}
                className={`w-10 h-10 rounded-full ${a.bg} transition-all border-2 ${
                  avatar === a.id ? "border-foreground scale-110 shadow-md" : "border-transparent"
                }`}
              />
            ))}
          </div>
        </div>

        <div
          className={`bg-card border-2 rounded-3xl p-4 mb-4 shadow-sm flex items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors ${guideCfg.border}`}
          onClick={() => setLocation("/choose-guide")}
          data-testid="btn-change-guide"
        >
          <MascotByName name={guide} size={48} />
          <div className="flex-1">
            <div className="font-extrabold text-foreground text-sm">My Guide</div>
            <div className={`text-xs font-bold ${guideCfg.textColor}`}>{guide} — {guideCfg.personality}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="bg-card border-2 border-border rounded-3xl p-5 mb-4 shadow-sm">
          <h3 className="font-extrabold text-base text-foreground mb-4">Settings</h3>
          <div className="space-y-4">
            {[
              { label: "Sound Effects",      icon: soundOn  ? Volume2 : VolumeX, on: soundOn,    toggle: () => setSoundOn(!soundOn),    testId: "toggle-sound"     },
              { label: "Background Music",   icon: musicOn  ? Music   : Music2,  on: musicOn,    toggle: () => setMusicOn(!musicOn),    testId: "toggle-music"     },
              { label: "Large Text",         icon: Type,                          on: largeText,  toggle: () => setLargeText(!largeText),testId: "toggle-large-text" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 font-bold text-foreground text-sm">{s.label}</div>
                <button
                  data-testid={s.testId}
                  onClick={s.toggle}
                  className={`w-11 h-6 rounded-full transition-all relative flex-shrink-0 ${s.on ? "bg-primary" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${s.on ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <Button
          data-testid="btn-switch-player"
          variant="outline"
          onClick={() => setLocation("/whose-turn")}
          className="w-full rounded-2xl h-13 font-bold border-2 gap-3 text-sm"
        >
          <Users className="w-5 h-5" />
          Switch Player
        </Button>
      </div>
    </AppLayout>
  );
}
