import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Lock, Check, RefreshCw, Navigation, Sun, ArrowUp, ArrowDown, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip } from "@/hooks/useFirebase";
import {
  voteDestination,
  lockDestinationVotes,
  unlockDestinationVotes,
  confirmDestination,
  storeRedoSuggestions,
} from "@/hooks/useFirebase";

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

interface SuggestionCardProps {
  suggestion: any;
  idx: number;
  tripId: string;
  uid: string;
  votes: Record<string, "up" | "down">;
  members: Record<string, { name: string }>;
  isWinning: boolean;
  allLocked: boolean;
  isCreator: boolean;
  packConfirmed: boolean;
  onConfirm: () => void;
}

function SuggestionCard({ suggestion, idx, tripId, uid, votes, members, isWinning, allLocked, isCreator, packConfirmed, onConfirm }: SuggestionCardProps) {
  const myVote = votes[uid] ?? null;
  const upVoters = Object.entries(votes).filter(([, v]) => v === "up");
  const downVoters = Object.entries(votes).filter(([, v]) => v === "down");
  const score = upVoters.length - downVoters.length;
  const upNames = upVoters.map(([id]) => members[id]?.name ?? "Unknown");
  const downNames = downVoters.map(([id]) => members[id]?.name ?? "Unknown");
  const winner = isWinning && allLocked;

  const handleVote = (dir: "up" | "down") => {
    voteDestination(tripId, idx, uid, dir);
  };

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${winner ? "border-2" : "border"}`}
      style={{
        backgroundColor: winner ? "#2B2723" : undefined,
        borderColor: winner ? "#E85D3A" : undefined,
      }}
    >
      {winner && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold mb-2">
          ⭐ WINNER
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className={`font-bold text-base ${winner ? "text-[#FFFDF9]" : "text-foreground"}`}>
            {suggestion.name}
          </div>
          <div className={`text-sm mt-0.5 ${winner ? "text-[#BDB0A0]" : "text-muted-foreground"}`}>
            {suggestion.pitch}
          </div>
        </div>

        {/* Vote arrows */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <button
            onClick={() => handleVote("up")}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: myVote === "up" ? "rgba(232,93,58,0.15)" : "transparent" }}
          >
            <ArrowUp size={18} color={myVote === "up" ? "#E85D3A" : "#888"} strokeWidth={2.5} />
          </button>
          <span className="text-sm font-bold" style={{ color: score > 0 ? "#E85D3A" : "#888" }}>
            {score > 0 ? `+${score}` : score}
          </span>
          <button
            onClick={() => handleVote("down")}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ backgroundColor: myVote === "down" ? "rgba(0,0,0,0.08)" : "transparent" }}
          >
            <ArrowDown size={18} color={myVote === "down" ? "#444" : "#888"} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Tags */}
      {suggestion.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {suggestion.tags.map((tag: string) => (
            <span key={tag} className="px-2 py-0.5 rounded-full bg-muted text-xs text-foreground">{tag}</span>
          ))}
        </div>
      )}

      {/* Meta */}
      <div className="flex gap-4 mt-2">
        {suggestion.flightHint && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Navigation size={11} />
            {suggestion.flightHint}
          </div>
        )}
        {suggestion.bestTime && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sun size={11} />
            {suggestion.bestTime}
          </div>
        )}
      </div>

      {/* Voter names */}
      {upNames.length > 0 && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-primary">
          <ArrowUp size={11} />
          {upNames.join(", ")}
        </div>
      )}
      {downNames.length > 0 && (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
          <ArrowDown size={11} />
          {downNames.join(", ")}
        </div>
      )}

      {/* Confirm button — creator, winner, all locked */}
      {isCreator && winner && (
        <button
          onClick={onConfirm}
          className="w-full flex items-center justify-center gap-2 mt-3 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm"
        >
          <Check size={15} />
          Set as destination
        </button>
      )}
    </div>
  );
}

export default function DestinationVote() {
  const [, params] = useRoute("/trip/:tripId/destination-vote");
  const tripId = params?.tripId ?? "";
  const { user } = useAuth();
  const { trip, loading } = useTrip(tripId);
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (trip && !trip.packConfirmed) setLocation(`/trip/${tripId}`);
  }, [trip?.packConfirmed, tripId]);

  const [locking, setLocking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lockError, setLockError] = useState("");

  const uid = user?.uid ?? "";
  const suggestions = trip?.destinationSuggestions ?? [];
  const allVotes = trip?.destinationVotes ?? {};
  const lockedBy = trip?.destinationLockedBy ?? {};
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
        setLockError(`Vote on all ${suggestions.length} destinations before locking in (${unvoted.length} remaining).`);
        return;
      }
    }
    setLocking(true);
    try {
      if (myLocked) await unlockDestinationVotes(tripId, uid);
      else await lockDestinationVotes(tripId, uid);
    } finally {
      setLocking(false);
    }
  };

  // Redirect ALL members (not just the confirming host) when destination is set
  useEffect(() => {
    if (trip?.destination) {
      setLocation(`/trip/${tripId}`);
    }
  }, [trip?.destination, tripId]);

  const handleConfirm = async () => {
    if (!suggestions[winnerIdx]) return;
    setConfirming(true);
    try {
      await confirmDestination(tripId, suggestions[winnerIdx].name);
      // setLocation is handled by the useEffect above for all users
    } finally {
      setConfirming(false);
    }
  };

  const handleRedo = async () => {
    const memberPrefs = trip?.memberPreferences;
    if (!memberPrefs || Object.keys(memberPrefs).length === 0) {
      alert("Member preferences were not found. Go back and submit preferences again.");
      return;
    }
    if (!window.confirm("The AI will generate 3 fresh destinations using the same preferences — votes are reset. Continue?")) return;

    setRedoing(true);
    try {
      const memberPrefsList = Object.entries(memberPrefs).map(([uid2, pref]: any) => ({
        name: trip?.members?.[uid2]?.name ?? "Member",
        vibes: pref.vibes,
        distance: pref.distance,
        budget: pref.budget,
        days: pref.days,
        startDate: pref.startDate,
        startLocation: pref.startLocation,
      }));
      const res = await fetch("/api/suggest-destinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberPreferences: memberPrefsList,
          excludedDestinations: suggestions.map((s: any) => s.name),
        }),
      });
      if (!res.ok) throw new Error("AI couldn't generate suggestions.");
      const data = await res.json() as { suggestions: any[] };
      await storeRedoSuggestions(tripId, data.suggestions);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setRedoing(false);
    }
  };

  const inviteLink = `${window.location.origin}/join/${tripId}`;

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (trip && !trip.packConfirmed) {
    setLocation(`/trip/${tripId}`);
    return null;
  }

  if (!trip || suggestions.length === 0) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="text-muted-foreground">No suggestions yet.</div>
      <button onClick={() => setLocation(`/trip/${tripId}/destination-preferences`)} className="px-4 py-2 rounded-xl border border-border text-sm">
        Go back
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-2">
        <button onClick={() => setLocation(`/trip/${tripId}/destination-preferences`)} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold tracking-widest text-primary">WHERE TO?</div>
          <div className="font-semibold text-sm">Vote on a destination</div>
        </div>
        <div className="flex items-center gap-2">
          {isCreator && (
            <button
              onClick={handleRedo}
              disabled={redoing}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors disabled:opacity-50"
            >
              {redoing ? <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" /> : <RefreshCw size={14} className="text-muted-foreground" />}
            </button>
          )}
          <button onClick={() => setShowInvite(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
            <UserPlus size={13} />
            Invite
          </button>
        </div>
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
                backgroundColor: allLocked ? "#4CAF50" : "var(--primary)",
                width: memberCount > 0 ? `${(lockedCount / memberCount) * 100}%` : "0%",
              }}
            />
          </div>
        </div>
        <button
          onClick={handleToggleLock}
          disabled={locking}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold shrink-0 disabled:opacity-60 transition-colors"
          style={{ backgroundColor: myLocked ? "#4CAF50" : "#E85D3A" }}
        >
          {locking ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Lock size={13} />}
          {myLocked ? "Locked ✓" : "Lock in"}
        </button>
      </div>

      {lockError && (
        <div className="mx-4 mt-2 text-sm text-red-500">{lockError}</div>
      )}

      <div className="flex-1 overflow-y-auto pb-12">
        <div className="px-4 pt-4 flex flex-col gap-3">
          {suggestions.map((s: any, idx: number) => (
            <SuggestionCard
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
              packConfirmed={!!trip?.packConfirmed}
              onConfirm={handleConfirm}
            />
          ))}
        </div>
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowInvite(false)}>
          <div className="w-full max-w-lg bg-card rounded-t-2xl p-6 pb-8" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-muted rounded-full mx-auto mb-4" />
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-lg">Invite the pack</span>
              <button onClick={() => setShowInvite(false)} className="text-muted-foreground">✕</button>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted border border-border">
              <span className="flex-1 text-sm truncate">{inviteLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0"
              >
                {copied ? <Check size={14} /> : <RefreshCw size={14} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
