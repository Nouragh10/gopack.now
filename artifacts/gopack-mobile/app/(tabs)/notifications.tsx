import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { useAuth } from "@/context/AuthContext";
import { useNotifications, AppNotification } from "@/hooks/useFirebase";

/* ── Icon config per notification type ─────────────────────────── */
const TYPE_META: Record<
  AppNotification["type"],
  { icon: string; bg: string; label: string }
> = {
  itinerary_ready:  { icon: "map",           bg: "#4CAF50", label: "Trips" },
  accom_vote:       { icon: "home",           bg: "#E85D3A", label: "Trips" },
  dest_vote:        { icon: "navigation",     bg: "#7E57C2", label: "Trips" },
  votes_complete:   { icon: "check-circle",   bg: "#4CAF50", label: "Trips" },
  dest_confirmed:   { icon: "flag",           bg: "#F59E0B", label: "Trips" },
  new_member:       { icon: "user-plus",      bg: "#2196F3", label: "Trips" },
  chat:             { icon: "message-circle", bg: "#7E57C2", label: "Mentions" },
  invite:           { icon: "user-plus",      bg: "#E85D3A", label: "Trips" },
};

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

const TABS = ["All", "Trips", "Mentions"] as const;
type Tab = (typeof TABS)[number];

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("All");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  const { notifications, loading } = useNotifications(user?.uid);

  const visible =
    activeTab === "All"
      ? notifications
      : notifications.filter(
          (n) => TYPE_META[n.type]?.label === activeTab
        );

  function handlePress(n: AppNotification) {
    if (n.type === "accom_vote") {
      router.push({ pathname: "/accommodation-vote/[id]", params: { id: n.tripId } } as any);
    } else if (n.type === "dest_vote") {
      router.push({ pathname: "/destination-vote/[id]", params: { id: n.tripId } } as any);
    } else if (n.type === "itinerary_ready") {
      router.push({ pathname: "/itinerary/[id]", params: { id: n.tripId } } as any);
    } else if (n.type === "chat") {
      router.push({ pathname: "/chat/[id]", params: { id: n.tripId } } as any);
    } else {
      router.push({ pathname: "/trip/[id]", params: { id: n.tripId } } as any);
    }
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: activeTab === tab ? colors.foreground : colors.mutedForeground },
                activeTab === tab && { fontFamily: "DmSans_700Bold" },
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Body */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#E85D3A" />
        </View>
      ) : !user ? (
        <View style={styles.center}>
          <Feather name="bell-off" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sign in to see notifications</Text>
        </View>
      ) : visible.length === 0 ? (
        <View style={styles.center}>
          <Feather name="bell" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>All caught up</Text>
          <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
            No notifications yet — join or create a trip to get started.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: bottomInset, paddingTop: 4 }}
        >
          {visible.map((n) => {
            const meta = TYPE_META[n.type];
            return (
              <Pressable
                key={n.id}
                onPress={() => handlePress(n)}
                style={({ pressed }) => [
                  styles.row,
                  { borderBottomColor: colors.border },
                  pressed && { opacity: 0.7 },
                ]}
              >
                {/* Icon */}
                <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
                  <Feather name={meta.icon as any} size={16} color="#fff" />
                </View>

                {/* Content */}
                <View style={styles.content}>
                  <View style={styles.topRow}>
                    <Text style={[styles.noteTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {n.text}
                    </Text>
                    <Text style={[styles.time, { color: colors.mutedForeground }]}>
                      {timeAgo(n.timestamp)}
                    </Text>
                  </View>
                  {n.subtext ? (
                    <Text style={[styles.subtext, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {n.subtext}
                    </Text>
                  ) : null}
                  {/* Trip label chip */}
                  <View style={[styles.tripChip, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.tripChipText, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {n.tripName}
                    </Text>
                  </View>
                  {/* CTA for actionable items */}
                  {n.actionable && (
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => handlePress(n)}
                        style={[styles.solidBtn, { backgroundColor: colors.primary }]}
                      >
                        <Text style={styles.solidBtnText}>Vote now</Text>
                      </Pressable>
                    </View>
                  )}
                </View>

                {/* Chevron */}
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 16 },
  title: { fontFamily: "DmSans_700Bold", fontSize: 28 },

  tabs: {
    flexDirection: "row",
    paddingHorizontal: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: { marginRight: 24, paddingVertical: 12 },
  tabText: { fontFamily: "DmSans_500Medium", fontSize: 15 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: { fontFamily: "DmSans_700Bold", fontSize: 18 },
  emptyBody: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  content: { flex: 1 },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 4,
  },
  noteTitle: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 15,
    flex: 1,
  },
  time: { fontFamily: "DmSans_400Regular", fontSize: 12, flexShrink: 0, paddingTop: 2 },
  subtext: {
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  tripChip: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  tripChipText: { fontFamily: "DmSans_500Medium", fontSize: 11 },
  actions: { marginTop: 8 },
  solidBtn: {
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  solidBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13, color: "#fff" },
});
