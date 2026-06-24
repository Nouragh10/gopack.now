import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Clock, DollarSign, Sparkles, Star, Loader2,
  FileDown, CalendarPlus, Edit2, Plus, Check, X, MapPin, Users, Eye, EyeOff,
  RotateCcw, Trash2
} from "lucide-react";
import { ref, onValue, set } from "firebase/database";
import { db } from "@/lib/firebase";
import { incrementAiUsage } from "@/hooks/useFirebase";
import { UpgradeModal } from "@/components/UpgradeModal";

/* ─── constants ─────────────────────────────────────────────── */
const TAG_COLORS: Record<string, string> = {
  food:        "bg-amber-100 text-amber-700 border-amber-200",
  culture:     "bg-violet-100 text-violet-700 border-violet-200",
  adventure:   "bg-green-100 text-green-700 border-green-200",
  relaxation:  "bg-blue-100 text-blue-700 border-blue-200",
  nightlife:   "bg-pink-100 text-pink-700 border-pink-200",
  shopping:    "bg-orange-100 text-orange-700 border-orange-200",
  travel:      "bg-gray-100 text-gray-600 border-gray-200",
};

const TAG_LEFT_BORDER: Record<string, string> = {
  food:        "#f59e0b",
  culture:     "#7c3aed",
  adventure:   "#16a34a",
  relaxation:  "#2563eb",
  nightlife:   "#db2777",
  shopping:    "#ea580c",
  travel:      "#9ca3af",
};

const TAG_BG: Record<string, string> = {
  food:        "#fef3c7",
  culture:     "#ede9fe",
  adventure:   "#dcfce7",
  relaxation:  "#dbeafe",
  nightlife:   "#fce7f3",
  shopping:    "#ffedd5",
  travel:      "#f3f4f6",
};

const TAG_OPTIONS = ["food","culture","adventure","relaxation","nightlife","shopping","travel"];

function getRedoOptions(tag: string): Array<{ label: string; redoType: "same_type" | "whole" }> {
  const sameLabels: Record<string, string> = {
    food: "Change restaurant",
    relaxation: "Change location",
    adventure: "Change location",
    culture: "Change venue",
    nightlife: "Change bar/club",
    shopping: "Change market/shop",
  };
  const opts: Array<{ label: string; redoType: "same_type" | "whole" }> = [];
  if (sameLabels[tag]) opts.push({ label: sameLabels[tag], redoType: "same_type" });
  opts.push({ label: "Redo whole activity", redoType: "whole" });
  return opts;
}

/* ─── helpers ────────────────────────────────────────────────── */
function parseActivityTime(baseDate: Date, dayOffset: number, timeStr: string) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + dayOffset);
  const match = timeStr?.match(/(\d+):(\d+)\s*(am|pm)?/i);
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
  return d;
}

function toGCalDate(d: Date) {
  return d.toISOString().replace(/[-:.]/g, "").slice(0, 15);
}

function buildActivityCalendarUrl(act: any, day: any, trip: any, dayIndex: number): string {
  const base = trip?.startDate ? new Date(trip.startDate) : new Date();
  const start = parseActivityTime(base, dayIndex, act.time || "9:00am");
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const params = new URLSearchParams({
    action:   "TEMPLATE",
    text:     act.name || "",
    details:  act.description || "",
    location: `${act.name || ""}, ${day.city || trip?.destination || ""}`,
    dates:    `${toGCalDate(start)}/${toGCalDate(end)}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildActivityMapsUrl(act: any, day: any, trip: any): string {
  const q = `${act.name || ""}, ${day.city || trip?.destination || ""}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function buildAllMapsUrl(itinerary: any, trip: any): string {
  const dest = trip?.destination || "";
  const places: string[] = [];
  (itinerary.days || []).forEach((day: any) =>
    (day.activities || []).forEach((act: any) => {
      if (act.name) places.push(`${act.name}, ${day.city || dest}`);
    })
  );
  if (places.length === 0) return `https://www.google.com/maps/search/${encodeURIComponent(dest)}`;
  if (places.length === 1) return `https://www.google.com/maps/search/${encodeURIComponent(places[0])}`;
  const origin = encodeURIComponent(places[0]);
  const destination = encodeURIComponent(places[places.length - 1]);
  const waypoints = places.slice(1, -1).map(encodeURIComponent).join("|");
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints ? `&waypoints=${waypoints}` : ""}`;
}

function buildFullICS(itinerary: any, trip: any): string {
  const base = trip?.startDate ? new Date(trip.startDate) : new Date();
  const lines = [
    "BEGIN:VCALENDAR","VERSION:2.0",
    "PRODID:-//GoPackNow//AI Travel Planner//EN",
    "CALSCALE:GREGORIAN","METHOD:PUBLISH",
    `X-WR-CALNAME:${itinerary.title || trip?.destination || "Trip"}`,
  ];
  (itinerary.days || []).forEach((day: any, di: number) => {
    (day.activities || []).forEach((act: any) => {
      const start = parseActivityTime(base, di, act.time || "9:00am");
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
      lines.push("BEGIN:VEVENT",
        `DTSTART:${fmt(start)}`,`DTEND:${fmt(end)}`,
        `SUMMARY:${(act.name||"").replace(/,/g,"\\,")}`,
        `DESCRIPTION:${(act.description||"").replace(/,/g,"\\,").replace(/\n/g,"\\n")}`,
        `LOCATION:${day.city||trip?.destination||""}`,
        "END:VEVENT");
    });
  });
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ─── ActivityEditor ─────────────────────────────────────────── */
function ActivityEditor({ activity, onSave, onCancel }: { activity: any; onSave: (u: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ ...activity });
  const set_ = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));
  return (
    <div className="border-2 border-primary/30 rounded-2xl p-5 bg-primary/5 flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Name</label>
          <input value={form.name||""} onChange={e=>set_("name",e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"/></div>
        <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Time</label>
          <input value={form.time||""} onChange={e=>set_("time",e.target.value)} placeholder="e.g. 10:00am" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"/></div>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
        <textarea value={form.description||""} onChange={e=>set_("description",e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Est. cost ($)</label>
          <input type="number" value={form.estimatedCost||0} onChange={e=>set_("estimatedCost",Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"/></div>
        <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Category</label>
          <select value={form.tag||"travel"} onChange={e=>set_("tag",e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            {TAG_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"><X size={14}/> Cancel</button>
        <button onClick={()=>onSave(form)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"><Check size={14}/> Save</button>
      </div>
    </div>
  );
}

/* ─── AddActivityForm ────────────────────────────────────────── */
function AddActivityForm({ dayIndex, onAdd, onCancel }: { dayIndex: number; onAdd: (di: number, a: any) => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name:"", time:"", description:"", estimatedCost:0, tag:"travel", labels:[], fromWish:false, suggester:"Manual" });
  const set_ = (k: string, v: any) => setForm(f=>({ ...f, [k]: v }));
  return (
    <div className="border-2 border-dashed border-primary/40 rounded-2xl p-5 bg-primary/5 flex flex-col gap-3">
      <p className="text-sm font-medium text-primary">New activity</p>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Name *</label>
          <input value={form.name} onChange={e=>set_("name",e.target.value)} placeholder="e.g. Louvre Museum" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"/></div>
        <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Time</label>
          <input value={form.time} onChange={e=>set_("time",e.target.value)} placeholder="e.g. 10:00am" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"/></div>
      </div>
      <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Description</label>
        <textarea value={form.description} onChange={e=>set_("description",e.target.value)} rows={2} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" placeholder="What to expect…"/></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Est. cost ($)</label>
          <input type="number" value={form.estimatedCost} onChange={e=>set_("estimatedCost",Number(e.target.value))} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"/></div>
        <div><label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1">Category</label>
          <select value={form.tag} onChange={e=>set_("tag",e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
            {TAG_OPTIONS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"><X size={14}/> Cancel</button>
        <button onClick={()=>{ if(form.name.trim()) onAdd(dayIndex,form); }} disabled={!form.name.trim()} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-40"><Plus size={14}/> Add activity</button>
      </div>
    </div>
  );
}

/* ─── main page ──────────────────────────────────────────────── */
export default function Itinerary() {
  const [, params] = useRoute("/trip/:tripId/itinerary");
  const tripId = params?.tripId || "";
  const [itinerary, setItinerary] = useState<any>(null);
  const [localItinerary, setLocalItinerary] = useState<any>(null);
  const [trip, setTrip] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [permissionError, setPermissionError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [addingToDayIndex, setAddingToDayIndex] = useState<number | null>(null);
  const [printPreview, setPrintPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [redoPanel, setRedoPanel] = useState<{ di: number; ai: number; act: any } | null>(null);
  const [redoLoading, setRedoLoading] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  useEffect(() => {
    if (!tripId) return;
    const unsub = onValue(
      ref(db, `trips/${tripId}`),
      snap => {
        const data = snap.val();
        if (data) {
          setTrip(data);
          const itin = data.itinerary || null;
          setItinerary(itin);
          setLocalItinerary(itin ? JSON.parse(JSON.stringify(itin)) : null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("itinerary read error:", err);
        setPermissionError(true);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tripId]);

  const isDirty = JSON.stringify(localItinerary) !== JSON.stringify(itinerary);

  /* ── premium / tier ── */
  const isPremium = trip?.isPremium ?? false;
  const activityRedosUsed = trip?.aiUsage?.activityRedos ?? 0;
  const FREE_REDO_LIMIT = 1;
  const PREMIUM_REDO_LIMIT = 20;
  const canRedo = isPremium ? activityRedosUsed < PREMIUM_REDO_LIMIT : activityRedosUsed < FREE_REDO_LIMIT;

  const saveChanges = async () => {
    if (!localItinerary || !tripId) return;
    setSaving(true);
    try {
      await set(ref(db, `trips/${tripId}/itinerary`), localItinerary);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } finally { setSaving(false); }
  };

  const handleEditSave = (di: number, ai: number, updated: any) => {
    const next = JSON.parse(JSON.stringify(localItinerary));
    next.days[di].activities[ai] = updated;
    setLocalItinerary(next);
    setEditingKey(null);
  };

  const handleAddActivity = (di: number, activity: any) => {
    const next = JSON.parse(JSON.stringify(localItinerary));
    next.days[di].activities.push(activity);
    setLocalItinerary(next);
    setAddingToDayIndex(null);
  };

  const handleExportPDF = () => {
    setPrintPreview(false);
    setTimeout(() => window.print(), 50);
  };
  const togglePrintPreview = () => setPrintPreview(p => !p);

  const handleExportAllCalendar = () => {
    if (!localItinerary) return;
    downloadFile(buildFullICS(localItinerary, trip), `${(trip?.destination||"trip").replace(/\s+/g,"-").toLowerCase()}-itinerary.ics`, "text/calendar;charset=utf-8");
  };

  const handleOpenAllMaps = () => {
    if (!localItinerary) return;
    window.open(buildAllMapsUrl(localItinerary, trip), "_blank", "noopener,noreferrer");
  };

  const handleDeleteActivity = (di: number, ai: number, name: string) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setRedoPanel(null);
    const next = JSON.parse(JSON.stringify(localItinerary));
    next.days[di].activities.splice(ai, 1);
    setLocalItinerary(next);
  };

  const handleRedo = async (di: number, ai: number, act: any, redoType: "same_type" | "whole") => {
    if (!canRedo) {
      setUpgradeReason(isPremium ? "You've reached the premium redo limit (20)" : "You've used your free activity redo");
      setShowUpgrade(true);
      return;
    }
    const key = `${di}-${ai}`;
    setRedoPanel(null);
    setRedoLoading(key);
    const day = localItinerary.days[di];
    const otherActivities = day.activities.filter((_: any, i: number) => i !== ai).map((a: any) => a.name);
    try {
      const resp = await fetch("/api/redo-activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity: act,
          city: day.city,
          theme: day.theme,
          destination: trip?.destination,
          redoType,
          otherActivities,
        }),
      });
      if (resp.ok) {
        const { activity: newAct } = await resp.json();
        const next = JSON.parse(JSON.stringify(localItinerary));
        next.days[di].activities[ai] = { ...newAct, time: act.time };
        setLocalItinerary(next);
        await incrementAiUsage(tripId, "activityRedos");
      }
    } finally {
      setRedoLoading(null);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-primary"/>
    </div>
  );

  if (permissionError) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-lg w-full">
        <Link href={`/trip/${tripId}`} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 text-sm">
          <ArrowLeft size={16}/> Back to trip
        </Link>
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-8">
          <h2 className="font-serif text-2xl font-bold mb-2">Firebase rules need updating</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Your Firebase Realtime Database rules are blocking reads. Paste the rules below into your{" "}
            <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              Firebase Console
            </a>
            {" "}→ Realtime Database → Rules tab, then publish.
          </p>
          <pre className="bg-muted/60 rounded-xl p-4 text-xs overflow-x-auto leading-relaxed select-all">{`{
  "rules": {
    "trips": {
      "$tripId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "userTrips": {
      "$uid": {
        ".read": "auth != null && auth.uid === $uid",
        ".write": "auth != null && auth.uid === $uid"
      }
    }
  }
}`}</pre>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* ── print + screen styles ── */}
      <style>{`
        @media screen {
          .print-only { display: none !important; }
        }

        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .no-print { display: none !important; }
          .print-only { display: block !important; }

          body { margin: 0; background: #fff !important; font-family: Georgia, serif; }

          .print-header {
            background: #1a1a1a !important;
            color: #fff !important;
            padding: 48px 48px 40px;
            display: flex !important;
            align-items: flex-end;
            justify-content: space-between;
          }
          .print-header-logo { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; opacity: 0.6; font-family: sans-serif; }
          .print-header-logo span { color: #E85D3A; }
          .print-header-title { font-size: 38px; font-weight: 700; line-height: 1.15; margin: 16px 0 8px; }
          .print-header-sub { font-size: 15px; opacity: 0.6; }

          .print-content { padding: 40px 48px; }

          .print-day { margin-bottom: 40px; break-inside: avoid-page; }
          .print-day-header {
            display: flex !important;
            align-items: center;
            gap: 16px;
            padding: 14px 20px;
            background: #E85D3A !important;
            color: #fff !important;
            border-radius: 12px;
            margin-bottom: 16px;
          }
          .print-day-number {
            width: 36px; height: 36px;
            background: rgba(255,255,255,0.2) !important;
            border-radius: 8px;
            display: flex; align-items: center; justify-content: center;
            font-size: 18px; font-weight: 700;
          }
          .print-day-city { font-size: 20px; font-weight: 700; }
          .print-day-theme { font-size: 13px; opacity: 0.8; margin-top: 2px; }

          .print-activity {
            border: 1px solid #e5e7eb !important;
            border-radius: 12px;
            padding: 16px 20px;
            margin-bottom: 12px;
            break-inside: avoid;
            display: flex !important;
            gap: 16px;
            position: relative;
            border-left-width: 4px !important;
          }
          .print-activity-time { font-size: 12px; color: #6b7280; margin-bottom: 4px; font-family: sans-serif; }
          .print-activity-name { font-size: 16px; font-weight: 700; margin-bottom: 6px; }
          .print-activity-desc { font-size: 13px; color: #4b5563; line-height: 1.6; }
          .print-activity-meta { display: flex; align-items: center; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
          .print-tag { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; font-family: sans-serif; border: 1px solid; }
          .print-tag-food       { background: #fef3c7 !important; color: #92400e !important; border-color: #fde68a !important; }
          .print-tag-culture    { background: #ede9fe !important; color: #5b21b6 !important; border-color: #c4b5fd !important; }
          .print-tag-adventure  { background: #dcfce7 !important; color: #14532d !important; border-color: #86efac !important; }
          .print-tag-relaxation { background: #dbeafe !important; color: #1e3a8a !important; border-color: #93c5fd !important; }
          .print-tag-nightlife  { background: #fce7f3 !important; color: #831843 !important; border-color: #f9a8d4 !important; }
          .print-tag-shopping   { background: #ffedd5 !important; color: #7c2d12 !important; border-color: #fdba74 !important; }
          .print-tag-travel     { background: #f3f4f6 !important; color: #374151 !important; border-color: #d1d5db !important; }
          .print-wish-badge     { background: #fef2f2 !important; color: #E85D3A !important; border: 1px solid #fecaca !important; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
          .print-cost { font-size: 14px; color: #374151; font-weight: 600; font-family: sans-serif; white-space: nowrap; }
          .print-activity-right { margin-left: auto; text-align: right; min-width: 72px; }
          .print-footer { text-align: center; color: #9ca3af; font-size: 11px; font-family: sans-serif; padding: 24px 0; border-top: 1px solid #f3f4f6; }

          nav, .print-screen-only { display: none !important; }
          .print-page { padding: 0 !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="min-h-screen bg-background text-foreground">
        {/* nav */}
        <nav className="no-print flex items-center justify-between px-8 py-5 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-4">
            <Link href={`/trip/${tripId}`} className="text-muted-foreground hover:text-foreground" data-testid="link-back">
              <ArrowLeft size={20}/>
            </Link>
            <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
              go<span className="text-primary">pack</span>
            </Link>
          </div>
          {localItinerary && (
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {isDirty && (
                <button onClick={saveChanges} disabled={saving}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50"
                  data-testid="button-save-changes">
                  {saving ? <Loader2 size={14} className="animate-spin"/> : saveSuccess ? <Check size={14}/> : null}
                  {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save changes"}
                </button>
              )}
              <button
                onClick={isPremium ? handleExportAllCalendar : () => { setUpgradeReason("Calendar export is a Pack Plus feature"); setShowUpgrade(true); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                title={isPremium ? "Export all to Calendar" : "Pack Plus — Export to Calendar"}
                data-testid="button-export-calendar">
                <CalendarPlus size={15}/><span className="hidden sm:inline">Calendar</span>
              </button>
              <button onClick={handleOpenAllMaps}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                title="All stops in Google Maps" data-testid="button-open-maps">
                <MapPin size={15}/><span className="hidden sm:inline">Maps</span>
              </button>
              <button
                onClick={isPremium ? togglePrintPreview : () => { setUpgradeReason("PDF export is a Pack Plus feature"); setShowUpgrade(true); }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-full transition-colors ${printPreview && isPremium ? "bg-primary text-white border-primary" : "border-border hover:bg-muted/50"}`}
                title={isPremium ? "Preview PDF layout" : "Pack Plus — PDF Preview"}
                data-testid="button-preview-pdf">
                {printPreview && isPremium ? <EyeOff size={15}/> : <Eye size={15}/>}
                <span className="hidden sm:inline">{printPreview && isPremium ? "Close preview" : "Preview PDF"}</span>
              </button>
              <button
                onClick={isPremium ? handleExportPDF : () => { setUpgradeReason("PDF export is a Pack Plus feature"); setShowUpgrade(true); }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors"
                title={isPremium ? "Export as PDF" : "Pack Plus — Export PDF"}
                data-testid="button-export-pdf">
                <FileDown size={15}/><span className="hidden sm:inline">PDF</span>
              </button>
            </div>
          )}
        </nav>

        {/* print header */}
        {localItinerary && (
          <div className="print-only print-header">
            <div>
              <div className="print-header-logo">go<span>pack</span></div>
              <div className="print-header-title">{localItinerary.title}</div>
              <div className="print-header-sub">{localItinerary.days?.length} days · {trip?.destination}</div>
            </div>
            <div style={{textAlign:"right",opacity:0.5,fontSize:13}}>
              AI-generated itinerary<br/>gopacknow.app
            </div>
          </div>
        )}

        <div className="max-w-3xl mx-auto px-6 py-12 print-page print-content" ref={printRef}>
          {!localItinerary ? (
            <div className="text-center py-20 text-muted-foreground">
              <Sparkles size={32} className="mx-auto mb-4 opacity-30"/>
              <p className="font-medium mb-2">No itinerary yet</p>
              <p className="text-sm mb-6">Go back to the trip hub and generate one.</p>
              <Link href={`/trip/${tripId}`} className="bg-primary text-white font-medium px-6 py-3 rounded-full hover:bg-primary/90 transition-colors" data-testid="link-go-back">
                Back to trip
              </Link>
            </div>
          ) : (
            <>
              {/* screen title */}
              <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="print-screen-only no-print mb-10">
                <p className="text-sm text-muted-foreground font-medium tracking-wide uppercase mb-2">{trip?.destination}</p>
                <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-3 leading-tight">{localItinerary.title}</h1>
                <p className="text-muted-foreground mb-3">{localItinerary.days?.length} days planned by AI from your group&apos;s wishes</p>
                {trip?.members && Object.keys(trip.members).length > 0 && (
                  <div className="flex items-center gap-2 mb-6">
                    <Users size={13} className="text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground">
                      {(Object.values(trip.members) as any[]).map((m: any) => m.name).filter(Boolean).join(" · ")}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleExportAllCalendar} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors">
                    <CalendarPlus size={14}/> Add all to Calendar
                  </button>
                  <button onClick={handleOpenAllMaps} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors">
                    <MapPin size={14}/> Full route in Maps
                  </button>
                  <button onClick={handleExportPDF} className="flex items-center gap-2 px-4 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors">
                    <FileDown size={14}/> Export PDF
                  </button>
                </div>
              </motion.div>

              {/* days */}
              <div className="flex flex-col gap-10">
                {(localItinerary.days || []).map((day: any, di: number) => (
                  <motion.div key={di} initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{delay:di*0.07}} data-testid={`day-${di+1}`}>

                    {/* screen day header */}
                    <div className="no-print flex items-center gap-0 mb-6">
                      <div
                        className="flex items-center gap-4 flex-1 px-5 py-4 rounded-2xl"
                        style={{ background: `linear-gradient(135deg, rgba(232,93,58,0.12) 0%, rgba(232,93,58,0.04) 100%)`, borderLeft: "4px solid #E85D3A" }}
                      >
                        <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-primary text-white font-display font-bold shrink-0">
                          <span className="text-[10px] font-medium opacity-70 leading-none uppercase tracking-wider">Day</span>
                          <span className="text-xl leading-none font-bold">{day.dayNumber}</span>
                        </div>
                        <div>
                          <h2 className="font-serif text-xl font-bold text-foreground">{day.city}</h2>
                          <p className="text-sm text-muted-foreground mt-0.5">{day.theme}</p>
                        </div>
                      </div>
                    </div>

                    {/* print day header */}
                    <div className="print-only print-day-header">
                      <div className="print-day-number">{day.dayNumber}</div>
                      <div>
                        <div className="print-day-city">{day.city}</div>
                        <div className="print-day-theme">{day.theme}</div>
                      </div>
                    </div>

                    {/* activities */}
                    <div className="flex flex-col gap-3 pl-0 sm:pl-4">
                      <AnimatePresence>
                        {(day.activities||[]).map((act: any, ai: number) => {
                          const key = `${di}-${ai}`;
                          const isEditing = editingKey === key;
                          const borderColor = TAG_LEFT_BORDER[act.tag] || TAG_LEFT_BORDER.travel;
                          const tagBg = TAG_BG[act.tag] || TAG_BG.travel;
                          return (
                            <motion.div key={ai} layout initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} data-testid={`activity-${di+1}-${ai+1}`}>
                              {isEditing ? (
                                <ActivityEditor activity={act} onSave={u=>handleEditSave(di,ai,u)} onCancel={()=>setEditingKey(null)}/>
                              ) : (
                                <>
                                  {/* screen card */}
                                  <div className="no-print group relative bg-background border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200"
                                    style={{borderLeft:`4px solid ${borderColor}`}}>

                                    {/* action buttons */}
                                    <div className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-all z-10">
                                      <button
                                        onClick={()=>{setAddingToDayIndex(null);setEditingKey(key);setRedoPanel(null);}}
                                        className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground"
                                        title="Edit activity" data-testid={`button-edit-activity-${di+1}-${ai+1}`}>
                                        <Edit2 size={14}/>
                                      </button>
                                      <button
                                        onClick={()=>setRedoPanel(redoPanel?.di===di&&redoPanel?.ai===ai?null:{di,ai,act})}
                                        className="p-1.5 rounded-lg hover:bg-muted/60 transition-colors text-muted-foreground"
                                        title="Redo activity">
                                        <RotateCcw size={14}/>
                                      </button>
                                      <button
                                        onClick={()=>handleDeleteActivity(di,ai,act.name)}
                                        className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-400 transition-colors text-muted-foreground"
                                        title="Delete activity">
                                        <Trash2 size={14}/>
                                      </button>
                                    </div>

                                    {/* redo loading overlay */}
                                    {redoLoading===key&&(
                                      <div className="absolute inset-0 bg-background/80 backdrop-blur-[1px] rounded-2xl flex items-center justify-center z-20">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                          <Loader2 size={16} className="animate-spin text-primary"/>
                                          <span>Finding a new activity…</span>
                                        </div>
                                      </div>
                                    )}

                                    <div className="p-5">
                                      {/* time row */}
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                                          style={{ background: tagBg, color: borderColor }}>
                                          <Clock size={11}/>
                                          <span>{act.time}</span>
                                        </div>
                                        {act.fromWish && (
                                          <span className="flex items-center gap-1 text-xs text-primary font-medium">
                                            <Star size={11} className="fill-primary/30"/> From a wish
                                          </span>
                                        )}
                                        <div className="ml-auto flex items-center gap-1 text-sm font-semibold text-foreground/70">
                                          <DollarSign size={13}/>
                                          <span>~${act.estimatedCost}</span>
                                        </div>
                                      </div>

                                      {/* title */}
                                      <h3 className="font-semibold text-base mb-2 pr-6">{act.name}</h3>

                                      {/* description */}
                                      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{act.description}</p>

                                      {/* footer row */}
                                      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/60">
                                        <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${TAG_COLORS[act.tag]||TAG_COLORS.travel}`}>
                                          {act.tag}
                                        </span>
                                        {(act.labels||[]).map((l: string, li: number) => (
                                          <span key={li} className="text-xs px-2.5 py-0.5 rounded-full border border-border text-muted-foreground">{l}</span>
                                        ))}
                                        {act.suggester && act.suggester !== "AI pick" && (
                                          <span className="text-xs text-muted-foreground/70 italic ml-1">by {act.suggester}</span>
                                        )}
                                        <div className="ml-auto flex items-center gap-1.5">
                                          <a href={`https://www.viator.com/searchResults/all?text=${encodeURIComponent(`${act.name} ${day.city || trip?.destination || ""}`)}`}
                                            target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100 transition-colors"
                                            title="Reserve on Viator" data-testid={`button-act-viator-${di+1}-${ai+1}`}>
                                            <Star size={11}/> Reserve
                                          </a>
                                          <button
                                            onClick={() => {
                                              if (!isPremium) { setUpgradeReason("Calendar export is a Pack Plus feature"); setShowUpgrade(true); return; }
                                              window.open(buildActivityCalendarUrl(act, day, trip, di), "_blank", "noopener,noreferrer");
                                            }}
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                                            title={isPremium ? "Add to Google Calendar" : "Pack Plus — Calendar export"}
                                            data-testid={`button-act-calendar-${di+1}-${ai+1}`}>
                                            <CalendarPlus size={11}/> Calendar
                                          </button>
                                          <a href={buildActivityMapsUrl(act, day, trip)} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                                            title="Open in Google Maps" data-testid={`button-act-maps-${di+1}-${ai+1}`}>
                                            <MapPin size={11}/> Maps
                                          </a>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* redo panel */}
                                  {redoPanel?.di===di&&redoPanel?.ai===ai&&(
                                    <motion.div initial={{opacity:0,y:-4}} animate={{opacity:1,y:0}} className="no-print mt-1.5 border border-primary/20 rounded-xl p-3 bg-primary/5">
                                      <p className="text-xs font-medium text-muted-foreground mb-2">What would you like to change?</p>
                                      <div className="flex gap-2 flex-wrap">
                                        {getRedoOptions(act.tag).map(({label,redoType:rt},oi)=>(
                                          <button key={oi} onClick={()=>handleRedo(di,ai,act,rt)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                                            <RotateCcw size={11}/>{label}
                                          </button>
                                        ))}
                                        <button onClick={()=>setRedoPanel(null)}
                                          className="px-3 py-1.5 text-xs text-muted-foreground rounded-lg border border-border hover:bg-muted/50 transition-colors">
                                          Cancel
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}

                                  {/* print card */}
                                  <div className="print-only print-activity" style={{borderLeftColor:borderColor}}>
                                    <div style={{flex:1}}>
                                      <div className="print-activity-time">{act.time}{act.fromWish ? " · ★ From a wish" : ""}</div>
                                      <div className="print-activity-name">{act.name}</div>
                                      <div className="print-activity-desc">{act.description}</div>
                                      <div className="print-activity-meta">
                                        <span className={`print-tag print-tag-${act.tag||"travel"}`}>{act.tag||"travel"}</span>
                                        {(act.labels||[]).map((l: string, li: number) => (
                                          <span key={li} className="print-tag print-tag-travel">{l}</span>
                                        ))}
                                        {act.suggester && act.suggester !== "AI pick" && (
                                          <span style={{fontSize:11,color:"#9ca3af"}}>by {act.suggester}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="print-activity-right">
                                      <div className="print-cost">${act.estimatedCost}</div>
                                    </div>
                                  </div>
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {/* add activity */}
                      {addingToDayIndex === di ? (
                        <AddActivityForm dayIndex={di} onAdd={handleAddActivity} onCancel={()=>setAddingToDayIndex(null)}/>
                      ) : (
                        <button
                          onClick={()=>{setEditingKey(null);setAddingToDayIndex(di);}}
                          className="no-print flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground py-2.5 px-4 border border-dashed border-border rounded-xl hover:border-primary/40 hover:text-primary transition-colors"
                          data-testid={`button-add-activity-day-${di+1}`}>
                          <Plus size={15}/> Add activity to Day {day.dayNumber}
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* print footer */}
              <div className="print-only print-footer">
                gopacknow.app · AI-powered group travel planning · Itinerary generated for {trip?.destination}
              </div>

              {/* save bar */}
              {isDirty && (
                <div className="no-print mt-12 pt-6 border-t border-border flex justify-end">
                  <button onClick={saveChanges} disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50">
                    {saving ? <Loader2 size={16} className="animate-spin"/> : saveSuccess ? <Check size={16}/> : null}
                    {saving ? "Saving…" : saveSuccess ? "Saved!" : "Save changes"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Print preview overlay ── */}
      <AnimatePresence>
        {printPreview && localItinerary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-gray-200 overflow-y-auto"
          >
            {/* Preview toolbar */}
            <div className="sticky top-0 z-10 bg-gray-800 text-white flex items-center justify-between px-6 py-3 shadow-lg">
              <div className="flex items-center gap-3">
                <Eye size={16} className="text-gray-400" />
                <span className="text-sm font-medium">PDF Preview</span>
                <span className="text-xs text-gray-400">This is exactly what your PDF will look like</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
                >
                  <FileDown size={14} /> Print / Save PDF
                </button>
                <button
                  onClick={() => setPrintPreview(false)}
                  className="flex items-center gap-1.5 text-gray-300 hover:text-white text-sm px-3 py-2 rounded-full hover:bg-gray-700 transition-colors"
                >
                  <X size={14} /> Close preview
                </button>
              </div>
            </div>

            {/* Simulated PDF page */}
            <div className="py-8 flex justify-center">
              <div className="w-[850px] max-w-full bg-white shadow-2xl" style={{fontFamily:"Georgia, serif"}}>

                {/* PDF Header (dark) */}
                <div style={{background:"#1a1a1a",color:"#fff",padding:"48px 48px 40px",display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:22,fontWeight:700,letterSpacing:-0.5,opacity:0.6,fontFamily:"sans-serif"}}>
                      go<span style={{color:"#E85D3A"}}>pack</span>
                    </div>
                    <div style={{fontSize:38,fontWeight:700,lineHeight:1.15,margin:"16px 0 8px"}}>{localItinerary.title}</div>
                    <div style={{fontSize:15,opacity:0.6}}>{localItinerary.days?.length} days · {trip?.destination}</div>
                  </div>
                  <div style={{textAlign:"right",opacity:0.5,fontSize:13}}>
                    AI-generated itinerary<br/>gopacknow.app
                  </div>
                </div>

                {/* PDF Content */}
                <div style={{padding:"40px 48px"}}>
                  {(localItinerary.days || []).map((day: any, di: number) => (
                    <div key={di} style={{marginBottom:40}}>
                      {/* Day header */}
                      <div style={{display:"flex",alignItems:"center",gap:16,padding:"14px 20px",background:"#E85D3A",color:"#fff",borderRadius:12,marginBottom:16}}>
                        <div style={{width:40,height:40,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700,fontSize:18,flexShrink:0}}>
                          {di+1}
                        </div>
                        <div>
                          <div style={{fontWeight:700,fontSize:18}}>{day.city || trip?.destination}</div>
                          {day.theme && <div style={{fontSize:13,opacity:0.85,marginTop:2}}>{day.theme}</div>}
                        </div>
                      </div>

                      {/* Activities */}
                      {(day.activities || []).map((act: any, ai: number) => {
                        const borderColor = TAG_LEFT_BORDER[act.tag || "travel"] || "#9ca3af";
                        return (
                          <div key={ai} style={{display:"flex",alignItems:"flex-start",gap:16,padding:"14px 16px",borderLeft:`4px solid ${borderColor}`,marginBottom:10,background:"#fafafa",borderRadius:"0 8px 8px 0"}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:12,color:"#9ca3af",marginBottom:4,fontFamily:"sans-serif"}}>{act.time}{act.fromWish ? " · ★ From a wish" : ""}</div>
                              <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{act.name}</div>
                              <div style={{fontSize:13,color:"#6b7280",lineHeight:1.5,fontFamily:"sans-serif"}}>{act.description}</div>
                            </div>
                            <div style={{minWidth:72,textAlign:"right",fontWeight:600,fontSize:14,fontFamily:"sans-serif",color:"#374151"}}>
                              ${act.estimatedCost}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}

                  {/* Footer */}
                  <div style={{textAlign:"center",color:"#9ca3af",fontSize:11,fontFamily:"sans-serif",paddingTop:24,borderTop:"1px solid #f3f4f6"}}>
                    gopacknow.app · AI-powered group travel planning · Itinerary generated for {trip?.destination}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <UpgradeModal
        open={showUpgrade}
        reason={upgradeReason}
        tripId={tripId}
        onClose={() => setShowUpgrade(false)}
      />
    </>
  );
}
