import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
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

import { useColors } from "@/hooks/useColors";
import { usePublicReviews } from "@/hooks/useFirebase";

const VIBES = [
  { label: "Culture", icon: "book", color: "#9C5544" },
  { label: "Food", icon: "coffee", color: "#E85D3A" },
  { label: "Adventure", icon: "zap", color: "#4CAF50" },
  { label: "Beach", icon: "sun", color: "#42A5F5" },
  { label: "City", icon: "grid", color: "#5C6BC0" },
  { label: "Nature", icon: "feather", color: "#26A69A" },
];

type PublicReview = ReturnType<typeof usePublicReviews>[number];

function ReviewPreviewModal({ review, onClose, colors }: { review: PublicReview; onClose: () => void; colors: any }) {
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={[styles.previewSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.previewHeader}>
            <View style={[styles.previewDestIcon, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="map-pin" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.previewDest, { color: colors.foreground }]}>
                {review.destination || "Mystery destination"}
              </Text>
              {review.memberNames?.length > 0 && (
                <Text style={[styles.previewPack, { color: colors.mutedForeground }]}>
                  Pack: {review.memberNames.slice(0, 3).join(", ")}
                  {review.memberNames.length > 3 ? ` +${review.memberNames.length - 3}` : ""}
                </Text>
              )}
            </View>
            <Pressable onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
              <Feather name="x" size={16} color={colors.foreground} />
            </Pressable>
          </View>

          {/* Vibes */}
          {review.vibes?.length > 0 && (
            <View style={styles.vibesRow}>
              {review.vibes.slice(0, 5).map((v: string) => (
                <View key={v} style={[styles.vibePill, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.vibePillText, { color: colors.primary }]}>{v}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Review text */}
          {review.text ? (
            <View style={[styles.reviewBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Feather name="message-circle" size={14} color={colors.mutedForeground} />
              <Text style={[styles.reviewBoxText, { color: colors.foreground }]}>{review.text}</Text>
            </View>
          ) : null}

          {/* Itinerary preview */}
          {(review as any).itinerary?.days?.length > 0 ? (
            <View style={{ marginTop: 16, gap: 10 }}>
              <Text style={[styles.itineraryLabel, { color: colors.mutedForeground }]}>ITINERARY HIGHLIGHTS</Text>
              {((review as any).itinerary.days as any[]).slice(0, 3).map((day: any, i: number) => (
                <View key={i} style={[styles.dayRow, { borderColor: colors.border }]}>
                  <View style={[styles.dayBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.dayBadgeText}>{day.dayNumber}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dayCity, { color: colors.foreground }]}>{day.city ?? day.theme}</Text>
                    {day.activities?.slice(0, 2).map((act: any, j: number) => (
                      <Text key={j} style={[styles.dayActivity, { color: colors.mutedForeground }]}>
                        · {act.name}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.noItinerary, { backgroundColor: colors.muted }]}>
              <Feather name="map" size={16} color={colors.mutedForeground} />
              <Text style={[styles.noItineraryText, { color: colors.mutedForeground }]}>
                No itinerary shared publicly for this trip.
              </Text>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [previewReview, setPreviewReview] = useState<PublicReview | null>(null);
  const reviews = usePublicReviews(4);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  const filtered = reviews.filter((r) =>
    !query || r.destination?.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset }}
      >
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.label, { color: colors.primary }]}>DISCOVER</Text>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            {"Where will the\npack go?"}
          </Text>
          <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
            <Feather name="search" size={16} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search destinations..."
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
            />
          </View>
        </View>

        {filtered.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              Reviewed trips
            </Text>
            {filtered.map((r) => (
              <View key={r.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.reviewImg, { backgroundColor: colors.muted }]}>
                  <Feather name="map-pin" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.reviewDest, { color: colors.foreground }]}>
                    {r.destination || "Mystery destination"}
                  </Text>
                  {r.text ? (
                    <Text style={[styles.reviewText, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {r.text}
                    </Text>
                  ) : null}
                  {r.vibes?.length > 0 && (
                    <Text style={[styles.reviewVibes, { color: colors.primary }]}>
                      {r.vibes.slice(0, 3).join(" · ")}
                    </Text>
                  )}
                  <Pressable
                    onPress={() => setPreviewReview(r)}
                    style={[styles.previewBtn, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "30" }]}
                  >
                    <Feather name="file-text" size={12} color={colors.primary} />
                    <Text style={[styles.previewBtnText, { color: colors.primary }]}>Preview</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            Browse by vibe
          </Text>
          <View style={styles.vibeGrid}>
            {VIBES.map((vibe) => (
              <Pressable
                key={vibe.label}
                style={[styles.vibeCard, { backgroundColor: vibe.color + "22", borderColor: vibe.color + "44" }]}
              >
                <Feather name={vibe.icon as any} size={22} color={vibe.color} />
                <Text style={[styles.vibeLabel, { color: vibe.color }]}>{vibe.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {previewReview && (
        <ReviewPreviewModal
          review={previewReview}
          onClose={() => setPreviewReview(null)}
          colors={colors}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  label: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
    marginBottom: 8,
  },
  headline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
  },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: {
    fontFamily: "DmSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  reviewCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 10,
  },
  reviewImg: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  reviewDest: { fontFamily: "DmSans_600SemiBold", fontSize: 15, marginBottom: 3 },
  reviewText: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18, marginBottom: 4 },
  reviewVibes: { fontFamily: "DmSans_500Medium", fontSize: 12, marginBottom: 8 },
  previewBtn: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  previewBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 12 },
  vibeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vibeCard: {
    width: "30%",
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  vibeLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 12 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  previewSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  previewDestIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  previewDest: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, letterSpacing: -0.3 },
  previewPack: { fontFamily: "DmSans_400Regular", fontSize: 13, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  vibesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  vibePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  vibePillText: { fontFamily: "DmSans_600SemiBold", fontSize: 12 },
  reviewBox: {
    flexDirection: "row",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 4,
  },
  reviewBoxText: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 20, flex: 1 },
  itineraryLabel: {
    fontFamily: "DmSans_500Medium",
    fontSize: 11,
    letterSpacing: 1.5,
  },
  dayRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
    borderLeftWidth: 2,
    paddingLeft: 12,
  },
  dayBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dayBadgeText: { fontFamily: "DmSans_700Bold", fontSize: 11, color: "#fff" },
  dayCity: { fontFamily: "DmSans_600SemiBold", fontSize: 14, marginBottom: 2 },
  dayActivity: { fontFamily: "DmSans_400Regular", fontSize: 12, lineHeight: 18 },
  noItinerary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  noItineraryText: { fontFamily: "DmSans_400Regular", fontSize: 13 },
});
