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
import {
  savePackingList,
  togglePackItem,
  usePackingList,
  useTrip,
} from "@/hooks/useFirebase";

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  essentials: { label: "Essentials", icon: "shield" },
  clothing: { label: "Clothing", icon: "wind" },
  toiletries: { label: "Toiletries", icon: "droplet" },
  tech: { label: "Tech & Gadgets", icon: "cpu" },
  activities: { label: "Activity Gear", icon: "activity" },
  tips: { label: "Pro Tips", icon: "zap" },
};

const CATEGORY_ORDER = ["essentials", "clothing", "toiletries", "tech", "activities", "tips"];

export default function PackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trip } = useTrip(id);
  const { packingList, loading } = usePackingList(id);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const handleGenerate = async () => {
    if (!trip || !id) return;
    setGenerating(true);
    setGenError(null);
    try {
      const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`;
      const res = await fetch(`${baseUrl}/api/packing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination: trip.destination,
          days: trip.days,
          vibes: trip.vibes ?? [],
          budget: trip.budget ?? "midrange",
        }),
      });
      if (!res.ok) throw new Error("Server error. Please try again.");
      const data = await res.json() as { list: Record<string, string[]> };
      await savePackingList(id, data.list);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      setGenError((e as Error).message || "Failed to generate packing list.");
    } finally {
      setGenerating(false);
    }
  };

  const handleToggle = async (category: string, index: number, checked: boolean) => {
    if (!id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await togglePackItem(id, category, index, checked);
  };

  const totalItems = packingList
    ? Object.entries(packingList)
        .filter(([cat]) => cat !== "tips")
        .reduce((sum, [, items]) => sum + (items?.length ?? 0), 0)
    : 0;

  const checkedItems = packingList
    ? Object.entries(packingList)
        .filter(([cat]) => cat !== "tips")
        .reduce((sum, [, items]) => sum + (items?.filter((i) => i.checked)?.length ?? 0), 0)
    : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={[styles.headerLabel, { color: colors.primary }]}>PACKING LIST</Text>
          <Text style={[styles.headerDest, { color: colors.foreground }]} numberOfLines={1}>
            {trip?.destination ?? "…"}
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : !packingList ? (
        <View style={styles.center}>
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="package" size={40} color={colors.primary} style={{ marginBottom: 12 }} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              No packing list yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Let AI build a smart packing list tailored to {trip?.destination ?? "your trip"} and your vibes.
            </Text>
            {genError && (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{genError}</Text>
            )}
            <Pressable
              onPress={handleGenerate}
              disabled={generating}
              style={[styles.genBtn, { backgroundColor: colors.primary }]}
            >
              {generating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Feather name="zap" size={18} color="#fff" />
              )}
              <Text style={styles.genBtnText}>
                {generating ? "Generating…" : "Generate packing list"}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <>
          {totalItems > 0 && (
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.primary, width: `${(checkedItems / totalItems) * 100}%` as any },
                ]}
              />
              <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
                {checkedItems}/{totalItems} packed
              </Text>
            </View>
          )}

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 20 }}
          >
            {CATEGORY_ORDER.filter((cat) => packingList[cat]?.length > 0).map((cat) => {
              const meta = CATEGORY_META[cat] ?? { label: cat, icon: "list" };
              const items = packingList[cat] ?? [];
              const isTips = cat === "tips";

              return (
                <View key={cat} style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Feather name={meta.icon as any} size={15} color={colors.primary} />
                    <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                      {meta.label}
                    </Text>
                  </View>

                  {items.map((item, idx) => (
                    isTips ? (
                      <View
                        key={idx}
                        style={[styles.tipRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <Feather name="zap" size={13} color={colors.primary} />
                        <Text style={[styles.tipText, { color: colors.foreground }]}>
                          {typeof item === "string" ? item : item.text}
                        </Text>
                      </View>
                    ) : (
                      <Pressable
                        key={idx}
                        onPress={() => handleToggle(cat, idx, !item.checked)}
                        style={[
                          styles.itemRow,
                          { borderBottomColor: colors.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.checkbox,
                            {
                              borderColor: item.checked ? colors.primary : colors.border,
                              backgroundColor: item.checked ? colors.primary : "transparent",
                            },
                          ]}
                        >
                          {item.checked && <Feather name="check" size={13} color="#fff" />}
                        </View>
                        <Text
                          style={[
                            styles.itemText,
                            {
                              color: item.checked ? colors.mutedForeground : colors.foreground,
                              textDecorationLine: item.checked ? "line-through" : "none",
                            },
                          ]}
                        >
                          {item.text}
                        </Text>
                      </Pressable>
                    )
                  ))}
                </View>
              );
            })}

            <Pressable
              onPress={handleGenerate}
              disabled={generating}
              style={[styles.regenBtn, { borderColor: colors.border }]}
            >
              {generating ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Feather name="refresh-cw" size={15} color={colors.mutedForeground} />
              )}
              <Text style={[styles.regenText, { color: colors.mutedForeground }]}>
                Regenerate list
              </Text>
            </Pressable>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitles: { flex: 1, gap: 4 },
  headerLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 2 },
  headerDest: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, letterSpacing: -0.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 18, marginBottom: 4 },
  emptyText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  errorText: { fontFamily: "DmSans_400Regular", fontSize: 13, textAlign: "center" },
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    marginTop: 8,
  },
  genBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
  progressBar: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  progressFill: { position: "absolute", left: 0, top: 0, bottom: 0 },
  progressText: {
    fontFamily: "DmSans_500Medium",
    fontSize: 12,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  section: { marginTop: 20 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: { fontFamily: "DmSans_400Regular", fontSize: 15, flex: 1 },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 6,
  },
  tipText: { fontFamily: "DmSans_400Regular", fontSize: 14, flex: 1, lineHeight: 20 },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 24,
  },
  regenText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
});
