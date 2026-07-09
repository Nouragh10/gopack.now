import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, ChevronRight, Compass, X, Sparkles, ThumbsUp, Map,
  Trash2, MapPin, Users, Calendar, Loader2, LogOut, Bell, Check, Package,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrips, deleteTrip, getSavedPacks, deleteSavedPack, useNotifications, acceptTripInvite, declineNotification, type SavedPack } from "@/hooks/useFirebase";

function getHour() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const HOW_IT_WORKS = [
  {
    step: "1",
    icon: Sparkles,
    title: "Wish",
    desc: "Everyone in the group drops what they want to do — hikes, restaurants, museums, nightlife. No filter, just ideas.",
    color: "bg-amber-500/10 border-amber-500/30 text-amber-600",
    iconBg: "bg-amber-500",
  },
  {
    step: "2",
    icon: ThumbsUp,
    title: "Vote",
    desc: "Thumbs-up the wishes you love. The most-wanted activities rise to the top so everyone's voice counts.",
    color: "bg-violet-500/10 border-violet-500/30 text-violet-600",
    iconBg: "bg-violet-500",
  },
  {
    step: "3",
    icon: Map,
    title: "Go",
    desc: "Hit Generate — Claude reads all your wishes and builds a perfect day-by-day itinerary for the whole group.",
    color: "bg-primary/10 border-primary/30 text-primary",
    iconBg: "bg-primary",
  },
];

function NotifCard({ notif, user, onNavigate }: { notif: any; user: any; onNavigate: (tripId: string) => void }) {
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [done, setDone] = useState<"accepted" | "declined" | null>(null);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptTripInvite(user, notif.id, notif.tripId);
      setDone("accepted");
      setTimeout(() => onNavigate(notif.tripId), 800);
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await declineNotification(user.uid, notif.id);
      setDone("declined");
    } finally {
      setDeclining(false);
    }
  };

  if (done === "declined") return null;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-2 mb-2">
        <Package size={15} className="text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">
            <span className="text-primary">{notif.fromName}</span> invited you to <span className="font-semibold">{notif.tripName || "a trip"}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">via pack <span className="font-medium">{notif.packName}</span></p>
        </div>
      </div>
      {done === "accepted" ? (
        <div className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
          <Check size={12} /> Joined! Taking you there…
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleAccept}
            disabled={accepting || declining}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {accepting ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Accept
          </button>
          <button
            onClick={handleDecline}
            disabled={accepting || declining}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-60"
          >
            {declining ? <Loader2 size={11} className="animate-spin" /> : "Decline"}
          </button>
        </div>
      )}
    </div>
  );
}

function TripCard({
  trip,
  uid,
  onDeleted,
}: {
  trip: any;
  uid: string;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isHost = trip.hostMemberId === uid;
  const memberCount = Object.keys(trip.members ?? {}).length;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTrip(trip.id, uid, isHost);
      onDeleted(trip.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      className="group relative rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all overflow-hidden"
    >
      <Link href={`/trip/${trip.id}`} className="block p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
            <MapPin size={16} />
          </div>
          <div className="flex-1 min-w-0 pr-8">
            <div className="font-semibold text-foreground truncate">
              {trip.destination || "Unnamed trip"}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users size={11} /> {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
              {trip.days && (
                <span className="flex items-center gap-1">
                  <Calendar size={11} /> {trip.days} {trip.days === 1 ? "day" : "days"}
                </span>
              )}
              {isHost && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
                  Host
                </span>
              )}
            </div>
          </div>
          <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </Link>

      {/* Delete / leave button */}
      {!confirming ? (
        <button
          onClick={(e) => { e.preventDefault(); setConfirming(true); }}
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
          title={isHost ? "Delete trip" : "Leave trip"}
        >
          {isHost ? <Trash2 size={13} /> : <LogOut size={13} />}
        </button>
      ) : (
        <div className="absolute inset-0 bg-background/97 backdrop-blur-sm flex items-center justify-center gap-2 px-4 rounded-2xl">
          <span className="text-sm text-foreground mr-1">
            {isHost ? "Delete this trip?" : "Leave this trip?"}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {deleting
              ? <Loader2 size={11} className="animate-spin" />
              : isHost ? <Trash2 size={11} /> : <LogOut size={11} />}
            {isHost ? "Delete" : "Leave"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </motion.div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { trips, loading } = useTrips();
  const [localTrips, setLocalTrips] = useState<any[] | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifications = useNotifications();

  const displayTrips = localTrips ?? trips;

  const handleDeleted = (id: string) => {
    setLocalTrips((localTrips ?? trips).filter((t: any) => t.id !== id));
  };

  // Sync localTrips once trips load
  if (localTrips === null && !loading && trips.length >= 0) {
    // don't set here — causes render loop; we just use trips directly until a delete happens
  }

  const firstName = user?.displayName?.split(" ")[0] || "traveller";

  const [savedPacks, setSavedPacks] = useState<SavedPack[]>([]);
  useEffect(() => {
    if (user?.uid) setSavedPacks(getSavedPacks(user.uid));
  }, [user?.uid]);

  const handleDeletePack = (packId: string) => {
    if (!user?.uid) return;
    deleteSavedPack(user.uid, packId);
    setSavedPacks(getSavedPacks(user.uid));
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      setLocation(`/join/${joinCode.trim()}`);
    }
  };

  const visibleTrips = localTrips !== null ? localTrips : trips;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-border">
        <Link href="/" className="font-display font-bold text-2xl" data-testid="link-logo">
          go<span className="text-primary">pack</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/explore" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="link-explore">
            <Compass size={16} /> Explore
          </Link>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(o => !o)}
              className="relative w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
              title="Trip invites"
              data-testid="button-notifications"
            >
              <Bell size={15} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {notifications.length > 9 ? "9+" : notifications.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 6, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-10 w-80 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                      <span className="font-semibold text-sm flex items-center gap-1.5">
                        <Bell size={13} className="text-primary" /> Trip invites
                      </span>
                      <button onClick={() => setNotifOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                        No pending invites
                      </div>
                    ) : (
                      <div className="divide-y divide-border max-h-80 overflow-y-auto">
                        {notifications.map(n => (
                          <NotifCard
                            key={n.id}
                            notif={n}
                            user={user}
                            onNavigate={(tripId) => { setNotifOpen(false); setLocation(`/trip/${tripId}`); }}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => setHelpOpen(true)}
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors text-sm font-semibold"
            title="How it works"
            data-testid="button-help"
          >
            ?
          </button>
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium hover:opacity-80 transition-opacity"
            title="Profile"
            data-testid="link-profile"
          >
            {firstName[0].toUpperCase()}
          </Link>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-8 py-12">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-muted-foreground text-sm mb-1">{getHour()}, {firstName}</p>
          <h1 className="font-serif text-5xl font-bold mb-4">
            Where&apos;s the pack <span className="text-primary">headed next?</span>
          </h1>
          <p className="text-muted-foreground mb-8">
            Plan your next group trip together — everyone wishes, everyone votes, AI builds the itinerary.
          </p>
        </motion.div>

        {/* Create trip CTA */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Link
            href="/create"
            className="flex items-center gap-4 border-2 border-dashed border-primary/50 rounded-2xl p-5 mb-3 hover:border-primary hover:bg-primary/5 transition-all group"
            data-testid="link-create-trip"
          >
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white group-hover:scale-110 transition-transform shrink-0">
              <Plus size={20} />
            </div>
            <div>
              <div className="font-medium text-primary">Plan a new trip</div>
              <div className="text-sm text-muted-foreground">Create a trip and invite your crew</div>
            </div>
            <ChevronRight size={18} className="ml-auto text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        </motion.div>

        {/* Join trip form */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <form onSubmit={handleJoin} className="flex gap-3 mb-10">
            <input
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              placeholder="Have a code? Join a trip..."
              className="flex-1 border border-border rounded-full px-5 py-3 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="input-join-code"
            />
            <button
              type="submit"
              className="bg-foreground text-background text-sm font-medium px-6 py-3 rounded-full hover:bg-foreground/80 transition-colors"
              data-testid="button-join-trip"
            >
              Join
            </button>
          </form>
        </motion.div>

        {/* Your trips */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Your trips</p>

          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 size={18} className="animate-spin mr-2" /> Loading your trips…
            </div>
          ) : visibleTrips.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed border-border rounded-2xl">
              No trips yet — create one above or join with a code.
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              <div className="flex flex-col gap-2 mb-10">
                {visibleTrips.map((trip: any) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    uid={user?.uid ?? ""}
                    onDeleted={handleDeleted}
                  />
                ))}
              </div>
            </AnimatePresence>
          )}
        </motion.div>

        {/* Saved packs */}
        {savedPacks.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="mb-10">
            <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-3">Saved packs</p>
            <div className="flex flex-col gap-2">
              {savedPacks.map(pack => (
                <div key={pack.id} className="flex items-center gap-3 border border-border rounded-2xl px-4 py-3 bg-muted/20">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{pack.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {pack.members.map(m => m.name).join(", ")}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeletePack(pack.id)}
                    className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg transition-colors"
                    title="Remove saved pack"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* How it works */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <p className="text-xs font-semibold text-muted-foreground tracking-widest uppercase mb-5">How it works</p>
          <div className="flex flex-col gap-3">
            {HOW_IT_WORKS.map((item, i) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.26 + i * 0.07 }}
                  className={`flex items-start gap-4 border rounded-2xl p-5 ${item.color}`}
                >
                  <div className={`w-9 h-9 rounded-full ${item.iconBg} flex items-center justify-center text-white shrink-0 mt-0.5`}>
                    <Icon size={16} />
                  </div>
                  <div>
                    <div className="font-semibold mb-0.5">{item.step}. {item.title}</div>
                    <p className="text-sm opacity-80">{item.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Help modal */}
      <AnimatePresence>
        {helpOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setHelpOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-background border border-border rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-2xl font-bold">How GoPackNow works</h2>
                <button onClick={() => setHelpOpen(false)} className="p-2 text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="flex flex-col gap-5 text-sm text-muted-foreground">
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">1</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Create or join a trip</p>
                    <p>Start a trip with a destination (or let the group decide), then share the invite link with your travel pack.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-violet-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">2</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Everyone adds wishes</p>
                    <p>Each person drops activities they want to do — "cooking class", "sunrise hike", "rooftop bar". No limits.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold shrink-0 text-xs">3</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Vote on favourites</p>
                    <p>Thumbs-up the activities you love. The top-voted wishes shape the final plan.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-green-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">4</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">AI builds your itinerary</p>
                    <p>Hit "Generate itinerary" — Claude turns your top wishes into a detailed day-by-day plan. Also generates a smart packing list.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-7 h-7 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold shrink-0 text-xs">5</span>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Decide together (optional)</p>
                    <p>No destination yet? Use "Decide with the group" — everyone submits preferences, AI suggests destinations, the group votes.</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setHelpOpen(false)}
                className="mt-8 w-full bg-primary text-white py-3 rounded-full font-medium hover:bg-primary/90 transition-colors"
              >
                Got it
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
