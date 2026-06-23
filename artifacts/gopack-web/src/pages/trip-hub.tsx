import { useState, useEffect } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Copy, Check, Loader2, MapPin, Calendar,
  ChevronUp, Sparkles, Package, ArrowLeft,
  AlertCircle, ChevronRight, Users, ArrowRight, MessageSquare, UserCircle,
  Star, X, Bell, Home, Compass
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip, startCollectingPreferences } from "@/hooks/useFirebase";
import { useGenerateItinerary, useGeneratePackingList } from "@workspace/api-client-react";

const VIBE_LABELS: Record<string, string> = {
  culture: "Culture", food: "Foodie", adventure: "Adventure",
  relaxation: "Relaxation", nightlife: "Nightlife", shopping: "Shopping",
};
const AVATAR_COLORS = ["#E85D3A", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517", "#C4448A"];

const WISH_PLACEHOLDERS = [
  "Sunset rooftop dinner…",
  "Morning hike to a viewpoint…",
  "Cooking class at a local farm…",
  "Street food tour downtown…",
  "Kayaking at dawn…",
  "Hidden speakeasy bar night…",
  "Visit the old town market…",
  "Guided museum tour…",
  "Beachside yoga session…",
  "Boat trip along the coast…",
];

type Tab = "wish" | "vote" | "go";

export default function TripHub() {
  const [, params] = useRoute("/trip/:tripId");
  const tripId = params?.tripId || "";
  const { user } = useAuth();
  const { trip, wishes, loading, addWish, toggleVote, updateItinerary, updatePackingList, submitReview } = useTrip(tripId);
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>("wish");
  const [wishText, setWishText] = useState("");
  const [wishPlaceholderIdx, setWishPlaceholderIdx] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setWishPlaceholderIdx(i => (i + 1) % WISH_PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(t);
  }, []);
  const [itineraryError, setItineraryError] = useState("");
  const [packingError, setPackingError] = useState("");
  const [votingId, setVotingId] = useState<string | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewHighlight, setReviewHighlight] = useState("");
  const [reviewVibes, setReviewVibes] = useState<string[]>([]);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

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
      { data: { destination: trip.destination, days: trip.days, vibes: trip.vibes || [], budget: trip.budget || "midrange", startDate: trip.startDate || null, wishes: wishList } },
      {
        onSuccess: (result) => { updateItinerary(result); setLocation(`/trip/${tripId}/itinerary`); },
        onError: (err: any) => { setItineraryError(err?.message || "Generation failed. Please try again."); },
      }
    );
  };

  const handleGeneratePacking = () => {
    if (!trip) return;
    setPackingError("");
    generatePacking.mutate(
      { data: { destination: trip.destination, days: trip.days, vibes: trip.vibes || [], budget: trip.budget || "midrange" } },
      {
        onSuccess: (result) => { updatePackingList(result.list); setLocation(`/trip/${tripId}/packing`); },
        onError: (err: any) => { setPackingError(err?.message || "Generation failed. Please try again."); },
      }
    );
  };

  const handleToggleVote = async (wishId: string) => {
    if (votingId) return;
    setVotingId(wishId);
    try { await toggleVote(wishId); } finally { setVotingId(null); }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/join/${tripId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tripEnded = (() => {
    if (!trip?.startDate) return false;
    const start = new Date(trip.startDate);
    const end = new Date(start.getTime() + (trip.days || 1) * 24 * 60 * 60 * 1000);
    return end < new Date();
  })();

  const isMember = !!trip?.members?.[user?.uid || ""];
  const hasReview = !!trip?.review;
  const showReviewBanner = tripEnded && isMember && !hasReview && !reviewDone;

  const handleOpenReview = () => {
    setReviewVibes(trip?.vibes || []);
    setReviewOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewRating || !reviewText.trim()) return;
    setReviewSubmitting(true);
    try {
      await submitReview({
        rating: reviewRating,
        text: reviewText.trim(),
        vibes: reviewVibes,
        highlight: reviewHighlight.trim(),
      });
      setReviewDone(true);
      setReviewOpen(false);
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-primary" />
    </div>
  );

  if (!trip) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
      Trip not found.
    </div>
  );

  const members = trip.members ? Object.entries(trip.members) as [string, any][] : [];
  const memberCount = members.length;

  /* who has voted on at least one wish */
  const voterUids = new Set<string>();
  wishes.forEach(w => { if (w.votedBy) Object.keys(w.votedBy).forEach(uid => voterUids.add(uid)); });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">

      {/* ── Top nav ── */}
      <nav className="flex items-center px-6 py-3 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-20 gap-4">
        {/* Left: logo + destination — flex-1 so it shares space equally with right */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground shrink-0" data-testid="link-back">
            <ArrowLeft size={18} />
          </Link>
          <Link href="/" className="font-display font-bold text-lg shrink-0" data-testid="link-logo">
            go<span className="text-primary">pack</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border text-sm shrink-0">
            <MapPin size={12} className="text-primary shrink-0" />
            <span className="font-medium truncate max-w-[120px]">{trip.destination}</span>
            <span className="text-muted-foreground">· {trip.days}d</span>
          </div>
        </div>

        {/* Center: tab switcher — exact center of the nav */}
        <div className="flex items-center gap-0.5 bg-muted/50 rounded-xl p-1 border border-border shrink-0">
          {(["wish", "vote", "go"] as Tab[]).map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${tab}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                activeTab === tab ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</span>
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </div>

        {/* Right: secondary actions — flex-1 + justify-end mirrors the left */}
        <div className="flex items-center justify-end gap-2 flex-1">
          <Link href={`/trip/${tripId}/chat`} className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors" data-testid="link-chat">
            <MessageSquare size={15} /> Chat
          </Link>
          <Link href="/notifications" className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition-colors" data-testid="link-notifications">
            <Bell size={20} />
          </Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted/50 transition-colors" data-testid="link-profile">
            <UserCircle size={20} />
          </Link>
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors font-medium shrink-0"
            data-testid="button-invite"
          >
            {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            {copied ? "Copied!" : "Invite"}
          </button>
        </div>
      </nav>

      {/* ── Main content ── */}
      <div className="flex-1 flex">
        {/* Left / center content */}
        <div className="flex-1 min-w-0 px-6 py-8 md:px-10">

          {/* ── Review banner (shown when trip has ended) ── */}
          <AnimatePresence>
            {showReviewBanner && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 flex items-center justify-between gap-4 border border-primary/40 bg-primary/5 rounded-2xl px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Star size={18} className="text-primary shrink-0 fill-primary/20" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">How was the trip?</p>
                    <p className="text-xs text-muted-foreground truncate">Your trip to {trip.destination} is done — share how it went with the community.</p>
                  </div>
                </div>
                <button
                  onClick={handleOpenReview}
                  className="shrink-0 bg-primary text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-primary/90 transition-colors"
                  data-testid="button-leave-review"
                >
                  Leave a review
                </button>
              </motion.div>
            )}
            {(hasReview || reviewDone) && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center gap-3 border border-green-200 bg-green-50 rounded-2xl px-5 py-4 text-green-800"
              >
                <Check size={16} className="shrink-0" />
                <p className="text-sm font-medium">Review submitted — thanks for sharing your experience!</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">

            {/* ── TAB 1: WISH ── */}
            {activeTab === "wish" && (
              <motion.div key="wish" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h1 className="font-serif text-3xl font-bold">The pack&apos;s wishlist</h1>
                    <p className="text-sm text-muted-foreground mt-1">Drop what you want to do. Vote on what matters.</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{wishes.length} wishes</span>
                </div>

                {/* Add wish */}
                <form onSubmit={handleAddWish} className="flex gap-2 mb-8">
                  <input
                    value={wishText}
                    onChange={e => setWishText(e.target.value)}
                    placeholder={WISH_PLACEHOLDERS[wishPlaceholderIdx]}
                    className="flex-1 border border-border rounded-full px-5 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                    data-testid="input-wish"
                  />
                  <button type="submit" className="bg-primary text-white rounded-full px-5 py-3 hover:bg-primary/90 transition-colors" data-testid="button-add-wish">
                    <Send size={16} />
                  </button>
                </form>

                {/* Wish list */}
                <div className="flex flex-col gap-3 max-w-2xl">
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
                            className="flex items-center gap-4 border border-border rounded-xl p-4 bg-background hover:border-border/60 transition-colors"
                            data-testid={`card-wish-${wish.id}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">{wish.text}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                by {(wish.memberId && trip?.members?.[wish.memberId]?.name) || wish.author}
                              </p>
                            </div>
                            {i === 0 && wishes.length > 1 && (
                              <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20 shrink-0">
                                Top pick
                              </span>
                            )}
                            {/* Upvote button with arrow */}
                            <button
                              onClick={() => handleToggleVote(wish.id)}
                              disabled={isVoting}
                              className={`flex flex-col items-center gap-0.5 min-w-[44px] py-2 px-3 rounded-xl transition-all border ${
                                hasVoted
                                  ? "text-primary bg-primary/10 border-primary/30"
                                  : "text-muted-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-primary/20"
                              }`}
                              data-testid={`button-vote-${wish.id}`}
                            >
                              {isVoting
                                ? <Loader2 size={16} className="animate-spin" />
                                : <ChevronUp size={18} className={hasVoted ? "stroke-[2.5]" : ""} />
                              }
                              <span className="text-sm font-bold leading-none">{wish.votes || 0}</span>
                            </button>
                          </motion.div>
                        );
                      })
                    )}
                  </AnimatePresence>
                </div>

                {/* Go to vote nudge */}
                {wishes.length >= 2 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                    className="mt-8 max-w-2xl">
                    <button onClick={() => setActiveTab("vote")} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                      See top wishes rising → <ChevronRight size={14} />
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* ── TAB 2: VOTE ── */}
            {activeTab === "vote" && (
              <motion.div key="vote" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                <div className="mb-6">
                  <h1 className="font-serif text-3xl font-bold">Top wishes rising</h1>
                  <p className="text-sm text-muted-foreground mt-1">Ranked by votes — the most wanted plans float to the top.</p>
                </div>

                <div className="flex flex-col gap-3 max-w-2xl">
                  {wishes.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground/60">
                      <Sparkles size={28} className="mx-auto mb-3 opacity-30" />
                      <p>No wishes yet. Add some in the Wish tab first.</p>
                      <button onClick={() => setActiveTab("wish")} className="mt-4 text-sm text-primary hover:underline">
                        Go add wishes →
                      </button>
                    </div>
                  ) : (
                    wishes.map((wish, i) => {
                      const hasVoted = user && wish.votedBy && wish.votedBy[user.uid];
                      const isVoting = votingId === wish.id;
                      const rankStyle = i === 0
                        ? "border-primary/40 bg-primary/5"
                        : i === 1
                        ? "border-border bg-muted/20"
                        : "border-border bg-background";
                      return (
                        <motion.div
                          key={wish.id}
                          initial={{ opacity: 0, x: -12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`flex items-center gap-4 border rounded-xl p-4 transition-colors ${rankStyle}`}
                          data-testid={`card-vote-${wish.id}`}
                        >
                          {/* Rank number */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm shrink-0 ${
                            i === 0 ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                          }`}>
                            {i + 1}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{wish.text}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              by {(wish.memberId && trip?.members?.[wish.memberId]?.name) || wish.author}
                            </p>
                          </div>

                          {/* Vote */}
                          <button
                            onClick={() => handleToggleVote(wish.id)}
                            disabled={isVoting}
                            className={`flex flex-col items-center gap-0.5 min-w-[44px] py-2 px-3 rounded-xl transition-all border ${
                              hasVoted
                                ? "text-primary bg-primary/10 border-primary/30"
                                : "text-muted-foreground hover:text-primary hover:bg-primary/10 border-transparent hover:border-primary/20"
                            }`}
                            data-testid={`button-vote-rank-${wish.id}`}
                          >
                            {isVoting
                              ? <Loader2 size={16} className="animate-spin" />
                              : <ChevronUp size={18} className={hasVoted ? "stroke-[2.5]" : ""} />
                            }
                            <span className="text-sm font-bold leading-none">{wish.votes || 0}</span>
                          </button>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {wishes.length > 0 && (
                  <div className="mt-8 max-w-2xl">
                    <button onClick={() => setActiveTab("go")} className="flex items-center gap-2 text-sm text-primary hover:underline font-medium">
                      Ready to build the trip? → <ChevronRight size={14} />
                    </button>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── TAB 3: GO ── */}
            {activeTab === "go" && (
              <motion.div key="go" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.18 }}>
                <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-4">Ready when you are</p>
                <h1 className="font-serif text-3xl font-bold mb-2">Build the itinerary</h1>
                <p className="text-muted-foreground mb-8">
                  AI will turn your top wishes into a perfect day-by-day plan for {trip.destination}.
                </p>

                <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
                  {/* Generate Itinerary */}
                  <div className="border border-border rounded-2xl p-6 bg-background flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={18} className="text-primary" />
                      <h3 className="font-semibold">AI Itinerary</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5 flex-1">
                      Day-by-day plan built from your {wishes.length} wishes, tailored to {trip.destination}.
                    </p>
                    <button
                      onClick={handleGenerateItinerary}
                      disabled={generateItinerary.isPending}
                      className="w-full bg-primary text-white font-medium py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                      data-testid="button-generate-itinerary"
                    >
                      {generateItinerary.isPending && <Loader2 size={14} className="animate-spin" />}
                      {generateItinerary.isPending ? "Generating…" : "Generate itinerary"}
                      {!generateItinerary.isPending && <ArrowRight size={14} />}
                    </button>
                    {itineraryError && (
                      <div className="mt-3 flex items-start gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                        <AlertCircle size={13} className="mt-0.5 shrink-0" />
                        <span>{itineraryError}</span>
                      </div>
                    )}
                    {trip.itinerary && (
                      <Link href={`/trip/${tripId}/itinerary`}
                        className="flex items-center justify-between mt-3 px-4 py-2.5 border border-primary/30 bg-primary/5 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors"
                        data-testid="link-view-itinerary">
                        View itinerary <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>

                  {/* Generate Packing */}
                  <div className="border border-border rounded-2xl p-6 bg-background flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={18} className="text-primary" />
                      <h3 className="font-semibold">Packing List</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5 flex-1">
                      Smart packing list based on your destination, vibes, and budget.
                    </p>
                    <button
                      onClick={handleGeneratePacking}
                      disabled={generatePacking.isPending}
                      className="w-full bg-primary text-white font-medium py-3 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                      data-testid="button-generate-packing"
                    >
                      {generatePacking.isPending && <Loader2 size={14} className="animate-spin" />}
                      {generatePacking.isPending ? "Generating…" : "Generate packing list"}
                      {!generatePacking.isPending && <Package size={14} />}
                    </button>
                    {packingError && (
                      <div className="mt-3 flex items-start gap-2 text-destructive text-xs bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                        <AlertCircle size={13} className="mt-0.5 shrink-0" />
                        <span>{packingError}</span>
                      </div>
                    )}
                    {trip.packingList && (
                      <Link href={`/trip/${tripId}/packing`}
                        className="flex items-center justify-between mt-3 px-4 py-2.5 border border-border bg-muted/20 rounded-xl text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                        data-testid="link-view-packing">
                        View packing list <ChevronRight size={14} />
                      </Link>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── Persistent right sidebar ── */}
        <aside className="hidden lg:flex flex-col gap-4 w-72 xl:w-80 shrink-0 border-l border-border px-6 py-8">

          {/* THE PACK */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users size={14} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground tracking-widest uppercase">The pack · {memberCount}</span>
            </div>
            <div className="flex flex-col gap-2">
              {members.map(([uid, member], i) => {
                const hasVoted = voterUids.has(uid);
                return (
                  <div key={uid} className="flex items-center gap-3" data-testid={`member-${i}`}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                      style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}
                    >
                      {member.name?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.name || "Unknown"}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {member.isHost && (
                        <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">host</span>
                      )}
                      {activeTab === "vote" && hasVoted && (
                        <Check size={14} className="text-green-500" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Trip details */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={13} className="text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">{trip.destination}</span>
            </div>
            {trip.startDate && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar size={13} className="text-muted-foreground shrink-0" />
                <span className="text-muted-foreground">{trip.startDate}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className="text-xs px-2.5 py-0.5 bg-muted rounded-full text-muted-foreground border border-border">{trip.days} days</span>
              {(trip.vibes || []).map((v: string) => (
                <span key={v} className="text-xs px-2.5 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20">
                  {VIBE_LABELS[v] || v}
                </span>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Invite */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Invite the pack</p>
            <p className="text-xs text-muted-foreground mb-3">More wishes = better plan. Share this link.</p>
            <button
              onClick={copyInviteLink}
              className="w-full flex items-center justify-center gap-2 border border-border py-2.5 rounded-full text-sm font-medium hover:bg-muted/50 transition-colors"
              data-testid="button-copy-invite"
            >
              {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
              {copied ? "Copied!" : "Copy invite link"}
            </button>
            <p className="text-xs text-muted-foreground/60 mt-2 text-center truncate">/join/{tripId}</p>
          </div>

          {/* Destination & accommodation flows — only shown when no destination yet */}
          {(!trip.destination || trip.collectingPreferences || trip.destinationSuggestions?.length || trip.accommodationPreferences || trip.accommodationSuggestions?.length || trip.confirmedAccommodation) && (
            <>
              <div className="border-t border-border" />
              <div>
                <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Plan the trip</p>
                <div className="flex flex-col gap-2">
                  {(trip.collectingPreferences || trip.memberPreferences) && (
                    <Link href={`/trip/${tripId}/destination-preferences`}
                      className="flex items-center justify-between px-4 py-2.5 border border-violet-300/40 bg-violet-500/5 rounded-xl text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors">
                      <span className="flex items-center gap-2"><Compass size={13} />Destination preferences</span>
                      <ChevronRight size={13} />
                    </Link>
                  )}
                  {trip.destinationSuggestions?.length > 0 && (
                    <Link href={`/trip/${tripId}/destination-vote`}
                      className="flex items-center justify-between px-4 py-2.5 border border-violet-300/40 bg-violet-500/5 rounded-xl text-sm text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors">
                      <span className="flex items-center gap-2"><Compass size={13} />Vote on destination</span>
                      <ChevronRight size={13} />
                    </Link>
                  )}
                  {(trip.accommodationPreferences || trip.accommodationSuggestions?.length) && (
                    <Link href={`/trip/${tripId}/accommodation-preferences`}
                      className="flex items-center gap-3 px-4 py-3 border-2 border-teal-400/60 bg-teal-500/10 rounded-xl text-sm text-teal-700 hover:bg-teal-500/20 hover:border-teal-500 transition-all font-medium shadow-sm">
                      <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                        <Home size={13} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div>Accommodation</div>
                        <div className="text-xs font-normal text-teal-600/80">Pick where you'll stay</div>
                      </div>
                      <ChevronRight size={14} />
                    </Link>
                  )}
                  {trip.accommodationSuggestions?.length > 0 && (
                    <Link href={`/trip/${tripId}/accommodation-vote`}
                      className="flex items-center gap-3 px-4 py-3 border-2 border-teal-400/60 bg-teal-500/10 rounded-xl text-sm text-teal-700 hover:bg-teal-500/20 hover:border-teal-500 transition-all font-medium shadow-sm">
                      <div className="w-7 h-7 rounded-full bg-teal-500 flex items-center justify-center shrink-0">
                        <Home size={13} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <div>Vote on accommodation</div>
                        <div className="text-xs font-normal text-teal-600/80">{trip.accommodationSuggestions.length} options to vote on</div>
                      </div>
                      <ChevronRight size={14} />
                    </Link>
                  )}
                  {trip.confirmedAccommodation && (
                    <div className="flex items-center gap-2 px-4 py-2.5 border border-green-300/40 bg-green-500/5 rounded-xl text-sm text-green-600 dark:text-green-400">
                      <Check size={13} />
                      {trip.confirmedAccommodation.name}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* View links if generated */}
          {(trip.itinerary || trip.packingList) && (
            <>
              <div className="border-t border-border" />
              <div className="flex flex-col gap-2">
                {trip.itinerary && (
                  <Link href={`/trip/${tripId}/itinerary`}
                    className="flex items-center justify-between px-4 py-2.5 border border-primary/30 bg-primary/5 rounded-xl text-sm text-primary hover:bg-primary/10 transition-colors"
                    data-testid="link-sidebar-itinerary">
                    View itinerary <ChevronRight size={13} />
                  </Link>
                )}
                {trip.packingList && (
                  <Link href={`/trip/${tripId}/packing`}
                    className="flex items-center justify-between px-4 py-2.5 border border-border bg-muted/20 rounded-xl text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
                    data-testid="link-sidebar-packing">
                    View packing list <ChevronRight size={13} />
                  </Link>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── Mobile bottom bar (sidebar info collapsed) ── */}
      <div className="lg:hidden border-t border-border px-6 py-4 bg-background">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {members.slice(0, 4).map(([uid, member], i) => (
                <div key={uid} className="w-7 h-7 rounded-full border-2 border-background flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
                  {member.name?.[0]?.toUpperCase() || "?"}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">{memberCount} in the pack</span>
          </div>
          <button onClick={copyInviteLink} className="flex items-center gap-1.5 text-sm border border-border rounded-full px-4 py-2 hover:bg-muted/50 transition-colors font-medium" data-testid="button-mobile-invite">
            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
            {copied ? "Copied!" : "Invite"}
          </button>
        </div>
      </div>

      {/* ── Review modal ── */}
      <AnimatePresence>
        {reviewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setReviewOpen(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="bg-background rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
                <div>
                  <h2 className="font-serif text-xl font-bold">Review your trip</h2>
                  <p className="text-sm text-muted-foreground">{trip.destination}</p>
                </div>
                <button onClick={() => setReviewOpen(false)} className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted/50 transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="px-6 py-5 flex flex-col gap-6">
                {/* Star rating */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Rating</p>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReviewRating(n)}
                        onMouseEnter={() => setReviewHover(n)}
                        onMouseLeave={() => setReviewHover(0)}
                        className="p-0.5 transition-transform hover:scale-110"
                        data-testid={`star-${n}`}
                      >
                        <Star
                          size={28}
                          className={n <= (reviewHover || reviewRating) ? "fill-amber-400 text-amber-400" : "text-border fill-muted"}
                        />
                      </button>
                    ))}
                    {reviewRating > 0 && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {["", "Disappointing", "It was OK", "Pretty good", "Really good", "Incredible!"][reviewRating]}
                      </span>
                    )}
                  </div>
                </div>

                {/* Review text */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Your review <span className="normal-case font-normal">(required)</span></p>
                  <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="How did it go? What worked, what surprised you, what would you tell another group planning the same trip?"
                    rows={4}
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    data-testid="input-review-text"
                  />
                </div>

                {/* Highlight */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Top highlight <span className="normal-case font-normal">(optional)</span></p>
                  <input
                    value={reviewHighlight}
                    onChange={e => setReviewHighlight(e.target.value)}
                    placeholder="e.g. Sunset hike, rooftop dinner, that hidden beach"
                    className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    data-testid="input-review-highlight"
                  />
                </div>

                {/* Vibes */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Trip vibes</p>
                  <div className="flex flex-wrap gap-2">
                    {["culture", "food", "adventure", "relaxation", "nightlife", "shopping"].map(v => {
                      const label = { culture: "Culture", food: "Foodie", adventure: "Adventure", relaxation: "Relaxation", nightlife: "Nightlife", shopping: "Shopping" }[v];
                      const active = reviewVibes.includes(v);
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setReviewVibes(prev => active ? prev.filter(x => x !== v) : [...prev, v])}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${active ? "bg-primary text-white border-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <button
                  onClick={handleSubmitReview}
                  disabled={reviewSubmitting || !reviewRating || !reviewText.trim()}
                  className="w-full bg-primary text-white font-medium py-3.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  data-testid="button-submit-review"
                >
                  {reviewSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {reviewSubmitting ? "Submitting…" : "Share review"}
                </button>
                <p className="text-xs text-center text-muted-foreground -mt-3">
                  Your review will appear publicly on the Explore page.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
