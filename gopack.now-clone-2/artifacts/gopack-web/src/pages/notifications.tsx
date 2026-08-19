import { useMemo } from "react";
import { useLocation, Link } from "wouter";
import { Map, Zap, Home, CheckCircle, Bell, UserPlus, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTrips } from "@/hooks/useFirebase";

interface AppNotification {
  id: string;
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  href?: string;
  time: number;
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Notifications() {
  const { user } = useAuth();
  const { trips } = useTrips();
  const [, setLocation] = useLocation();

  const notifications = useMemo<AppNotification[]>(() => {
    const notes: AppNotification[] = [];
    const uid = user?.uid ?? "";

    for (const trip of trips) {
      const createdAt = new Date(trip.createdAt ?? 0).getTime();

      // Itinerary ready
      if (trip.itinerary) {
        notes.push({
          id: `itinerary-${trip.id}`,
          icon: <Map size={18} />,
          color: "#E85D3A",
          title: "Itinerary ready!",
          subtitle: `Your ${trip.destination} itinerary has been built. Tap to view.`,
          href: `/trip/${trip.id}/itinerary`,
          time: createdAt + 3_600_000,
        });
      }

      // Destination vote available
      if (trip.destinationSuggestions?.length) {
        notes.push({
          id: `dest-${trip.id}`,
          icon: <Zap size={18} />,
          color: "#7E57C2",
          title: "Vote on destinations",
          subtitle: `Your pack is choosing where to go — cast your vote.`,
          href: `/trip/${trip.id}/destination-vote`,
          time: createdAt + 1_800_000,
        });
      }

      // Accommodation voting
      if (trip.accommodationStatus === "voting") {
        notes.push({
          id: `accom-vote-${trip.id}`,
          icon: <Home size={18} />,
          color: "#26A69A",
          title: "Vote on accommodation",
          subtitle: `Choose where to stay in ${trip.destination}.`,
          href: `/trip/${trip.id}/accommodation-vote`,
          time: createdAt + 2_000_000,
        });
      }

      // Accommodation confirmed
      if (trip.accommodationStatus === "confirmed" && trip.confirmedAccommodation) {
        notes.push({
          id: `accom-confirmed-${trip.id}`,
          icon: <CheckCircle size={18} />,
          color: "#4CAF50",
          title: "Accommodation booked!",
          subtitle: `${trip.confirmedAccommodation.name} confirmed for ${trip.destination}.`,
          href: `/trip/${trip.id}/accommodation-vote`,
          time: createdAt + 2_500_000,
        });
      }

      // Destination preferences needed
      if (trip.collectingPreferences && !trip.memberPreferences?.[uid]) {
        notes.push({
          id: `dest-pref-${trip.id}`,
          icon: <UserPlus size={18} />,
          color: "#7E57C2",
          title: "Add your preferences",
          subtitle: `Tell the pack what you're looking for in ${trip.destination || "your next trip"}.`,
          href: `/trip/${trip.id}/destination-preferences`,
          time: createdAt + 500_000,
        });
      }

      // New members who joined recently (excluding self)
      const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
      for (const [memberId, member] of Object.entries(trip.members ?? {})) {
        if (memberId === uid) continue;
        const joinedAt = new Date((member as any).joinedAt ?? 0).getTime();
        if (joinedAt > sevenDaysAgo) {
          notes.push({
            id: `join-${trip.id}-${memberId}`,
            icon: <UserPlus size={18} />,
            color: "#378ADD",
            title: `${(member as any).name} joined`,
            subtitle: `${(member as any).name} joined your ${trip.destination} trip.`,
            href: `/trip/${trip.id}`,
            time: joinedAt,
          });
        }
      }
    }

    return notes.sort((a, b) => b.time - a.time);
  }, [trips, user?.uid]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => setLocation("/dashboard")} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-base">Notifications</span>
        {notifications.length > 0 && (
          <span className="ml-auto px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold">
            {notifications.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-24 px-6">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Bell size={28} className="text-muted-foreground" />
            </div>
            <div className="text-center">
              <div className="font-semibold mb-1">All caught up</div>
              <div className="text-sm text-muted-foreground">No notifications yet — start planning a trip to see updates here.</div>
            </div>
            <Link href="/dashboard" className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium">
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => n.href && setLocation(n.href)}
                className={`flex items-start gap-4 px-4 py-4 ${n.href ? "cursor-pointer hover:bg-muted/50 transition-colors" : ""}`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ backgroundColor: n.color + "22", color: n.color }}
                >
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{n.title}</div>
                  <div className="text-sm text-muted-foreground mt-0.5 leading-snug">{n.subtitle}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 mt-0.5">{timeAgo(n.time)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
