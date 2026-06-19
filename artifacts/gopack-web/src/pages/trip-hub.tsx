import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Copy, Check, Loader2, MapPin, Calendar,
  ChevronUp, Sparkles, Package, ArrowLeft,
  AlertCircle, ChevronRight, Users, ArrowRight, MessageSquare, UserCircle
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrip } from "@/hooks/useFirebase";
import { useGenerateItinerary, useGeneratePackingList } from "@workspace/api-client-react";

const VIBE_LABELS: Record<string, string> = {
  culture: "Culture", food: "Foodie", adventure: "Adventure",
  relaxation: "Relaxation", nightlife: "Nightlife", shopping: "Shopping",
};
const AVATAR_COLORS = ["#E85D3A", "#7F77DD", "#1D9E75", "#378ADD", "#BA7517", "#C4448A"];

type Tab = "wish" | "vote" | "go";

export default function TripHub() {
  const [, params] = useRoute("/trip/:tripId");
  const tripId = params?.tripId || "";
  const { user } = useAuth();
  const { trip, wishes, loading, addWish, toggleVote, updateItinerary, updatePackingList } = useTrip(tripId);
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>("wish");
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
      <nav className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-20">
        {/* Left: logo + destination */}
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard" className="text-muted-foreground hover:text-foreground shrink-0" data-testid="link-back">
            <ArrowLeft size={18} />
          </Link>
          <Link href="/" className="font-display font-bold text-lg shrink-0" data-testid="link-logo">
            go<span className="text-primary">pack</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 border border-border text-sm">
            <MapPin size={12} className="text-primary shrink-0" />
            <span className="font-medium truncate max-w-[140px]">{trip.destination}</span>
            <span className="text-muted-foreground">· {trip.days}d</span>
          </div>
        </div>

        {/* Center: tab switcher */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1 border border-border">
          {(["wish", "vote", "go"] as Tab[]).map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid={`tab-${tab}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                activeTab === tab ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</span>
              <span className="capitalize">{tab}</span>
            </button>
          ))}
        </div>

        {/* Right: secondary actions */}
        <div className="flex items-center gap-2">
          <Link href={`/trip/${tripId}/chat`} className="hidden sm:flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors" data-testid="link-chat">
            <MessageSquare size={15} /> Chat
          </Link>
          <Link href="/profile" className="text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors" data-testid="link-profile">
            <UserCircle size={20} />
          </Link>
          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border rounded-full hover:bg-muted/50 transition-colors font-medium"
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
                    placeholder="Add a wish — e.g. 'Sunset rooftop dinner'"
                    className="flex-1 border border-border rounded-full px-5 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
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
                <div className="max-w-xl">
                  <p className="text-xs font-semibold text-primary tracking-widest uppercase mb-4">Ready when you are</p>
                  <h1 className="font-serif text-3xl font-bold mb-2">Build the itinerary</h1>
                  <p className="text-muted-foreground mb-8">
                    Claude will turn your top wishes into a perfect day-by-day plan for {trip.destination}.
                  </p>

                  {/* Generate Itinerary */}
                  <div className="border border-border rounded-2xl p-6 bg-background mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={18} className="text-primary" />
                      <h3 className="font-semibold">AI Itinerary</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5">
                      Day-by-day plan built from your {wishes.length} wishes, tailored to {trip.destination}.
                    </p>
                    <button
                      onClick={handleGenerateItinerary}
                      disabled={generateItinerary.isPending}
                      className="w-full bg-primary text-white font-medium py-3.5 rounded-full hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      data-testid="button-generate-itinerary"
                    >
                      {generateItinerary.isPending && <Loader2 size={15} className="animate-spin" />}
                      {generateItinerary.isPending ? "Generating… (may take ~30s)" : "Generate itinerary"}
                      {!generateItinerary.isPending && <ArrowRight size={16} />}
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
                  <div className="border border-border rounded-2xl p-6 bg-background">
                    <div className="flex items-center gap-2 mb-2">
                      <Package size={18} className="text-primary" />
                      <h3 className="font-semibold">Packing List</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-5">
                      Smart packing list based on your destination, vibes, and budget.
                    </p>
                    <button
                      onClick={handleGeneratePacking}
                      disabled={generatePacking.isPending}
                      className="w-full border border-border font-medium py-3.5 rounded-full hover:bg-muted/50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
    </div>
  );
}
