import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
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
import { useTrips, usePacks, deletePack } from "@/hooks/useFirebase";
import { GoPackIcon } from "@/components/GoPackLogo";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const PACK_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

const HOW_IT_WORKS = [
  {
    icon: "star" as const,
    step: "1",
    title: "Wish",
    desc: "Everyone drops what they want to do — hikes, restaurants, museums. No filter, just ideas.",
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  {
    icon: "thumbs-up" as const,
    step: "2",
    title: "Vote",
    desc: "Thumbs-up the activities you love. The most-wanted wishes rise to the top.",
    color: "#7E57C2",
    bg: "#EDE9FE",
  },
  {
    icon: "map" as const,
    step: "3",
    title: "Go",
    desc: "Hit Generate — our AI reads your top wishes and builds a perfect day-by-day itinerary.",
    color: "#E85D3A",
    bg: "#FEE8E2",
  },
];

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { trips, refetch } = useTrips(user?.uid);
  const { packs } = usePacks(user?.uid);
  const router = useRouter();
  const [helpVisible, setHelpVisible] = useState(false);
  const [deletedPackIds, setDeletedPackIds] = useState<Set<string>>(new Set());

  const handleDeletePack = (pack: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Delete "${pack.name}"?`,
      "This will permanently remove this crew for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePack(pack.id, user!.uid);
            setDeletedPackIds(prev => new Set([...prev, pack.id]));
          },
        },
      ],
    );
  };

  const displayName = user?.displayName ?? (user?.isAnonymous ? "Traveler" : "Explorer");
  const firstName = displayName.split(" ")[0];
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const mostRecentTrip = trips[0] ?? null;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={styles.logoRow}>
          <GoPackIcon size={30} />
          <Text style={[styles.logoText, { color: colors.foreground }]}>GoPackNow</Text>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            onPress={() => setHelpVisible(true)}
            style={[styles.helpBtn, { borderColor: colors.border }]}
          >
            <Text style={[styles.helpBtnText, { color: colors.mutedForeground }]}>?</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/notifications")} style={styles.headerIcon}>
            <Feather name="bell" size={22} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset }}
      >
        {/* Hero */}
        <View style={styles.heroSection}>
          <Text style={[styles.greetingText, { color: colors.mutedForeground }]}>
            {getGreeting()}, {firstName}
          </Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            {"Where's the pack\nheaded next?"}
          </Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            Plan your next group trip — everyone wishes, everyone votes, AI builds the itinerary.
          </Text>
        </View>

        {/* Active trip pill */}
        {mostRecentTrip && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push(`/trip/${mostRecentTrip.id}`); }}
            style={[styles.activeCard, { borderColor: colors.primary }]}
          >
            <View style={styles.activeCardInner}>
              <Feather name="map-pin" size={14} color={colors.primary} />
              <Text style={[styles.activeCardText, { color: colors.foreground }]}>
                {mostRecentTrip.destination || "Deciding destination…"}
              </Text>
            </View>
            <Text style={[styles.activeCardSub, { color: colors.mutedForeground }]}>
              Active trip · tap to continue
            </Text>
          </Pressable>
        )}

        {/* Action buttons */}
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

        {/* My Packs */}
        {packs.filter(p => !deletedPackIds.has(p.id)).length > 0 && (
          <View style={styles.packsSection}>
            <View style={styles.packsSectionRow}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>My Packs</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20, paddingBottom: 4 }}>
              {packs.filter(p => !deletedPackIds.has(p.id)).slice(0, 6).map((pack) => {
                const memberEntries = Object.entries(pack.members);
                return (
                  <Pressable
                    key={pack.id}
                    onPress={() => router.push(`/groups/${pack.id}` as any)}
                    style={[styles.packCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    {/* Delete button */}
                    <Pressable
                      onPress={(e) => { e.stopPropagation(); handleDeletePack(pack); }}
                      hitSlop={8}
                      style={styles.packDeleteBtn}
                    >
                      <Feather name="x" size={12} color={colors.mutedForeground} />
                    </Pressable>

                    <Text style={[styles.packCardName, { color: colors.foreground }]} numberOfLines={1}>{pack.name}</Text>
                    <View style={styles.packAvatarRow}>
                      {memberEntries.slice(0, 4).map(([uid, m], i) => (
                        <View
                          key={uid}
                          style={[styles.packAvatar, { backgroundColor: PACK_COLORS[i % PACK_COLORS.length], marginLeft: i > 0 ? -6 : 0 }]}
                        >
                          <Text style={styles.packAvatarText}>{((m as any).name ?? "?")[0]?.toUpperCase()}</Text>
                        </View>
                      ))}
                      {memberEntries.length > 4 && (
                        <View style={[styles.packAvatar, { backgroundColor: colors.muted, marginLeft: -6 }]}>
                          <Text style={[styles.packAvatarText, { color: colors.mutedForeground }]}>+{memberEntries.length - 4}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.packCardMeta, { color: colors.mutedForeground }]}>
                      {memberEntries.length} members{pack.lastTripDestination ? ` · ${pack.lastTripDestination}` : ""}
                    </Text>
                    <View style={[styles.packPlanPill, { borderColor: colors.primary + "50" }]}>
                      <Feather name="plus" size={11} color={colors.primary} />
                      <Text style={[styles.packPlanText, { color: colors.primary }]}>Plan new trip</Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* How it works */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>How it works</Text>
          {HOW_IT_WORKS.map((item) => (
            <View
              key={item.step}
              style={[styles.howCard, { backgroundColor: item.bg, borderColor: item.color + "40" }]}
            >
              <View style={[styles.howIcon, { backgroundColor: item.color }]}>
                <Feather name={item.icon} size={16} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.howTitle, { color: item.color }]}>{item.step}. {item.title}</Text>
                <Text style={[styles.howDesc, { color: item.color + "CC" }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Help modal */}
      <Modal visible={helpVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setHelpVisible(false)}>
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>How GoPackNow works</Text>
            <Pressable onPress={() => setHelpVisible(false)} style={[styles.modalClose, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={18} color={colors.foreground} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {[
              { n: "1", color: "#F59E0B", title: "Create or join a trip", body: "Start a trip with a destination (or let the group decide), then share the invite link with your travel pack." },
              { n: "2", color: "#7E57C2", title: "Everyone adds wishes", body: "Each person drops activities they want — \"cooking class\", \"sunrise hike\", \"rooftop bar\". No limits." },
              { n: "3", color: "#E85D3A", title: "Vote on favourites", body: "Thumbs-up the activities you love. The top-voted wishes shape the final plan." },
              { n: "4", color: "#26A69A", title: "AI builds your itinerary", body: "Hit \"Generate itinerary\" — our AI turns your top wishes into a detailed day-by-day plan plus a smart packing list." },
              { n: "5", color: "#4CAF50", title: "Decide together (optional)", body: "No destination yet? Choose \"Decide with the group\" — everyone submits preferences, AI suggests destinations, the group votes." },
            ].map((s) => (
              <View key={s.n} style={styles.helpStep}>
                <View style={[styles.helpNum, { backgroundColor: s.color }]}>
                  <Text style={styles.helpNumText}>{s.n}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpStepTitle, { color: colors.foreground }]}>{s.title}</Text>
                  <Text style={[styles.helpStepBody, { color: colors.mutedForeground }]}>{s.body}</Text>
                </View>
              </View>
            ))}
            <Pressable
              onPress={() => setHelpVisible(false)}
              style={[styles.helpDone, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.helpDoneText}>Got it</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
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
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  helpBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  helpBtnText: { fontFamily: "DmSans_700Bold", fontSize: 16 },
  headerIcon: { padding: 4 },
  heroSection: { paddingHorizontal: 20, paddingBottom: 20, paddingTop: 8 },
  greetingText: { fontFamily: "DmSans_400Regular", fontSize: 14, marginBottom: 6 },
  heroTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 30, lineHeight: 38, marginBottom: 8 },
  heroSub: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 20 },
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
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: 14,
  },
  actionBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
  section: { paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: "DmSans_500Medium", fontSize: 12,
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12,
  },
  howCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 14,
    borderRadius: 16, borderWidth: 1,
    padding: 16, marginBottom: 10,
  },
  howIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", marginTop: 1,
  },
  howTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 15, marginBottom: 4 },
  howDesc: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18 },
  // Modal
  modalRoot: { flex: 1 },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 18, borderBottomWidth: 1,
  },
  modalTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  modalBody: { padding: 24, gap: 20 },
  helpStep: { flexDirection: "row", gap: 14, alignItems: "flex-start" },
  helpNum: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  helpNumText: { fontFamily: "DmSans_700Bold", fontSize: 13, color: "#fff" },
  helpStepTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 15, marginBottom: 4 },
  helpStepBody: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 20 },
  helpDone: {
    marginTop: 12, borderRadius: 28,
    paddingVertical: 14, alignItems: "center",
  },
  helpDoneText: { fontFamily: "DmSans_600SemiBold", fontSize: 16, color: "#fff" },
  packsSection: { marginBottom: 24 },
  packsSectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  packCard: { width: 168, borderRadius: 16, borderWidth: 1, padding: 14, gap: 8, position: "relative" },
  packDeleteBtn: { position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.08)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  packCardName: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  packAvatarRow: { flexDirection: "row", alignItems: "center" },
  packAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  packAvatarText: { fontFamily: "DmSans_700Bold", fontSize: 10, color: "#fff" },
  packCardMeta: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  packPlanPill: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, alignSelf: "flex-start" },
  packPlanText: { fontFamily: "DmSans_600SemiBold", fontSize: 12 },
});
