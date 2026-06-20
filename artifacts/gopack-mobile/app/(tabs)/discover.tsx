import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
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

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
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
  reviewVibes: { fontFamily: "DmSans_500Medium", fontSize: 12 },
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
});
