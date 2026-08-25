import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { WikiImage } from "@/components/WikiImage";

/* ── Smart destination photo: user-uploaded first, WikiImage fallback ── */
function DestinationPhoto({
  destination,
  photos,
  style,
}: {
  destination: string;
  photos?: string[];
  style: any;
}) {
  const cityName = destination.split(",")[0].trim();
  if (photos && photos.length > 0) {
    return <Image source={{ uri: photos[0] }} style={style} contentFit="cover" />;
  }
  return (
    <WikiImage
      name={cityName}
      context="travel destination"
      style={style}
      resizeMode="cover"
      placeholderColor="#D1C9BE"
    />
  );
}

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [query, setQuery] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  // Load up to 20 reviews from Firebase
  const reviews = usePublicReviews(20);

  // Filter by search query
  const filtered = query.trim()
    ? reviews.filter(
        (r) =>
          r.destination.toLowerCase().includes(query.toLowerCase()) ||
          r.vibes.some((v: string) => v.toLowerCase().includes(query.toLowerCase()))
      )
    : reviews;

  // Unique destinations (for Featured section)
  const seenDests = new Set<string>();
  const featuredDests = filtered
    .filter((r) => {
      const key = r.destination.split(",")[0].trim().toLowerCase();
      if (seenDests.has(key)) return false;
      seenDests.add(key);
      return true;
    })
    .slice(0, 6);

  // Reviews sorted by rating desc (for Popular section)
  const popular = [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 5);

  // Reviews with highlights (for Community Picks)
  const communityPicks = filtered.filter((r) => r.highlight || r.text).slice(0, 6);

  const loading = reviews.length === 0 && !query.trim();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.headline, { color: colors.foreground }]}>Discover</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search destinations, vibes..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#E85D3A" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading destinations…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="compass" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            {query.trim()
              ? `No trips match "${query}". Try a different search.`
              : "No trips have been reviewed yet. Be the first!"}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomInset }}
        >
          {/* Featured destinations */}
          {featuredDests.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Featured destinations</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
                  {featuredDests.length} places
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {featuredDests.map((r) => (
                  <Pressable
                    key={r.id}
                    style={styles.featuredCard}
                    onPress={() =>
                      router.push({
                        pathname: "/(tabs)/create",
                        params: { prefillDestination: r.destination },
                      })
                    }
                  >
                    <DestinationPhoto
                      destination={r.destination}
                      photos={r.photos}
                      style={styles.featuredImage}
                    />
                    <Text style={[styles.featuredName, { color: colors.foreground }]} numberOfLines={1}>
                      {r.destination.split(",")[0].trim()}
                    </Text>
                    {r.vibes?.length > 0 && (
                      <Text style={[styles.featuredVibes, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {r.vibes.slice(0, 2).join(" · ")}
                      </Text>
                    )}
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Popular itineraries */}
          {popular.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top rated trips</Text>
              </View>
              <View style={styles.verticalList}>
                {popular.map((r) => (
                  <Pressable
                    key={r.id}
                    style={[styles.popularCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => router.push(`/discover-itinerary/${r.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`Preview itinerary for ${r.destination.split(",")[0].trim()}`}
                    testID={`discover-top-rated-${r.id}`}
                  >
                    <DestinationPhoto
                      destination={r.destination}
                      photos={r.photos}
                      style={styles.popularImage}
                    />
                    <View style={styles.popularInfo}>
                      <Text style={[styles.popularName, { color: colors.foreground }]} numberOfLines={1}>
                        {r.days > 0 ? `${r.days} days in ${r.destination.split(",")[0].trim()}` : r.destination.split(",")[0].trim()}
                      </Text>
                      <Text style={[styles.popularBy, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {r.memberNames?.length > 0 ? `By ${r.memberNames.slice(0, 2).join(", ")}` : "Packyo trip"}
                      </Text>
                      {r.highlight ? (
                        <Text style={[styles.popularHighlight, { color: colors.mutedForeground }]} numberOfLines={1}>
                          "{r.highlight}"
                        </Text>
                      ) : null}
                    </View>
                    {r.rating > 0 && (
                      <View style={styles.ratingCol}>
                        <Feather name="star" size={13} color="#F59E0B" />
                        <Text style={[styles.ratingText, { color: colors.foreground }]}>
                          {r.rating.toFixed(1)}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Community picks */}
          {communityPicks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Community picks</Text>
                <Text style={[styles.sectionCount, { color: colors.mutedForeground }]}>
                  {communityPicks.length} trips
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalScroll}
              >
                {communityPicks.map((r) => (
                  <View key={r.id} style={styles.communityCard}>
                    <DestinationPhoto
                      destination={r.destination}
                      photos={r.photos}
                      style={styles.communityImage}
                    />
                    <View style={[styles.communityOverlay]}>
                      <Text style={styles.communityDest} numberOfLines={1}>
                        {r.destination.split(",")[0].trim()}
                      </Text>
                      {r.memberNames?.length > 0 && (
                        <Text style={styles.communityMembers} numberOfLines={1}>
                          {r.memberNames.length} travellers
                        </Text>
                      )}
                    </View>
                    {r.rating > 0 && (
                      <View style={styles.communityRating}>
                        <Feather name="star" size={10} color="#F59E0B" />
                        <Text style={styles.communityRatingText}>{r.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  headline: { fontFamily: "DmSans_700Bold", fontSize: 28, marginBottom: 16 },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: 24, borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 15 },

  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "DmSans_400Regular", fontSize: 14 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontFamily: "DmSans_700Bold", fontSize: 20 },
  emptyBody: { fontFamily: "DmSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },

  section: { marginBottom: 28 },
  sectionHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 24, marginBottom: 14,
  },
  sectionTitle: { fontFamily: "DmSans_700Bold", fontSize: 17 },
  sectionCount: { fontFamily: "DmSans_400Regular", fontSize: 13 },

  /* Featured */
  horizontalScroll: { paddingHorizontal: 24, gap: 14 },
  featuredCard: { width: 140, gap: 6 },
  featuredImage: { width: "100%", aspectRatio: 4 / 3, borderRadius: 14 },
  featuredName: { fontFamily: "DmSans_600SemiBold", fontSize: 14, textAlign: "center" },
  featuredVibes: { fontFamily: "DmSans_400Regular", fontSize: 11, textAlign: "center" },

  /* Popular */
  verticalList: { paddingHorizontal: 24, gap: 10 },
  popularCard: {
    flexDirection: "row", alignItems: "center",
    padding: 12, borderRadius: 14, borderWidth: 1, gap: 12,
  },
  popularImage: { width: 60, height: 60, borderRadius: 10 },
  popularInfo: { flex: 1 },
  popularName: { fontFamily: "DmSans_600SemiBold", fontSize: 14, marginBottom: 2 },
  popularBy: { fontFamily: "DmSans_400Regular", fontSize: 12, marginBottom: 2 },
  popularHighlight: { fontFamily: "DmSans_400Regular", fontSize: 11, fontStyle: "italic" },
  ratingCol: { alignItems: "center", gap: 3 },
  ratingText: { fontFamily: "DmSans_700Bold", fontSize: 13 },

  /* Community picks */
  communityCard: { width: 160, borderRadius: 14, overflow: "hidden", position: "relative" },
  communityImage: { width: "100%", height: 120 },
  communityOverlay: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.42)", padding: 8,
  },
  communityDest: { fontFamily: "DmSans_700Bold", fontSize: 13, color: "#fff" },
  communityMembers: { fontFamily: "DmSans_400Regular", fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 1 },
  communityRating: {
    position: "absolute", top: 8, right: 8,
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  communityRatingText: { fontFamily: "DmSans_700Bold", fontSize: 11, color: "#fff" },
});
