import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useTrip } from "@/hooks/useFirebase";
import { apiFetch } from "@/lib/api-client";

export default function MemoryGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { trip, loading } = useTrip(id);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    if (!user || !id) return;
    setGenerating(true);
    setError("");
    try {
      const token = await user.getIdToken();
      const response = await apiFetch("/api/memory-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tripId: id }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? "Could not create the memory guide.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the memory guide.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading || !trip) {
    return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator color={colors.primary} /></View>;
  }

  // Authenticated members must only see their own review and guide. The
  // legacy fields are safe fallbacks only when they were written by this
  // member; otherwise one member could briefly see another member's memory.
  const legacyReview = trip.review as { reviewedBy?: string } | undefined;
  const isLegacyReviewMine = !!user && legacyReview?.reviewedBy === user.uid;
  const guide = user
    ? trip.memoryGuides?.[user.uid] ?? (isLegacyReviewMine ? trip.memoryGuide : undefined)
    : trip.memoryGuide;
  const myReview = user
    ? trip.memberReviews?.[user.uid] ?? (isLegacyReviewMine ? trip.review : undefined)
    : trip.review;
  const photos = ((myReview as { photos?: string[] } | undefined)?.photos ?? []).slice(0, 6);
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Trip memories</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        {photos.length > 0 ? (
          <View style={styles.photoStrip}>
            {photos.slice(0, 3).map((uri, index) => (
              <Image key={`${uri.slice(0, 30)}-${index}`} source={{ uri }} style={styles.heroPhoto} contentFit="cover" />
            ))}
          </View>
        ) : null}
        {guide ? (
          <>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>PACKYO MEMORY GUIDE</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>{guide.title}</Text>
            <Text style={[styles.opening, { color: colors.mutedForeground }]}>{guide.opening}</Text>
            <View style={styles.stats}>
              {guide.byTheNumbers.map((item, index) => (
                <View key={`${item.label}-${index}`} style={[styles.stat, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>{item.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
                </View>
              ))}
            </View>
            {guide.highlights.map((highlight, index) => (
              <View key={`${highlight.title}-${index}`} style={[styles.highlight, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.number, { backgroundColor: colors.primary }]}><Text style={styles.numberText}>{index + 1}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.highlightTitle, { color: colors.foreground }]}>{highlight.title}</Text>
                  <Text style={[styles.highlightStory, { color: colors.mutedForeground }]}>{highlight.story}</Text>
                </View>
              </View>
            ))}
            <Text style={[styles.closing, { color: colors.foreground }]}>{guide.closing}</Text>
          </>
        ) : (
          <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="book-open" size={34} color={colors.primary} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Turn the trip into a keepsake</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>Packyo will organize your review, itinerary, stay, and photos into a polished memory guide.</Text>
            {!!error && <Text style={[styles.error, { color: colors.destructive }]}>{error}</Text>}
            <Pressable onPress={generate} disabled={generating || !myReview} style={[styles.generate, { backgroundColor: colors.primary, opacity: myReview ? 1 : 0.5 }]}>
              {generating ? <ActivityIndicator color="#fff" /> : <Text style={styles.generateText}>{myReview ? "Create memory guide" : "Add a review first"}</Text>}
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontFamily: "DmSans_700Bold", fontSize: 18 },
  content: { padding: 18, gap: 16 },
  photoStrip: { flexDirection: "row", height: 190, gap: 5, overflow: "hidden", borderRadius: 20 },
  heroPhoto: { flex: 1, height: "100%" },
  eyebrow: { fontFamily: "DmSans_700Bold", fontSize: 12, letterSpacing: 1.2, marginTop: 4 },
  title: { fontFamily: "DmSans_700Bold", fontSize: 30, lineHeight: 36 },
  opening: { fontFamily: "DmSans_400Regular", fontSize: 16, lineHeight: 24 },
  stats: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  stat: { minWidth: "30%", flexGrow: 1, borderWidth: 1, borderRadius: 15, padding: 13 },
  statValue: { fontFamily: "DmSans_700Bold", fontSize: 20 },
  statLabel: { fontFamily: "DmSans_400Regular", fontSize: 11, marginTop: 2 },
  highlight: { flexDirection: "row", gap: 12, borderWidth: 1, borderRadius: 18, padding: 16 },
  number: { width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  numberText: { color: "#fff", fontFamily: "DmSans_700Bold", fontSize: 12 },
  highlightTitle: { fontFamily: "DmSans_700Bold", fontSize: 16 },
  highlightStory: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 21, marginTop: 5 },
  closing: { fontFamily: "DmSans_600SemiBold", fontSize: 17, lineHeight: 25, textAlign: "center", padding: 18 },
  empty: { borderWidth: 1, borderRadius: 22, padding: 24, alignItems: "center", gap: 12, marginTop: 36 },
  emptyTitle: { fontFamily: "DmSans_700Bold", fontSize: 20, textAlign: "center" },
  emptyBody: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 21, textAlign: "center" },
  error: { fontFamily: "DmSans_500Medium", fontSize: 13, textAlign: "center" },
  generate: { minHeight: 46, borderRadius: 23, paddingHorizontal: 22, alignItems: "center", justifyContent: "center", marginTop: 4 },
  generateText: { color: "#fff", fontFamily: "DmSans_700Bold", fontSize: 14 },
});