import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const MEMBER_COLORS = ["#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5", "#E85D3A"];

const MOCK_NOTIFICATIONS = [
  { id: "1", text: "Alex added a wish to Tokyo Trip", time: "2m ago", colorIdx: 0, isNew: true },
  { id: "2", text: "Sam voted on your wish", time: "15m ago", colorIdx: 1, isNew: true },
  { id: "3", text: "Jordan joined Tokyo Trip", time: "1h ago", colorIdx: 2, isNew: false },
  { id: "4", text: "Your itinerary is ready", time: "3h ago", colorIdx: 5, isNew: false },
  { id: "5", text: "Maria sent a message in Pack chat", time: "5h ago", colorIdx: 3, isNew: false },
];

function NotifItem({ text, time, colorIdx }: { text: string; time: string; colorIdx: number }) {
  const colors = useColors();
  const bg = MEMBER_COLORS[colorIdx % MEMBER_COLORS.length];
  return (
    <View style={[styles.item, { borderBottomColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: bg }]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemText, { color: colors.foreground }]}>{text}</Text>
        <Text style={[styles.itemTime, { color: colors.mutedForeground }]}>{time}</Text>
      </View>
    </View>
  );
}

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  const newNotifs = MOCK_NOTIFICATIONS.filter((n) => n.isNew);
  const earlier = MOCK_NOTIFICATIONS.filter((n) => !n.isNew);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
          <Text style={styles.badgeText}>{newNotifs.length}</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: bottomInset }}>
        {newNotifs.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>New</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {newNotifs.map((n) => (
                <NotifItem key={n.id} text={n.text} time={n.time} colorIdx={n.colorIdx} />
              ))}
            </View>
          </View>
        )}

        {earlier.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Earlier</Text>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {earlier.map((n) => (
                <NotifItem key={n.id} text={n.text} time={n.time} colorIdx={n.colorIdx} />
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    letterSpacing: -0.5,
  },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontFamily: "DmSans_700Bold", fontSize: 12, color: "#fff" },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionLabel: {
    fontFamily: "DmSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  dot: { width: 40, height: 40, borderRadius: 20 },
  itemText: { fontFamily: "DmSans_500Medium", fontSize: 14, marginBottom: 3 },
  itemTime: { fontFamily: "DmSans_400Regular", fontSize: 12 },
});
