import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp, Send, Copy, Check, Loader2, MapPin, Calendar,
  Users, ChevronRight, Sparkles, Package, MessageSquare, ArrowLeft,
  UserCircle, AlertCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip } from "@/hooks/useFirebase";
import { useGenerateItinerary, useGeneratePackingList } from "@workspace/api-client-react";

const VIBE_LABELS: Record<string, string> = {
  culture: "Culture", food: "Foodie", adventure: "Adventure",
  relaxation: "Relaxation", nightlife: "Nightlife", shopping: "Shopping",
};
const AVATAR_COLORS = ["#E85D3A", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517", "#C4448A"];

export default function TripHub() {
  const [, params] = useRoute("/trip/:tripId");
  const tripId = params?.tripId || "";
  const { user } = useAuth();
  const { trip, wishes, loading, addWish, toggleVote, updateItinerary, updatePackingList } = useTrip(tripId);
  const [, setLocation] = useLocation();
  const [wishText, setWishText] = useState("");
  const [copied, setCopied] = useState(false);
  const [itineraryError, setItineraryError] = useState("");
  const [packingError, setPackingError] = useState("");
  const [votingId, setVotingId] = useState<string | null>(null);

  const generateItinerary = useGenerateItinerary();
  const generatePacking = useGeneratePackingList();

  const handleAddWish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wishText.trim()) return;
    await addWish(wishText.trim());
    setWishText("");
  };

  const handleGenerateItinerary = () => {
    if (!trip) return;
    setItineraryError("");
    const wishList = wishes.map(w => ({ text: w.text, author: w.author, votes: w.votes }));
    generateItinerary.mutate(
      {
        data: {
          destination: trip.destination,
          days: trip.days,
          vibes: trip.vibes || [],
          budget: trip.budget || "midrange",
          startDate: trip.startDate || null,
          wishes: wishList
        }
      },
      {
        onSuccess: (result) => {
          updateItinerary(result);
          setLocation(`/trip/${tripId}/itinerary`);
        },
        onError: (err: any) => {
          setItineraryError(err?.message || "Generation failed. Please try again.");
        }
      }
    );
  };

  const handleGeneratePacking = () => {
    if (!trip) return;
    setPackingError("");
    generatePacking.mutate(
      {
        data: {
          destination: trip.destination,
          days: trip.days,
          vibes: trip.vibes || [],
          budget: trip.budget || "midrange"
        }
      },
      {
        onSuccess: (result) => {
          updatePackingList(result.list);
          setLocation(`/trip/${tripId}/packing`);
        },
        onError: (err: any) => {
          setPackingError(err?.message || "Generation failed. Please try again.");
        }
      }
    );
  };

  const handleToggleVote = async (wishId: string) => {
    if (votingId) return;
    setVotingId(wishId);
    try {
      await toggleVote(wishId);
    } finally {
      setVotingId(null);
    }
  };

  const copyInviteLink = () => {
    const url = `${window.location.origin}/join/${tripId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
        Trip not found.
      </div>
    );
  }

  const members = trip.members ? Object.entries(trip.members) as [string, any][] : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground" data-testid="link-back">
            <ArrowLeft size={20} />
          </Link>
          <Link href="/" className="font-display font-bold text-xl" data-testid="link-logo">
            go<span className="text-primary">pack</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/trip/${tripId}/chat`}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
            data-testid="link-chat"
          >
            <MessageSquare size={16} /> Chat
          </Link>
          <Link
            href="/profile"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors"
            data-testid="link-profile"
          >
            <UserCircle size={20} />
          </Link>
        </div>
      </nav>

      {/* Trip header */}
      <div className="border-b border-border px-8 py-8 bg-muted/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <MapPin size={14} />
                <span>{trip.destination}</span>
                {trip.startDate && <><Calendar size={14} className="ml-2" /><span>{trip.startDate}</span></>}
              </div>
              <h1 className="font-serif text-4xl font-bold">{trip.destination}</h1>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs px-2.5 py-1 bg-muted rounded-full text-muted-foreground">
                  {trip.days} days
                </span>
                {(trip.vibes || []).map((v: string) => (
                  <span key={v} className="text-xs px-2.5 py-1 bg-primary/10 text-primary rounded-full border border-primary/20">
                    {VIBE_LABELS[v] || v}
                  </span>
                ))}
                <span className="text-xs px-2.5 py-1 bg-muted rounded-full text-muted-foreground capitalize">
                  {trip.budget}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-8 py-10 grid md:grid-cols-[1fr_340px] gap-10">
        {/* Left: Wishes */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-2xl font-bold">Wishlist</h2>
              <p className="text-sm text-muted-foreground">Drop what you want to do. Vote on what matters.</p>
            </div>
            <span className="text-xs text-muted-foreground">{wishes.length} wishes</span>
          </div>

          {/* Add wish */}
          <form onSubmit={handleAddWish} className="flex gap-2 mb-8">
            <input
              value={wishText}
              onChange={e => setWishText(e.target.value)}
              placeholder="Add a wish — e.g. 'Sunset rooftop dinner'"
              className="flex-1 border border-border rounded-full px-5 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-wish"
            />
            <button
              type="submit"
              className="bg-primary text-white rounded-full px-5 py-3 hover:bg-primary/90 transition-colors"
              data-testid="button-add-wish"
            >
              <Send size={16} />
            </button>
          </form>

          {/* Wishes list */}
          <div className="flex flex-col gap-3">
            <AnimatePresence>
              {wishes.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground/60">
                  <Sparkles size={28} className="mx-auto mb-3 opacity-30" />
                  <p>No wishes yet. Be the first to add one!</p>
                </div>
              ) : (
                wishes.map((wish, i) => {
                  const hasVoted = user && wish.votedBy && wish.votedBy[user.uid];
                  const isVoting = votingId === wish.id;
                  return (
                    <motion.div
                      key={wish.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 12 }}
                      transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 border border-border rounded-xl p-4 hover:border-border/80 transition-colors bg-background"
                      data-testid={`card-wish-${wish.id}`}
                    >
                      {/* Vote button — large enough to tap */}
                      <button
                        onClick={() => handleToggleVote(wish.id)}
                        disabled={isVoting}
                        className={`flex flex-col items-center gap-1 min-w-[48px] py-2 px-3 rounded-xl transition-all border ${
                          hasVoted
                            ? "text-primary bg-primary/10 border-primary/30"
                            : "text-muted-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-primary/20"
                        }`}
                        data-testid={`button-vote-${wish.id}`}
                      >
                        {isVoting
                          ? <Loader2 size={18} className="animate-spin" />
                          : <ThumbsUp size={18} className={hasVoted ? "fill-primary/20" : ""} />
                        }
                        <span className="text-sm font-bold leading-none">{wish.votes || 0}</span>
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{wish.text}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">by {(wish.memberId && trip?.members?.[wish.memberId]?.name) || wish.author}</p>
                      </div>
                      {i === 0 && wishes.length > 1 && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20 shrink-0">
                          Top pick
                        </span>
                      )}
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Sidebar */}
        <div className="flex flex-col gap-4">
          {/* Generate Itinerary */}
          <div className="border border-border rounded-2xl p-6 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={18} className="text-primary" />
              <h3 className="font-medium">Generate Itinerary</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              AI builds a day-by-day plan from your top wishes.
            </p>
            <button
              onClick={handleGenerateItinerary}
              disabled={generateItinerary.isPending}
              className="w-full bg-primary text-white font-medium py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              data-testid="button-generate-itinerary"
            >
              {generateItinerary.isPending && <Loader2 size={15} className="animate-spin" />}
              {generateItinerary.isPending ? "Generating… (may take ~30s)" : "Generate itinerary"}
            </button>
            {itineraryError && (
              <div className="mt-3 flex items-start gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{itineraryError}</span>
              </div>
            )}
            {trip.itinerary && (
              <Link
                href={`/trip/${tripId}/itinerary`}
                className="flex items-center justify-between mt-3 px-4 py-2.5 border border-primary/30 bg-primary/5 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors"
                data-testid="link-view-itinerary"
              >
                View itinerary
                <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {/* Generate Packing */}
          <div className="border border-border rounded-2xl p-6 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Package size={18} className="text-primary" />
              <h3 className="font-medium">Packing List</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              AI builds a smart packing list for your trip.
            </p>
            <button
              onClick={handleGeneratePacking}
              disabled={generatePacking.isPending}
              className="w-full border border-border font-medium py-3 rounded-full hover:bg-muted/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
              data-testid="button-generate-packing"
            >
              {generatePacking.isPending && <Loader2 size={15} className="animate-spin" />}
              {generatePacking.isPending ? "Generating… (may take ~30s)" : "Generate packing list"}
            </button>
            {packingError && (
              <div className="mt-3 flex items-start gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <AlertCircle size={13} className="mt-0.5 shrink-0" />
                <span>{packingError}</span>
              </div>
            )}
            {trip.packingList && (
              <Link
                href={`/trip/${tripId}/packing`}
                className="flex items-center justify-between mt-3 px-4 py-2.5 border border-border bg-muted/20 rounded-xl text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                data-testid="link-view-packing"
              >
                View packing list
                <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {/* Invite */}
          <div className="border border-border rounded-2xl p-6 bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-primary" />
              <h3 className="font-medium">Invite the pack</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">Share this link with your group.</p>
            <button
              onClick={copyInviteLink}
              className="w-full flex items-center justify-center gap-2 border border-border py-2.5 rounded-full text-sm font-medium hover:bg-muted/50 transition-colors"
              data-testid="button-copy-invite"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
              {copied ? "Copied!" : "Copy invite link"}
            </button>
            <p className="text-xs text-muted-foreground mt-3 break-all text-center">
              /join/{tripId}
            </p>
          </div>

          {/* Members */}
          {members.length > 0 && (
            <div className="border border-border rounded-2xl p-6 bg-background">
              <h3 className="font-medium mb-4">Members ({members.length})</h3>
              <div className="flex flex-col gap-3">
                {members.map(([uid, member], i) => (
                  <div key={uid} className="flex items-center gap-3" data-testid={`member-${i}`}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium shrink-0"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {member.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name || "Unknown"}</p>
                    </div>
                    {member.isHost && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20 shrink-0">
                        Host
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
