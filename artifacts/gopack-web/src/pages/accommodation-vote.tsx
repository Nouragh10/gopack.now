import { useState, useRef, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  ArrowLeft, Lock, X, Heart, Plus, ExternalLink,
  Star, Home, Key, Users, MapPin, Check, Zap, Loader2,
  Navigation, ChevronUp,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  useTrip,
  voteAccommodation,
  lockAccommodationVotes,
  unlockAccommodationVotes,
  confirmAccommodation,
  addMemberAccommodationLink,
} from "@/hooks/useFirebase";

const TEAL = "#26A69A";
const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];
const SWIPE_THRESHOLD = 80;

function Avatar({ name, index, size = 26 }: { name: string; index: number; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white shrink-0 border-2 border-background"
      style={{ width: size, height: size, backgroundColor: MEMBER_COLORS[index % MEMBER_COLORS.length], fontSize: size * 0.38 }}
    >
      {(name ?? "?")[0].toUpperCase()}
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
      <Icon size={10} /> {label}
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  if (!rating || rating <= 0) return null;
  if (rating > 5) return (
    <div className="flex items-center gap-1">
      <Star size={11} fill="#F59E0B" color="#F59E0B" />
      <span className="text-xs font-semibold text-amber-500">{rating.toFixed(1)}<span className="text-muted-foreground font-normal">/10</span></span>
    </div>
  );
  const full = Math.floor(rating);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} size={11} color={i < full ? "#F59E0B" : "#D0C9C0"} fill={i < full ? "#F59E0B" : "none"} />
      ))}
      <span className="text-xs font-semibold text-amber-500 ml-1">{rating.toFixed(1)}</span>
    </div>
  );
}

/* ── Swipe card ──────────────────────────────────────────── */

function SwipeCard({ suggestion, onSwipeLeft, onSwipeRight }: {
  suggestion: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [offset, setOffset] = useState(0);
  const [flyDir, setFlyDir] = useState<"left" | "right" | null>(null);
  const [imgError, setImgError] = useState(false);
  const startXRef = useRef(0);

  const flyOut = (dir: "left" | "right") => {
    setFlyDir(dir);
    setTimeout(() => {
      if (dir === "right") onSwipeRight();
      else onSwipeLeft();
    }, 280);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (flyDir) return;
    setIsDragging(true);
    startXRef.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setOffset(e.clientX - startXRef.current);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (offset > SWIPE_THRESHOLD) flyOut("right");
    else if (offset < -SWIPE_THRESHOLD) flyOut("left");
    else setOffset(0);
  };

  const rotate = offset * 0.06;
  const likeOp = Math.min(1, Math.max(0, offset / SWIPE_THRESHOLD));
  const nopeOp = Math.min(1, Math.max(0, -offset / SWIPE_THRESHOLD));

  const transform = flyDir === "right"
    ? "translateX(150vw) rotate(20deg)"
    : flyDir === "left"
    ? "translateX(-150vw) rotate(-20deg)"
    : `translateX(${offset}px) rotate(${rotate}deg)`;

  const transition = isDragging
    ? "none"
    : flyDir
    ? "transform 0.28s ease-in"
    : "transform 0.35s cubic-bezier(0.34,1.56,0.64,1)";

  const photo = suggestion.photos?.[0];

  return (
    <div
      className="absolute inset-0 rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 overflow-y-auto select-none"
      style={{ transform, transition, cursor: isDragging ? "grabbing" : "grab", touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* LOVE IT overlay */}
      <div
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-green-500 z-10 pointer-events-none"
        style={{ opacity: likeOp, backgroundColor: "rgba(255,255,255,0.92)" }}
      >
        <Heart size={16} color="#22c55e" fill="#22c55e" />
        <span className="font-bold text-green-500 text-sm tracking-wide">LOVE IT</span>
      </div>
      {/* SKIP overlay */}
      <div
        className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-red-400 z-10 pointer-events-none"
        style={{ opacity: nopeOp, backgroundColor: "rgba(255,255,255,0.92)" }}
      >
        <X size={16} color="#ef4444" />
        <span className="font-bold text-red-400 text-sm tracking-wide">SKIP</span>
      </div>

      {photo && !imgError ? (
        <img
          src={photo}
          alt={suggestion.name}
          className="w-full h-40 object-cover rounded-xl shrink-0"
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <div className="w-full h-40 rounded-xl bg-muted flex items-center justify-center shrink-0">
          <Home size={36} className="text-muted-foreground/20" />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <TypeBadge type={suggestion.type} />
        <StarRating rating={suggestion.rating} />
        {suggestion.submittedBy && suggestion.submittedBy !== "AI" && (
          <span className="text-xs text-amber-500 ml-auto">by {suggestion.submittedBy}</span>
        )}
      </div>

      <div className="font-bold text-lg leading-tight">{suggestion.name}</div>

      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <MapPin size={12} className="shrink-0" />
        <span className="truncate">{suggestion.location}</span>
      </div>

      {suggestion.whyItFits && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl shrink-0" style={{ backgroundColor: TEAL + "15" }}>
          <Zap size={12} style={{ color: TEAL }} className="shrink-0 mt-0.5" />
          <span className="text-xs leading-snug text-foreground">{suggestion.whyItFits}</span>
        </div>
      )}

      {(suggestion.costPerPerson > 0 || suggestion.totalCost > 0) && (
        <div className="flex items-center gap-5 shrink-0">
          {suggestion.costPerPerson > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">Per person</div>
              <div className="text-xl font-bold" style={{ color: TEAL }}>${suggestion.costPerPerson.toLocaleString()}</div>
            </div>
          )}
          {suggestion.costPerPerson > 0 && suggestion.totalCost > 0 && (
            <div className="w-px h-8 bg-border" />
          )}
          {suggestion.totalCost > 0 && (
            <div>
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-xl font-bold">${suggestion.totalCost.toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      {suggestion.amenities?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {suggestion.amenities.slice(0, 4).map((a: string) => (
            <div key={a} className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              <Check size={9} style={{ color: TEAL }} /> {a}
            </div>
          ))}
        </div>
      )}

      {suggestion.link && (
        <a
          href={suggestion.link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium shrink-0"
          style={{ color: TEAL }}
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={11} /> View listing
        </a>
      )}

      <div className="text-xs text-muted-foreground text-center mt-auto pt-1 shrink-0">← skip · love it →</div>
    </div>
  );
}

/* ── Swipe stack ──────────────────────────────────────────── */

function AccommodationSwipeStack({ suggestions, uid, tripId, onComplete }: {
  suggestions: any[];
  uid: string;
  tripId: string;
  onComplete: () => void;
}) {
  const [pos, setPos] = useState(0);
  const [order] = useState<number[]>(() => suggestions.map((_, i) => i));
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const doVote = useCallback((dir: "up" | "down") => {
    const actualIdx = order[pos];
    if (actualIdx === undefined) return;
    voteAccommodation(tripId, actualIdx, uid, dir);
    const next = pos + 1;
    setPos(next);
    if (next >= order.length) onCompleteRef.current();
  }, [pos, order, tripId, uid]);

  if (suggestions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-8 text-center text-muted-foreground">
        <Home size={48} className="opacity-20" />
        <p className="font-semibold text-foreground">No picks yet</p>
        <p className="text-sm">Go back and paste an accommodation link to get started.</p>
      </div>
    );
  }

  if (pos >= order.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="rounded-2xl border border-border bg-card p-8 flex flex-col items-center gap-3 text-center max-w-sm w-full">
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: TEAL + "20" }}>
            <Check size={28} style={{ color: TEAL }} />
          </div>
          <div className="font-serif text-2xl font-bold">All voted!</div>
          <p className="text-sm text-muted-foreground">
            You've rated all {order.length} {order.length === 1 ? "option" : "options"}. Locking in your vote…
          </p>
        </div>
      </div>
    );
  }

  const topIdx = order[pos];
  const nextIdx = order[pos + 1];
  const thirdIdx = order[pos + 2];
  const CARD_H = 520;

  return (
    <div className="flex-1 flex flex-col items-center pt-3 pb-2 overflow-hidden">
      <span className="text-xs text-muted-foreground mb-3">{pos + 1} / {order.length}</span>

      <div className="relative w-full max-w-sm px-4 flex-1" style={{ maxHeight: CARD_H }}>
        {thirdIdx !== undefined && (
          <div
            className="absolute inset-x-4 rounded-2xl border border-border bg-card"
            style={{ top: 28, bottom: 0, transform: "scale(0.92)", opacity: 0.5, transformOrigin: "bottom center" }}
          />
        )}
        {nextIdx !== undefined && (
          <div
            className="absolute inset-x-4 rounded-2xl border border-border bg-card"
            style={{ top: 14, bottom: 0, transform: "scale(0.96)", opacity: 0.8, transformOrigin: "bottom center" }}
          />
        )}
        <SwipeCard
          key={`card-${pos}`}
          suggestion={suggestions[topIdx]}
          onSwipeRight={() => doVote("up")}
          onSwipeLeft={() => doVote("down")}
        />
      </div>

      <div className="flex gap-8 mt-4 shrink-0">
        <button
          onClick={() => doVote("down")}
          className="w-16 h-16 rounded-full flex items-center justify-center border-2 transition-colors hover:bg-red-50"
          style={{ borderColor: "#ef444440", backgroundColor: "#ef444408" }}
        >
          <X size={28} color="#ef4444" />
        </button>
        <button
          onClick={() => doVote("up")}
          className="w-16 h-16 rounded-full flex items-center justify-center border-2 transition-colors hover:bg-green-50"
          style={{ borderColor: "#22c55e40", backgroundColor: "#22c55e08" }}
        >
          <Heart size={26} color="#22c55e" />
        </button>
      </div>
    </div>
  );
}

/* ── Ranked card (post-lock) ────────────────────────────── */

function RankedCard({ suggestion, idx, tripId, uid, votes, members, isWinning, allLocked, isCreator, onConfirm }: {
  suggestion: any; idx: number; tripId: string; uid: string;
  votes: Record<string, "up" | "down">; members: Record<string, { name: string }>;
  isWinning: boolean; allLocked: boolean; isCreator: boolean;
  onConfirm: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const upVoters = Object.entries(votes).filter(([, v]) => v === "up");
  const downVoters = Object.entries(votes).filter(([, v]) => v === "down");
  const score = upVoters.length - downVoters.length;
  const upNames = upVoters.map(([id]) => members[id]?.name ?? "Someone");
  const downNames = downVoters.map(([id]) => members[id]?.name ?? "Someone");
  const winner = isWinning && allLocked;
  const photo = suggestion.photos?.[0];

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        border: winner ? `2px solid ${TEAL}` : "1px solid var(--border)",
        backgroundColor: winner ? "#2B2723" : undefined,
      }}
    >
      {winner && (
        <div className="px-4 pt-3 pb-0">
          <div
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold text-white mb-2"
            style={{ backgroundColor: TEAL }}
          >
            ⭐ WINNER
          </div>
        </div>
      )}

      {photo && !imgError ? (
        <img
          src={photo}
          alt={suggestion.name}
          className="w-full h-44 object-cover"
          onError={() => setImgError(true)}
        />
      ) : null}

      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <TypeBadge type={suggestion.type} />
              <StarRating rating={suggestion.rating} />
            </div>
            <div className={`font-bold text-base ${winner ? "text-[#FFFDF9]" : "text-foreground"}`}>{suggestion.name}</div>
            <div className="flex items-center gap-1 mt-0.5">
              <MapPin size={11} color={winner ? "#BDB0A0" : "var(--muted-foreground)"} />
              <span className={`text-xs ${winner ? "text-[#BDB0A0]" : "text-muted-foreground"}`}>{suggestion.location}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold" style={{ color: score > 0 ? TEAL : "var(--muted-foreground)" }}>
              {score > 0 ? `+${score}` : score}
            </div>
            <div className="text-xs text-muted-foreground">score</div>
          </div>
        </div>

        {suggestion.whyItFits && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl" style={{ backgroundColor: winner ? "#3A3330" : "var(--muted)" }}>
            <Zap size={12} color={TEAL} className="shrink-0 mt-0.5" />
            <span className={`text-xs leading-snug ${winner ? "text-[#FFFDF9]" : "text-foreground"}`}>{suggestion.whyItFits}</span>
          </div>
        )}

        {(suggestion.costPerPerson > 0 || suggestion.totalCost > 0) && (
          <div className="flex items-center gap-4 py-2 px-3 rounded-xl bg-muted/50">
            {suggestion.totalCost > 0 && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className={`text-sm font-bold ${winner ? "text-[#FFFDF9]" : "text-foreground"}`}>${suggestion.totalCost.toLocaleString()}</div>
              </div>
            )}
            {suggestion.totalCost > 0 && suggestion.costPerPerson > 0 && <div className="w-px h-8 bg-border" />}
            {suggestion.costPerPerson > 0 && (
              <div className="text-center">
                <div className="text-xs text-muted-foreground">Per person</div>
                <div className="text-sm font-bold" style={{ color: TEAL }}>${suggestion.costPerPerson.toLocaleString()}</div>
              </div>
            )}
          </div>
        )}

        {suggestion.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestion.amenities.slice(0, 5).map((a: string) => (
              <div key={a} className="flex items-center gap-1 text-xs text-muted-foreground">
                <Check size={10} color={TEAL} /> {a}
              </div>
            ))}
          </div>
        )}

        {suggestion.distanceNote && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Navigation size={11} /> {suggestion.distanceNote}
          </div>
        )}

        {suggestion.link && (
          <a
            href={suggestion.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-sm font-medium"
            style={{ borderColor: TEAL, color: TEAL }}
          >
            <ExternalLink size={13} /> View listing
          </a>
        )}

        {upNames.length > 0 && (
          <div className="flex items-center gap-1 text-xs" style={{ color: "#22c55e" }}>
            <Heart size={11} fill="#22c55e" /> {upNames.join(", ")}
          </div>
        )}
        {downNames.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <X size={11} /> {downNames.join(", ")}
          </div>
        )}

        {isCreator && winner && (
          <button
            onClick={onConfirm}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white font-semibold text-sm"
            style={{ backgroundColor: TEAL }}
          >
            <Check size={15} /> Book this one
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Main screen ────────────────────────────────────────── */

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
  const [linkUrl, setLinkUrl] = useState("");
  const [linkCost, setLinkCost] = useState("");
  const [addingLink, setAddingLink] = useState(false);
  const [addLinkError, setAddLinkError] = useState("");
  const [parseStatus, setParseStatus] = useState<"idle" | "fetching" | "saving">("idle");

  const uid = user?.uid ?? "";
  const suggestions: any[] = trip?.accommodationSuggestions ?? [];
  const allVotes = trip?.accommodationVotes ?? {};
  const lockedBy = trip?.accommodationLockedBy ?? {};
  const members = trip?.members ?? {};
  const memberEntries = Object.entries(members) as [string, { name: string }][];
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
    const rawUrl = linkUrl.trim();
    if (!rawUrl) return;
    setAddingLink(true);
    setAddLinkError("");
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const mCount = Object.keys(members).length || 1;
    const total = parseFloat(linkCost) || 0;
    try {
      setParseStatus("fetching");
      const parseRes = await fetch("/api/parse-accommodation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, destination: trip?.destination ?? "" }),
      });
      let parsed: any = {};
      if (parseRes.ok) parsed = await parseRes.json();

      setParseStatus("saving");
      await addMemberAccommodationLink(tripId, {
        id: `member-${Date.now()}`,
        name: parsed.name || "Member pick",
        type: parsed.type || "other",
        location: parsed.location || trip?.destination || "",
        totalCost: total,
        costPerPerson: total ? Math.round(total / mCount) : 0,
        nights: trip?.days ?? 1,
        rating: parsed.rating || 0,
        amenities: parsed.amenities || [],
        rooms: 1,
        beds: mCount,
        cancellation: parsed.cancellation || "Check listing",
        whyItFits: parsed.whyItFits || "Added by a pack member",
        tags: parsed.tags || ["Member pick"],
        distanceNote: parsed.distanceNote || "See listing for details",
        link: url,
        photos: parsed.photos || [],
        submittedBy: members[uid]?.name ?? user?.displayName ?? "Member",
      });
      setLinkUrl("");
      setLinkCost("");
      setShowAddLink(false);
      setParseStatus("idle");
    } catch {
      setAddLinkError("Couldn't parse the listing. Please try again.");
      setParseStatus("idle");
    } finally {
      setAddingLink(false);
    }
  };

  const handleSwipeComplete = async () => {
    if (!myLocked) {
      try { await lockAccommodationVotes(tripId, uid); } catch { /* ignore */ }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 size={24} className="animate-spin" style={{ color: TEAL }} />
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
          <div className="text-xs font-bold tracking-widest" style={{ color: TEAL }}>WHERE TO STAY</div>
          <div className="font-semibold text-sm">{myLocked ? "Results" : "Swipe to vote"}</div>
        </div>
        <button
          onClick={() => setShowAddLink(true)}
          className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border font-medium hover:bg-muted transition-colors shrink-0"
          style={{ borderColor: TEAL, color: TEAL }}
        >
          <Plus size={14} /> Add link
        </button>
      </div>

      {/* Lock-in bar */}
      <div className="px-4 py-3 border-b border-border bg-card flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">
            {allLocked ? "All votes locked ✓" : myLocked ? "Your vote is locked ✓" : `${lockedCount} of ${memberCount} locked in`}
          </div>
          <div className="h-1.5 rounded-full bg-muted mt-1.5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ backgroundColor: allLocked ? "#22c55e" : TEAL, width: memberCount > 0 ? `${(lockedCount / memberCount) * 100}%` : "0%" }}
            />
          </div>
        </div>
        <button
          onClick={handleToggleLock}
          disabled={locking}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shrink-0 disabled:opacity-60 transition-colors"
          style={{ backgroundColor: myLocked ? "#22c55e" : TEAL }}
        >
          {locking
            ? <Loader2 size={13} className="animate-spin" />
            : myLocked
            ? <><Check size={13} /> Locked</>
            : <><Lock size={13} /> Lock in</>}
        </button>
      </div>

      {lockError && <div className="mx-4 mt-2 text-xs text-red-500">{lockError}</div>}

      {/* Member avatars */}
      {memberEntries.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-2 border-b border-border/50">
          <div className="flex -space-x-2">
            {memberEntries.map(([muid, m], i) => (
              <div key={muid} className="relative">
                <Avatar name={m.name} index={i} size={28} />
                {lockedBy[muid] && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border border-background flex items-center justify-center">
                    <Check size={7} className="text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{lockedCount}/{memberCount} locked</span>
        </div>
      )}

      {/* Main content */}
      {!myLocked ? (
        <AccommodationSwipeStack
          suggestions={suggestions}
          uid={uid}
          tripId={tripId}
          onComplete={handleSwipeComplete}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 pt-4 pb-12 flex flex-col gap-3">
            {confirming && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: TEAL + "18", color: TEAL }}>
                <Loader2 size={14} className="animate-spin" /> Confirming accommodation…
              </div>
            )}

            {allLocked && !isCreator && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted text-sm text-muted-foreground">
                <ChevronUp size={14} />
                Waiting for the trip creator to confirm the winner.
              </div>
            )}

            {[...suggestions]
              .map((s: any, i: number) => ({ s, i, score: getScore(i) }))
              .sort((a, b) => b.score - a.score)
              .map(({ s, i }) => (
                <RankedCard
                  key={s.id ?? i}
                  suggestion={s}
                  idx={i}
                  tripId={tripId}
                  uid={uid}
                  votes={getVotesForIdx(i)}
                  members={members}
                  isWinning={i === winnerIdx}
                  allLocked={allLocked}
                  isCreator={isCreator}
                  onConfirm={handleConfirm}
                />
              ))}

            <button
              onClick={handleToggleLock}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Re-vote on options
            </button>
          </div>
        </div>
      )}

      {/* Add link modal */}
      {showAddLink && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50"
          onClick={() => { if (!addingLink) setShowAddLink(false); }}
        >
          <div
            className="w-full max-w-lg bg-card rounded-t-2xl p-6 pb-8 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-muted rounded-full mx-auto" />
            <div className="flex items-center justify-between">
              <span className="font-semibold text-lg">Add your own pick</span>
              <button onClick={() => setShowAddLink(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              Paste any listing URL — Airbnb, Booking.com, Hotels.com, etc. AI will extract the details automatically.
            </p>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/50 focus-within:border-teal-400 transition-colors">
              <span style={{ color: TEAL }}>🔗</span>
              <input
                type="url"
                placeholder="https://airbnb.com/rooms/…"
                value={linkUrl}
                onChange={e => setLinkUrl(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                autoFocus
                disabled={addingLink}
              />
            </div>

            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/50">
              <span className="text-muted-foreground">$</span>
              <input
                type="number"
                placeholder="Total cost for group (optional)"
                value={linkCost}
                onChange={e => setLinkCost(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
                disabled={addingLink}
              />
            </div>

            {addingLink && (
              <div className="flex items-center gap-2 text-sm" style={{ color: TEAL }}>
                <Loader2 size={14} className="animate-spin" />
                {parseStatus === "fetching" ? "AI is reading the listing…" : "Saving to vote…"}
              </div>
            )}

            {addLinkError && <p className="text-xs text-red-500">{addLinkError}</p>}

            <button
              onClick={handleAddLink}
              disabled={addingLink || !linkUrl.trim()}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
              style={{ backgroundColor: TEAL }}
            >
              {addingLink ? "Adding…" : "Add to vote"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
