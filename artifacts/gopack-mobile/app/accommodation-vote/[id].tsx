import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import {
  AccommodationSuggestion,
  addMemberAccommodationLink,
  confirmAccommodation,
  lockAccommodationVotes,
  unlockAccommodationVotes,
  useTrip,
  voteAccommodation,
} from "@/hooks/useFirebase";

const TEAL = "#26A69A";
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

function StarRating({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Feather
          key={i}
          name={i < full ? "star" : half && i === full ? "star" : "star"}
          size={11}
          color={i < full || (half && i === full) ? "#FFA726" : "#D0C9C0"}
        />
      ))}
      <Text style={{ fontFamily: "DmSans_600SemiBold", fontSize: 12, color: "#FFA726", marginLeft: 3 }}>
        {rating.toFixed(1)}
      </Text>
    </View>
  );
}

function TypeBadge({ type, colors }: { type: string; colors: any }) {
  const icons: Record<string, string> = { hotel: "home", airbnb: "key", hostel: "users", other: "map-pin" };
  const labels: Record<string, string> = { hotel: "Hotel", airbnb: "Airbnb", hostel: "Hostel", other: "Other" };
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: TEAL + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
      <Feather name={icons[type] as any ?? "map-pin"} size={11} color={TEAL} />
      <Text style={{ fontFamily: "DmSans_600SemiBold", fontSize: 11, color: TEAL }}>{labels[type] ?? type}</Text>
    </View>
  );
}

interface CardProps {
  suggestion: AccommodationSuggestion;
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

function AccommodationCard({ suggestion, idx, tripId, uid, votes, members, isWinning, allLocked, isCreator, colors, onConfirm }: CardProps) {
  const myVote = votes[uid] ?? null;
  const upVoters = Object.entries(votes).filter(([, v]) => v === "up");
  const downVoters = Object.entries(votes).filter(([, v]) => v === "down");
  const score = upVoters.length - downVoters.length;
  const upNames = upVoters.map(([id]) => members[id]?.name ?? "Unknown");
  const downNames = downVoters.map(([id]) => members[id]?.name ?? "Unknown");
  const winner = isWinning && allLocked;

  const handleVote = (dir: "up" | "down") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    voteAccommodation(tripId, idx, uid, dir);
  };

  return (
    <View style={[
      styles.card,
      { backgroundColor: winner ? "#2B2723" : colors.card, borderColor: winner ? TEAL : colors.border, borderWidth: winner ? 2 : 1 },
    ]}>
      {winner && (
        <View style={[styles.winBadge, { backgroundColor: TEAL }]}>
          <Text style={styles.winBadgeText}>⭐ WINNER</Text>
        </View>
      )}

      {suggestion.submittedBy !== "AI" && (
        <View style={styles.memberBadge}>
          <Feather name="user" size={10} color="#FFA726" />
          <Text style={styles.memberBadgeText}>Added by {suggestion.submittedBy}</Text>
        </View>
      )}

      {/* Top row: name + vote */}
      <View style={styles.cardTop}>
        <View style={{ flex: 1, gap: 5 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <TypeBadge type={suggestion.type} colors={colors} />
            <StarRating rating={suggestion.rating} />
          </View>
          <Text style={[styles.cardName, { color: winner ? "#FFFDF9" : colors.foreground }]}>
            {suggestion.name}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
            <Feather name="map-pin" size={11} color={winner ? "#BDB0A0" : colors.mutedForeground} />
            <Text style={[styles.cardLocation, { color: winner ? "#BDB0A0" : colors.mutedForeground }]}>
              {suggestion.location}
            </Text>
          </View>
        </View>

        <View style={styles.arrowStack}>
          <Pressable onPress={() => handleVote("up")} style={[styles.arrowBtn, { backgroundColor: myVote === "up" ? TEAL + "22" : "transparent" }]}>
            <Feather name="arrow-up" size={20} color={myVote === "up" ? TEAL : colors.mutedForeground} />
          </Pressable>
          <Text style={[styles.scoreText, { color: score > 0 ? TEAL : colors.mutedForeground }]}>
            {score > 0 ? `+${score}` : score}
          </Text>
          <Pressable onPress={() => handleVote("down")} style={[styles.arrowBtn, { backgroundColor: myVote === "down" ? "#9E9E9E22" : "transparent" }]}>
            <Feather name="arrow-down" size={20} color={myVote === "down" ? colors.foreground : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* Why it fits */}
      <View style={[styles.whyBox, { backgroundColor: winner ? "#3A3330" : colors.muted }]}>
        <Feather name="zap" size={12} color={TEAL} />
        <Text style={[styles.whyText, { color: winner ? "#FFFDF9" : colors.foreground }]}>
          {suggestion.whyItFits}
        </Text>
      </View>

      {/* Cost breakdown */}
      <View style={styles.costRow}>
        <View style={styles.costItem}>
          <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Total</Text>
          <Text style={[styles.costValue, { color: winner ? "#FFFDF9" : colors.foreground }]}>
            ${suggestion.totalCost.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.costDivider, { backgroundColor: colors.border }]} />
        <View style={styles.costItem}>
          <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Per person</Text>
          <Text style={[styles.costValue, { color: TEAL }]}>
            ${suggestion.costPerPerson.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.costDivider, { backgroundColor: colors.border }]} />
        <View style={styles.costItem}>
          <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>Rooms</Text>
          <Text style={[styles.costValue, { color: winner ? "#FFFDF9" : colors.foreground }]}>
            {suggestion.rooms} × {suggestion.beds} beds
          </Text>
        </View>
      </View>

      {/* Tags + distance */}
      <View style={styles.tagsRow}>
        {(suggestion.tags ?? []).map((tag) => (
          <View key={tag} style={[styles.tag, { backgroundColor: colors.muted }]}>
            <Text style={[styles.tagText, { color: colors.foreground }]}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Feather name="navigation" size={11} color={colors.mutedForeground} />
        <Text style={[styles.distanceText, { color: colors.mutedForeground }]}>{suggestion.distanceNote}</Text>
      </View>

      {/* Amenities */}
      {(suggestion.amenities ?? []).length > 0 && (
        <View style={styles.amenitiesRow}>
          {(suggestion.amenities ?? []).slice(0, 5).map((a) => (
            <View key={a} style={styles.amenityItem}>
              <Feather name="check" size={10} color={TEAL} />
              <Text style={[styles.amenityText, { color: colors.mutedForeground }]}>{a}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Cancellation */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        <Feather name="shield" size={11} color={colors.mutedForeground} />
        <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>{suggestion.cancellation}</Text>
      </View>

      {/* Member link */}
      {suggestion.link && (
        <Pressable
          style={[styles.linkBtn, { borderColor: TEAL }]}
          onPress={() => {
            if (Platform.OS === "web") window.open(suggestion.link, "_blank", "noopener,noreferrer");
            else Linking.openURL(suggestion.link!);
          }}
        >
          <Feather name="external-link" size={13} color={TEAL} />
          <Text style={[styles.linkBtnText, { color: TEAL }]}>View listing</Text>
        </Pressable>
      )}

      {/* Voter names */}
      {upNames.length > 0 && (
        <View style={styles.voterRow}>
          <Feather name="arrow-up" size={11} color={TEAL} />
          <Text style={[styles.voterNames, { color: TEAL }]} numberOfLines={1}>{upNames.join(", ")}</Text>
        </View>
      )}
      {downNames.length > 0 && (
        <View style={styles.voterRow}>
          <Feather name="arrow-down" size={11} color={colors.mutedForeground} />
          <Text style={[styles.voterNames, { color: colors.mutedForeground }]} numberOfLines={1}>{downNames.join(", ")}</Text>
        </View>
      )}

      {/* Confirm button */}
      {isCreator && winner && (
        <Pressable onPress={onConfirm} style={[styles.confirmBtn, { backgroundColor: TEAL }]}>
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.confirmBtnText}>Book this one</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function AccommodationVoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { trip, loading } = useTrip(id);
  const [locking, setLocking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkType, setLinkType] = useState<"hotel" | "airbnb" | "hostel" | "other">("other");
  const [linkCost, setLinkCost] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const suggestions = trip?.accommodationSuggestions ?? [];
  const allVotes = trip?.accommodationVotes ?? {};
  const lockedBy = trip?.accommodationLockedBy ?? {};
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

  const winnerIdx = suggestions.reduce((best, _, idx) =>
    getScore(idx) > getScore(best) ? idx : best, 0);

  const handleToggleLock = async () => {
    if (!user || !id) return;
    if (!myLocked) {
      const unvoted = suggestions.filter((_, idx) => !getVotesForIdx(idx)[user.uid]);
      if (unvoted.length > 0) {
        Alert.alert("Vote on all options first", `Vote on ${unvoted.length} more option${unvoted.length > 1 ? "s" : ""} before locking in.`, [{ text: "OK" }]);
        return;
      }
    }
    setLocking(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (myLocked) await unlockAccommodationVotes(id, user.uid);
      else await lockAccommodationVotes(id, user.uid);
    } finally {
      setLocking(false);
    }
  };

  const handleConfirm = async () => {
    if (!id || !suggestions[winnerIdx]) return;
    setConfirming(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await confirmAccommodation(id, suggestions[winnerIdx]);
      router.replace(`/trip/${id}`);
    } finally {
      setConfirming(false);
    }
  };

  const handleAiTiebreak = async () => {
    if (!id || !trip) return;
    const currentTopScore = getScore(winnerIdx);
    const tiedOptions = suggestions
      .map((s, i) => ({ ...s, origIdx: i }))
      .filter((_, i) => getScore(i) === currentTopScore);
    setBreaking(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      const baseUrl = Platform.OS === "web" ? "" : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`;
      const res = await fetch(`${baseUrl}/api/ai-pick-accommodation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          suggestions: tiedOptions.map((s) => ({
            name: s.name,
            type: s.type,
            location: s.location,
            costPerPerson: s.costPerPerson,
            whyItFits: s.whyItFits,
          })),
          destination: trip.destination,
          memberCount,
        }),
      });
      if (!res.ok) throw new Error("AI could not decide");
      const result = await res.json() as { winnerIdx: number; reason: string };
      const picked = tiedOptions[result.winnerIdx];
      Alert.alert(
        "AI Tiebreaker",
        `AI picks: ${picked?.name ?? "Unknown"}\n\n"${result.reason}"`,
        [
          { text: "Keep voting", style: "cancel" },
          isCreator && picked
            ? {
                text: "Confirm this pick",
                onPress: async () => {
                  await confirmAccommodation(id, suggestions[picked.origIdx]);
                  router.replace(`/trip/${id}`);
                },
              }
            : { text: "OK" },
        ].filter(Boolean) as any,
      );
    } catch {
      Alert.alert("Error", "Could not break the tie. Please try again.");
    } finally {
      setBreaking(false);
    }
  };

  const handleAddLink = async () => {
    if (!linkName.trim() || !id) return;
    setAddingLink(true);
    try {
      const memberCount = Object.keys(members).length || 1;
      const total = parseFloat(linkCost) || 0;
      const newSuggestion: AccommodationSuggestion = {
        id: `member-${Date.now()}`,
        name: linkName.trim(),
        type: linkType,
        location: trip?.destination ?? "",
        totalCost: total,
        costPerPerson: Math.round(total / memberCount),
        nights: trip?.days ?? 1,
        rating: 0,
        amenities: [],
        rooms: 1,
        beds: memberCount,
        cancellation: "Check listing",
        whyItFits: "Added by a pack member",
        tags: ["Member pick"],
        distanceNote: "See listing for details",
        link: linkUrl.trim() || undefined,
        submittedBy: user?.displayName ?? "Member",
      };
      await addMemberAccommodationLink(id, newSuggestion);
      setShowAddLink(false);
      setLinkName(""); setLinkUrl(""); setLinkCost("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } finally {
      setAddingLink(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={TEAL} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={TEAL} size="large" />
      </View>
    );
  }

  const topScore = getScore(winnerIdx);
  const isTied = allLocked && suggestions.length > 1 && suggestions.filter((_, i) => getScore(i) === topScore).length > 1;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: TEAL }]}>WHERE TO STAY?</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Choose accommodation</Text>
        </View>
        <Pressable onPress={() => setShowAddLink(true)} style={[styles.addBtn, { borderColor: TEAL }]}>
          <Feather name="plus" size={14} color={TEAL} />
          <Text style={[styles.addBtnText, { color: TEAL }]}>Add link</Text>
        </Pressable>
      </View>

      {/* Lock-in bar */}
      <View style={[styles.lockBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.lockBarTitle, { color: colors.foreground }]}>
            {allLocked ? "All votes locked in ✓" : `${lockedCount} of ${memberCount} locked in`}
          </Text>
          <View style={[styles.lockProgress, { backgroundColor: colors.muted }]}>
            <View style={[styles.lockProgressFill, { backgroundColor: allLocked ? "#4CAF50" : TEAL, width: memberCount > 0 ? `${(lockedCount / memberCount) * 100}%` : "0%" }]} />
          </View>
        </View>
        <Pressable onPress={handleToggleLock} disabled={locking} style={[styles.lockBtn, { backgroundColor: myLocked ? "#4CAF50" : TEAL }]}>
          {locking ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <Feather name={myLocked ? "check" : "lock"} size={14} color="#fff" />
              <Text style={styles.lockBtnText}>{myLocked ? "Locked" : "Lock in"}</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* AI note */}
      <View style={[styles.aiNote, { backgroundColor: colors.muted }]}>
        <Feather name="info" size={12} color={colors.mutedForeground} />
        <Text style={[styles.aiNoteText, { color: colors.mutedForeground }]}>
          AI suggestions — research and verify before booking. Members can add their own links.
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomInset + 20 }}>
        {suggestions.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="link" size={44} color={colors.border} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No picks yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Be first! Add your preferred accommodation link so the pack can vote.
            </Text>
            <Pressable onPress={() => setShowAddLink(true)} style={[styles.addFirstBtn, { backgroundColor: TEAL }]}>
              <Feather name="plus" size={16} color="#fff" />
              <Text style={styles.addFirstBtnText}>Add your pick</Text>
            </Pressable>
          </View>
        )}

        {isTied && (
          <Pressable
            onPress={handleAiTiebreak}
            disabled={breaking}
            style={[styles.aiTieBtn, { backgroundColor: "#7E57C218", borderColor: "#7E57C2" }]}
          >
            {breaking ? (
              <ActivityIndicator color="#7E57C2" size="small" />
            ) : (
              <>
                <Feather name="zap" size={16} color="#7E57C2" />
                <Text style={[styles.aiTieBtnText, { color: "#7E57C2" }]}>Too close to call — let AI break the tie</Text>
              </>
            )}
          </Pressable>
        )}

        {allLocked && !isCreator && !isTied && (
          <View style={[styles.waitingBanner, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="clock" size={16} color={colors.mutedForeground} />
            <Text style={[styles.waitingText, { color: colors.mutedForeground }]}>
              Waiting for the trip creator to confirm the accommodation…
            </Text>
          </View>
        )}

        {confirming && (
          <View style={[styles.confirmingBanner, { backgroundColor: TEAL + "18" }]}>
            <ActivityIndicator color={TEAL} size="small" />
            <Text style={[styles.waitingText, { color: TEAL }]}>Confirming accommodation…</Text>
          </View>
        )}

        {suggestions.map((s, idx) => (
          <AccommodationCard
            key={s.id ?? idx}
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

      {/* Add member link modal */}
      <Modal visible={showAddLink} transparent animationType="slide" onRequestClose={() => setShowAddLink(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddLink(false)}>
          <Pressable style={[styles.addSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Add your own pick</Text>
            <Text style={[styles.sheetSub, { color: colors.mutedForeground }]}>Found something? Add it so the pack can vote on it.</Text>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Property name *</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="e.g. Cozy Apartment near Sagrada Família"
                placeholderTextColor={colors.mutedForeground}
                value={linkName}
                onChangeText={setLinkName}
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Type</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["hotel", "airbnb", "hostel", "other"] as const).map((t) => (
                <Pressable key={t} onPress={() => setLinkType(t)} style={[styles.typeChip, { backgroundColor: linkType === t ? TEAL : colors.muted, borderColor: linkType === t ? TEAL : colors.border }]}>
                  <Text style={[styles.chipText, { color: linkType === t ? "#fff" : colors.foreground, fontSize: 12 }]}>{t}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Total cost for group ($)</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="e.g. 1200"
                placeholderTextColor={colors.mutedForeground}
                value={linkCost}
                onChangeText={setLinkCost}
                keyboardType="numeric"
              />
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Listing URL (optional)</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="https://..."
                placeholderTextColor={colors.mutedForeground}
                value={linkUrl}
                onChangeText={setLinkUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <Pressable
              onPress={handleAddLink}
              disabled={addingLink || !linkName.trim()}
              style={[styles.submitBtn, { backgroundColor: TEAL, opacity: addingLink || !linkName.trim() ? 0.6 : 1 }]}
            >
              {addingLink ? <ActivityIndicator color="#fff" size="small" /> : (
                <Text style={styles.submitBtnText}>Add to vote</Text>
              )}
            </Pressable>
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
  emptyState: { alignItems: "center", justifyContent: "center", gap: 12, paddingVertical: 60, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22, letterSpacing: -0.3 },
  addFirstBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 24, marginTop: 4 },
  addFirstBtnText: { fontFamily: "DmSans_700Bold", fontSize: 15, color: "#fff" },
  aiTieBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderWidth: 1, borderRadius: 16, padding: 14 },
  aiTieBtnText: { fontFamily: "DmSans_700Bold", fontSize: 14 },
  waitingBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 14, borderWidth: 1 },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  backBtn: { padding: 4 },
  headerLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 2 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },

  lockBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  lockBarTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 13, marginBottom: 6 },
  lockProgress: { height: 4, borderRadius: 2, overflow: "hidden" },
  lockProgressFill: { height: 4, borderRadius: 2 },
  lockBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  lockBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff" },

  aiNote: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  aiNoteText: { fontFamily: "DmSans_400Regular", fontSize: 11, flex: 1, lineHeight: 15 },

  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  winBadge: { alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  winBadgeText: { fontFamily: "DmSans_700Bold", fontSize: 11, color: "#fff", letterSpacing: 1 },
  memberBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", backgroundColor: "#FFA72620", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  memberBadgeText: { fontFamily: "DmSans_600SemiBold", fontSize: 11, color: "#FFA726" },

  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  cardName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, lineHeight: 26 },
  cardLocation: { fontFamily: "DmSans_400Regular", fontSize: 12 },

  arrowStack: { alignItems: "center", gap: 2 },
  arrowBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  scoreText: { fontFamily: "DmSans_700Bold", fontSize: 14, minWidth: 24, textAlign: "center" },

  whyBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, borderRadius: 10, padding: 10 },
  whyText: { fontFamily: "DmSans_400Regular", fontSize: 13, flex: 1, lineHeight: 18 },

  costRow: { flexDirection: "row", alignItems: "center" },
  costItem: { flex: 1, alignItems: "center", gap: 2 },
  costLabel: { fontFamily: "DmSans_400Regular", fontSize: 11 },
  costValue: { fontFamily: "DmSans_700Bold", fontSize: 15 },
  costDivider: { width: 1, height: 30, marginHorizontal: 4 },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  tagText: { fontFamily: "DmSans_500Medium", fontSize: 11 },

  distanceText: { fontFamily: "DmSans_400Regular", fontSize: 12, flex: 1 },

  amenitiesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  amenityItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  amenityText: { fontFamily: "DmSans_400Regular", fontSize: 12 },

  cancelText: { fontFamily: "DmSans_400Regular", fontSize: 12, flex: 1 },

  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 10, paddingVertical: 8 },
  linkBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },

  voterRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  voterNames: { fontFamily: "DmSans_400Regular", fontSize: 12, flex: 1 },

  confirmBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 13, marginTop: 4 },
  confirmBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },

  confirmingBanner: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, padding: 12 },
  waitingText: { fontFamily: "DmSans_400Regular", fontSize: 13, flex: 1 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  addSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 48, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 8 },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  sheetSub: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18 },
  fieldLabel: { fontFamily: "DmSans_500Medium", fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase" },
  inputWrap: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11 },
  input: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 14 },
  typeChip: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  chipText: { fontFamily: "DmSans_500Medium", fontSize: 13 },
  submitBtn: { borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  submitBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
});
