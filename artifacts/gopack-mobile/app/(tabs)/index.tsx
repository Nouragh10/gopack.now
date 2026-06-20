import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  FlatList,
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
import { Trip, useTrips } from "@/hooks/useFirebase";

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

function TripCard({ trip, onPress }: { trip: Trip; onPress: () => void }) {
  const colors = useColors();
  const memberNames = Object.values(trip.members ?? {}).map((m) => m.name);
  const memberCount = Object.keys(trip.members ?? {}).length;

  return (
    <Pressable
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
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
  const { trips, loading } = useTrips(user?.uid);
  const router = useRouter();

  const displayName = user?.displayName ?? (user?.isAnonymous ? "Traveler" : "Explorer");
  const firstName = displayName.split(" ")[0];
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View>
          <Text style={[styles.logoText, { color: colors.primary }]}>gopack</Text>
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Your trips
          </Text>
          {loading ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Loading...</Text>
          ) : trips.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="map" size={36} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No trips yet. Start one!
              </Text>
              <Pressable
                onPress={() => router.push("/(tabs)/create")}
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.emptyBtnText, { color: colors.primaryForeground }]}>
                  Create a trip
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  onPress={() => router.push(`/trip/${trip.id}`)}
                />
              ))}
            </View>
          )}
        </View>
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
  logoText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerIcon: { padding: 6 },
  heroSection: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  greetingText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    marginBottom: 6,
  },
  heroTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  activeCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  activeCardInner: { flexDirection: "row", alignItems: "center", gap: 6 },
  activeCardText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  activeCardSub: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: "DmSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  tripCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  tripCardTop: { flexDirection: "row", alignItems: "center" },
  tripDestination: { fontFamily: "DmSans_600SemiBold", fontSize: 16, marginBottom: 2 },
  tripMeta: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatar: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  avatarText: { color: "#fff", fontFamily: "DmSans_700Bold" },
  moreText: { fontFamily: "DmSans_500Medium", fontSize: 12, marginLeft: 10 },
  emptyState: { alignItems: "center", paddingVertical: 32, gap: 12 },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 15 },
  emptyBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  emptyBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
});
