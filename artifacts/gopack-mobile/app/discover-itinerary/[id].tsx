import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
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

import { WikiImage } from "@/components/WikiImage";
import { useColors } from "@/hooks/useColors";
import {
  PublicItineraryActivity,
  PublicItineraryDay,
  usePublicReview,
} from "@/hooks/useFirebase";

function DestinationPhoto({
  destination,
  photos,
}: {
  destination: string;
  photos?: string[];
}) {
  const cityName = destination.split(",")[0].trim();
  if (photos?.[0]) {
    return <Image source={{ uri: photos[0] }} style={styles.heroImage} contentFit="cover" />;
  }
  return (
    <WikiImage
      name={cityName}
      context="travel destination"
      style={styles.heroImage}
      resizeMode="cover"
      placeholderColor="#D1C9BE"
    />
  );
}

function ActivityRow({
  activity,
  colors,
  isLast,
}: {
  activity: PublicItineraryActivity;
  colors: ReturnType<typeof useColors>;
  isLast: boolean;
}) {
  const category = activity.category
    ? activity.category.charAt(0).toUpperCase() + activity.category.slice(1)
    : "";
  const hasCost = typeof activity.estimatedCost === "number";

  return (
    <View style={styles.activityRow}>
      <View style={styles.activityRail}>
        <View style={[styles.activityDot, { backgroundColor: colors.primary }]} />
        {!isLast && <View style={[styles.activityLine, { backgroundColor: colors.border }]} />}
      </View>
      <View style={[styles.activityCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.activityMeta}>
          <Text style={[styles.activityTime, { color: colors.mutedForeground }]}>
            {activity.time || "Flexible time"}
          </Text>
          {category ? (
            <Text style={[styles.activityCategory, { color: colors.primary, backgroundColor: colors.primary + "15" }]}>
              {category}
            </Text>
          ) : null}
        </View>
        <Text style={[styles.activityName, { color: colors.foreground }]}>
          {activity.name || "Untitled activity"}
        </Text>
        {activity.description ? (
          <Text style={[styles.activityDescription, { color: colors.mutedForeground }]}>
            {activity.description}
          </Text>
        ) : null}
        {hasCost ? (
          <Text style={[styles.activityCost, { color: activity.estimatedCost === 0 ? "#26A69A" : colors.foreground }]}>
            {activity.estimatedCost === 0 ? "Free" : `≈ $${activity.estimatedCost} / person`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function DaySection({
  day,
  colors,
}: {
  day: PublicItineraryDay;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <View style={[styles.dayNumber, { backgroundColor: colors.primary }]}>
          <Text style={styles.dayNumberText}>{day.day}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dayTitle, { color: colors.foreground }]}>
            {day.city || `Day ${day.day}`}
          </Text>
          <Text style={[styles.dayTheme, { color: colors.mutedForeground }]}>
            {day.theme}
          </Text>
        </View>
      </View>
      {day.activities.length > 0 ? (
        day.activities.map((activity, index) => (
          <ActivityRow
            key={`${day.day}-${index}-${activity.name}`}
            activity={activity}
            colors={colors}
            isLast={index === day.activities.length - 1}
          />
        ))
      ) : (
        <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.emptyDayText, { color: colors.mutedForeground }]}>
            No activities listed for this day.
          </Text>
        </View>
      )}
    </View>
  );
}

export default function DiscoverItineraryPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { review, loading } = usePublicReview(id);
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 20;

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/discover");
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading itinerary preview…</Text>
      </View>
    );
  }

  if (!review) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingHorizontal: 32 }]}>
        <View style={[styles.errorIcon, { backgroundColor: colors.primary + "15" }]}>
          <Feather name="map" size={26} color={colors.primary} />
        </View>
        <Text style={[styles.errorTitle, { color: colors.foreground }]}>Trip preview unavailable</Text>
        <Text style={[styles.errorBody, { color: colors.mutedForeground }]}>
          This public itinerary may have been removed or is no longer available.
        </Text>
        <Pressable onPress={goBack} style={[styles.backAction, { backgroundColor: colors.primary }]}>
          <Feather name="arrow-left" size={16} color="#fff" />
          <Text style={styles.backActionText}>Back to Discover</Text>
        </Pressable>
      </View>
    );
  }

  const city = review.destination.split(",")[0].trim();
  const days = review.itineraryDays ?? [];
  const totalActivities = days.reduce((total, day) => total + day.activities.length, 0);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={goBack} style={styles.headerBack} accessibilityLabel="Back to Discover">
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Itinerary preview</Text>
          <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>From the Packyo community</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
      >
        <View style={styles.hero}>
          <DestinationPhoto destination={review.destination} photos={review.photos} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>TOP RATED TRIP</Text>
            <Text style={styles.heroTitle}>{city}</Text>
            <Text style={styles.heroDuration}>
              {review.days > 0 ? `${review.days} ${review.days === 1 ? "day" : "days"}` : "Trip itinerary"}
              {totalActivities > 0 ? ` · ${totalActivities} activities` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryStat}>
            <Feather name="star" size={16} color="#F59E0B" />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {review.rating > 0 ? review.rating.toFixed(1) : "—"}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>community rating</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStat}>
            <Feather name="users" size={16} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {review.memberNames.length || "—"}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>travellers</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryStat}>
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={[styles.summaryValue, { color: colors.foreground }]}>
              {days.length || review.days || "—"}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>days shown</Text>
          </View>
        </View>

        {(review.highlight || review.text || review.vibes.length > 0) && (
          <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {review.highlight ? (
              <Text style={[styles.highlight, { color: colors.foreground }]}>“{review.highlight}”</Text>
            ) : review.text ? (
              <Text style={[styles.reviewText, { color: colors.foreground }]}>{review.text}</Text>
            ) : null}
            {review.memberNames.length > 0 ? (
              <Text style={[styles.reviewByline, { color: colors.mutedForeground }]}>
                Shared by {review.memberNames.slice(0, 2).join(" and ")}
              </Text>
            ) : null}
            {review.vibes.length > 0 ? (
              <View style={styles.vibes}>
                {review.vibes.slice(0, 4).map((vibe) => (
                  <Text key={vibe} style={[styles.vibe, { color: colors.primary, backgroundColor: colors.primary + "12" }]}>
                    {vibe}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.itineraryHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>The itinerary</Text>
          <View style={styles.readOnly}>
            <Feather name="eye" size={12} color={colors.mutedForeground} />
            <Text style={[styles.readOnlyText, { color: colors.mutedForeground }]}>Read only</Text>
          </View>
        </View>

        {days.length > 0 ? (
          days.map((day) => <DaySection key={day.day} day={day} colors={colors} />)
        ) : (
          <View style={[styles.noItinerary, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="calendar" size={28} color={colors.mutedForeground} />
            <Text style={[styles.noItineraryTitle, { color: colors.foreground }]}>
              No itinerary preview yet
            </Text>
            <Text style={[styles.noItineraryBody, { color: colors.mutedForeground }]}>
              This trip has a public review, but its day-by-day plan was not shared.
            </Text>
          </View>
        )}

        <Pressable
          onPress={() =>
            router.push({
              pathname: "/(tabs)/create",
              params: { prefillDestination: review.destination },
            })
          }
          style={[styles.createButton, { backgroundColor: colors.primary }]}
          accessibilityRole="button"
        >
          <Feather name="plus" size={17} color="#fff" />
          <Text style={styles.createButtonText}>Plan your own trip to {city}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontFamily: "DmSans_400Regular", fontSize: 14 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBack: { padding: 4, marginRight: 10 },
  headerTitle: { fontFamily: "DmSans_700Bold", fontSize: 17 },
  headerSubtitle: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 1 },
  errorIcon: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  errorTitle: { fontFamily: "DmSans_700Bold", fontSize: 21, textAlign: "center" },
  errorBody: { fontFamily: "DmSans_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  backAction: { flexDirection: "row", alignItems: "center", gap: 7, borderRadius: 22, paddingHorizontal: 18, paddingVertical: 11, marginTop: 4 },
  backActionText: { fontFamily: "DmSans_700Bold", fontSize: 13, color: "#fff" },
  hero: { height: 220, position: "relative", overflow: "hidden" },
  heroImage: { width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.42)" },
  heroContent: { position: "absolute", left: 24, right: 24, bottom: 22 },
  heroEyebrow: { fontFamily: "DmSans_700Bold", fontSize: 10, letterSpacing: 1.7, color: "#FFD3C6", marginBottom: 5 },
  heroTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 34, color: "#fff" },
  heroDuration: { fontFamily: "DmSans_500Medium", fontSize: 13, color: "rgba(255,255,255,0.86)", marginTop: 3 },
  summaryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 16, marginHorizontal: 16 },
  summaryStat: { alignItems: "center", gap: 3, flex: 1 },
  summaryValue: { fontFamily: "DmSans_700Bold", fontSize: 17 },
  summaryLabel: { fontFamily: "DmSans_400Regular", fontSize: 10, textAlign: "center" },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 38 },
  reviewCard: { marginHorizontal: 16, marginBottom: 22, padding: 16, borderRadius: 14, borderWidth: 1 },
  highlight: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 19, lineHeight: 26 },
  reviewText: { fontFamily: "DmSans_400Regular", fontSize: 14, lineHeight: 21 },
  reviewByline: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 8 },
  vibes: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  vibe: { fontFamily: "DmSans_600SemiBold", fontSize: 11, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  itineraryHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 23 },
  readOnly: { flexDirection: "row", alignItems: "center", gap: 4 },
  readOnlyText: { fontFamily: "DmSans_400Regular", fontSize: 11 },
  daySection: { marginHorizontal: 16, marginBottom: 22 },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  dayNumber: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dayNumberText: { fontFamily: "DmSans_700Bold", fontSize: 15, color: "#fff" },
  dayTitle: { fontFamily: "DmSans_700Bold", fontSize: 16 },
  dayTheme: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 1 },
  activityRow: { flexDirection: "row", alignItems: "stretch", minHeight: 84 },
  activityRail: { width: 22, alignItems: "center" },
  activityDot: { width: 9, height: 9, borderRadius: 5, marginTop: 17, zIndex: 1 },
  activityLine: { position: "absolute", top: 25, bottom: 0, width: 1 },
  activityCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  activityMeta: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 },
  activityTime: { fontFamily: "DmSans_600SemiBold", fontSize: 11 },
  activityCategory: { fontFamily: "DmSans_600SemiBold", fontSize: 10, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  activityName: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 17, lineHeight: 22 },
  activityDescription: { fontFamily: "DmSans_400Regular", fontSize: 12, lineHeight: 17, marginTop: 4 },
  activityCost: { fontFamily: "DmSans_600SemiBold", fontSize: 11, marginTop: 7 },
  emptyDay: { borderRadius: 12, borderWidth: 1, padding: 14, marginLeft: 22 },
  emptyDayText: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  noItinerary: { marginHorizontal: 16, alignItems: "center", borderRadius: 16, borderWidth: 1, padding: 28, gap: 8 },
  noItineraryTitle: { fontFamily: "DmSans_700Bold", fontSize: 16 },
  noItineraryBody: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 19, textAlign: "center" },
  createButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginHorizontal: 16, marginTop: 20, borderRadius: 14, paddingVertical: 14 },
  createButtonText: { fontFamily: "DmSans_700Bold", fontSize: 14, color: "#fff" },
});