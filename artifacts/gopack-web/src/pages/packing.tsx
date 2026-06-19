import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Loader2, Check } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase";

const SECTIONS = [
  { key: "essentials", label: "Essentials", emoji: "passport" },
  { key: "clothing", label: "Clothing", emoji: "shirt" },
  { key: "toiletries", label: "Toiletries", emoji: "sparkles" },
  { key: "tech", label: "Tech", emoji: "phone" },
  { key: "activities", label: "Activity Gear", emoji: "backpack" },
  { key: "tips", label: "Pro Tips", emoji: "lightbulb" },
];

export default function Packing() {
  const [, params] = useRoute("/trip/:tripId/packing");
  const tripId = params?.tripId || "";
  const [packingList, setPackingList] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

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

  const toggle = (key: string) => {
    setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const totalItems = packingList
    ? SECTIONS.flatMap(s => packingList[s.key] || []).length
    : 0;
  const checkedCount = Object.values(checked).filter(Boolean).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-4">
          <Link href={`/trip/${tripId}`} className="text-muted-foreground hover:text-foreground" data-testid="link-back">
            <ArrowLeft size={20} />
          </Link>
          <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
            go<span className="text-primary">pack</span>
          </Link>
        </div>
        {totalItems > 0 && (
          <span className="text-sm text-muted-foreground">
            {checkedCount} / {totalItems} packed
          </span>
        )}
      </nav>

      <div className="max-w-2xl mx-auto px-8 py-12">
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
              <h1 className="font-serif text-5xl font-bold mb-2">Packing List</h1>
              <p className="text-muted-foreground mb-4">AI-curated for your {trip?.days}-day trip</p>

              {totalItems > 0 && (
                <div className="h-1.5 w-full bg-muted rounded-full mb-10 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                  />
                </div>
              )}
            </motion.div>

            <div className="flex flex-col gap-8">
              {SECTIONS.map((section, si) => {
                const items: string[] = packingList[section.key] || [];
                if (items.length === 0) return null;
                return (
                  <motion.div
                    key={section.key}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: si * 0.08 }}
                    data-testid={`section-${section.key}`}
                  >
                    <h2 className="font-serif text-xl font-bold mb-4 flex items-center gap-2">
                      {section.label}
                      <span className="text-xs font-sans font-normal text-muted-foreground">
                        ({items.filter((_, i) => checked[`${section.key}-${i}`]).length}/{items.length})
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
                                : "border-border hover:border-border/80 bg-background"
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
          </>
        )}
      </div>
    </div>
  );
}
