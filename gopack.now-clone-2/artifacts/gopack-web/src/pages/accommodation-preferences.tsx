import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft, Link2, Loader2, Plus, X, ExternalLink,
  Home, Key, Users, MapPin, Star, ChevronRight, Zap, DollarSign,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip, addMemberAccommodationLink } from "@/hooks/useFirebase";

const TEAL = "#26A69A";

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; Icon: any }> = {
    hotel: { label: "Hotel", Icon: Home },
    airbnb: { label: "Airbnb", Icon: Key },
    hostel: { label: "Hostel", Icon: Users },
    other: { label: "Other", Icon: MapPin },
  };
  const { label, Icon } = map[type] ?? map["other"];
  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: TEAL + "20", color: TEAL }}>
      <Icon size={10} />
      {label}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  if (!rating || rating <= 0) return null;
  return (
    <div className="flex items-center gap-0.5 text-amber-500">
      <Star size={10} fill="#F59E0B" />
      <span className="text-xs font-semibold">{rating.toFixed(1)}</span>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: any }) {
  const [imgError, setImgError] = useState(false);
  const photo = suggestion.photos?.[0];

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex gap-3">
      {photo && !imgError ? (
        <img
          src={photo}
          alt={suggestion.name}
          className="w-24 h-24 object-cover shrink-0"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-24 h-24 bg-muted flex items-center justify-center shrink-0">
          <Home size={24} className="text-muted-foreground/30" />
        </div>
      )}
      <div className="flex-1 min-w-0 py-3 pr-3">
        <div className="flex items-center gap-2 mb-1">
          <TypeBadge type={suggestion.type} />
          <StarRating rating={suggestion.rating} />
        </div>
        <div className="font-semibold text-sm truncate">{suggestion.name}</div>
        {suggestion.location && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 truncate">
            <MapPin size={9} className="shrink-0" />
            {suggestion.location}
          </div>
        )}
        {suggestion.whyItFits && (
          <div className="flex items-start gap-1 mt-1.5">
            <Zap size={9} style={{ color: TEAL }} className="shrink-0 mt-0.5" />
            <span className="text-xs text-muted-foreground line-clamp-2 leading-snug">{suggestion.whyItFits}</span>
          </div>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {suggestion.costPerPerson > 0 && (
            <span className="text-xs font-semibold" style={{ color: TEAL }}>
              ${suggestion.costPerPerson.toLocaleString()}/person
            </span>
          )}
          {suggestion.submittedBy && (
            <span className="text-xs text-muted-foreground">by {suggestion.submittedBy}</span>
          )}
          {suggestion.link && (
            <a
              href={suggestion.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-xs ml-auto"
              style={{ color: TEAL }}
            >
              <ExternalLink size={9} /> View
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AccommodationPreferences() {
  const [, params] = useRoute("/trip/:tripId/accommodation-preferences");
  const tripId = params?.tripId ?? "";
  const { user } = useAuth();
  const { trip, loading } = useTrip(tripId);
  const [, setLocation] = useLocation();

  const [linkUrl, setLinkUrl] = useState("");
  const [linkCost, setLinkCost] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [showForm, setShowForm] = useState(false);

  const members = trip?.members ?? {};
  const suggestions: any[] = trip?.accommodationSuggestions ?? [];

  const handleAdd = async () => {
    const rawUrl = linkUrl.trim();
    if (!rawUrl || !tripId) return;
    setParsing(true);
    setParseError("");
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const memberCount = Object.keys(members).length || 1;
    const total = parseFloat(linkCost) || 0;
    try {
      const parseRes = await fetch("/api/parse-accommodation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, destination: trip?.destination ?? "" }),
      });
      let parsed: any = {};
      if (parseRes.ok) parsed = await parseRes.json();

      const suggestion = {
        id: `member-${Date.now()}`,
        name: parsed.name || "Member pick",
        type: parsed.type || "other",
        location: parsed.location || trip?.destination || "",
        totalCost: total,
        costPerPerson: total ? Math.round(total / memberCount) : 0,
        nights: trip?.days ?? 1,
        rating: parsed.rating || 0,
        amenities: parsed.amenities || [],
        rooms: 1,
        beds: memberCount,
        cancellation: parsed.cancellation || "Check listing",
        whyItFits: parsed.whyItFits || "Added by a pack member",
        tags: parsed.tags || ["Member pick"],
        distanceNote: parsed.distanceNote || "See listing for details",
        link: url,
        photos: parsed.photos || [],
        submittedBy: members[user?.uid ?? ""]?.name ?? user?.displayName ?? "Member",
      };
      await addMemberAccommodationLink(tripId, suggestion);
      setLinkUrl("");
      setLinkCost("");
      setShowForm(false);
    } catch {
      setParseError("Couldn't parse the listing. Please try again or check the URL.");
    } finally {
      setParsing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 size={24} className="animate-spin" style={{ color: TEAL }} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation(`/trip/${tripId}`)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold tracking-widest" style={{ color: TEAL }}>WHERE TO STAY</div>
          <div className="font-semibold text-sm">Add your picks</div>
        </div>
        {suggestions.length > 0 && (
          <button
            onClick={() => setLocation(`/trip/${tripId}/accommodation-vote`)}
            className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg text-white font-semibold shrink-0"
            style={{ backgroundColor: TEAL }}
          >
            Vote <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-16">
        <div className="px-4 pt-5 pb-4">
          <h2 className="font-serif text-2xl font-bold mb-1">Found a great place?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Paste any Airbnb, Booking.com, or Hotels.com link — AI reads the details automatically. Everyone votes by swiping.
          </p>
        </div>

        {!showForm ? (
          <div className="px-4">
            <button
              onClick={() => setShowForm(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed text-sm font-semibold transition-colors hover:opacity-80"
              style={{ borderColor: TEAL + "70", color: TEAL }}
            >
              <Plus size={18} />
              Paste a listing link
            </button>
          </div>
        ) : (
          <div className="mx-4 rounded-2xl border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Add your pick</span>
              <button
                onClick={() => { setShowForm(false); setParseError(""); setLinkUrl(""); setLinkCost(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Supports Airbnb, Booking.com, Hotels.com, Hostelworld, Expedia, VRBO and more.
            </p>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/50 focus-within:border-teal-400 transition-colors">
              <Link2 size={14} style={{ color: TEAL }} className="shrink-0" />
              <input
                type="url"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                placeholder="https://airbnb.com/rooms/…"
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                onKeyDown={e => e.key === "Enter" && !parsing && linkUrl.trim() && handleAdd()}
                autoFocus
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/50 focus-within:border-teal-400 transition-colors">
              <DollarSign size={14} className="text-muted-foreground shrink-0" />
              <input
                type="number"
                value={linkCost}
                onChange={e => setLinkCost(e.target.value)}
                placeholder="Total cost for the group (optional)"
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {parseError && <p className="text-xs text-red-500">{parseError}</p>}

            <button
              onClick={handleAdd}
              disabled={parsing || !linkUrl.trim()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: TEAL }}
            >
              {parsing ? (
                <><Loader2 size={15} className="animate-spin" />AI is reading the listing…</>
              ) : (
                <><Plus size={15} />Add to vote</>
              )}
            </button>
          </div>
        )}

        {suggestions.length > 0 ? (
          <div className="px-4 mt-5">
            <div className="text-xs font-bold tracking-wider text-muted-foreground mb-3 uppercase">
              {suggestions.length} {suggestions.length === 1 ? "pick" : "picks"} added
            </div>
            <div className="flex flex-col gap-3">
              {suggestions.map((s: any, i: number) => (
                <SuggestionCard key={s.id ?? i} suggestion={s} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-8 text-center text-muted-foreground">
            <Home size={40} className="opacity-20 mb-2" />
            <p className="font-semibold text-sm text-foreground">No picks yet</p>
            <p className="text-xs leading-relaxed">
              Be the first! Paste an Airbnb or hotel link above and AI will extract all the details automatically.
            </p>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="px-4 mt-6">
            <button
              onClick={() => setLocation(`/trip/${tripId}/accommodation-vote`)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-semibold text-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: TEAL }}
            >
              Start swiping on {suggestions.length} {suggestions.length === 1 ? "option" : "options"}
              <ChevronRight size={16} />
            </button>
            <p className="text-xs text-center text-muted-foreground mt-2">
              More picks can be added from the voting screen too
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
