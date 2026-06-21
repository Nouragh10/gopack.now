import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback } from "react";
import {
  Alert,
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
import { Trip, deleteTrip, leaveTrip, useTrips } from "@/hooks/useFirebase";

const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Avatar({ name, index, size = 28 }: { name: string; index: number; size?: number }) {
  const bg = MEMBER_COLORS[index % MEMBER_COLORS.length];
  return (
    <View style={[styles.avatar, { backgroundColor: bg, width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.42 }]}>
        {(name ?? "?")[0].toUpperCase()}
      </Text>
    </View>
  );
}

const VIBE_COLORS: Record<string, string> = {
  culture: "#9C5544",
  food: "#E85D3A",
  adventure: "#4CAF50",
  relaxation: "#26A69A",
  nightlife: "#FF7043",
  shopping: "#FFB300",
  nature: "#26C6DA",
  beach: "#26C6DA",
  wellness: "#AB7ACA",
  foodie: "#E85D3A",
};

function VibeChip({ vibe }: { vibe: string }) {
  const colors = useColors();
  const color = VIBE_COLORS[vibe.toLowerCase()] ?? colors.primary;
  return (
    <View style={[styles.vibeChip, { backgroundColor: color + "20", borderColor: color + "60" }]}>
      <Text style={[styles.vibeChipText, { color }]}>{vibe}</Text>
    </View>
  );
}

function TripCard({ trip, onPress, onLongPress }: { trip: Trip; onPress: () => void; onLongPress?: () => void }) {
  const colors = useColors();
  const memberNames = Object.values(trip.members ?? {}).map((m) => m.name);
  const memberCount = Object.keys(trip.members ?? {}).length;
  const vibes = trip.vibes ?? [];

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onLongPress?.(); }}
      style={[styles.tripCard, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.tripCardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.tripDestination, { color: colors.foreground }]}>
            {trip.destination}
          </Text>
          <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>
            {trip.days} day{trip.days !== 1 ? "s" : ""} · {memberCount} member{memberCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      </View>
      {vibes.length > 0 && (
        <View style={styles.vibeRow}>
          {vibes.map((v) => <VibeChip key={v} vibe={v} />)}
        </View>
      )}
      <View style={styles.avatarRow}>
        {memberNames.slice(0, 4).map((name, i) => (
          <View key={i} style={{ marginRight: -6 }}>
            <Avatar name={name} index={i} />
          </View>
        ))}
        {memberNames.length > 4 && (
          <Text style={[styles.moreText, { color: colors.mutedForeground }]}>
            +{memberNames.length - 4}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { trips, loading, refetch } = useTrips(user?.uid);
  const router = useRouter();

  const displayName = user?.displayName ?? (user?.isAnonymous ? "Traveler" : "Explorer");
  const firstName = displayName.split(" ")[0];
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleDeleteTrip = (trip: Trip) => {
    const isHost = trip.hostMemberId === user?.uid;
    Alert.alert(
      isHost ? "Delete Trip" : "Leave Trip",
      isHost
        ? "This will permanently delete the trip for everyone in the pack. This cannot be undone."
        : "You'll leave this trip. You'll need a new invite to rejoin.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isHost ? "Delete" : "Leave",
          style: "destructive",
          onPress: async () => {
            if (isHost) await deleteTrip(trip.id, user!.uid);
            else await leaveTrip(trip.id, user!.uid);
            refetch();
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View>
          <Text style={[styles.logoText, { color: colors.primary }]}>PackClan</Text>
        </View>
        <Pressable onPress={() => router.push("/(tabs)/notifications")} style={styles.headerIcon}>
          <Feather name="bell" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset }}
      >
        <View style={styles.heroSection}>
          <Text style={[styles.greetingText, { color: colors.mutedForeground }]}>
            {getGreeting()}, {firstName}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            {"Where's the pack\nheaded next?"}
          </Text>
        </View>

        {trips.length > 0 && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/trip/${trips[0].id}`); }}
            style={[styles.activeCard, { borderColor: colors.primary }]}
          >
            <View style={styles.activeCardInner}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.activeCardText, { color: colors.foreground }]}>
                {trips[0].destination}
              </Text>
            </View>
            <Text style={[styles.activeCardSub, { color: colors.mutedForeground }]}>
              Active trip · tap to continue
            </Text>
          </Pressable>
        )}

        <View style={styles.quickActions}>
          <Pressable
            onPress={() => router.push("/(tabs)/create")}
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.actionBtnText}>New trip</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/join")}
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}
          >
            <Feather name="users" size={18} color={colors.foreground} />
            <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Join trip</Text>
          </Pressable>
        </View>

        {loading ? null : trips.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Your trips</Text>
            {trips.map((item) => (
              <TripCard
                key={item.id}
                trip={item}
                onPress={() => router.push(`/trip/${item.id}`)}
                onLongPress={() => handleDeleteTrip(item)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="map" size={40} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No trips yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create your first trip or join one with an invite code.
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  logoText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26 },
  headerIcon: { padding: 4 },
  heroSection: { paddingHorizontal: 20, paddingBottom: 20 },
  greetingText: { fontFamily: "DmSans_400Regular", fontSize: 14, marginBottom: 6 },
  heroTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 30, lineHeight: 38 },
  activeCard: {
    marginHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 16,
  },
  activeCardInner: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  activeCardText: { fontFamily: "DmSans_600SemiBold", fontSize: 16 },
  activeCardSub: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  quickActions: { flexDirection: "row", paddingHorizontal: 20, gap: 12, marginBottom: 28 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: "DmSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  tripCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  tripCardTop: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  tripDestination: { fontFamily: "DmSans_600SemiBold", fontSize: 16, marginBottom: 3 },
  tripMeta: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  vibeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  vibeChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  vibeChipText: { fontFamily: "DmSans_500Medium", fontSize: 11 },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  avatarText: { color: "#fff", fontFamily: "DmSans_700Bold" },
  moreText: { fontFamily: "DmSans_500Medium", fontSize: 12, marginLeft: 10 },
  emptyState: { alignItems: "center", paddingHorizontal: 40, paddingTop: 40, gap: 12 },
  emptyTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 18 },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
});
