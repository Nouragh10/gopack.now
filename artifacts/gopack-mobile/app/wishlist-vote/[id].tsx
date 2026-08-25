import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { lockVotes, unlockVotes, voteWish, useTrip, useWishes, Wish } from "@/hooks/useFirebase";

/* ── Category thumbnail (reused from wishlist screen) ─────── */
const CATEGORY_MAP: { keywords: string[]; icon: string; bg: string; color: string }[] = [
  { keywords: ["temple", "sacred", "spiritual", "shrine"], icon: "sun", bg: "#FFF3E0", color: "#FB8C00" },
  { keywords: ["beach", "surf", "ocean", "sea", "swim"], icon: "anchor", bg: "#E3F2FD", color: "#1E88E5" },
  { keywords: ["hike", "trek", "waterfall", "nature", "forest"], icon: "triangle", bg: "#E8F5E9", color: "#43A047" },
  { keywords: ["food", "cook", "eat", "dinner", "market", "restaurant"], icon: "coffee", bg: "#FFF8E1", color: "#F9A825" },
  { keywords: ["sail", "boat", "cruise", "kayak"], icon: "wind", bg: "#E3F2FD", color: "#039BE5" },
  { keywords: ["spa", "massage", "relax", "yoga"], icon: "heart", bg: "#FCE4EC", color: "#E91E63" },
  { keywords: ["museum", "art", "gallery", "culture", "history", "tour"], icon: "map", bg: "#F3E5F5", color: "#8E24AA" },
  { keywords: ["night", "bar", "club"], icon: "moon", bg: "#E8EAF6", color: "#3949AB" },
  { keywords: ["shop", "market"], icon: "shopping-bag", bg: "#FFF3E0", color: "#FB8C00" },
  { keywords: ["day trip", "nusa", "island"], icon: "flag", bg: "#E0F7FA", color: "#00ACC1" },
];

function getCategory(text: string) {
  const lower = text.toLowerCase();
  for (const cat of CATEGORY_MAP) {
    if (cat.keywords.some((k) => lower.includes(k))) return cat;
  }
  return { icon: "star", bg: "#F5F5F5", color: "#9E9E9E" };
}

function WishThumb({ text }: { text: string }) {
  const cat = getCategory(text);
  return (
    <View style={[styles.thumb, { backgroundColor: cat.bg }]}>
      <Feather name={cat.icon as any} size={20} color={cat.color} />
    </View>
  );
}

function getCategoryLabel(text: string): string {
  const lower = text.toLowerCase();
  if (lower.match(/temple|shrine|sacred/)) return "Culture";
  if (lower.match(/beach|surf|ocean|sea|swim/)) return "Beach";
  if (lower.match(/hike|trek|waterfall|nature|forest/)) return "Adventure";
  if (lower.match(/food|cook|eat|dinner|market/)) return "Food";
  if (lower.match(/sail|boat|cruise|kayak/)) return "Sailing";
  if (lower.match(/spa|massage|relax|yoga/)) return "Wellness";
  if (lower.match(/museum|art|gallery|history/)) return "Culture";
  if (lower.match(/night|bar|club/)) return "Nightlife";
  return "Activity";
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;

type WishlistSwipeCardProps = {
  wish: Wish;
  uid: string;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  colors: ReturnType<typeof useColors>;
};

function TopWishlistCard({ wish, uid, onSwipeLeft, onSwipeRight, colors }: WishlistSwipeCardProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      tx.value = e.translationX;
      ty.value = e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        tx.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 280 }, (done) => {
          if (done) runOnJS(onSwipeRight)();
        });
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        tx.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 280 }, (done) => {
          if (done) runOnJS(onSwipeLeft)();
        });
      } else {
        tx.value = withSpring(0, { damping: 14, stiffness: 130 });
        ty.value = withSpring(0, { damping: 14, stiffness: 130 });
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${interpolate(tx.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-14, 0, 14])}deg` },
    ],
  }));
  const likeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [20, SWIPE_THRESHOLD * 0.8], [0, 1], Extrapolation.CLAMP),
  }));
  const nopeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value, [-SWIPE_THRESHOLD * 0.8, -20], [1, 0], Extrapolation.CLAMP),
  }));

  const upvoted = !!wish.upvoters?.[uid];
  const downvoted = !!wish.downvoters?.[uid];
  const authorInitial = (wish.authorName ?? "?").charAt(0).toUpperCase();

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        testID={`wishlist-swipe-card-${wish.id}`}
        style={[styles.swipeCard, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH }, cardStyle]}
      >
        <View style={[styles.swipeCardHeader, { backgroundColor: colors.primary + "12" }]}>
          <View style={styles.swipeCardAuthorRow}>
            <View style={[styles.swipeAuthorAvatar, { backgroundColor: colors.primary + "22" }]}>
              <Text style={[styles.swipeAuthorInitial, { color: colors.primary }]}>{authorInitial}</Text>
            </View>
            <Text style={[styles.swipeCardAuthor, { color: colors.mutedForeground }]}>{wish.authorName}</Text>
          </View>
          <View style={[styles.swipeScorePill, { backgroundColor: wish.score > 0 ? "#4CAF5022" : colors.muted }]}>
            <Feather name="arrow-up" size={12} color={wish.score > 0 ? "#4CAF50" : colors.mutedForeground} />
            <Text style={[styles.swipeScoreText, { color: wish.score > 0 ? "#4CAF50" : colors.mutedForeground }]}>
              {wish.score > 0 ? `+${wish.score}` : wish.score}
            </Text>
          </View>
        </View>

        <Animated.View style={[styles.swipeLabel, styles.swipeLabelRight, likeStyle]}>
          <Feather name="heart" size={18} color="#4CAF50" />
          <Text style={[styles.swipeLabelText, { color: "#4CAF50" }]}>LOVE IT</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeLabel, styles.swipeLabelLeft, nopeStyle]}>
          <Feather name="x" size={18} color="#ef4444" />
          <Text style={[styles.swipeLabelText, { color: "#ef4444" }]}>SKIP</Text>
        </Animated.View>

        <View style={styles.swipeCardBody}>
          <WishThumb text={wish.text} />
          {(upvoted || downvoted) && (
            <View style={[styles.prevVotePill, { backgroundColor: upvoted ? "#4CAF5015" : "#9E9E9E15" }]}>
              <Feather name={upvoted ? "heart" : "x"} size={11} color={upvoted ? "#4CAF50" : "#9E9E9E"} />
              <Text style={[styles.prevVoteText, { color: upvoted ? "#4CAF50" : "#9E9E9E" }]}>
                {upvoted ? "You loved this" : "You skipped"}
              </Text>
            </View>
          )}
          <Text style={[styles.swipeCardWishText, { color: colors.foreground }]}>{wish.text}</Text>
          <Text style={[styles.swipeHint, { color: colors.mutedForeground }]}>swipe or tap below</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

function WishlistSwipeStack({
  wishes, uid, userName, tripId, colors, onComplete,
}: {
  wishes: Wish[];
  uid: string;
  userName: string;
  tripId: string;
  colors: ReturnType<typeof useColors>;
  onComplete?: () => void;
}) {
  // Keep the order stable while Firebase updates vote scores.
  const [swipeOrder] = useState<string[]>(() => wishes.map((wish) => wish.id));
  const wishMap = useMemo(() => new Map(wishes.map((wish) => [wish.id, wish])), [wishes]);
  const [topIndex, setTopIndex] = useState(0);
  const topIndexRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  topIndexRef.current = topIndex;
  onCompleteRef.current = onComplete;

  const doVote = useCallback((direction: "up" | "down") => {
    const index = topIndexRef.current;
    const wishId = swipeOrder[index];
    if (!wishId) return;

    if (direction === "up") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    void voteWish(tripId, wishId, uid, userName, direction);
    topIndexRef.current = index + 1;
    setTopIndex(index + 1);
    if (index + 1 >= swipeOrder.length) onCompleteRef.current?.();
  }, [swipeOrder, tripId, uid, userName]);

  const onSwipeRight = useCallback(() => doVote("up"), [doVote]);
  const onSwipeLeft = useCallback(() => doVote("down"), [doVote]);

  if (wishes.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Feather name="star" size={32} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No wishes to vote on yet.</Text>
      </View>
    );
  }

  if (topIndex >= swipeOrder.length) {
    return (
      <View style={styles.allDoneWrap}>
        <View style={[styles.allDoneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="check-circle" size={44} color={colors.primary} />
          <Text style={[styles.allDoneTitle, { color: colors.foreground }]}>All voted!</Text>
          <Text style={[styles.allDoneSub, { color: colors.mutedForeground }]}>
            You've voted on all {swipeOrder.length} {swipeOrder.length === 1 ? "wish" : "wishes"}.
          </Text>
        </View>
      </View>
    );
  }

  const topWish = wishMap.get(swipeOrder[topIndex]);
  const nextWish = wishMap.get(swipeOrder[topIndex + 1]);
  const thirdWish = wishMap.get(swipeOrder[topIndex + 2]);
  if (!topWish) return null;

  return (
    <View style={styles.swipeStackWrap}>
      <Text style={[styles.swipeCounter, { color: colors.mutedForeground }]}>
        {topIndex + 1} / {swipeOrder.length}
      </Text>
      <View style={styles.swipeStack}>
        {thirdWish && <View style={[styles.swipeCard, styles.swipeBgCard3, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH }]} />}
        {nextWish && <View style={[styles.swipeCard, styles.swipeBgCard2, { backgroundColor: colors.card, borderColor: colors.border, width: CARD_WIDTH }]} />}
        <TopWishlistCard
          key={`wishlist-card-${topIndex}`}
          wish={topWish}
          uid={uid}
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          colors={colors}
        />
      </View>
      <View style={styles.swipeTapRow}>
        <Pressable testID="wishlist-skip-button" onPress={onSwipeLeft} style={[styles.swipeTapBtn, { backgroundColor: "#ef444418" }]}>
          <Feather name="x" size={22} color="#ef4444" />
        </Pressable>
        <Pressable testID="wishlist-love-button" onPress={onSwipeRight} style={[styles.swipeTapBtn, { backgroundColor: colors.primary }]}>
          <Feather name="heart" size={20} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/* ── Screen ─────────────────────────────────────────────────── */
export default function WishlistVoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { trip, loading } = useTrip(id);
  const wishes = useWishes(id);

  const [tab, setTab] = useState<"activity" | "member">("activity");
  const [locking, setLocking] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 12;

  const members = Object.entries(trip?.members ?? {});
  const lockedBy = trip?.votesLockedBy ?? {};
  const lockedCount = Object.keys(lockedBy).length;
  const allLocked = members.length > 0 && lockedCount >= members.length;
  const myLocked = !!lockedBy[user?.uid ?? ""];

  const handleAutoLock = async () => {
    if (!id || !user) return;
    setLocking(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await lockVotes(id, user.uid);
    } finally {
      setLocking(false);
    }
  };

  const handleUnlock = async () => {
    if (!id || !user) return;
    setLocking(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await unlockVotes(id, user.uid);
    } finally {
      setLocking(false);
    }
  };

  const wishesGroupedByMember: Record<string, typeof wishes> = {};
  for (const w of wishes) {
    if (!wishesGroupedByMember[w.authorId]) wishesGroupedByMember[w.authorId] = [];
    wishesGroupedByMember[w.authorId].push(w);
  }

  if (loading || !trip) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#E85D3A" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Vote on Wishlist</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {lockedCount}/{members.length} members voted
          </Text>
        </View>
        {allLocked && (
          <Pressable style={styles.resultsBtn} onPress={() => router.push(`/wishlist-results/${id}`)}>
            <Text style={styles.resultsBtnText}>Results</Text>
            <Feather name="chevron-right" size={13} color="#fff" />
          </Pressable>
        )}
      </View>

      {/* All-voted banner */}
      {allLocked && (
        <Pressable style={styles.allVotedBanner} onPress={() => router.push(`/wishlist-results/${id}`)}>
          <Feather name="check-circle" size={15} color="#4CAF50" />
          <Text style={styles.allVotedText}>Voting complete! See ranked results →</Text>
        </Pressable>
      )}

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tabItem, tab === "activity" && [styles.tabActive, { borderBottomColor: "#E85D3A" }]]}
          onPress={() => setTab("activity")}
        >
          <Text style={[styles.tabText, { color: tab === "activity" ? "#E85D3A" : colors.mutedForeground }]}>By activity</Text>
        </Pressable>
        <Pressable
          style={[styles.tabItem, tab === "member" && [styles.tabActive, { borderBottomColor: "#E85D3A" }]]}
          onPress={() => setTab("member")}
        >
          <Text style={[styles.tabText, { color: tab === "member" ? "#E85D3A" : colors.mutedForeground }]}>By member</Text>
        </Pressable>
      </View>

      {/* Lock-in bar — matches destination and accommodation voting */}
      <View style={[styles.lockBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.lockBarTitle, { color: colors.foreground }]}>
            {allLocked
              ? "Everyone's voted ✓"
              : myLocked
              ? "Your vote is locked ✓"
              : `${lockedCount} of ${members.length} finished voting`}
          </Text>
          <View style={[styles.lockProgress, { backgroundColor: colors.muted }]}>
            <View style={[
              styles.lockProgressFill,
              {
                backgroundColor: allLocked ? "#4CAF50" : colors.primary,
                width: members.length > 0 ? `${(lockedCount / members.length) * 100}%` : "0%",
              },
            ]} />
          </View>
        </View>
        {myLocked && (
          <Pressable
            testID="wishlist-revote-button"
            onPress={handleUnlock}
            disabled={locking}
            style={[styles.lockBtn, { backgroundColor: colors.muted, borderWidth: 1, borderColor: colors.border }]}
          >
            {locking
              ? <ActivityIndicator color={colors.mutedForeground} size="small" />
              : (
                <>
                  <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.lockBtnText, { color: colors.mutedForeground }]}>Re-vote</Text>
                </>
              )}
          </Pressable>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 100, paddingTop: 8 }}
      >
        {/* ── BY ACTIVITY (Screen 9) ── */}
        {tab === "activity" && (
          myLocked ? (
            <>
              <Text style={[styles.rankingTitle, { color: colors.foreground }]}>Current rankings</Text>
              {wishes.map((wish, index) => (
                <View key={wish.id} style={[styles.rankingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.rankingNumber, { color: colors.mutedForeground }]}>{index + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.wishName, { color: colors.foreground }]} numberOfLines={2}>{wish.text}</Text>
                    <Text style={[styles.wishAuthor, { color: colors.mutedForeground }]}>Added by {wish.authorName}</Text>
                  </View>
                  <Text style={[styles.scoreText, { color: wish.score > 0 ? "#4CAF50" : colors.mutedForeground }]}>
                    {wish.score > 0 ? `+${wish.score}` : wish.score}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <WishlistSwipeStack
              wishes={wishes}
              uid={user?.uid ?? ""}
              userName={user?.displayName ?? "Traveler"}
              tripId={id!}
              colors={colors}
              onComplete={handleAutoLock}
            />
          )
        )}

        {/* ── BY MEMBER (Screen 10) ── */}
        {tab === "member" && (
          <>
            {members.map(([uid, member]) => {
              const memberWishes = (wishesGroupedByMember[uid] ?? []).sort((a, b) => b.score - a.score);
              const isMe = uid === user?.uid;
              const totalUp = memberWishes.reduce((s, w) => s + Object.keys(w.upvoters ?? {}).length, 0);
              const totalDown = memberWishes.reduce((s, w) => s + Object.keys(w.downvoters ?? {}).length, 0);

              return (
                <View key={uid} style={[styles.memberSection, { borderColor: colors.border }]}>
                  {/* Member header */}
                  <View style={[styles.memberSectionHeader, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <View style={[styles.memberAvatar, { backgroundColor: isMe ? "#E85D3A20" : "#F4BC5520" }]}>
                      <Text style={[styles.memberAvatarText, { color: isMe ? "#E85D3A" : "#D4A017" }]}>
                        {member.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memberSectionName, { color: colors.foreground }]}>
                        {isMe ? `${member.name} (you)` : member.name}
                      </Text>
                      <Text style={[styles.memberSectionCount, { color: colors.mutedForeground }]}>
                        {memberWishes.length} wishes
                      </Text>
                    </View>
                    {memberWishes.length > 0 && (
                      <View style={styles.memberTotalVotes}>
                        <Feather name="thumbs-up" size={12} color="#4CAF50" />
                        <Text style={[styles.memberTotalNum, { color: "#4CAF50" }]}>{totalUp}</Text>
                        <Feather name="thumbs-down" size={12} color="#EF5350" style={{ marginLeft: 6 }} />
                        <Text style={[styles.memberTotalNum, { color: "#EF5350" }]}>{totalDown}</Text>
                      </View>
                    )}
                  </View>

                  {memberWishes.length === 0 && (
                    <Text style={[styles.noWishes, { color: colors.mutedForeground }]}>No wishes added yet</Text>
                  )}

                  {memberWishes.map((w) => {
                    const upCount = Object.keys(w.upvoters ?? {}).length;
                    const downCount = Object.keys(w.downvoters ?? {}).length;
                    return (
                      <View key={w.id} style={[styles.memberWishRow, { borderBottomColor: colors.border }]}>
                        <WishThumb text={w.text} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.wishName, { color: colors.foreground }]} numberOfLines={1}>{w.text}</Text>
                          <View style={styles.miniVotePills}>
                            <View style={[styles.miniVotePill, { backgroundColor: "#4CAF5015" }]}>
                              <Feather name="thumbs-up" size={10} color="#4CAF50" />
                              <Text style={[styles.miniVotePillText, { color: "#4CAF50" }]}>{upCount}</Text>
                            </View>
                            <View style={[styles.miniVotePill, { backgroundColor: "#EF535015" }]}>
                              <Feather name="thumbs-down" size={10} color="#EF5350" />
                              <Text style={[styles.miniVotePillText, { color: "#EF5350" }]}>{downCount}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
            <Text style={[styles.caption, { color: colors.mutedForeground }]}>
              See how each member's wishlist is performing.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerTitle: { fontFamily: "DmSans_700Bold", fontSize: 17 },
  headerSub: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 1 },
  resultsBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "#4CAF50", borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  resultsBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff" },
  allVotedBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#4CAF5015", paddingHorizontal: 16, paddingVertical: 10,
  },
  allVotedText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#4CAF50" },
  tabBar: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tabItem: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabActive: { borderBottomWidth: 2 },
  tabText: { fontFamily: "DmSans_600SemiBold", fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 14 },

  /* Swipe voting deck — shared visual language with destination/accommodation */
  swipeStackWrap: { height: 530, alignItems: "center", paddingTop: 6, width: "100%" },
  swipeCounter: { fontFamily: "DmSans_400Regular", fontSize: 12, marginBottom: 8 },
  swipeStack: { height: 430, width: "100%", alignItems: "center", justifyContent: "center", position: "relative" },
  swipeCard: {
    position: "absolute" as const, left: (SCREEN_WIDTH - CARD_WIDTH) / 2,
    borderRadius: 18, borderWidth: 1,
    padding: 14, gap: 9, overflow: "hidden",
  },
  swipeBgCard2: { top: 12, transform: [{ scale: 0.96 }], opacity: 0.85 },
  swipeBgCard3: { top: 24, transform: [{ scale: 0.92 }], opacity: 0.6 },
  swipeCardHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10,
  },
  swipeCardAuthorRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  swipeAuthorAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  swipeAuthorInitial: { fontFamily: "DmSans_700Bold", fontSize: 12 },
  swipeCardAuthor: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  swipeScorePill: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  swipeScoreText: { fontFamily: "DmSans_700Bold", fontSize: 12 },
  swipeLabel: {
    position: "absolute", top: 16, flexDirection: "row", alignItems: "center",
    gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 2, zIndex: 10, backgroundColor: "rgba(255,255,255,0.92)",
  },
  swipeLabelRight: { right: 14, borderColor: "#4CAF50" },
  swipeLabelLeft: { left: 14, borderColor: "#ef4444" },
  swipeLabelText: { fontFamily: "DmSans_700Bold", fontSize: 13, letterSpacing: 1 },
  thumb: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  swipeCardBody: { gap: 10 },
  prevVotePill: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  prevVoteText: { fontFamily: "DmSans_400Regular", fontSize: 11 },
  swipeCardWishText: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, lineHeight: 28 },
  swipeHint: { fontFamily: "DmSans_400Regular", fontSize: 11, textAlign: "center", marginTop: 2 },
  swipeTapRow: { flexDirection: "row", gap: 16, marginTop: 12, marginBottom: 4 },
  swipeTapBtn: {
    width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  allDoneWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  allDoneCard: { borderRadius: 20, borderWidth: 1, padding: 32, alignItems: "center", gap: 12, width: "100%" },
  allDoneTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 26 },
  allDoneSub: { fontFamily: "DmSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  wishName: { fontFamily: "DmSans_600SemiBold", fontSize: 14, lineHeight: 19 },
  wishAuthor: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 2 },
  scoreText: { fontFamily: "DmSans_700Bold", fontSize: 16 },

  caption: { fontFamily: "DmSans_400Regular", fontSize: 12, textAlign: "center", marginTop: 16, paddingHorizontal: 24, marginBottom: 8 },

  /* Member section (Screen 10) */
  memberSection: {
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden",
  },
  memberSectionHeader: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  memberAvatarText: { fontFamily: "DmSans_700Bold", fontSize: 16 },
  memberSectionName: { fontFamily: "DmSans_600SemiBold", fontSize: 14 },
  memberSectionCount: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 1 },
  memberTotalVotes: { flexDirection: "row", alignItems: "center", gap: 3 },
  memberTotalNum: { fontFamily: "DmSans_700Bold", fontSize: 13 },
  noWishes: { fontFamily: "DmSans_400Regular", fontSize: 13, padding: 12 },

  memberWishRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 10,
  },
  miniVotePills: { flexDirection: "row", gap: 6, marginTop: 4 },
  miniVotePill: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 20, paddingHorizontal: 6, paddingVertical: 2 },
  miniVotePillText: { fontFamily: "DmSans_600SemiBold", fontSize: 11 },

  rankingTitle: { fontFamily: "DmSans_700Bold", fontSize: 14, marginHorizontal: 16, marginTop: 14, marginBottom: 6 },
  rankingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  rankingNumber: { fontFamily: "DmSans_700Bold", fontSize: 15, width: 20, textAlign: "center" },
  lockBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  lockBarTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 13, marginBottom: 6 },
  lockProgress: { height: 4, borderRadius: 2, overflow: "hidden" },
  lockProgressFill: { height: 4, borderRadius: 2 },
  lockBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  lockBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
});
