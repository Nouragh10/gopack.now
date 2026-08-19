import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { useTrips, useInvites, acceptInvite, dismissInvite, PackInvite } from "@/hooks/useFirebase";

interface AppNotification {
  id: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  tripId?: string;
  time: number;
  type?: "itinerary" | "default";
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { trips } = useTrips(user?.uid);
  const invites = useInvites(user?.uid);
  const [accepting, setAccepting] = useState<string | null>(null);

  const handleAcceptInvite = async (invite: PackInvite) => {
    if (!user) return;
    setAccepting(invite.id);
    try {
      await acceptInvite(invite.packId, user.uid, user.displayName ?? "Traveler", invite.tripId);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push(`/trip/${invite.tripId}` as any);
    } catch {}
    setAccepting(null);
  };

  const handleDismissInvite = async (invite: PackInvite) => {
    if (!user) return;
    try { await dismissInvite(user.uid, invite.packId, invite.tripId); } catch {}
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  const notifications = useMemo<AppNotification[]>(() => {
    const notes: AppNotification[] = [];
    const uid = user?.uid ?? "";
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;

    for (const trip of trips) {
      const createdAt = new Date(trip.createdAt ?? 0).getTime();

      // Itinerary ready
      if (trip.itinerary) {
        notes.push({
          id: `itinerary-${trip.id}`,
          icon: "map",
          color: "#E85D3A",
          title: "Itinerary ready!",
          subtitle: `Your ${trip.destination} itinerary has been built. Tap to view.`,
          tripId: trip.id,
          time: createdAt + 3600000,
          type: "itinerary",
        });
      }

      // Destination vote available
      if (trip.destinationSuggestions?.length) {
        notes.push({
          id: `dest-${trip.id}`,
          icon: "zap",
          color: "#7E57C2",
          title: "Vote on destinations",
          subtitle: `Your pack is choosing where to go — cast your vote.`,
          tripId: trip.id,
          time: createdAt + 1800000,
        });
      }

      // Accommodation voting in progress
      if (trip.accommodationStatus === "voting") {
        notes.push({
          id: `accom-vote-${trip.id}`,
          icon: "home",
          color: "#26A69A",
          title: "Vote on accommodation",
          subtitle: `Choose where to stay in ${trip.destination}.`,
          tripId: trip.id,
          time: createdAt + 2000000,
        });
      }

      // Accommodation confirmed
      if (trip.accommodationStatus === "confirmed" && trip.confirmedAccommodation) {
        notes.push({
          id: `accom-confirmed-${trip.id}`,
          icon: "check-circle",
          color: "#4CAF50",
          title: "Accommodation booked!",
          subtitle: `${trip.confirmedAccommodation.name} confirmed for ${trip.destination}.`,
          tripId: trip.id,
          time: createdAt + 2500000,
        });
      }

      // New members who joined recently (excluding self)
      for (const [memberId, member] of Object.entries(trip.members ?? {})) {
        if (memberId === uid) continue;
        const joinedAt = new Date((member as any).joinedAt ?? 0).getTime();
        if (joinedAt > sevenDaysAgo) {
          notes.push({
            id: `join-${trip.id}-${memberId}`,
            icon: "user-plus",
            color: "#4CAF50",
            title: `${(member as any).name} joined`,
            subtitle: `${(member as any).name} joined your ${trip.destination} trip.`,
            tripId: trip.id,
            time: joinedAt,
          });
        }
      }

      // Preferences collection started
      if (trip.collectingPreferences) {
        notes.push({
          id: `prefs-${trip.id}`,
          icon: "sliders",
          color: "#7E57C2",
          title: "Share your preferences",
          subtitle: `Add your travel preferences for ${trip.destination}.`,
          tripId: trip.id,
          time: createdAt + 500,
        });
      }
    }

    return notes.sort((a, b) => b.time - a.time);
  }, [trips, user?.uid]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        {notifications.length > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>{notifications.length}</Text>
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}>
        {/* Pack invites — action required */}
        {invites.map((invite) => (
          <View key={invite.id} style={[styles.inviteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.noteIcon, { backgroundColor: "#7E57C220" }]}>
              <Feather name="users" size={18} color="#7E57C2" />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.noteTitle, { color: colors.foreground }]}>
                {invite.fromName} invited you to a trip
              </Text>
              <Text style={[styles.noteSub, { color: colors.mutedForeground }]}>
                {invite.destination} · via {invite.packName}
              </Text>
              <View style={styles.inviteBtns}>
                <Pressable
                  onPress={() => handleAcceptInvite(invite)}
                  disabled={!!accepting}
                  style={[styles.joinBtn, { backgroundColor: "#7E57C2", opacity: accepting === invite.id ? 0.6 : 1 }]}
                >
                  {accepting === invite.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.joinBtnText}>Join trip</Text>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => handleDismissInvite(invite)}
                  style={[styles.dismissBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.dismissText, { color: colors.mutedForeground }]}>Dismiss</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        {/* Regular notifications */}
        {notifications.map((note) => (
          <Pressable
            key={note.id}
            onPress={() => {
              if (!note.tripId) return;
              if (note.type === "itinerary") {
                router.push(`/itinerary/${note.tripId}` as any);
              } else {
                router.push(`/trip/${note.tripId}` as any);
              }
            }}
            style={[styles.noteRow, { borderBottomColor: colors.border }]}
          >
            <View style={[styles.noteIcon, { backgroundColor: note.color + "1A" }]}>
              <Feather name={note.icon as any} size={18} color={note.color} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.noteTitle, { color: colors.foreground }]}>{note.title}</Text>
              <Text style={[styles.noteSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                {note.subtitle}
              </Text>
            </View>
            <View style={styles.noteRight}>
              <Text style={[styles.noteTime, { color: colors.mutedForeground }]}>{timeAgo(note.time)}</Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </View>
          </Pressable>
        ))}

        {/* Empty state */}
        {notifications.length === 0 && invites.length === 0 && (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Feather name="bell" size={28} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              You'll be notified when your pack adds wishes, joins trips, or your itinerary is ready.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
    flex: 1,
  },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: "DmSans_700Bold", fontSize: 12, color: "#fff" },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 14,
    marginTop: -60,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  noteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  noteTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 14 },
  noteSub: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18 },
  noteRight: { alignItems: "flex-end", gap: 4 },
  noteTime: { fontFamily: "DmSans_400Regular", fontSize: 11 },
  inviteCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "transparent",
    marginHorizontal: 12, marginVertical: 6, borderRadius: 16, borderWidth: 1,
  },
  inviteBtns: { flexDirection: "row", gap: 8, marginTop: 4 },
  joinBtn: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, alignItems: "center", justifyContent: "center", minWidth: 80 },
  joinBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff" },
  dismissBtn: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1 },
  dismissText: { fontFamily: "DmSans_500Medium", fontSize: 13 },
});
