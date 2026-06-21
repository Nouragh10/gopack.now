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
import { signOut } from "@/lib/firebase";
import { Trip, deleteTrip, leaveTrip, useTrips } from "@/hooks/useFirebase";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { trips, refetch } = useTrips(user?.uid);
  const router = useRouter();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const displayName = user?.displayName ?? (user?.isAnonymous ? "Guest" : "Explorer");
  const initial = displayName[0].toUpperCase();
  const totalDays = trips.reduce((sum, t) => sum + (t.days ?? 0), 0);
  const uniqueCities = new Set(trips.map((t) => t.destination.split(",")[0].trim())).size;

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await signOut();
    router.replace("/sign-in");
  };

  const handleDeleteTrip = (trip: Trip) => {
    const isHost = trip.hostMemberId === user?.uid;
    Alert.alert(
      isHost ? "Delete Trip" : "Leave Trip",
      isHost
        ? "This will permanently delete the trip for everyone. Cannot be undone."
        : "You'll leave this trip and need a new invite to rejoin.",
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset }}
      >
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
          {user?.email ? (
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
          ) : null}
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 20 }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{trips.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>trips</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{uniqueCities}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>cities</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{totalDays}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>days</Text>
          </View>
        </View>

        {trips.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Your trips</Text>
            {trips.map((trip) => (
              <Pressable
                key={trip.id}
                onPress={() => router.push(`/trip/${trip.id}`)}
                onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleDeleteTrip(trip); }}
                style={[styles.tripRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.tripName, { color: colors.foreground }]}>{trip.destination}</Text>
                  <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>
                    {trip.days} days · {trip.budget}
                    {trip.startDate ? ` · ${trip.startDate}` : ""}
                  </Text>
                  <Text style={[styles.tripMembers, { color: colors.mutedForeground }]}>
                    {Object.keys(trip.members ?? {}).length} member{Object.keys(trip.members ?? {}).length !== 1 ? "s" : ""}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        )}

        {trips.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="map" size={36} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No trips yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Create or join a trip to get started.
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Pressable
            onPress={handleSignOut}
            style={[styles.signOutBtn, { borderColor: colors.border }]}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: "center", paddingBottom: 24, paddingHorizontal: 20 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  avatarText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 34, color: "#fff" },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, marginBottom: 4 },
  email: { fontFamily: "DmSans_400Regular", fontSize: 14 },
  statsCard: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 20,
    marginBottom: 28,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28 },
  statLabel: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: {
    fontFamily: "DmSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  tripName: { fontFamily: "DmSans_600SemiBold", fontSize: 15, marginBottom: 2 },
  tripMeta: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  tripMembers: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 2 },
  emptyState: { alignItems: "center", paddingHorizontal: 40, paddingTop: 32, paddingBottom: 24, gap: 10 },
  emptyTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 16 },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 14,
  },
  signOutText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
});
