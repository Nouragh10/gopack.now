import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, DollarSign, Sparkles, Star, Loader2,
  FileDown, CalendarPlus, MapPin, Edit2, Plus, Check, X, Map
} from "lucide-react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";

const TAG_COLORS: Record<string, string> = {
  food: "bg-amber-100 text-amber-700 border-amber-200",
  culture: "bg-violet-100 text-violet-700 border-violet-200",
  adventure: "bg-green-100 text-green-700 border-green-200",
  relaxation: "bg-blue-100 text-blue-700 border-blue-200",
  nightlife: "bg-pink-100 text-pink-700 border-pink-200",
  shopping: "bg-orange-100 text-orange-700 border-orange-200",
  travel: "bg-gray-100 text-gray-600 border-gray-200",
};

const TAG_OPTIONS = ["food", "culture", "adventure", "relaxation", "nightlife", "shopping", "travel"];

function makeICSDate(baseDate: Date, dayOffset: number, timeStr: string): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + dayOffset);
  const match = timeStr.match(/(\d+):(\d+)\s*(am|pm)?/i);
  if (match) {
    let h = parseInt(match[1]);
    const m = parseInt(match[2]);
    const period = match[3]?.toLowerCase();
    if (period === "pm" && h < 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function generateICS(itinerary: any, trip: any): string {
  const startDate = trip?.startDate ? new Date(trip.startDate) : new Date();
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GoPack//AI Travel Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${itinerary.title || trip?.destination || "Trip"}`,
  ];

  (itinerary.days || []).forEach((day: any, di: number) => {
    (day.activities || []).forEach((act: any) => {
      const dtStart = makeICSDate(startDate, di, act.time || "9:00am");
      const dtEnd = makeICSDate(startDate, di, act.time || "9:00am");
      const endDate = new Date(dtEnd.slice(0, 8) + "T" + dtEnd.slice(8));
      endDate.setHours(endDate.getHours() + 1);
      const dtEndStr = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

      lines.push("BEGIN:VEVENT");
      lines.push(`DTSTART:${dtStart}`);
      lines.push(`DTEND:${dtEndStr}`);
      lines.push(`SUMMARY:${(act.name || "").replace(/,/g, "\\,")}`);
      lines.push(`DESCRIPTION:${(act.description || "").replace(/,/g, "\\,").replace(/\n/g, "\\n")}`);
      lines.push(`LOCATION:${day.city || trip?.destination || ""}`);
      lines.push("END:VEVENT");
    });
  });

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function buildGoogleMapsUrl(itinerary: any, trip: any): string {
  const destination = trip?.destination || "";
  const places: string[] = [];

  (itinerary.days || []).forEach((day: any) => {
    (day.activities || []).forEach((act: any) => {
      if (act.name) {
        places.push(`${act.name}, ${day.city || destination}`);
      }
    });
  });

  if (places.length === 0) {
    return `https://www.google.com/maps/search/${encodeURIComponent(destination)}`;
  }
  if (places.length === 1) {
    return `https://www.google.com/maps/search/${encodeURIComponent(places[0])}`;
  }

  const origin = encodeURIComponent(places[0]);
  const dest = encodeURIComponent(places[places.length - 1]);
  const waypoints = places.slice(1, -1).map(encodeURIComponent).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}${waypoints ? `&waypoints=${waypoints}` : ""}`;
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

interface ActivityEditorProps {
  activity: any;
  onSave: (updated: any) => void;
  onCancel: () => void;
}

function ActivityEditor({ activity, onSave, onCancel }: ActivityEditorProps) {
  const [form, setForm] = useState({ ...activity });
  return (
    <div className="border-2 border-primary/30 rounded-2xl p-5 bg-primary/5 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Name</label>
          <input
            value={form.name || ""}
            onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Time</label>
          <input
            value={form.time || ""}
            onChange={e => setForm((f: any) => ({ ...f, time: e.target.value }))}
            placeholder="e.g. 10:00am"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
        <textarea
          value={form.description || ""}
          onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Est. cost ($)</label>
          <input
            type="number"
            value={form.estimatedCost || 0}
            onChange={e => setForm((f: any) => ({ ...f, estimatedCost: Number(e.target.value) }))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Category</label>
          <select
            value={form.tag || "travel"}
            onChange={e => setForm((f: any) => ({ ...f, tag: e.target.value }))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Check size={14} /> Save
        </button>
      </div>
    </div>
  );
}

interface AddActivityFormProps {
  dayIndex: number;
  onAdd: (dayIndex: number, activity: any) => void;
  onCancel: () => void;
}

function AddActivityForm({ dayIndex, onAdd, onCancel }: AddActivityFormProps) {
  const [form, setForm] = useState({
    name: "", time: "", description: "", estimatedCost: 0, tag: "travel", labels: [], fromWish: false, suggester: "Manual"
  });
  return (
    <div className="border-2 border-dashed border-primary/40 rounded-2xl p-5 bg-primary/5 flex flex-col gap-3">
      <p className="text-sm font-medium text-primary">New activity</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Name *</label>
          <input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Louvre Museum"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Time</label>
          <input
            value={form.time}
            onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
            placeholder="e.g. 10:00am"
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          placeholder="What to expect…"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Est. cost ($)</label>
          <input
            type="number"
            value={form.estimatedCost}
            onChange={e => setForm(f => ({ ...f, estimatedCost: Number(e.target.value) }))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Category</label>
          <select
            value={form.tag}
            onChange={e => setForm(f => ({ ...f, tag: e.target.value }))}
            className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {TAG_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <X size={14} /> Cancel
        </button>
        <button
          onClick={() => { if (form.name.trim()) onAdd(dayIndex, form); }}
          disabled={!form.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          <Plus size={14} /> Add activity
        </button>
      </div>
    </div>
  );
}

export default function Itinerary() {
  const [, params] = useRoute("/trip/:tripId/itinerary");
  const tripId = params?.tripId || "";
  const [itinerary, setItinerary] = useState<any>(null);
  const [localItinerary, setLocalItinerary] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [addingToDayIndex, setAddingToDayIndex] = useState<number | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tripId) return;
    const tripRef = ref(db, `trips/${tripId}`);
    const unsub = onValue(tripRef, snap => {
      const data = snap.val();
      if (data) {
        setTrip(data);
        const itin = data.itinerary || null;
        setItinerary(itin);
        setLocalItinerary(itin ? JSON.parse(JSON.stringify(itin)) : null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [tripId]);

  const isDirty = JSON.stringify(localItinerary) !== JSON.stringify(itinerary);

  const saveChanges = async () => {
    if (!localItinerary || !tripId) return;
    setSaving(true);
    try {
      await set(ref(db, `trips/${tripId}/itinerary`), localItinerary);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = (dayIndex: number, actIndex: number, updated: any) => {
    const next = JSON.parse(JSON.stringify(localItinerary));
    next.days[dayIndex].activities[actIndex] = updated;
    setLocalItinerary(next);
    setEditingKey(null);
  };

  const handleAddActivity = (dayIndex: number, activity: any) => {
    const next = JSON.parse(JSON.stringify(localItinerary));
    next.days[dayIndex].activities.push(activity);
    setLocalItinerary(next);
    setAddingToDayIndex(null);
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleExportCalendar = () => {
    if (!localItinerary) return;
    const ics = generateICS(localItinerary, trip);
    const name = (trip?.destination || "trip").replace(/\s+/g, "-").toLowerCase();
    downloadFile(ics, `${name}-itinerary.ics`, "text/calendar;charset=utf-8");
  };

  const handleOpenMaps = () => {
    if (!localItinerary) return;
    const url = buildGoogleMapsUrl(localItinerary, trip);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          nav { display: none !important; }
          .print-page { padding: 0 !important; }
        }
      `}</style>

      <div className="min-h-screen bg-background text-foreground">
        <nav className="no-print flex items-center justify-between px-8 py-5 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-4">
            <Link href={`/trip/${tripId}`} className="text-muted-foreground hover:text-foreground" data-testid="link-back">
              <ArrowLeft size={20} />
            </Link>
            <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
              go<span className="text-primary">pack</span>
            </Link>
          </div>

          {localItinerary && (
            <div className="flex items-center gap-2">
              {isDirty && (
                <button
                  onClick={saveChanges}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                  data-testid="button-save-changes"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : saveSuccess ? <Check size={14} /> : null}
                  {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save changes"}
                </button>
              )}
              <button
                onClick={handleExportCalendar}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                title="Export to Calendar"
                data-testid="button-export-calendar"
              >
                <CalendarPlus size={15} />
                <span className="hidden sm:inline">Calendar</span>
              </button>
              <button
                onClick={handleOpenMaps}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                title="Open in Google Maps"
                data-testid="button-open-maps"
              >
                <Map size={15} />
                <span className="hidden sm:inline">Maps</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                title="Export as PDF"
                data-testid="button-export-pdf"
              >
                <FileDown size={15} />
                <span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          )}
        </nav>

        <div className="max-w-3xl mx-auto px-8 py-12 print-page" ref={printRef}>
          {!localItinerary ? (
            <div className="text-center py-20 text-muted-foreground">
              <Sparkles size={32} className="mx-auto mb-4 opacity-30" />
              <p className="font-medium mb-2">No itinerary yet</p>
              <p className="text-sm mb-6">Go back to the trip hub and generate one.</p>
              <Link href={`/trip/${tripId}`} className="bg-primary text-white font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition-colors" data-testid="link-go-back">
                Back to trip
              </Link>
            </div>
          ) : (
            <>
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <p className="text-sm text-muted-foreground mb-1">{trip?.destination}</p>
                <h1 className="font-serif text-5xl font-bold mb-2">{localItinerary.title}</h1>
                <p className="text-muted-foreground mb-6">{localItinerary.days?.length} days planned by AI from your group&apos;s wishes</p>

                <div className="no-print flex flex-wrap gap-2 mb-10">
                  <button
                    onClick={handleExportCalendar}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                  >
                    <CalendarPlus size={14} /> Add to Calendar
                  </button>
                  <button
                    onClick={handleOpenMaps}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                  >
                    <Map size={14} /> Open in Google Maps
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                  >
                    <FileDown size={14} /> Export PDF
                  </button>
                </div>
              </motion.div>

              <div className="flex flex-col gap-12">
                {(localItinerary.days || []).map((day: any, di: number) => (
                  <motion.div
                    key={di}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: di * 0.07 }}
                    data-testid={`day-${di + 1}`}
                  >
                    <div className="flex items-baseline gap-4 mb-6">
                      <div className="w-12 h-12 rounded-xl bg-foreground text-background flex items-center justify-center font-display font-bold text-xl shrink-0">
                        {day.dayNumber}
                      </div>
                      <div>
                        <h2 className="font-serif text-2xl font-bold">{day.city}</h2>
                        <p className="text-muted-foreground text-sm">{day.theme}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-4 pl-16">
                      <AnimatePresence>
                        {(day.activities || []).map((act: any, ai: number) => {
                          const key = `${di}-${ai}`;
                          const isEditing = editingKey === key;
                          return (
                            <motion.div
                              key={ai}
                              layout
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -8 }}
                              data-testid={`activity-${di + 1}-${ai + 1}`}
                            >
                              {isEditing ? (
                                <ActivityEditor
                                  activity={act}
                                  onSave={(updated) => handleEditSave(di, ai, updated)}
                                  onCancel={() => setEditingKey(null)}
                                />
                              ) : (
                                <div className="group border border-border rounded-2xl p-5 bg-background hover:border-border/80 transition-colors relative">
                                  <button
                                    onClick={() => { setAddingToDayIndex(null); setEditingKey(key); }}
                                    className="no-print absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-muted/60 transition-all text-muted-foreground"
                                    title="Edit activity"
                                    data-testid={`button-edit-activity-${di + 1}-${ai + 1}`}
                                  >
                                    <Edit2 size={14} />
                                  </button>

                                  <div className="flex items-start justify-between gap-4 mb-3 pr-8">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <Clock size={13} className="text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">{act.time}</span>
                                        {act.fromWish && (
                                          <span className="flex items-center gap-1 text-xs text-primary">
                                            <Star size={11} /> From a wish
                                          </span>
                                        )}
                                      </div>
                                      <h3 className="font-medium text-base">{act.name}</h3>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 text-sm text-muted-foreground">
                                      <DollarSign size={13} />
                                      <span>~${act.estimatedCost}</span>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{act.description}</p>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${TAG_COLORS[act.tag] || TAG_COLORS.travel}`}>
                                      {act.tag}
                                    </span>
                                    {(act.labels || []).map((label: string, li: number) => (
                                      <span key={li} className="text-xs px-2.5 py-0.5 rounded-full border border-border text-muted-foreground">
                                        {label}
                                      </span>
                                    ))}
                                    {act.suggester && act.suggester !== "AI pick" && (
                                      <span className="text-xs text-muted-foreground ml-auto">
                                        Suggested by {act.suggester}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {addingToDayIndex === di ? (
                        <AddActivityForm
                          dayIndex={di}
                          onAdd={handleAddActivity}
                          onCancel={() => setAddingToDayIndex(null)}
                        />
                      ) : (
                        <button
                          onClick={() => { setEditingKey(null); setAddingToDayIndex(di); }}
                          className="no-print flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2 px-4 border border-dashed border-border rounded-xl hover:border-border/80 transition-colors"
                          data-testid={`button-add-activity-day-${di + 1}`}
                        >
                          <Plus size={15} /> Add activity to Day {day.dayNumber}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {isDirty && (
                <div className="no-print mt-12 pt-6 border-t border-border flex justify-end">
                  <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : saveSuccess ? <Check size={16} /> : null}
                    {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save changes"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
