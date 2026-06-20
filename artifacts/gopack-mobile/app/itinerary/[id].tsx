import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { useColors } from "@/hooks/useColors";
import { Activity, useTrip } from "@/hooks/useFirebase";

const TAG_COLORS: Record<string, string> = {
  food: "#E85D3A",
  dining: "#E85D3A",
  culture: "#9C5544",
  museum: "#9C5544",
  art: "#9C5544",
  adventure: "#4CAF50",
  outdoor: "#4CAF50",
  nature: "#26A69A",
  transport: "#42A5F5",
  accommodation: "#7E57C2",
  hotel: "#7E57C2",
  relax: "#AB7ACA",
  wellness: "#AB7ACA",
};

function getTagColor(tag: string) {
  const lower = tag?.toLowerCase() ?? "";
  return TAG_COLORS[lower] ?? "#9E9E9E";
}

function ActivityCard({ activity, colors }: { activity: Activity; colors: any }) {
  const tagColor = getTagColor(activity.tag);
  return (
    <View style={[styles.actCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.actTagBar, { backgroundColor: tagColor }]} />
      <View style={styles.actContent}>
        <View style={styles.actTop}>
          <Text style={[styles.actTime, { color: colors.mutedForeground }]}>{activity.time}</Text>
          {activity.fromWish && (
            <Feather name="star" size={12} color="#FFA726" />
          )}
        </View>
        <Text style={[styles.actName, { color: colors.foreground }]}>{activity.name}</Text>
        <Text style={[styles.actDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
          {activity.description}
        </Text>
        {activity.estimatedCost > 0 && (
          <Text style={[styles.actCost, { color: colors.mutedForeground }]}>
            ~${activity.estimatedCost}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trip, loading } = useTrip(id);

  const [selectedDay, setSelectedDay] = useState(1);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const itinerary = trip?.itinerary;
  const days = itinerary?.days ?? [];
  const currentDay = days.find((d) => d.dayNumber === selectedDay) ?? days[0];

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!trip || !itinerary) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No itinerary yet.</Text>
        <Pressable onPress={() => router.back()} style={[styles.backLink, { borderColor: colors.border }]}>
          <Text style={[styles.backLinkText, { color: colors.foreground }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerLabel, { color: colors.primary }]}>YOUR GOPACK ITINERARY</Text>
          <Text style={[styles.headerDest, { color: colors.foreground }]}>{trip.destination}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.dayScrollWrap}
        contentContainerStyle={styles.dayScroll}
      >
        {days.map((day) => (
          <Pressable
            key={day.dayNumber}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSelectedDay(day.dayNumber); }}
            style={[
              styles.dayChip,
              {
                backgroundColor: day.dayNumber === selectedDay ? colors.foreground : colors.muted,
                borderColor: day.dayNumber === selectedDay ? colors.foreground : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.dayChipText,
                { color: day.dayNumber === selectedDay ? colors.background : colors.mutedForeground },
              ]}
            >
              Day {day.dayNumber}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset }}
      >
        {currentDay && (
          <>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayCity, { color: colors.foreground }]}>{currentDay.city}</Text>
              <Text style={[styles.dayTheme, { color: colors.mutedForeground }]}>{currentDay.theme}</Text>
            </View>
            {currentDay.activities.map((act, i) => (
              <ActivityCard key={i} activity={act} colors={colors} />
            ))}
          </>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset, borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => router.push(`/trip/${id}`)}
          style={[styles.footerBtn, { borderColor: colors.border }]}
        >
          <Text style={[styles.footerBtnText, { color: colors.foreground }]}>Back to trip</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/chat/${id}`)}
          style={[styles.footerBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
        >
          <Text style={[styles.footerBtnText, { color: "#fff" }]}>Pack chat</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  backBtn: { padding: 4, marginBottom: 8 },
  headerTitles: { gap: 4 },
  headerLabel: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
  },
  headerDest: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, letterSpacing: -0.5 },
  dayScrollWrap: { maxHeight: 52 },
  dayScroll: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexDirection: "row" },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayChipText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  dayHeader: { paddingVertical: 14 },
  dayCity: { fontFamily: "DmSans_700Bold", fontSize: 18, marginBottom: 2 },
  dayTheme: { fontFamily: "DmSans_400Regular", fontSize: 14 },
  actCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  actTagBar: { width: 4 },
  actContent: { flex: 1, padding: 14, gap: 4 },
  actTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  actTime: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  actName: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  actDesc: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18 },
  actCost: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  emptyText: { fontFamily: "DmSans_400Regular", fontSize: 15 },
  backLink: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  backLinkText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  footerBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
});
