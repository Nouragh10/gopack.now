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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  addWish,
  lockVotes,
  unlockVotes,
  useTrip,
  useWishes,
  voteWish,
  Wish,
} from "@/hooks/useFirebase";

const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

type Tab = "wish" | "vote" | "go";

function Avatar({ name, index, size = 32 }: { name: string; index: number; size?: number }) {
  const bg = MEMBER_COLORS[index % MEMBER_COLORS.length];
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: bg, alignItems: "center", justifyContent: "center",
        borderWidth: 1.5, borderColor: "#fff",
      }}
    >
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontFamily: "DmSans_700Bold" }}>
        {(name ?? "?")[0].toUpperCase()}
      </Text>
    </View>
  );
}

/* ── WishItem (Wish tab) ─────────────────────────────────────────── */

function WishItem({
  wish, uid, userName, tripId, colors,
}: {
  wish: Wish; uid: string; userName: string; tripId: string; colors: any;
}) {
  const upvoted = !!wish.upvoters?.[uid];
  const downvoted = !!wish.downvoters?.[uid];
  const score = wish.score ?? 0;
  const scoreColor = score > 0 ? colors.primary : score < 0 ? "#9E9E9E" : colors.mutedForeground;
  const idx = (wish.authorName ?? "?").charCodeAt(0) % MEMBER_COLORS.length;

  const handleVote = (dir: "up" | "down") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    voteWish(tripId, wish.id, uid, userName, dir);
  };

  return (
    <View style={[styles.wishRow, { borderBottomColor: colors.border }]}>
      <Avatar name={wish.authorName} index={idx} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.wishText, { color: colors.foreground }]} numberOfLines={3}>
          {wish.text}
        </Text>
        <Text style={[styles.wishAuthor, { color: colors.mutedForeground }]}>
          {wish.authorName}
        </Text>
      </View>
      <View style={styles.arrowStack}>
        <Pressable
          onPress={() => handleVote("up")}
          style={[styles.arrowBtn, { backgroundColor: upvoted ? colors.primary + "22" : "transparent" }]}
        >
          <Feather name="arrow-up" size={18} color={upvoted ? colors.primary : colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.scoreText, { color: scoreColor }]}>
          {score > 0 ? `+${score}` : score}
        </Text>
        <Pressable
          onPress={() => handleVote("down")}
          style={[styles.arrowBtn, { backgroundColor: downvoted ? "#9E9E9E22" : "transparent" }]}
        >
          <Feather name="arrow-down" size={18} color={downvoted ? colors.foreground : colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

/* ── VoteCard (Vote tab) ─────────────────────────────────────────── */

function VoteCard({
  wish, rank, uid, userName, tripId, colors,
}: {
  wish: Wish; rank: number; uid: string; userName: string; tripId: string; colors: any;
}) {
  const upvoted = !!wish.upvoters?.[uid];
  const downvoted = !!wish.downvoters?.[uid];
  const upNames = Object.values(wish.upvoters ?? {}) as string[];
  const downNames = Object.values(wish.downvoters ?? {}) as string[];
  const score = wish.score ?? 0;

  const handleVote = (dir: "up" | "down") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    voteWish(tripId, wish.id, uid, userName, dir);
  };

  return (
    <View style={[styles.voteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.voteCardTop}>
        <Text style={[styles.voteRank, { color: colors.mutedForeground }]}>{rank}</Text>
        <Text style={[styles.voteCardText, { color: colors.foreground }]} numberOfLines={3}>
          {wish.text}
        </Text>
        <View
          style={[
            styles.scorePill,
            { backgroundColor: score > 0 ? colors.primary : score < 0 ? colors.muted : colors.muted },
          ]}
        >
          <Text style={[styles.scorePillText, { color: score > 0 ? "#fff" : colors.foreground }]}>
            {score > 0 ? `+${score}` : score}
          </Text>
        </View>
      </View>

      {upNames.length > 0 && (
        <View style={styles.voterRow}>
          <Feather name="arrow-up" size={12} color={colors.primary} />
          <Text style={[styles.voterNames, { color: colors.primary }]} numberOfLines={1}>
            {upNames.join(", ")}
          </Text>
        </View>
      )}
      {downNames.length > 0 && (
        <View style={styles.voterRow}>
          <Feather name="arrow-down" size={12} color={colors.mutedForeground} />
          <Text style={[styles.voterNames, { color: colors.mutedForeground }]} numberOfLines={1}>
            {downNames.join(", ")}
          </Text>
        </View>
      )}

      <View style={styles.voteCardActions}>
        <Pressable
          onPress={() => handleVote("up")}
          style={[
            styles.voteActionBtn,
            { backgroundColor: upvoted ? colors.primary : colors.muted, borderColor: upvoted ? colors.primary : colors.border },
          ]}
        >
          <Feather name="arrow-up" size={16} color={upvoted ? "#fff" : colors.foreground} />
          <Text style={[styles.voteActionCount, { color: upvoted ? "#fff" : colors.foreground }]}>
            {upNames.length}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => handleVote("down")}
          style={[
            styles.voteActionBtn,
            { backgroundColor: downvoted ? colors.foreground : colors.muted, borderColor: downvoted ? colors.foreground : colors.border },
          ]}
        >
          <Feather name="arrow-down" size={16} color={downvoted ? colors.background : colors.foreground} />
          <Text style={[styles.voteActionCount, { color: downvoted ? colors.background : colors.foreground }]}>
            {downNames.length}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ── Screen ──────────────────────────────────────────────────────── */

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
  const [lockingVotes, setLockingVotes] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 12;

  const members = Object.entries(trip?.members ?? {});
  const memberCount = members.length;
  const memberNames = members.map(([, m]) => m.name);

  const lockedBy = trip?.votesLockedBy ?? {};
  const lockedCount = Object.keys(lockedBy).length;
  const allLocked = memberCount > 0 && lockedCount >= memberCount;
  const myLocked = !!lockedBy[user?.uid ?? ""];

  const handleAddWish = async () => {
    if (!wishInput.trim() || !user || !id) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addWish(id, wishInput.trim(), user.uid, user.displayName ?? "Traveler");
    setWishInput("");
  };

  const handleToggleLock = async () => {
    if (!user || !id) return;
    setLockingVotes(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (myLocked) {
        await unlockVotes(id, user.uid);
      } else {
        await lockVotes(id, user.uid);
      }
    } finally {
      setLockingVotes(false);
    }
  };

  const inviteLink = `https://gopack.now/join/${id ?? ""}`;

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

  const waitingMembers = members
    .filter(([uid]) => !lockedBy[uid])
    .map(([, m]) => m.name);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
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

      {/* Members strip */}
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

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["wish", "vote", "go"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, { borderBottomColor: activeTab === tab ? colors.primary : "transparent" }]}
          >
            <Text style={[styles.tabBtnText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab === "vote" && !allLocked && lockedCount > 0
                ? `Vote (${lockedCount}/${memberCount})`
                : tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── WISH TAB ── */}
      {activeTab === "wish" && (
        <View style={{ flex: 1 }}>
          {memberCount < 3 && (
            <View style={[styles.inviteCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inviteCardTitle, { color: colors.foreground }]}>Invite the pack</Text>
                <Text style={[styles.inviteCardSub, { color: colors.mutedForeground }]}>More wishes = better plan</Text>
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
              <WishItem
                wish={item}
                uid={user?.uid ?? ""}
                userName={user?.displayName ?? "Traveler"}
                tripId={id!}
                colors={colors}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWish}>
                <Feather name="star" size={32} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No wishes yet. Add the first one!</Text>
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

      {/* ── VOTE TAB ── */}
      {activeTab === "vote" && (
        <View style={{ flex: 1 }}>
          {/* Lock-in progress bar */}
          <View style={[styles.lockBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.lockBarTitle, { color: colors.foreground }]}>
                {allLocked ? "All votes locked in ✓" : `${lockedCount} of ${memberCount} locked in`}
              </Text>
              <View style={[styles.lockProgress, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.lockProgressFill,
                    {
                      backgroundColor: allLocked ? "#4CAF50" : colors.primary,
                      width: memberCount > 0 ? `${(lockedCount / memberCount) * 100}%` : "0%",
                    },
                  ]}
                />
              </View>
            </View>
            <Pressable
              onPress={handleToggleLock}
              disabled={lockingVotes}
              style={[
                styles.lockBtn,
                { backgroundColor: myLocked ? "#4CAF50" : colors.primary },
              ]}
            >
              {lockingVotes ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Feather name={myLocked ? "check" : "lock"} size={14} color="#fff" />
                  <Text style={styles.lockBtnText}>{myLocked ? "Locked" : "Lock in"}</Text>
                </>
              )}
            </Pressable>
          </View>

          <FlatList
            data={wishes}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <VoteCard
                wish={item}
                rank={index + 1}
                uid={user?.uid ?? ""}
                userName={user?.displayName ?? "Traveler"}
                tripId={id!}
                colors={colors}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyWish}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No wishes to vote on yet.</Text>
              </View>
            }
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: bottomInset + 12 }}
          />
        </View>
      )}

      {/* ── GO TAB ── */}
      {activeTab === "go" && (
        <ScrollView
          contentContainerStyle={[styles.goTab, { paddingBottom: bottomInset + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Member lock-in status */}
          <View style={[styles.membersLockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.membersLockTitle, { color: colors.foreground }]}>Vote lock-in status</Text>
            {members.map(([uid, member], i) => {
              const isLocked = !!lockedBy[uid];
              return (
                <View key={uid} style={[styles.memberLockRow, { borderTopColor: colors.border }]}>
                  <Avatar name={member.name} index={i} size={28} />
                  <Text style={[styles.memberLockName, { color: colors.foreground }]}>{member.name}</Text>
                  {isLocked ? (
                    <View style={styles.lockedBadge}>
                      <Feather name="check" size={12} color="#fff" />
                      <Text style={styles.lockedBadgeText}>Locked</Text>
                    </View>
                  ) : (
                    <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>Voting…</Text>
                  )}
                </View>
              );
            })}
          </View>

          {/* Generate itinerary card */}
          <Pressable
            onPress={() => {
              if (!allLocked) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              router.push(`/building/${id}`);
            }}
            style={[styles.goCard, { opacity: allLocked ? 1 : 0.5 }]}
          >
            <Text style={styles.goReadyLabel}>
              {allLocked ? "READY WHEN YOU ARE" : "WAITING FOR PACK"}
            </Text>
            <Text style={styles.goCardTitle}>Build the{"\n"}itinerary</Text>
            {!allLocked && waitingMembers.length > 0 && (
              <Text style={styles.goWaiting}>
                Waiting for: {waitingMembers.join(", ")}
              </Text>
            )}
            <View style={[styles.goCardBtn, { backgroundColor: allLocked ? "#E85D3A" : "#7A6E68" }]}>
              <Feather name={allLocked ? "arrow-right" : "clock"} size={22} color="#fff" />
            </View>
          </Pressable>

          {/* Packing list card */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push(`/packing/${id}`);
            }}
            style={[styles.packCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={styles.packCardLeft}>
              <Text style={[styles.packCardLabel, { color: colors.primary }]}>AI PACKING LIST</Text>
              <Text style={[styles.packCardTitle, { color: colors.foreground }]}>Pack smart{"\n"}for the trip</Text>
            </View>
            <View style={[styles.packCardBtn, { backgroundColor: colors.muted }]}>
              <Feather name="package" size={20} color={colors.foreground} />
            </View>
          </Pressable>

          <Pressable onPress={() => setShowInvite(true)}>
            <Text style={[styles.goManageLink, { color: colors.mutedForeground }]}>
              Manage invite & privacy
            </Text>
          </Pressable>
        </ScrollView>
      )}

      {/* Invite modal */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
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
            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>TRIP ID</Text>
            <Text style={[styles.inviteCode, { color: colors.primary }]}>{id}</Text>
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
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 8,
  },
  backBtn: { padding: 4 },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  headerTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 17 },
  inviteBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  inviteBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  membersRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  memberMore: { fontFamily: "DmSans_500Medium", fontSize: 12, marginLeft: 10 },
  tabRow: { flexDirection: "row", paddingHorizontal: 16 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2 },
  tabBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 14 },

  /* Wish tab */
  inviteCard: {
    flexDirection: "row", alignItems: "center",
    margin: 16, padding: 14, borderRadius: 12, borderWidth: 1, gap: 12,
  },
  inviteCardTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 14, marginBottom: 2 },
  inviteCardSub: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  inviteCardBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  wishRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12, borderBottomWidth: 1,
  },
  wishText: { fontFamily: "DmSans_400Regular", fontSize: 15, lineHeight: 21 },
  wishAuthor: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 2 },
  arrowStack: { alignItems: "center", gap: 1 },
  arrowBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  scoreText: { fontFamily: "DmSans_700Bold", fontSize: 13, minWidth: 24, textAlign: "center" },
  addWishBar: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1,
  },
  addWishInput: {
    flex: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontFamily: "DmSans_400Regular", fontSize: 15,
  },
  addWishBtn: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  emptyWish: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 15 },

  /* Vote tab */
  lockBar: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  lockBarTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 13, marginBottom: 6 },
  lockProgress: { height: 4, borderRadius: 2, overflow: "hidden" },
  lockProgressFill: { height: 4, borderRadius: 2 },
  lockBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20,
  },
  lockBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff" },
  voteCard: {
    borderRadius: 14, borderWidth: 1,
    padding: 14, marginBottom: 10, gap: 8,
  },
  voteCardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  voteRank: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18, minWidth: 22, textAlign: "center", marginTop: 1 },
  voteCardText: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 15, lineHeight: 21 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, minWidth: 36, alignItems: "center" },
  scorePillText: { fontFamily: "DmSans_700Bold", fontSize: 13 },
  voterRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  voterNames: { fontFamily: "DmSans_400Regular", fontSize: 12, flex: 1 },
  voteCardActions: { flexDirection: "row", gap: 8, marginTop: 2 },
  voteActionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  voteActionCount: { fontFamily: "DmSans_600SemiBold", fontSize: 14 },

  /* Go tab */
  goTab: { alignItems: "center", paddingHorizontal: 20, gap: 16, paddingTop: 20 },
  membersLockCard: {
    width: "100%", borderRadius: 16, borderWidth: 1, padding: 16, gap: 0,
  },
  membersLockTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 14, marginBottom: 12 },
  memberLockRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderTopWidth: 1,
  },
  memberLockName: { flex: 1, fontFamily: "DmSans_500Medium", fontSize: 14 },
  lockedBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#4CAF50", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  lockedBadgeText: { fontFamily: "DmSans_600SemiBold", fontSize: 12, color: "#fff" },
  waitingText: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  goCard: {
    width: "100%", backgroundColor: "#2B2723",
    borderRadius: 20, padding: 28, gap: 10,
  },
  goReadyLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 2, color: "#E85D3A" },
  goCardTitle: {
    fontFamily: "PlayfairDisplay_700Bold", fontSize: 30,
    color: "#FFFDF9", lineHeight: 38,
  },
  goWaiting: { fontFamily: "DmSans_400Regular", fontSize: 13, color: "#756C66" },
  goCardBtn: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: "center", justifyContent: "center", marginTop: 8,
  },
  goManageLink: { fontFamily: "DmSans_400Regular", fontSize: 13, textDecorationLine: "underline" },
  packCard: {
    width: "100%", flexDirection: "row", alignItems: "center",
    justifyContent: "space-between", borderRadius: 16, borderWidth: 1, padding: 20,
  },
  packCardLeft: { gap: 6 },
  packCardLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 2 },
  packCardTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, lineHeight: 28 },
  packCardBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },

  /* Modals */
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  inviteSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  sheetLabel: { fontFamily: "DmSans_500Medium", fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 },
  sheetLinkRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 12, borderWidth: 1, paddingLeft: 14, overflow: "hidden",
  },
  sheetLinkText: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 13 },
  copyBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  inviteCode: { fontFamily: "DmSans_700Bold", fontSize: 22, letterSpacing: 3, textAlign: "center", paddingVertical: 8 },
});
