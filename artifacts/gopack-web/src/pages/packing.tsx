import { useEffect, useState, useCallback, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Loader2, Check, Download, Save, Cloud } from "lucide-react";
import { ref, onValue, set, get } from "firebase/database";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

const SECTIONS = [
  { key: "essentials", label: "Essentials", emoji: "🛂" },
  { key: "clothing", label: "Clothing", emoji: "👕" },
  { key: "toiletries", label: "Toiletries", emoji: "✨" },
  { key: "tech", label: "Tech", emoji: "📱" },
  { key: "activities", label: "Activity Gear", emoji: "🎒" },
  { key: "tips", label: "Pro Tips", emoji: "💡" },
];

async function saveCheckedToFirebase(tripId: string, uid: string, checked: Record<string, boolean>) {
  try {
    await set(ref(db, `trips/${tripId}/packingChecked/${uid}`), checked);
  } catch {
    // silently ignore permission errors
  }
}

async function loadCheckedFromFirebase(tripId: string, uid: string): Promise<Record<string, boolean>> {
  try {
    const snap = await get(ref(db, `trips/${tripId}/packingChecked/${uid}`));
    return snap.val() ?? {};
  } catch {
    return {};
  }
}

function downloadPackingList(trip: any, packingList: any, checked: Record<string, boolean>) {
  const lines: string[] = [];
  lines.push(`PACKING LIST — ${trip?.destination ?? "Trip"} (${trip?.days ?? "?"} days)`);
  lines.push("=".repeat(50));
  lines.push("");

  for (const section of SECTIONS) {
    const items: string[] = packingList[section.key] || [];
    if (items.length === 0) continue;
    lines.push(`${section.emoji} ${section.label.toUpperCase()}`);
    lines.push("-".repeat(30));
    items.forEach((item, i) => {
      const id = `${section.key}-${i}`;
      const done = checked[id] ? "[x]" : "[ ]";
      lines.push(`  ${done} ${item}`);
    });
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `packing-${(trip?.destination ?? "trip").toLowerCase().replace(/\s+/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Packing() {
  const [, params] = useRoute("/trip/:tripId/packing");
  const tripId = params?.tripId || "";
  const { user } = useAuth();
  const [packingList, setPackingList] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const checkedLoadedRef = useRef(false);

  useEffect(() => {
    if (!tripId) return;
    const tripRef = ref(db, `trips/${tripId}`);
    const unsub = onValue(tripRef, snap => {
      const data = snap.val();
      if (data) {
        setTrip(data);
        setPackingList(data.packingList || null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [tripId]);

  // Load per-user checked state from Firebase once
  useEffect(() => {
    if (!tripId || !user?.uid || checkedLoadedRef.current) return;
    checkedLoadedRef.current = true;
    loadCheckedFromFirebase(tripId, user.uid).then(saved => {
      setChecked(saved);
    });
  }, [tripId, user?.uid]);

  const persistChecked = useCallback((next: Record<string, boolean>) => {
    if (!tripId || !user?.uid) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      await saveCheckedToFirebase(tripId, user.uid, next);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 600);
  }, [tripId, user?.uid]);

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = { ...prev, [key]: !prev[key] };
      persistChecked(next);
      return next;
    });
  };

  const totalItems = packingList
    ? SECTIONS.flatMap(s => packingList[s.key] || []).length
    : 0;
  const checkedCount = Object.values(checked).filter(Boolean).length;
  const progress = totalItems > 0 ? (checkedCount / totalItems) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-4">
          <Link href={`/trip/${tripId}`} className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back">
            <ArrowLeft size={20} />
          </Link>
          <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
            go<span className="text-primary">pack</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {totalItems > 0 && (
            <span className="text-sm text-muted-foreground">
              {checkedCount} / {totalItems} packed
            </span>
          )}
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> Saving…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <Cloud size={12} /> Saved
            </span>
          )}
          {packingList && (
            <button
              onClick={() => downloadPackingList(trip, packingList, checked)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
            >
              <Download size={13} /> Download
            </button>
          )}
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {!packingList ? (
          <div className="text-center py-20 text-muted-foreground">
            <Package size={32} className="mx-auto mb-4 opacity-30" />
            <p className="font-medium mb-2">No packing list yet</p>
            <p className="text-sm mb-6">Go back to the trip hub and generate one.</p>
            <Link href={`/trip/${tripId}`} className="bg-primary text-white font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition-colors" data-testid="link-go-back">
              Back to trip
            </Link>
          </div>
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm text-muted-foreground mb-1">{trip?.destination}</p>
              <h1 className="font-serif text-4xl font-bold mb-1">Packing List</h1>
              <p className="text-muted-foreground text-sm mb-5">AI-curated for your {trip?.days}-day trip</p>

              {totalItems > 0 && (
                <div className="mb-8">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{checkedCount} of {totalItems} packed</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  {checkedCount === totalItems && totalItems > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 flex items-center gap-2 text-sm text-green-600 font-medium"
                    >
                      <Check size={16} /> All packed — you're ready to go! 🎉
                    </motion.div>
                  )}
                </div>
              )}
            </motion.div>

            <div className="flex flex-col gap-8">
              {SECTIONS.map((section, si) => {
                const items: string[] = packingList[section.key] || [];
                if (items.length === 0) return null;
                const sectionChecked = items.filter((_, i) => checked[`${section.key}-${i}`]).length;
                return (
                  <motion.div
                    key={section.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: si * 0.07 }}
                    data-testid={`section-${section.key}`}
                  >
                    <h2 className="font-serif text-xl font-bold mb-3 flex items-center gap-2">
                      <span>{section.emoji}</span>
                      {section.label}
                      <span className="text-xs font-sans font-normal text-muted-foreground">
                        ({sectionChecked}/{items.length})
                      </span>
                    </h2>
                    <div className="flex flex-col gap-2">
                      {items.map((item, i) => {
                        const id = `${section.key}-${i}`;
                        const isChecked = !!checked[id];
                        return (
                          <button
                            key={i}
                            onClick={() => toggle(id)}
                            className={`flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl border transition-all ${
                              isChecked
                                ? "border-primary/30 bg-primary/5"
                                : "border-border hover:border-border/60 bg-background hover:bg-muted/30"
                            }`}
                            data-testid={`item-${section.key}-${i}`}
                          >
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                              isChecked ? "bg-primary border-primary" : "border-border"
                            }`}>
                              {isChecked && <Check size={12} className="text-white" />}
                            </div>
                            <span className={`text-sm ${isChecked ? "line-through text-muted-foreground" : ""}`}>
                              {item}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Save pack CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-10 flex flex-col sm:flex-row gap-3"
            >
              <button
                onClick={() => downloadPackingList(trip, packingList, checked)}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors flex-1"
              >
                <Download size={15} /> Download list
              </button>
              <button
                onClick={async () => {
                  if (!tripId || !user?.uid) return;
                  setSaveStatus("saving");
                  await saveCheckedToFirebase(tripId, user.uid, checked);
                  setSaveStatus("saved");
                  setTimeout(() => setSaveStatus("idle"), 2000);
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors flex-1"
              >
                {saveStatus === "saved"
                  ? <><Check size={15} /> Pack saved!</>
                  : saveStatus === "saving"
                  ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                  : <><Save size={15} /> Save pack</>}
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
