import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
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
import {
  useRecentWishes,
  useTrips,
  type ProfileWish,
  type Trip,
} from "@/hooks/useFirebase";

type SavedSection = "activities" | "stays";

function isCompletedTrip(trip: Trip) {
  if (!trip.startDate) return false;
  const start = new Date(`${trip.startDate}T00:00:00`);
  const end = trip.endDate
    ? new Date(`${trip.endDate}T23:59:59`)
    : new Date(start.getTime() + Math.max((trip.days || 1) - 1, 0) * 86400000 + 86399999);
  return end <= new Date();
}

function formatDate(date: string | null | undefined) {
  if (!date) return "Date not set";
  const parsed = new Date(`${date}T00:00:00`);
  return Number.isNaN(parsed.getTime())
    ? "Date not set"
    : parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatStayType(type: string | undefined) {
  if (!type || type === "no_preference") return "Stay";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function SavedTabs({
  section,
  onChange,
  colors,
}: {
  section: SavedSection;
  onChange: (next: SavedSection) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.tabs, { backgroundColor: colors.muted }]}>
      {(["activities", "stays"] as const).map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          style={[
            styles.tab,
            section === item && { backgroundColor: colors.card, shadowColor: "#000" },
          ]}
          accessibilityRole="tab"
          accessibilityState={{ selected: section === item }}
        >
          <Feather
            name={item === "activities" ? "activity" : "home"}
            size={15}
            color={section === item ? colors.primary : colors.mutedForeground}
          />
          <Text style={[styles.tabText, { color: section === item ? colors.foreground : colors.mutedForeground }]}>
            {item === "activities" ? "Activities" : "Stays"}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function ActivityRow({
  wish,
  trip,
  colors,
}: {
  wish: ProfileWish;
  trip: Trip | undefined;
  colors: ReturnType<typeof useColors>;
}) {
  const memberCount = Math.max(Object.keys(trip?.members ?? {}).length, 1);
  const upvotes = Object.keys(wish.upvoters ?? {}).length;
  const upvotePercent = Math.min(100, Math.round((upvotes / memberCount) * 100));

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.primary + "14" }]}>
        <Feather name="activity" size={17} color={colors.primary} />
      </View>
      <View style={styles.cardCopy}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{wish.text}</Text>
        <Text style={[styles.cardTrip, { color: colors.mutedForeground }]}>
          {wish.tripDestination} · Suggested on {formatDate(new Date(wish.createdAt).toISOString().slice(0, 10))}
        </Text>
        <View style={styles.voteLine}>
          <View style={[styles.voteTrack, { backgroundColor: colors.muted }]}>
            <View style={[styles.voteFill, { width: `${upvotePercent}%`, backgroundColor: colors.primary }]} />
          </View>
          <Text style={[styles.voteText, { color: colors.primary }]}>
            {upvotePercent}% upvoted
          </Text>
        </View>
        <Text style={[styles.voteMeta, { color: colors.mutedForeground }]}>
          {upvotes} of {memberCount} {memberCount === 1 ? "traveler" : "travelers"} in the pack voted yes
        </Text>
      </View>
    </View>
  );
}

export default function SavedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ section?: string }>();
  const initialSection: SavedSection = params.section === "stays" ? "stays" : "activities";
  const [section, setSection] = React.useState<SavedSection>(initialSection);
  const { trips, loading: tripsLoading } = useTrips(user?.uid);
  const tripIds = useMemo(() => trips.map((trip) => trip.id), [trips]);
  const { wishes, loading: wishesLoading } = useRecentWishes(user?.uid, tripIds);

  const stays = useMemo(
    () =>
      trips
        .filter((trip) => isCompletedTrip(trip) && trip.confirmedAccommodation)
        .sort((a, b) => String(b.startDate ?? "").localeCompare(String(a.startDate ?? ""))),
    [trips],
  );
  const tripById = useMemo(() => new Map(trips.map((trip) => [trip.id, trip])), [trips]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 24;
  const loading = tripsLoading || (section === "activities" && wishesLoading);

  const changeSection = (next: SavedSection) => {
    setSection(next);
    router.setParams({ section: next });
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Back to profile"
        >
          <Feather name="arrow-left" size={21} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.eyebrow, { color: colors.mutedForeground }]}>SAVED</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {section === "activities" ? "Activities" : "Stays"}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomInset }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <SavedTabs section={section} onChange={changeSection} colors={colors} />
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {section === "activities"
              ? "Every activity you suggested, with the pack's vote behind it."
              : "Places you've actually stayed at on completed Packyo trips."}
          </Text>

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : section === "activities" ? (
            wishes.length === 0 ? (
              <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="activity" size={26} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No suggested activities yet</Text>
                <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                  Add a wish to a trip and it will be saved here with the pack's response.
                </Text>
              </View>
            ) : (
              wishes.map((wish) => (
                <ActivityRow key={`${wish.tripId}-${wish.id}`} wish={wish} trip={tripById.get(wish.tripId)} colors={colors} />
              ))
            )
          ) : stays.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="home" size={26} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No stays yet</Text>
              <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                Confirmed accommodations will appear here after you return from a trip.
              </Text>
            </View>
          ) : (
            stays.map((trip) => (
              <Pressable
                key={trip.id}
                onPress={() => router.push(`/trip/${trip.id}` as any)}
                style={({ pressed }) => [
                  styles.card,
                  { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.78 : 1 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Open stay in ${trip.destination}`}
              >
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + "14" }]}>
                  <Feather name="home" size={17} color={colors.primary} />
                </View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                    {trip.confirmedAccommodation?.name ?? "Completed stay"}
                  </Text>
                  <Text style={[styles.cardTrip, { color: colors.mutedForeground }]}>
                    {trip.destination} · {formatDate(trip.startDate)}
                  </Text>
                  <Text style={[styles.stayMeta, { color: colors.mutedForeground }]}>
                    {formatStayType(trip.confirmedAccommodation?.type)}
                    {trip.confirmedAccommodation?.rating ? ` · ★ ${trip.confirmedAccommodation.rating.toFixed(1)}` : ""}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: { padding: 4, marginRight: 11 },
  headerCopy: { gap: 1 },
  eyebrow: { fontFamily: "DmSans_700Bold", fontSize: 10, letterSpacing: 1.2 },
  title: { fontFamily: "DmSans_700Bold", fontSize: 23 },
  content: { padding: 16 },
  tabs: { flexDirection: "row", padding: 4, borderRadius: 14, gap: 4 },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  tabText: { fontFamily: "DmSans_700Bold", fontSize: 13 },
  description: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 19, marginTop: 14, marginBottom: 13 },
  loading: { paddingVertical: 70, alignItems: "center" },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    marginBottom: 10,
    gap: 11,
  },
  iconWrap: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: "DmSans_700Bold", fontSize: 15, lineHeight: 20 },
  cardTrip: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: 3 },
  stayMeta: { fontFamily: "DmSans_500Medium", fontSize: 12, marginTop: 6 },
  voteLine: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 11 },
  voteTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  voteFill: { height: "100%", borderRadius: 3 },
  voteText: { fontFamily: "DmSans_700Bold", fontSize: 12, minWidth: 83, textAlign: "right" },
  voteMeta: { fontFamily: "DmSans_400Regular", fontSize: 11, marginTop: 5 },
  empty: { alignItems: "center", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 30, marginTop: 6 },
  emptyTitle: { fontFamily: "DmSans_700Bold", fontSize: 16, marginTop: 12 },
  emptyBody: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6, maxWidth: 290 },
});