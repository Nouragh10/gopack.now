import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Lock, Check, Navigation, Star, Home, Key, Users, MapPin, ExternalLink, ArrowUp, ArrowDown, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip } from "@/hooks/useFirebase";
import {
  voteAccommodation,
  lockAccommodationVotes,
  unlockAccommodationVotes,
  confirmAccommodation,
  addMemberAccommodationLink,
} from "@/hooks/useFirebase";

const TEAL = "#26A69A";
const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

function Avatar({ name, index, size = 26 }: { name: string; index: number; size?: number }) {
  const bg = MEMBER_COLORS[index % MEMBER_COLORS.length];
  return (
    <div
      className="flex items-center justify-center rounded-full border-2 border-background font-bold text-white shrink-0"
      style={{ width: size, height: size, backgroundColor: bg, fontSize: size * 0.38 }}
    >
      {(name ?? "?")[0].toUpperCase()}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  if (!rating || rating <= 0) return null;
  if (rating > 5) return (
    <div className="flex items-center gap-1">
      <Star size={11} fill="#FFA726" color="#FFA726" />
      <span className="text-xs font-semibold text-amber-500">{rating.toFixed(1)}<span className="text-muted-foreground font-normal">/10</span></span>
    </div>
  );
  const full = Math.floor(rating);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} color={i < full ? "#FFA726" : "#D0C9C0"} fill={i < full ? "#FFA726" : "none"} />
      ))}
      <span className="text-xs font-semibold text-amber-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

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

interface CardProps {
  suggestion: any;
  idx: number;
  tripId: string;
  uid: string;
  votes: Record<string, "up" | "down">;
  members: Record<string, { name: string }>;
  isWinning: boolean;
  allLocked: boolean;
  isCreator: boolean;
  onConfirm: () => void;
}

function AccommodationCard({ suggestion, idx, tripId, uid, votes, members, isWinning, allLocked, isCreator, onConfirm }: CardProps) {
  const myVote = votes[uid] ?? null;
  const upVoters = Object.entries(votes).filter(([, v]) => v === "up");
  const downVoters = Object.entries(votes).filter(([, v]) => v === "down");
  const score = upVoters.length - downVoters.length;
  const upNames = upVoters.map(([id]) => members[id]?.name ?? "Unknown");
  const downNames = downVoters.map(([id]) => members[id]?.name ?? "Unknown");
  const winner = isWinning && allLocked;

  const openLink = () => {
    const raw = suggestion.link ?? "";
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="rounded-2xl p-4 transition-all"
      style={{
        backgroundColor: winner ? "#2B2723" : undefined,
        border: winner ? `2px solid ${TEAL}` : "1px solid var(--border)",
      }}
    >
      {winner && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold mb-2 text-white" style={{ backgroundColor: TEAL }}>
          ⭐ WINNER
        </div>
      )}
      {suggestion.submittedBy && suggestion.submittedBy !== "AI" && (
        <div className="flex items-center gap-1 text-xs text-amber-500 mb-1">
          <span>Added by {suggestion.submittedBy}</span>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <TypeBadge type={suggestion.type} />
            <StarRating rating={suggestion.rating} />
          </div>
          <div className={`font-bold text-base ${winner ? "text-[#FFFDF9]" : "text-foreground"}`}>
            {suggestion.name}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <MapPin size={11} color={winner ? "#BDB0A0" : "var(--muted-foreground)"} />
            <span className={`text-xs ${winner ? "text-[#BDB0A0]" : "text-muted-foreground"}`}>{suggestion.location}</span>
          </div>
        </div>

        {/* Vote arrows */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button
            onClick={() => voteAccommodation(tripId, idx, uid, "up")}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: myVote === "up" ? TEAL + "22" : undefined }}
          >
            <ArrowUp size={18} color={myVote === "up" ? TEAL : "var(--muted-foreground)"} />
          </button>
          <span className="text-sm font-bold" style={{ color: score > 0 ? TEAL : "var(--muted-foreground)" }}>
            {score > 0 ? `+${score}` : score}
          </span>
          <button
            onClick={() => voteAccommodation(tripId, idx, uid, "down")}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowDown size={18} color={myVote === "down" ? "var(--foreground)" : "var(--muted-foreground)"} />
          </button>
        </div>
      </div>

      {/* Why it fits */}
      {suggestion.whyItFits && (
        <div className="flex items-start gap-2 mt-3 px-3 py-2 rounded-xl" style={{ backgroundColor: winner ? "#3A3330" : "var(--muted)" }}>
          <Zap size={12} color={TEAL} className="shrink-0 mt-0.5" />
          <span className={`text-xs leading-snug ${winner ? "text-[#FFFDF9]" : "text-foreground"}`}>{suggestion.whyItFits}</span>
        </div>
      )}

      {/* Cost breakdown */}
      <div className="flex items-center gap-4 mt-3 py-2 px-3 rounded-xl bg-muted/50">
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Total</div>
          <div className={`text-sm font-bold ${winner ? "text-[#FFFDF9]" : "text-foreground"}`}>${(suggestion.totalCost ?? 0).toLocaleString()}</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Per person</div>
          <div className="text-sm font-bold" style={{ color: TEAL }}>${(suggestion.costPerPerson ?? 0).toLocaleString()}</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="text-center">
          <div className="text-xs text-muted-foreground">Rooms</div>
          <div className={`text-sm font-bold ${winner ? "text-[#FFFDF9]" : "text-foreground"}`}>{suggestion.rooms} × {suggestion.beds} beds</div>
        </div>
      </div>

      {/* Tags */}
      {suggestion.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestion.tags.map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground">{tag}</span>
          ))}
        </div>
      )}

      {/* Distance */}
      {suggestion.distanceNote && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
          <Navigation size={11} />
          {suggestion.distanceNote}
        </div>
      )}

      {/* Amenities */}
      {suggestion.amenities?.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {suggestion.amenities.slice(0, 5).map((a: string) => (
            <div key={a} className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check size={10} color={TEAL} />
              {a}
            </div>
          ))}
        </div>
      )}

      {/* Cancellation */}
      {suggestion.cancellation && (
        <div className="text-xs text-muted-foreground mt-1">{suggestion.cancellation}</div>
      )}

      {/* Link */}
      {suggestion.link && (
        <button
          onClick={openLink}
          className="flex items-center gap-1.5 mt-3 px-3 py-2 rounded-xl border text-sm font-medium w-full justify-center"
          style={{ borderColor: TEAL, color: TEAL }}
        >
          <ExternalLink size={13} />
          View listing
        </button>
      )}

      {/* Voter names */}
      {upNames.length > 0 && (
        <div className="flex items-center gap-1 mt-2 text-xs" style={{ color: TEAL }}>
          <ArrowUp size={11} />{upNames.join(", ")}
        </div>
      )}
      {downNames.length > 0 && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <ArrowDown size={11} />{downNames.join(", ")}
        </div>
      )}

      {/* Confirm */}
      {isCreator && winner && (
        <button
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 mt-3 py-2.5 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: TEAL }}
        >
          <Check size={15} />
          Book this one
        </button>
      )}
    </div>
  );
}

export default function AccommodationVote() {
  const [, params] = useRoute("/trip/:tripId/accommodation-vote");
  const tripId = params?.tripId ?? "";
  const { user } = useAuth();
  const { trip, loading } = useTrip(tripId);
  const [, setLocation] = useLocation();

  const [locking, setLocking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [lockError, setLockError] = useState("");
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const uid = user?.uid ?? "";
  const suggestions = trip?.accommodationSuggestions ?? [];
  const allVotes = trip?.accommodationVotes ?? {};
  const lockedBy = trip?.accommodationLockedBy ?? {};
  const members = trip?.members ?? {};
  const memberCount = Object.keys(members).length;
  const lockedCount = Object.keys(lockedBy).length;
  const allLocked = memberCount > 0 && lockedCount >= memberCount;
  const myLocked = !!lockedBy[uid];
  const isCreator = trip?.hostMemberId === uid;

  const getVotesForIdx = (idx: number): Record<string, "up" | "down"> =>
    (allVotes[idx] ?? {}) as Record<string, "up" | "down">;

  const getScore = (idx: number) => {
    const v = getVotesForIdx(idx);
    return Object.values(v).filter(d => d === "up").length - Object.values(v).filter(d => d === "down").length;
  };

  const winnerIdx = suggestions.reduce((best: number, _: any, idx: number) =>
    getScore(idx) > getScore(best) ? idx : best, 0);

  const handleToggleLock = async () => {
    setLockError("");
    if (!myLocked) {
      const unvoted = suggestions.filter((_: any, idx: number) => !getVotesForIdx(idx)[uid]);
      if (unvoted.length > 0) {
        setLockError(`Vote on all ${suggestions.length} options before locking in (${unvoted.length} remaining).`);
        return;
      }
    }
    setLocking(true);
    try {
      if (myLocked) await unlockAccommodationVotes(tripId, uid);
      else await lockAccommodationVotes(tripId, uid);
    } finally {
      setLocking(false);
    }
  };

  const handleConfirm = async () => {
    if (!suggestions[winnerIdx]) return;
    setConfirming(true);
    try {
      await confirmAccommodation(tripId, suggestions[winnerIdx]);
      setLocation(`/trip/${tripId}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    setAddingLink(true);
    try {
      const memberName = members[uid]?.name ?? "Member";
      await addMemberAccommodationLink(tripId, {
        name: linkName.trim(),
        link: linkUrl.trim(),
        type: "other",
        submittedBy: memberName,
        whyItFits: "Added by a pack member",
        location: trip?.destination ?? "",
        totalCost: 0,
        costPerPerson: 0,
        rooms: 1,
        beds: 1,
        rating: 0,
        tags: [],
        amenities: [],
        cancellation: "",
        distanceNote: "",
      });
      setLinkName(""); setLinkUrl(""); setShowAddLink(false);
    } finally {
      setAddingLink(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: TEAL, borderTopColor: "transparent" }} />
    </div>
  );

  if (!trip || suggestions.length === 0) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="text-muted-foreground">No accommodation suggestions yet.</div>
      <button onClick={() => setLocation(`/trip/${tripId}/accommodation-preferences`)} className="px-4 py-2 rounded-xl border border-border text-sm">
        Go back
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-2">
        <button onClick={() => setLocation(`/trip/${tripId}/accommodation-preferences`)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold tracking-widest" style={{ color: TEAL }}>STAY</div>
          <div className="font-semibold text-sm">Vote on accommodation</div>
        </div>
        <button
          onClick={() => setShowAddLink(true)}
          className="text-sm px-3 py-1.5 rounded-lg border font-medium hover:bg-muted transition-colors"
          style={{ borderColor: TEAL, color: TEAL }}
        >
          + Add link
        </button>
      </div>

      {/* Lock-in bar */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            {allLocked ? "All votes locked in ✓" : `${lockedCount} of ${memberCount} locked in`}
          </div>
          <div className="h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                backgroundColor: allLocked ? "#4CAF50" : TEAL,
                width: memberCount > 0 ? `${(lockedCount / memberCount) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
        <button
          onClick={handleToggleLock}
          disabled={locking}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shrink-0 disabled:opacity-60 transition-colors"
          style={{ backgroundColor: myLocked ? "#4CAF50" : TEAL }}
        >
          {locking ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={13} />}
          {myLocked ? "Locked" : "Lock in"}
        </button>
      </div>

      {lockError && <div className="mx-4 mt-2 text-sm text-red-500">{lockError}</div>}

      <div className="flex-1 overflow-y-auto pb-12">
        <div className="px-4 pt-4 flex flex-col gap-3">
          {suggestions.map((s: any, idx: number) => (
            <AccommodationCard
              key={idx}
              suggestion={s}
              idx={idx}
              tripId={tripId}
              uid={uid}
              votes={getVotesForIdx(idx)}
              members={members}
              isWinning={idx === winnerIdx}
              allLocked={allLocked}
              isCreator={isCreator}
              onConfirm={handleConfirm}
            />
          ))}
        </div>
      </div>

      {/* Add link modal */}
      {showAddLink && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowAddLink(false)}>
          <div className="w-full max-w-lg bg-card rounded-t-2xl p-6 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-lg">Add a place you found</span>
              <button onClick={() => setShowAddLink(false)} className="text-muted-foreground">✕</button>
            </div>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Name (e.g. Ace Hotel Barcelona)"
                value={linkName}
                onChange={e => setLinkName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-sm outline-none"
              />
              <input
                type="url"
                placeholder="Booking link (optional)"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-muted text-sm outline-none"
              />
              <button
                onClick={handleAddLink}
                disabled={addingLink || !linkName.trim()}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
                style={{ backgroundColor: TEAL }}
              >
                {addingLink ? "Adding…" : "Add to vote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
