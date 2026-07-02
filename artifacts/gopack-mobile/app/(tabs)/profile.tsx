import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Linking,
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
import { signOut, deleteAccount } from "@/lib/firebase";
import { Trip, deleteTrip, leaveTrip, useTrips } from "@/hooks/useFirebase";
import { UpgradeModal } from "@/components/UpgradeModal";

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { trips, refetch } = useTrips(user?.uid);
  const router = useRouter();
  const [tripsExpanded, setTripsExpanded] = useState(false);
  const [upgradeVisible, setUpgradeVisible] = useState(false);

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

  const handleDeleteAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAccount();
              router.replace("/sign-in");
            } catch (e: any) {
              Alert.alert(
                "Error",
                e?.message?.includes("requires-recent-login")
                  ? "Please sign out and sign back in before deleting your account."
                  : "Failed to delete account. Please try again.",
              );
            }
          },
        },
      ],
    );
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
        {/* Avatar + name */}
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={[styles.name, { color: colors.foreground }]}>{displayName}</Text>
          {user?.email ? (
            <Text style={[styles.email, { color: colors.mutedForeground }]}>{user.email}</Text>
          ) : null}
        </View>

        {/* Stats */}
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

        {/* My Trips — collapsible card */}
        <View style={[styles.tripsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTripsExpanded(e => !e); }}
            style={styles.tripsCardHeader}
          >
            <View style={styles.tripsCardHeaderLeft}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
              <View>
                <Text style={[styles.tripsCardTitle, { color: colors.foreground }]}>My trips</Text>
                <Text style={[styles.tripsCardSub, { color: colors.mutedForeground }]}>
                  {trips.length} trip{trips.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            <Feather
              name={tripsExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedForeground}
            />
          </Pressable>

          {tripsExpanded && (
            <View style={[styles.tripsCardBody, { borderTopColor: colors.border }]}>
              {trips.length === 0 ? (
                <View style={styles.tripsEmpty}>
                  <Feather name="map" size={28} color={colors.border} />
                  <Text style={[styles.tripsEmptyText, { color: colors.mutedForeground }]}>No trips yet</Text>
                </View>
              ) : (
                trips.map((trip) => (
                  <Pressable
                    key={trip.id}
                    onPress={() => router.push(`/trip/${trip.id}`)}
                    onLongPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); handleDeleteTrip(trip); }}
                    style={[styles.tripRow, { borderBottomColor: colors.border }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.tripName, { color: colors.foreground }]}>
                        {trip.destination || "Deciding destination…"}
                      </Text>
                      <Text style={[styles.tripMeta, { color: colors.mutedForeground }]}>
                        {trip.days} days · {Object.keys(trip.members ?? {}).length} members
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>

        {/* Upgrade to Pack Plus */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setUpgradeVisible(true); }}
            style={[styles.upgradeBtn, { backgroundColor: colors.primary }]}
          >
            <Feather name="zap" size={18} color="#fff" />
            <Text style={styles.upgradeBtnText}>Upgrade to Pack Plus</Text>
          </Pressable>
        </View>

        {/* Sign out */}
        <View style={{ paddingHorizontal: 20, marginTop: 8 }}>
          <Pressable
            onPress={handleSignOut}
            style={[styles.signOutBtn, { borderColor: colors.border }]}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign out</Text>
          </Pressable>
        </View>

        {/* Legal links */}
        <View style={styles.legalRow}>
          <Pressable onPress={() => Linking.openURL("https://gopacknow.com/privacy")}>
            <Text style={[styles.legalLink, { color: colors.mutedForeground }]}>Privacy Policy</Text>
          </Pressable>
          <Text style={[styles.legalDot, { color: colors.mutedForeground }]}>·</Text>
          <Pressable onPress={() => Linking.openURL("https://www.apple.com/legal/internet-services/itunes/dev/stdeula/")}>
            <Text style={[styles.legalLink, { color: colors.mutedForeground }]}>Terms of Use</Text>
          </Pressable>
        </View>

        {/* Delete account */}
        <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
          <Pressable onPress={handleDeleteAccount} style={styles.deleteAccountBtn}>
            <Text style={[styles.deleteAccountText, { color: colors.destructive }]}>Delete account</Text>
          </Pressable>
        </View>
      </ScrollView>

      <UpgradeModal
        visible={upgradeVisible}
        tripId=""
        onClose={() => setUpgradeVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: "center", paddingBottom: 24, paddingHorizontal: 20 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  avatarText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 34, color: "#fff" },
  name: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, marginBottom: 4 },
  email: { fontFamily: "DmSans_400Regular", fontSize: 14 },
  statsCard: {
    flexDirection: "row", borderRadius: 16, borderWidth: 1,
    paddingVertical: 20, marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNum: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28 },
  statLabel: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 2 },
  statDivider: { width: 1, marginVertical: 4 },
  // Trips card
  tripsCard: {
    marginHorizontal: 20, borderRadius: 16, borderWidth: 1, marginBottom: 16, overflow: "hidden",
  },
  tripsCardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 16,
  },
  tripsCardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  tripsCardTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  tripsCardSub: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 1 },
  tripsCardBody: { borderTopWidth: 1 },
  tripsEmpty: { alignItems: "center", paddingVertical: 24, gap: 8 },
  tripsEmptyText: { fontFamily: "DmSans_400Regular", fontSize: 14 },
  tripRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tripName: { fontFamily: "DmSans_600SemiBold", fontSize: 15, marginBottom: 2 },
  tripMeta: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  upgradeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderRadius: 14, paddingVertical: 14,
  },
  upgradeBtnText: { fontFamily: "DmSans_700Bold", fontSize: 15, color: "#fff" },
  signOutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, borderWidth: 1, borderRadius: 14, paddingVertical: 14,
  },
  signOutText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  legalRow: {
    flexDirection: "row", justifyContent: "center", alignItems: "center",
    gap: 8, marginTop: 16, marginBottom: 8,
  },
  legalLink: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  legalDot: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  deleteAccountBtn: { alignItems: "center", paddingVertical: 10 },
  deleteAccountText: { fontFamily: "DmSans_400Regular", fontSize: 13 },
});
