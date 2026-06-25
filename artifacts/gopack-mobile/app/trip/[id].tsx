import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { GoPackIcon } from "@/components/GoPackLogo";
import {
  addWish,
  lockVotes,
  confirmPack,
  incrementAiUsage,
  setAccommodationStatus,
  unlockVotes,
  useTrip,
  useWishes,
  voteWish,
  Wish,
} from "@/hooks/useFirebase";
import { UpgradeModal } from "@/components/UpgradeModal";

const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

const WISH_PLACEHOLDERS = [
  "Visit a local market at sunrise…",
  "Find the best street food spot…",
  "Watch the sunset from a rooftop…",
  "Take a cooking class together…",
  "Explore a hidden neighbourhood…",
  "Go on a sunrise hike…",
  "Try a boat tour of the coast…",
  "Find a cosy jazz bar for the evening…",
  "Day trip to nearby ruins or nature…",
  "Catch a live music night…",
];

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

/* ── Swipe card constants ────────────────────────────────────────── */

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 32, 420);

/* ── TopSwipeCard ────────────────────────────────────────────────── */

function TopSwipeCard({
  wish, uid, onSwipeLeft, onSwipeRight, colors,
}: {
  wish: Wish; uid: string;
  onSwipeLeft: () => void; onSwipeRight: () => void; colors: any;
}) {
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
  const score = wish.score ?? 0;
  const authorIdx = (wish.authorName ?? "?").charCodeAt(0) % MEMBER_COLORS.length;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[styles.swipeCard, { backgroundColor: colors.card, borderColor: colors.border }, cardStyle]}>
        {/* Like label */}
        <Animated.View style={[styles.swipeLabel, styles.swipeLabelRight, likeStyle]}>
          <Feather name="heart" size={22} color="#4CAF50" />
          <Text style={[styles.swipeLabelText, { color: "#4CAF50" }]}>LOVE IT</Text>
        </Animated.View>
        {/* Skip label */}
        <Animated.View style={[styles.swipeLabel, styles.swipeLabelLeft, nopeStyle]}>
          <Feather name="x" size={22} color="#ef4444" />
          <Text style={[styles.swipeLabelText, { color: "#ef4444" }]}>SKIP</Text>
        </Animated.View>

        {/* Author row */}
        <View style={styles.swipeCardAuthorRow}>
          <Avatar name={wish.authorName} index={authorIdx} size={28} />
          <Text style={[styles.swipeCardAuthor, { color: colors.mutedForeground }]}>{wish.authorName}</Text>
          {(upvoted || downvoted) && (
            <View style={[styles.prevVotePill, { backgroundColor: upvoted ? "#4CAF5018" : "#9E9E9E18" }]}>
              <Feather name={upvoted ? "heart" : "x"} size={11} color={upvoted ? "#4CAF50" : "#9E9E9E"} />
              <Text style={[styles.prevVoteText, { color: upvoted ? "#4CAF50" : "#9E9E9E" }]}>
                {upvoted ? "You loved this" : "You skipped"}
              </Text>
            </View>
          )}
        </View>

        {/* Wish text */}
        <Text style={[styles.swipeCardWishText, { color: colors.foreground }]}>{wish.text}</Text>

        {/* Score + hint */}
        <View style={styles.swipeCardBottom}>
          <View style={[styles.swipeScorePill, { backgroundColor: score > 0 ? "#4CAF5018" : colors.muted }]}>
            <Feather name="arrow-up" size={12} color={score > 0 ? "#4CAF50" : colors.mutedForeground} />
            <Text style={[styles.swipeScoreText, { color: score > 0 ? "#4CAF50" : colors.mutedForeground }]}>
              {score > 0 ? `+${score}` : score}
            </Text>
          </View>
          <Text style={[styles.swipeHint, { color: colors.mutedForeground }]}>← skip · love it →</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
}

/* ── SwipeWishStack ──────────────────────────────────────────────── */

function SwipeWishStack({
  wishes, uid, userName, tripId, colors,
}: {
  wishes: Wish[]; uid: string; userName: string; tripId: string; colors: any;
}) {
  const [topIndex, setTopIndex] = useState(0);

  const onSwipeRight = useCallback(() => {
    const wish = wishes[topIndex];
    if (!wish) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    voteWish(tripId, wish.id, uid, userName, "up");
    setTopIndex((i) => i + 1);
  }, [topIndex, wishes, tripId, uid, userName]);

  const onSwipeLeft = useCallback(() => {
    const wish = wishes[topIndex];
    if (!wish) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    voteWish(tripId, wish.id, uid, userName, "down");
    setTopIndex((i) => i + 1);
  }, [topIndex, wishes, tripId, uid, userName]);

  if (wishes.length === 0) {
    return (
      <View style={styles.emptyWish}>
        <Feather name="star" size={32} color="#ccc" />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No wishes yet — add the first one below!</Text>
      </View>
    );
  }

  if (topIndex >= wishes.length) {
    return (
      <View style={styles.allDoneWrap}>
        <View style={[styles.allDoneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="check-circle" size={44} color={colors.primary} />
          <Text style={[styles.allDoneTitle, { color: colors.foreground }]}>All caught up!</Text>
          <Text style={[styles.allDoneSub, { color: colors.mutedForeground }]}>
            You've voted on all {wishes.length} {wishes.length === 1 ? "wish" : "wishes"}.{"\n"}Check the Vote tab for rankings.
          </Text>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setTopIndex(0); }}
            style={[styles.reviewBtn, { borderColor: colors.border }]}
          >
            <Feather name="refresh-cw" size={13} color={colors.foreground} />
            <Text style={[styles.reviewBtnText, { color: colors.foreground }]}>Review again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const topWish = wishes[topIndex];
  const nextWish = wishes[topIndex + 1];
  const thirdWish = wishes[topIndex + 2];

  return (
    <View style={styles.swipeStackWrap}>
      <Text style={[styles.swipeCounter, { color: colors.mutedForeground }]}>
        {topIndex + 1} / {wishes.length}
      </Text>

      <View style={styles.swipeStack}>
        {thirdWish && (
          <View style={[styles.swipeCard, styles.swipeBgCard3, { backgroundColor: colors.card, borderColor: colors.border }]} />
        )}
        {nextWish && (
          <View style={[styles.swipeCard, styles.swipeBgCard2, { backgroundColor: colors.card, borderColor: colors.border }]} />
        )}
        <TopSwipeCard
          key={`card-${topIndex}`}
          wish={topWish}
          uid={uid}
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
          colors={colors}
        />
      </View>

      <View style={styles.swipeTapRow}>
        <Pressable
          onPress={onSwipeLeft}
          style={[styles.swipeTapBtn, { borderColor: "#ef444440", backgroundColor: "#ef444408" }]}
        >
          <Feather name="x" size={28} color="#ef4444" />
        </Pressable>
        <Pressable
          onPress={onSwipeRight}
          style={[styles.swipeTapBtn, { borderColor: "#4CAF5040", backgroundColor: "#4CAF5008" }]}
        >
          <Feather name="heart" size={26} color="#4CAF50" />
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
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const placeholderTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    placeholderTimer.current = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % WISH_PLACEHOLDERS.length);
    }, 2800);
    return () => { if (placeholderTimer.current) clearInterval(placeholderTimer.current); };
  }, []);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [lockingVotes, setLockingVotes] = useState(false);
  const [showAccomModal, setShowAccomModal] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 12;

  const members = Object.entries(trip?.members ?? {});
  const memberCount = members.length;
  const memberNames = members.map(([, m]) => m.name);
  const isHost = user?.uid === trip?.hostMemberId;

  const tripEnded = (() => {
    if (!trip?.startDate) return false;
    const start = new Date(trip.startDate);
    const end = new Date(start.getTime() + (trip.days || 1) * 24 * 60 * 60 * 1000);
    return end < new Date();
  })();
  const isMember = !!trip?.members?.[user?.uid ?? ""];
  const hasReview = !!trip?.review;
  const showReviewBanner = tripEnded && isMember && !hasReview;

  const lockedBy = trip?.votesLockedBy ?? {};
  const lockedCount = Object.keys(lockedBy).length;
  const allLocked = memberCount > 0 && lockedCount >= memberCount;
  const myLocked = !!lockedBy[user?.uid ?? ""];

  const isPremium = true; // TEST MODE: all features unlocked
  const FREE_GEN_LIMIT = 2;
  const itineraryGenCount = trip?.aiUsage?.itinerary ?? 0;
  const packingGenCount = trip?.aiUsage?.packing ?? 0;
  const canGenerateItinerary = isPremium || itineraryGenCount < FREE_GEN_LIMIT;
  const canGeneratePacking = isPremium || packingGenCount < FREE_GEN_LIMIT;

  const handleAddWish = async () => {
    if (!wishInput.trim() || !user || !id) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await addWish(id, wishInput.trim(), user.uid, user.displayName ?? "Traveler");
    setWishInput("");
  };

  const handleToggleLock = async () => {
    if (!user || !id) return;
    if (!myLocked && wishes.length > 0) {
      const unvoted = wishes.filter(
        (w) => !w.upvoters?.[user.uid] && !w.downvoters?.[user.uid],
      );
      if (unvoted.length > 0) {
        Alert.alert(
          "Vote on everything first",
          `You still need to vote on ${unvoted.length} wish${unvoted.length > 1 ? "es" : ""} before locking in. Go through the list and give each one a ▲ or ▼.`,
          [{ text: "OK" }],
        );
        return;
      }
    }
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

  const inviteLink = `https://gopacknow.app/join/${id ?? ""}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(id ?? "");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
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

  const pendingDestination = !trip.destination && !!trip.destinationSuggestions?.length;
  const collectingPreferences = !!trip.collectingPreferences && !trip.destinationSuggestions?.length;

  const accomStatus = trip.accommodationStatus;
  const destConfirmed = !!trip.destination;
  const showAccomBanner = destConfirmed && !accomStatus;
  const accomCollecting = accomStatus === "collecting_prefs";
  const accomVoting = accomStatus === "voting";
  const accomConfirmed = accomStatus === "confirmed";

  const waitingMembers = members
    .filter(([uid]) => !lockedBy[uid])
    .map(([, m]) => m.name);

  const handleAccomChoice = async (choice: "vote" | "booked" | "later") => {
    setShowAccomModal(false);
    if (!id) return;
    if (choice === "vote") {
      await setAccommodationStatus(id, "voting");
      router.push(`/accommodation-vote/${id}`);
    } else if (choice === "booked") {
      await setAccommodationStatus(id, "booked");
    } else {
      await setAccommodationStatus(id, "skipped");
    }
  };

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

      {/* Collecting preferences banner */}
      {collectingPreferences && (
        <Pressable
          onPress={() => router.push(`/destination-preferences/${id}`)}
          style={[styles.destBanner, { backgroundColor: "#7E57C2" }]}
        >
          <Feather name="sliders" size={15} color="#fff" />
          <Text style={styles.destBannerText}>Share your travel preferences so AI can suggest destinations</Text>
          <Feather name="arrow-right" size={15} color="#fff" />
        </Pressable>
      )}

      {/* Pending destination banner */}
      {pendingDestination && (
        <Pressable
          onPress={() => router.push(`/destination-vote/${id}`)}
          style={[styles.destBanner, { backgroundColor: colors.primary }]}
        >
          <Feather name="zap" size={15} color="#fff" />
          <Text style={styles.destBannerText}>Your pack is voting on the destination — join the vote</Text>
          <Feather name="arrow-right" size={15} color="#fff" />
        </Pressable>
      )}

      {/* Accommodation: prompt to choose */}
      {showAccomBanner && (
        <Pressable
          onPress={() => setShowAccomModal(true)}
          style={styles.accomBanner}
        >
          <View style={styles.accomBannerIconWrap}>
            <Feather name="home" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accomBannerTitle}>Book accommodation</Text>
            <Text style={styles.accomBannerSub}>Choose where the pack is staying · tap to decide</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#fff" />
        </Pressable>
      )}

      {/* Accommodation: collecting preferences (legacy) — redirect to vote */}
      {accomCollecting && (
        <Pressable
          onPress={() => router.push(`/accommodation-vote/${id}`)}
          style={styles.accomBanner}
        >
          <View style={styles.accomBannerIconWrap}>
            <Feather name="home" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accomBannerTitle}>Submit your accommodation pick</Text>
            <Text style={styles.accomBannerSub}>Join the group vote now</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#fff" />
        </Pressable>
      )}

      {/* Accommodation: voting in progress */}
      {accomVoting && (
        <Pressable
          onPress={() => router.push(`/accommodation-vote/${id}`)}
          style={styles.accomBanner}
        >
          <View style={styles.accomBannerIconWrap}>
            <Feather name="home" size={20} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.accomBannerTitle}>Accommodation vote live</Text>
            <Text style={styles.accomBannerSub}>Your pack is voting — add your voice</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#fff" />
        </Pressable>
      )}

      {/* Review banner — shown when trip has ended and no review yet */}
      {showReviewBanner && (
        <Pressable
          onPress={() => router.push(`/review/${id}` as any)}
          style={[styles.reviewBanner, { backgroundColor: "#F59E0B" }]}
        >
          <Feather name="star" size={15} color="#fff" />
          <Text style={styles.reviewBannerText}>Your trip ended — leave a review for the pack!</Text>
          <Feather name="arrow-right" size={15} color="#fff" />
        </Pressable>
      )}

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

      {/* ── PACK GATE — host must confirm pack before wishlist unlocks ── */}
      {!trip?.packConfirmed && (
        <View style={styles.packGate}>
          <GoPackIcon size={64} />
          <Text style={[styles.gateTitle, { color: colors.foreground }]}>
            {isHost ? "Is the pack complete?" : "Waiting for the host…"}
          </Text>
          <Text style={[styles.gateSub, { color: colors.mutedForeground }]}>
            {isHost
              ? "Once everyone has joined, confirm the pack to unlock the wishlist and start planning."
              : `${trip?.members?.[trip?.hostMemberId ?? ""]?.name ?? "The host"} will confirm the pack when everyone is in.`}
          </Text>

          {/* Member list */}
          <View style={[styles.gateBadge, { backgroundColor: colors.muted, borderColor: colors.border, gap: 6 }]}>
            <Feather name="users" size={14} color={colors.mutedForeground} />
            <Text style={[styles.gateBadgeText, { color: colors.mutedForeground }]}>
              {memberCount} {memberCount === 1 ? "member" : "members"} · {memberNames.join(", ")}
            </Text>
          </View>

          {/* Invite button (always visible) */}
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setShowInvite(true); }}
            style={[styles.gateBtn, { backgroundColor: colors.secondary, borderWidth: 1, borderColor: colors.border }]}
          >
            <Feather name="user-plus" size={16} color={colors.foreground} />
            <Text style={[styles.gateBtnText, { color: colors.foreground }]}>Invite someone</Text>
          </Pressable>

          {/* Confirm button — host only */}
          {isHost && (
            <Pressable
              onPress={async () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                await confirmPack(id as string);
              }}
              style={[styles.gateBtn, { backgroundColor: colors.primary, marginTop: 0 }]}
            >
              <Feather name="check-circle" size={18} color="#fff" />
              <Text style={styles.gateBtnText}>Pack is complete — let's go!</Text>
            </Pressable>
          )}

          <Text style={[styles.gateHint, { color: colors.mutedForeground }]}>
            {isHost ? "You can always invite more people later" : "You'll get in as soon as the host confirms"}
          </Text>
        </View>
      )}

      {/* ── WISH TAB ── */}
      {trip?.packConfirmed && activeTab === "wish" && (
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
          <SwipeWishStack
            wishes={wishes}
            uid={user?.uid ?? ""}
            userName={user?.displayName ?? "Traveler"}
            tripId={id!}
            colors={colors}
          />
          <View style={[styles.addWishBar, { borderTopColor: colors.border, paddingBottom: bottomInset + 12 }]}>
            <TextInput
              style={[styles.addWishInput, { backgroundColor: colors.muted, color: colors.foreground }]}
              placeholder={WISH_PLACEHOLDERS[placeholderIdx]}
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
      {trip?.packConfirmed && activeTab === "vote" && (
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
      {trip?.packConfirmed && activeTab === "go" && (
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

          {/* Confirmed accommodation card */}
          {accomConfirmed && trip.confirmedAccommodation && (() => {
            const a = trip.confirmedAccommodation!;
            const openURL = (url: string) => {
              if (Platform.OS === "web") window.open(url, "_blank", "noopener,noreferrer");
              else Linking.openURL(url);
            };
            const checkIn = trip.startDate ?? "";
            const checkOut = (() => {
              if (!trip.startDate) return "";
              try {
                const d = new Date(trip.startDate + "T00:00:00");
                d.setDate(d.getDate() + (trip.days ?? 0));
                return d.toISOString().split("T")[0];
              } catch { return ""; }
            })();
            const q = encodeURIComponent(`${a.name} ${a.location}`);
            return (
              <View style={[styles.accomCard, { backgroundColor: colors.card, borderColor: "#26A69A" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <Feather name="home" size={13} color="#26A69A" />
                  <Text style={[styles.accomCardLabel, { color: "#26A69A" }]}>ACCOMMODATION CONFIRMED</Text>
                </View>
                <Text style={[styles.accomCardName, { color: colors.foreground }]}>{a.name}</Text>
                <Text style={[styles.accomCardSub, { color: colors.mutedForeground }]}>
                  {a.location} · ${a.costPerPerson}/person
                </Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                  {a.link ? (
                    <Pressable
                      onPress={() => openURL(a.link!)}
                      style={[styles.accomBookBtn, { backgroundColor: "#26A69A" }]}
                    >
                      <Feather name="external-link" size={13} color="#fff" />
                      <Text style={styles.accomBookBtnText}>View listing</Text>
                    </Pressable>
                  ) : (
                    <>
                      <Pressable
                        onPress={() => openURL(`https://www.airbnb.com/s/${encodeURIComponent(a.location)}/homes?query=${q}${checkIn ? `&checkin=${checkIn}&checkout=${checkOut}` : ""}`)}
                        style={[styles.accomBookBtn, { backgroundColor: "#FF5A5F" }]}
                      >
                        <Feather name="search" size={13} color="#fff" />
                        <Text style={styles.accomBookBtnText}>Airbnb</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => openURL(`https://www.booking.com/search.html?ss=${q}${checkIn ? `&checkin=${checkIn}&checkout=${checkOut}` : ""}`)}
                        style={[styles.accomBookBtn, { backgroundColor: "#003580" }]}
                      >
                        <Feather name="search" size={13} color="#fff" />
                        <Text style={styles.accomBookBtnText}>Booking.com</Text>
                      </Pressable>
                    </>
                  )}
                </View>
              </View>
            );
          })()}

          {/* Generate itinerary card */}
          <Pressable
            onPress={() => {
              if (!allLocked) return;
              if (!canGenerateItinerary) {
                setUpgradeReason("You've used your free itinerary generations");
                setShowUpgrade(true);
                return;
              }
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
            {allLocked && !canGenerateItinerary && (
              <Text style={{ color: "#fff", opacity: 0.75, fontSize: 12, fontFamily: "DmSans_400Regular", marginBottom: 4 }}>
                Pack Plus required
              </Text>
            )}
            <View style={[styles.goCardBtn, { backgroundColor: allLocked ? "#E85D3A" : "#7A6E68" }]}>
              <Feather name={allLocked ? (canGenerateItinerary ? "arrow-right" : "zap") : "clock"} size={22} color="#fff" />
            </View>
          </Pressable>

          {/* Packing list card */}
          <Pressable
            onPress={() => {
              if (!canGeneratePacking) {
                setUpgradeReason("You've used your free packing list generations");
                setShowUpgrade(true);
                return;
              }
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

      {/* Accommodation choice modal */}
      <Modal visible={showAccomModal} transparent animationType="slide" onRequestClose={() => setShowAccomModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAccomModal(false)}>
          <Pressable style={[styles.inviteSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <Feather name="home" size={20} color="#26A69A" />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Accommodation</Text>
            </View>
            <Text style={[styles.sheetLabel, { color: colors.mutedForeground, textTransform: "none", letterSpacing: 0, fontSize: 13, marginBottom: 8 }]}>
              How do you want to handle where the group stays?
            </Text>

            <Pressable
              onPress={() => handleAccomChoice("vote")}
              style={[styles.accomOption, { backgroundColor: "#26A69A10", borderColor: "#26A69A" }]}
            >
              <View style={[styles.accomOptionIcon, { backgroundColor: "#26A69A" }]}>
                <Feather name="link" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accomOptionTitle, { color: colors.foreground }]}>Submit & vote on links</Text>
                <Text style={[styles.accomOptionSub, { color: colors.mutedForeground }]}>Everyone adds their preferred listing — the pack votes, AI breaks ties</Text>
              </View>
              <Feather name="arrow-right" size={18} color="#26A69A" />
            </Pressable>

            <Pressable
              onPress={() => handleAccomChoice("booked")}
              style={[styles.accomOption, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <View style={[styles.accomOptionIcon, { backgroundColor: colors.primary }]}>
                <Feather name="check-circle" size={18} color="#fff" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accomOptionTitle, { color: colors.foreground }]}>We already booked</Text>
                <Text style={[styles.accomOptionSub, { color: colors.mutedForeground }]}>Skip this — accommodation is sorted</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleAccomChoice("later")}
              style={[styles.accomOption, { backgroundColor: colors.muted, borderColor: colors.border }]}
            >
              <View style={[styles.accomOptionIcon, { backgroundColor: colors.muted }]}>
                <Feather name="clock" size={18} color={colors.mutedForeground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accomOptionTitle, { color: colors.foreground }]}>Decide later</Text>
                <Text style={[styles.accomOptionSub, { color: colors.mutedForeground }]}>Come back to this when ready</Text>
              </View>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <UpgradeModal
        visible={showUpgrade}
        reason={upgradeReason}
        tripId={id ?? ""}
        onClose={() => setShowUpgrade(false)}
      />

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
            <View style={[styles.sheetLinkRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.inviteCode, { color: colors.primary }]}>{id}</Text>
              <Pressable onPress={handleCopyId} style={[styles.copyBtn, { backgroundColor: colors.primary }]}>
                <Feather name={copiedId ? "check" : "copy"} size={16} color="#fff" />
              </Pressable>
            </View>
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

  destBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 11,
  },
  destBannerText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff", flex: 1 },
  reviewBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  reviewBannerText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff", flex: 1 },
  accomBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    marginHorizontal: 16, marginBottom: 10, borderRadius: 16,
    backgroundColor: "#26A69A", padding: 16,
    shadowColor: "#26A69A", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 5,
  },
  accomBannerIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  accomBannerTitle: { fontFamily: "DmSans_700Bold", fontSize: 15, color: "#fff", marginBottom: 2 },
  accomBannerSub: { fontFamily: "DmSans_400Regular", fontSize: 12, color: "rgba(255,255,255,0.85)" },

  packGate: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 36,
    gap: 16,
  },
  gateTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 24,
    textAlign: "center" as const,
    marginTop: 8,
  },
  gateSub: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  gateBadge: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  gateBadgeText: { fontFamily: "DmSans_400Regular", fontSize: 13 },
  gateBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 4,
  },
  gateBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 16, color: "#fff" },
  gateHint: {
    fontFamily: "DmSans_400Regular",
    fontSize: 12,
    textAlign: "center" as const,
    marginTop: 4,
  },

  accomCard: {
    width: "100%", borderRadius: 14, borderWidth: 1.5, padding: 14, gap: 2,
  },
  accomCardLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 1.5 },
  accomCardName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 18 },
  accomCardSub: { fontFamily: "DmSans_400Regular", fontSize: 13 },

  accomOption: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  accomOptionIcon: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: "center", justifyContent: "center",
  },
  accomOptionTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 15, marginBottom: 2 },
  accomOptionSub: { fontFamily: "DmSans_400Regular", fontSize: 12, lineHeight: 17 },
  accomBookBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
  },
  accomBookBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff" },

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

  /* ── Swipe card stack ── */
  swipeStackWrap: {
    flex: 1,
    alignItems: "center" as const,
    paddingTop: 8,
  },
  swipeCounter: {
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
    marginBottom: 10,
  },
  swipeStack: {
    flex: 1,
    width: "100%",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  swipeCard: {
    position: "absolute" as const,
    width: CARD_WIDTH,
    minHeight: 240,
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 22,
    justifyContent: "space-between" as const,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  swipeBgCard2: {
    top: 14,
    transform: [{ scale: 0.96 }],
    opacity: 0.85,
  },
  swipeBgCard3: {
    top: 28,
    transform: [{ scale: 0.92 }],
    opacity: 0.6,
  },
  swipeLabel: {
    position: "absolute" as const,
    top: 18,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  swipeLabelRight: {
    right: 18,
    borderColor: "#4CAF50",
    transform: [{ rotate: "10deg" }],
  },
  swipeLabelLeft: {
    left: 18,
    borderColor: "#ef4444",
    transform: [{ rotate: "-10deg" }],
  },
  swipeLabelText: {
    fontFamily: "DmSans_700Bold",
    fontSize: 14,
    letterSpacing: 0.8,
  },
  swipeCardAuthorRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginBottom: 18,
    marginTop: 8,
  },
  swipeCardAuthor: {
    fontFamily: "DmSans_500Medium",
    fontSize: 13,
    flex: 1,
  },
  prevVotePill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  prevVoteText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 11,
  },
  swipeCardWishText: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    lineHeight: 30,
    flex: 1,
    marginBottom: 18,
  },
  swipeCardBottom: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  swipeScorePill: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  swipeScoreText: {
    fontFamily: "DmSans_700Bold",
    fontSize: 13,
  },
  swipeHint: {
    fontFamily: "DmSans_400Regular",
    fontSize: 12,
  },
  swipeTapRow: {
    flexDirection: "row" as const,
    justifyContent: "center" as const,
    gap: 28,
    paddingVertical: 18,
  },
  swipeTapBtn: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  allDoneWrap: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: 24,
  },
  allDoneCard: {
    borderRadius: 22,
    borderWidth: 1.5,
    padding: 32,
    alignItems: "center" as const,
    gap: 12,
    width: "100%",
  },
  allDoneTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 26,
  },
  allDoneSub: {
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  reviewBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  reviewBtnText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
  },
});
