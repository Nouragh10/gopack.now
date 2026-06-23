import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import {
  DestinationSuggestion,
  confirmDestination,
  lockDestinationVotes,
  storeRedoSuggestions,
  unlockDestinationVotes,
  useTrip,
  voteDestination,
} from "@/hooks/useFirebase";

const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

function Avatar({ name, index, size = 28 }: { name: string; index: number; size?: number }) {
  const bg = MEMBER_COLORS[index % MEMBER_COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontFamily: "DmSans_700Bold" }}>
        {(name ?? "?")[0].toUpperCase()}
      </Text>
    </View>
  );
}

interface SuggestionCardProps {
  suggestion: DestinationSuggestion;
  idx: number;
  tripId: string;
  uid: string;
  votes: Record<string, "up" | "down">;
  members: Record<string, { name: string }>;
  isWinning: boolean;
  allLocked: boolean;
  isCreator: boolean;
  colors: any;
  onConfirm: () => void;
}

function SuggestionCard({
  suggestion, idx, tripId, uid, votes, members, isWinning, allLocked, isCreator, colors, onConfirm,
}: SuggestionCardProps) {
  const myVote = votes[uid] ?? null;
  const upVoters = Object.entries(votes).filter(([, v]) => v === "up");
  const downVoters = Object.entries(votes).filter(([, v]) => v === "down");
  const score = upVoters.length - downVoters.length;

  const upNames = upVoters.map(([id]) => members[id]?.name ?? "Unknown");
  const downNames = downVoters.map(([id]) => members[id]?.name ?? "Unknown");

  const handleVote = (dir: "up" | "down") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    voteDestination(tripId, idx, uid, dir);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isWinning && allLocked ? "#2B2723" : colors.card,
          borderColor: isWinning && allLocked ? "#E85D3A" : colors.border,
          borderWidth: isWinning && allLocked ? 2 : 1,
        },
      ]}
    >
      {isWinning && allLocked && (
        <View style={styles.winBadge}>
          <Text style={styles.winBadgeText}>⭐ WINNER</Text>
        </View>
      )}

      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={[styles.cardName, { color: isWinning && allLocked ? "#FFFDF9" : colors.foreground }]}>
            {suggestion.name}
          </Text>
          <Text style={[styles.cardPitch, { color: isWinning && allLocked ? "#BDB0A0" : colors.mutedForeground }]}>
            {suggestion.pitch}
          </Text>
        </View>

        <View style={styles.arrowStack}>
          <Pressable
            onPress={() => handleVote("up")}
            style={[styles.arrowBtn, { backgroundColor: myVote === "up" ? colors.primary + "22" : "transparent" }]}
          >
            <Feather name="arrow-up" size={20} color={myVote === "up" ? colors.primary : colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.scoreText, { color: score > 0 ? colors.primary : score < 0 ? colors.mutedForeground : colors.mutedForeground }]}>
            {score > 0 ? `+${score}` : score}
          </Text>
          <Pressable
            onPress={() => handleVote("down")}
            style={[styles.arrowBtn, { backgroundColor: myVote === "down" ? "#9E9E9E22" : "transparent" }]}
          >
            <Feather name="arrow-down" size={20} color={myVote === "down" ? colors.foreground : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Tags */}
      <View style={styles.tagsRow}>
        {suggestion.tags.map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
            <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
          </View>
        ))}
      </View>

      {/* Meta */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Feather name="navigation" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{suggestion.flightHint}</Text>
        </View>
        <View style={styles.metaItem}>
          <Feather name="sun" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{suggestion.bestTime}</Text>
        </View>
      </View>

      {/* Voter names */}
      {upNames.length > 0 && (
        <View style={styles.voterRow}>
          <Feather name="arrow-up" size={11} color={colors.primary} />
          <Text style={[styles.voterNames, { color: colors.primary }]} numberOfLines={1}>
            {upNames.join(", ")}
          </Text>
        </View>
      )}
      {downNames.length > 0 && (
        <View style={styles.voterRow}>
          <Feather name="arrow-down" size={11} color={colors.mutedForeground} />
          <Text style={[styles.voterNames, { color: colors.mutedForeground }]} numberOfLines={1}>
            {downNames.join(", ")}
          </Text>
        </View>
      )}

      {/* Confirm button — creator only, winning card, all locked */}
      {isCreator && isWinning && allLocked && (
        <Pressable onPress={onConfirm} style={styles.confirmBtn}>
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.confirmBtnText}>Set as destination</Text>
        </Pressable>
      )}
    </View>
  );
}

/* ── Screen ──────────────────────────────────────────────────────── */

export default function DestinationVoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { trip, loading } = useTrip(id);

  useEffect(() => {
    if (trip && !trip.packConfirmed && id) {
      router.replace(`/trip/${id}`);
    }
  }, [trip?.packConfirmed, id]);

  const [locking, setLocking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [redoing, setRedoing] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const inviteLink = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "gopacknow.com"}/join/${id}`;

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

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const suggestions = trip?.destinationSuggestions ?? [];
  const allVotes = trip?.destinationVotes ?? {};
  const lockedBy = trip?.destinationLockedBy ?? {};
  const members = trip?.members ?? {};
  const memberCount = Object.keys(members).length;
  const lockedCount = Object.keys(lockedBy).length;
  const allLocked = memberCount > 0 && lockedCount >= memberCount;
  const myLocked = !!lockedBy[user?.uid ?? ""];
  const isCreator = trip?.hostMemberId === user?.uid;

  const getVotesForIdx = (idx: number): Record<string, "up" | "down"> =>
    (allVotes[idx] ?? {}) as Record<string, "up" | "down">;

  const getScore = (idx: number) => {
    const v = getVotesForIdx(idx);
    const up = Object.values(v).filter((d) => d === "up").length;
    const down = Object.values(v).filter((d) => d === "down").length;
    return up - down;
  };

  const winnerIdx = suggestions.reduce((best, _, idx) => {
    return getScore(idx) > getScore(best) ? idx : best;
  }, 0);

  const handleToggleLock = async () => {
    if (!user || !id) return;

    if (!myLocked) {
      const unvoted = suggestions.filter((_, idx) => !getVotesForIdx(idx)[user.uid]);
      if (unvoted.length > 0) {
        Alert.alert(
          "Vote on all destinations first",
          `You need to vote on ${unvoted.length} more destination${unvoted.length > 1 ? "s" : ""} before locking in.`,
          [{ text: "OK" }],
        );
        return;
      }
    }

    setLocking(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (myLocked) {
        await unlockDestinationVotes(id, user.uid);
      } else {
        await lockDestinationVotes(id, user.uid);
      }
    } finally {
      setLocking(false);
    }
  };

  const handleConfirm = async () => {
    if (!id || !suggestions[winnerIdx]) return;
    setConfirming(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await confirmDestination(id, suggestions[winnerIdx].name);
      router.replace(`/trip/${id}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleRedo = () => {
    const memberPrefs = trip?.memberPreferences;
    if (!memberPrefs || Object.keys(memberPrefs).length === 0) {
      Alert.alert(
        "Preferences not saved",
        "Member preferences were not saved from the original generation. Go back to the preferences screen and submit again.",
        [{ text: "OK" }],
      );
      return;
    }

    Alert.alert(
      "Try new suggestions?",
      "The AI will generate 3 fresh destinations using the same preferences — votes are reset.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Regenerate",
          onPress: async () => {
            if (!id) return;
            setRedoing(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              const memberPrefsList = Object.entries(memberPrefs).map(([uid, pref]) => ({
                name: trip?.members[uid]?.name ?? "Member",
                vibes: pref.vibes,
                distance: pref.distance,
                budget: pref.budget,
                days: pref.days,
                startDate: pref.startDate,
                startLocation: pref.startLocation,
              }));

              const baseUrl = Platform.OS === "web"
                ? ""
                : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`;

              const res = await fetch(`${baseUrl}/api/suggest-destinations`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  memberPreferences: memberPrefsList,
                  excludedDestinations: suggestions.map((s) => s.name),
                }),
              });

              if (!res.ok) {
                const errData = await res.json() as { error?: string };
                throw new Error(errData.error ?? "AI couldn't generate suggestions. Try again.");
              }
              const data = await res.json() as { suggestions: DestinationSuggestion[] };
              if (!data.suggestions?.length) throw new Error("No suggestions returned.");

              await storeRedoSuggestions(id, data.suggestions);
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              Alert.alert("Error", msg);
            } finally {
              setRedoing(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!trip || suggestions.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No suggestions yet.</Text>
        <Pressable onPress={() => router.back()} style={[styles.backLink, { borderColor: colors.border }]}>
          <Text style={[styles.backLinkText, { color: colors.foreground }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: colors.primary }]}>WHERE TO?</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Vote on a destination</Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isCreator && (
            <Pressable
              onPress={handleRedo}
              disabled={redoing}
              style={[styles.redoBtn, { borderColor: colors.border }]}
            >
              {redoing
                ? <ActivityIndicator size="small" color={colors.mutedForeground} />
                : <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
              }
            </Pressable>
          )}
          <Pressable onPress={() => setShowInvite(true)} style={[styles.inviteBtn, { borderColor: colors.primary }]}>
            <Text style={[styles.inviteBtnText, { color: colors.primary }]}>Invite</Text>
          </Pressable>
        </View>
      </View>

      {/* Lock-in bar */}
      <View style={[styles.lockBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
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
          disabled={locking}
          style={[styles.lockBtn, { backgroundColor: myLocked ? "#4CAF50" : colors.primary }]}
        >
          {locking ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name={myLocked ? "check" : "lock"} size={14} color="#fff" />
              <Text style={styles.lockBtnText}>{myLocked ? "Locked" : "Lock in"}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Member avatars */}
      <View style={[styles.membersRow, { borderBottomColor: colors.border }]}>
        {Object.entries(members).map(([uid, m], i) => (
          <View key={uid} style={{ marginRight: i < Object.keys(members).length - 1 ? -6 : 0 }}>
            <Avatar name={m.name} index={i} size={26} />
          </View>
        ))}
        <Text style={[styles.membersLabel, { color: colors.mutedForeground }]}>
          {"  "}{Object.values(members).map((m) => m.name).join(", ")}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomInset + 20 }}
      >
        {allLocked && !isCreator && (
          <View style={[styles.waitingBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
              Waiting for the trip creator to confirm the destination…
            </Text>
          </View>
        )}

        {redoing && (
          <View style={[styles.confirmingBanner, { backgroundColor: "#7E57C222" }]}>
            <ActivityIndicator color="#7E57C2" size="small" />
            <Text style={[styles.waitingText, { color: "#7E57C2" }]}>Asking AI for fresh suggestions…</Text>
          </View>
        )}

        {confirming && (
          <View style={[styles.confirmingBanner, { backgroundColor: colors.primary + "18" }]}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={[styles.waitingText, { color: colors.primary }]}>Setting destination…</Text>
          </View>
        )}

        {suggestions.map((s, idx) => (
          <SuggestionCard
            key={idx}
            suggestion={s}
            idx={idx}
            tripId={id!}
            uid={user?.uid ?? ""}
            votes={getVotesForIdx(idx)}
            members={members}
            isWinning={idx === winnerIdx}
            allLocked={allLocked}
            isCreator={isCreator}
            colors={colors}
            onConfirm={handleConfirm}
          />
        ))}
      </ScrollView>
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
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 15 },
  backLink: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backLinkText: { fontFamily: "DmSans_500Medium", fontSize: 14 },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  headerLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 2 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },

  lockBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  lockBarTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 13, marginBottom: 6 },
  lockProgress: { height: 4, borderRadius: 2, overflow: "hidden" },
  lockProgressFill: { height: 4, borderRadius: 2 },
  lockBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  lockBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff" },

  membersRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1 },
  membersLabel: { fontFamily: "DmSans_400Regular", fontSize: 12, flexShrink: 1 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  winBadge: { alignSelf: "flex-start", backgroundColor: "#E85D3A", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  winBadgeText: { fontFamily: "DmSans_700Bold", fontSize: 11, color: "#fff", letterSpacing: 1 },

  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, lineHeight: 28 },
  cardPitch: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 20 },

  arrowStack: { alignItems: "center", gap: 2 },
  arrowBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  scoreText: { fontFamily: "DmSans_700Bold", fontSize: 14, minWidth: 24, textAlign: "center" },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontFamily: "DmSans_500Medium", fontSize: 12 },

  metaRow: { flexDirection: "row", gap: 16 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontFamily: "DmSans_400Regular", fontSize: 12 },

  voterRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  voterNames: { fontFamily: "DmSans_400Regular", fontSize: 12, flex: 1 },

  confirmBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: "#E85D3A", borderRadius: 12, paddingVertical: 13, marginTop: 4,
  },
  confirmBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },

  waitingBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 12 },
  confirmingBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 12 },
  waitingText: { fontFamily: "DmSans_400Regular", fontSize: 13, flex: 1 },

  redoBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  inviteBtn: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  inviteBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  inviteSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 48, gap: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  sheetLabel: { fontFamily: "DmSans_500Medium", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  sheetLinkRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  sheetLinkText: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 13 },
  copyBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inviteCode: { fontFamily: "DmSans_700Bold", fontSize: 22, letterSpacing: 3, textAlign: "center", paddingVertical: 8 },
});
