import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { addWish, useTrip, useWishes, voteWish, Wish } from "@/hooks/useFirebase";

const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

type Tab = "wish" | "vote" | "go";

function Avatar({ name, index, size = 32 }: { name: string; index: number; size?: number }) {
  const bg = MEMBER_COLORS[index % MEMBER_COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontFamily: "DmSans_700Bold" }}>
        {(name ?? "?")[0].toUpperCase()}
      </Text>
    </View>
  );
}

function WishItem({ wish, uid, tripId, colors }: { wish: Wish; uid: string; tripId: string; colors: any }) {
  const hasVoted = !!wish.voters?.[uid];
  const memberNames = wish.authorName ?? "Member";
  const idx = memberNames.charCodeAt(0) % MEMBER_COLORS.length;

  return (
    <View style={[styles.wishRow, { borderBottomColor: colors.border }]}>
      <Avatar name={memberNames} index={idx} />
      <Text style={[styles.wishText, { color: colors.foreground }]} numberOfLines={3}>
        {wish.text}
      </Text>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          voteWish(tripId, wish.id, uid, wish.votes, hasVoted);
        }}
        style={styles.voteBtn}
      >
        <Feather name="thumbs-up" size={16} color={hasVoted ? colors.primary : colors.mutedForeground} />
        <Text style={[styles.voteCount, { color: hasVoted ? colors.primary : colors.mutedForeground }]}>
          {wish.votes}
        </Text>
      </Pressable>
    </View>
  );
}

function VoteItem({ wish, rank, colors }: { wish: Wish; rank: number; colors: any }) {
  return (
    <View style={[styles.voteRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>{rank}</Text>
      <Text style={[styles.voteWishText, { color: colors.foreground }]} numberOfLines={2}>
        {wish.text}
      </Text>
      <View style={[styles.voteBadge, { backgroundColor: rank === 1 ? colors.primary : colors.muted }]}>
        <Text style={[styles.voteBadgeText, { color: rank === 1 ? "#fff" : colors.foreground }]}>
          {wish.votes}
        </Text>
      </View>
    </View>
  );
}

export default function TripHubScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { trip, loading } = useTrip(id);
  const wishes = useWishes(id);

  const [activeTab, setActiveTab] = useState<Tab>("wish");
  const [wishInput, setWishInput] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 12;

  const memberNames = Object.values(trip?.memberNames ?? {});
  const memberCount = Object.keys(trip?.memberIds ?? {}).length;

  const handleAddWish = async () => {
    if (!wishInput.trim() || !user || !id) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addWish(id, wishInput.trim(), user.uid, user.displayName ?? "Traveler");
    setWishInput("");
  };

  const inviteLink = `https://gopack.now/join/${trip?.inviteCode ?? ""}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "DmSans_400Regular" }}>Trip not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Feather name="map-pin" size={14} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {trip.destination}
          </Text>
        </View>
        <Pressable onPress={() => setShowInvite(true)} style={[styles.inviteBtn, { borderColor: colors.primary }]}>
          <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Invite</Text>
        </Pressable>
      </View>

      <View style={[styles.membersRow, { borderBottomColor: colors.border }]}>
        {memberNames.slice(0, 5).map((name, i) => (
          <View key={i} style={{ marginRight: i < Math.min(memberNames.length, 5) - 1 ? -8 : 0 }}>
            <Avatar name={name} index={i} size={30} />
          </View>
        ))}
        {memberCount > 5 && (
          <Text style={[styles.memberMore, { color: colors.mutedForeground }]}>+{memberCount - 5}</Text>
        )}
      </View>

      <View style={styles.tabRow}>
        {(["wish", "vote", "go"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tabBtn,
              { borderBottomColor: activeTab === tab ? colors.primary : "transparent" },
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === tab ? colors.primary : colors.mutedForeground },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "wish" && (
        <View style={{ flex: 1 }}>
          {memberCount < 3 && (
            <View style={[styles.inviteCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteCardTitle, { color: colors.foreground }]}>Invite the pack</Text>
                <Text style={[styles.inviteCardSub, { color: colors.mutedForeground }]}>
                  More wishes = better plan
                </Text>
              </View>
              <Pressable
                onPress={() => setShowInvite(true)}
                style={[styles.inviteCardBtn, { backgroundColor: colors.primary }]}
              >
                <Feather name="user-plus" size={16} color="#fff" />
              </Pressable>
            </View>
          )}
          <FlatList
            data={wishes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <WishItem wish={item} uid={user?.uid ?? ""} tripId={id!} colors={colors} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWish}>
                <Feather name="star" size={32} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No wishes yet. Add the first one!
                </Text>
              </View>
            }
            contentContainerStyle={{ flexGrow: 1 }}
            scrollEnabled={!!wishes.length}
          />
          <View style={[styles.addWishBar, { borderTopColor: colors.border, paddingBottom: bottomInset + 12 }]}>
            <TextInput
              style={[styles.addWishInput, { backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder="Add a wish..."
              placeholderTextColor={colors.mutedForeground}
              value={wishInput}
              onChangeText={setWishInput}
              onSubmitEditing={handleAddWish}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleAddWish}
              style={[styles.addWishBtn, { backgroundColor: colors.primary }]}
              disabled={!wishInput.trim()}
            >
              <Feather name="plus" size={22} color="#fff" />
            </Pressable>
          </View>
        </View>
      )}

      {activeTab === "vote" && (
        <View style={{ flex: 1 }}>
          <View style={[styles.voteHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.voteHeaderTitle, { color: colors.foreground }]}>Top wishes rising</Text>
            <Text style={[styles.voteHeaderSub, { color: colors.mutedForeground }]}>
              {wishes.filter((w) => w.votes > 0).length} of {wishes.length} voted
            </Text>
          </View>
          <FlatList
            data={wishes}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <VoteItem wish={item} rank={index + 1} colors={colors} />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWish}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No wishes to vote on yet.
                </Text>
              </View>
            }
            contentContainerStyle={{ paddingBottom: bottomInset + 12 }}
          />
        </View>
      )}

      {activeTab === "go" && (
        <View style={[styles.goTab, { paddingBottom: bottomInset + 12 }]}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push(`/building/${id}`);
            }}
            style={styles.goCard}
          >
            <Text style={styles.goReadyLabel}>READY WHEN YOU ARE</Text>
            <Text style={styles.goCardTitle}>Build the{"\n"}itinerary</Text>
            <View style={styles.goCardBtn}>
              <Feather name="arrow-right" size={22} color="#fff" />
            </View>
          </Pressable>
          <Pressable onPress={() => setShowInvite(true)}>
            <Text style={[styles.goManageLink, { color: colors.mutedForeground }]}>
              Manage invite & privacy
            </Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={showInvite}
        transparent
        animationType="slide"
        onRequestClose={() => setShowInvite(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowInvite(false)}>
          <Pressable style={[styles.inviteSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Invite the pack</Text>
              <Pressable onPress={() => setShowInvite(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>TRIP LINK</Text>
            <View style={[styles.sheetLinkRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.sheetLinkText, { color: colors.foreground }]} numberOfLines={1}>
                {inviteLink}
              </Text>
              <Pressable onPress={handleCopy} style={[styles.copyBtn, { backgroundColor: colors.primary }]}>
                <Feather name={copied ? "check" : "copy"} size={16} color="#fff" />
              </Pressable>
            </View>

            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>CODE</Text>
            <Text style={[styles.inviteCode, { color: colors.primary }]}>
              {trip.inviteCode}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 17 },
  inviteBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  inviteBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  memberMore: { fontFamily: "DmSans_500Medium", fontSize: 12, marginLeft: 10 },
  tabRow: { flexDirection: "row", paddingHorizontal: 16 },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
  },
  tabBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 14 },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  inviteCardTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 14, marginBottom: 2 },
  inviteCardSub: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  inviteCardBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  wishRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  wishText: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 15, lineHeight: 21 },
  voteBtn: { alignItems: "center", gap: 3, minWidth: 36 },
  voteCount: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  addWishBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  addWishInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
  },
  addWishBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWish: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 15 },
  voteHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  voteHeaderTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  voteHeaderSub: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  voteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  rankNum: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, minWidth: 24, textAlign: "center" },
  voteWishText: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 15 },
  voteBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: "center",
  },
  voteBadgeText: { fontFamily: "DmSans_700Bold", fontSize: 14 },
  goTab: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, gap: 20 },
  goCard: {
    width: "100%",
    backgroundColor: "#2B2723",
    borderRadius: 20,
    padding: 28,
    gap: 10,
  },
  goReadyLabel: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
    color: "#E85D3A",
  },
  goCardTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
    color: "#FFFDF9",
    lineHeight: 38,
  },
  goCardBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#E85D3A",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  goManageLink: { fontFamily: "DmSans_400Regular", fontSize: 13, textDecorationLine: "underline" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  inviteSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    gap: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  sheetLabel: {
    fontFamily: "DmSans_500Medium",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  sheetLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingLeft: 14,
    overflow: "hidden",
  },
  sheetLinkText: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 13 },
  copyBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteCode: {
    fontFamily: "DmSans_700Bold",
    fontSize: 28,
    letterSpacing: 4,
    textAlign: "center",
    paddingVertical: 8,
  },
});
