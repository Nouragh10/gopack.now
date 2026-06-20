import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  Activity,
  addActivity,
  updateActivity,
  useTrip,
} from "@/hooks/useFirebase";

const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

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
  nightlife: "#FF7043",
  shopping: "#FFB300",
  beach: "#26C6DA",
};

function getTagColor(tag: string) {
  return TAG_COLORS[tag?.toLowerCase() ?? ""] ?? "#9E9E9E";
}

function getDayDate(startDate: string | null | undefined, dayNumber: number): string | null {
  if (!startDate) return null;
  try {
    const d = new Date(startDate + "T00:00:00");
    d.setDate(d.getDate() + dayNumber - 1);
    return d.toISOString().split("T")[0].replace(/-/g, "");
  } catch {
    return null;
  }
}

interface ActivityCardProps {
  activity: Activity;
  actIndex: number;
  dayNumber: number;
  destination: string;
  startDate?: string | null;
  tripId: string;
  colors: any;
  onEdit: (act: Activity, idx: number, day: number) => void;
}

function ActivityCard({ activity, actIndex, dayNumber, destination, startDate, tripId, colors, onEdit }: ActivityCardProps) {
  const tagColor = getTagColor(activity.tag);

  const openMaps = async () => {
    const query = encodeURIComponent(`${activity.name}, ${destination}`);
    const url = `https://maps.google.com/maps?q=${query}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) await Linking.openURL(url);
  };

  const openCalendar = async () => {
    const dateStr = getDayDate(startDate, dayNumber);
    const title = encodeURIComponent(activity.name);
    const details = encodeURIComponent(activity.description);
    const location = encodeURIComponent(destination);
    let url: string;
    if (dateStr) {
      url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}/${dateStr}&details=${details}&location=${location}`;
    } else {
      url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`;
    }
    await Linking.openURL(url);
  };

  return (
    <View style={[styles.actCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.actTagBar, { backgroundColor: tagColor }]} />
      <View style={styles.actContent}>
        <View style={styles.actTop}>
          <Text style={[styles.actTime, { color: colors.mutedForeground }]}>{activity.time}</Text>
          {activity.fromWish && <Feather name="star" size={12} color="#FFA726" />}
          <Pressable onPress={() => onEdit(activity, actIndex, dayNumber)} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <Text style={[styles.actName, { color: colors.foreground }]}>{activity.name}</Text>

        {activity.suggester ? (
          <Text style={[styles.actSuggester, { color: colors.primary }]}>
            {activity.fromWish ? `✦ ${activity.suggester}'s wish` : `✦ ${activity.suggester}`}
          </Text>
        ) : null}

        <Text style={[styles.actDesc, { color: colors.mutedForeground }]} numberOfLines={3}>
          {activity.description}
        </Text>

        {activity.estimatedCost > 0 && (
          <Text style={[styles.actCost, { color: colors.mutedForeground }]}>
            ~${activity.estimatedCost} est. per person
          </Text>
        )}

        <View style={styles.actActions}>
          <Pressable onPress={openMaps} style={[styles.actActionBtn, { borderColor: colors.border }]}>
            <Feather name="map-pin" size={13} color={colors.foreground} />
            <Text style={[styles.actActionText, { color: colors.foreground }]}>Maps</Text>
          </Pressable>
          <Pressable onPress={openCalendar} style={[styles.actActionBtn, { borderColor: colors.border }]}>
            <Feather name="calendar" size={13} color={colors.foreground} />
            <Text style={[styles.actActionText, { color: colors.foreground }]}>Calendar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

interface EditModal {
  dayNumber: number;
  actIndex: number | null;
  name: string;
  time: string;
  description: string;
  estimatedCost: string;
}

export default function ItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trip, loading } = useTrip(id);

  const [selectedDay, setSelectedDay] = useState(1);
  const [editModal, setEditModal] = useState<EditModal | null>(null);
  const [saving, setSaving] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const itinerary = trip?.itinerary;
  const days = itinerary?.days ?? [];
  const currentDay = days.find((d) => d.dayNumber === selectedDay) ?? days[0];
  const members = Object.values(trip?.members ?? {});

  const totalCost = days.reduce(
    (sum, day) => sum + day.activities.reduce((s, a) => s + (a.estimatedCost ?? 0), 0),
    0,
  );

  const handleEdit = (act: Activity, idx: number, dayNum: number) => {
    setEditModal({
      dayNumber: dayNum,
      actIndex: idx,
      name: act.name,
      time: act.time,
      description: act.description,
      estimatedCost: act.estimatedCost > 0 ? String(act.estimatedCost) : "",
    });
  };

  const handleAddActivity = () => {
    const dayNum = currentDay?.dayNumber ?? 1;
    setEditModal({
      dayNumber: dayNum,
      actIndex: null,
      name: "",
      time: "12:00 PM",
      description: "",
      estimatedCost: "",
    });
  };

  const handleSaveEdit = async () => {
    if (!editModal || !id) return;
    if (!editModal.name.trim()) {
      Alert.alert("Name required", "Please enter an activity name.");
      return;
    }
    setSaving(true);
    try {
      const partial: Partial<Activity> = {
        name: editModal.name.trim(),
        time: editModal.time.trim(),
        description: editModal.description.trim(),
        estimatedCost: parseFloat(editModal.estimatedCost) || 0,
      };
      if (editModal.actIndex === null) {
        await addActivity(id, editModal.dayNumber, partial);
      } else {
        await updateActivity(id, editModal.dayNumber, editModal.actIndex, partial);
      }
    } finally {
      setSaving(false);
      setEditModal(null);
    }
  };

  const handleShare = async () => {
    if (!trip || !itinerary) return;
    const lines = [
      `🗺 ${itinerary.title}`,
      `📍 ${trip.destination} · ${trip.days} days`,
      "",
      ...days.flatMap((day) => [
        `── Day ${day.dayNumber}: ${day.city} ──`,
        day.theme,
        ...day.activities.map(
          (a) =>
            `${a.time}  ${a.name}${a.estimatedCost > 0 ? ` (~$${a.estimatedCost})` : ""}`,
        ),
        "",
      ]),
      totalCost > 0 ? `💰 Estimated total: ~$${totalCost}/person` : "",
      "Built with GoPack 🎒",
    ].filter(Boolean);

    await Share.share({ message: lines.join("\n") });
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          Loading itinerary…
        </Text>
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
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={[styles.headerLabel, { color: colors.primary }]}>YOUR GOPACK ITINERARY</Text>
            <Text style={[styles.headerDest, { color: colors.foreground }]} numberOfLines={1}>
              {trip.destination}
            </Text>
          </View>
          <Pressable onPress={handleShare} style={styles.shareBtn}>
            <Feather name="share" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        {members.length > 0 && (
          <View style={styles.membersRow}>
            {members.slice(0, 5).map((m, i) => (
              <View
                key={i}
                style={[
                  styles.memberAvatar,
                  { backgroundColor: MEMBER_COLORS[i % MEMBER_COLORS.length], marginLeft: i > 0 ? -8 : 0 },
                ]}
              >
                <Text style={styles.memberInitial}>{m.name[0].toUpperCase()}</Text>
              </View>
            ))}
            <Text style={[styles.membersLabel, { color: colors.mutedForeground }]}>
              {"  "}
              {members.map((m) => m.name).join(", ")}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.dayScrollWrap, { borderBottomColor: colors.border }]}
        contentContainerStyle={styles.dayScroll}
      >
        {days.map((day) => {
          const isSelected = day.dayNumber === selectedDay;
          return (
            <Pressable
              key={day.dayNumber}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDay(day.dayNumber);
              }}
              style={[
                styles.dayChip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.muted,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.dayChipText, { color: isSelected ? "#fff" : colors.foreground }]}>
                Day {day.dayNumber}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: bottomInset + 20 }}
      >
        {currentDay && (
          <>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayCity, { color: colors.foreground }]}>{currentDay.city}</Text>
              <Text style={[styles.dayTheme, { color: colors.mutedForeground }]}>{currentDay.theme}</Text>
            </View>
            {currentDay.activities.map((act, i) => (
              <ActivityCard
                key={i}
                activity={act}
                actIndex={i}
                dayNumber={currentDay.dayNumber}
                destination={trip.destination}
                startDate={trip.startDate}
                tripId={id!}
                colors={colors}
                onEdit={handleEdit}
              />
            ))}
            <Pressable
              onPress={handleAddActivity}
              style={[styles.addActBtn, { borderColor: colors.border }]}
            >
              <Feather name="plus" size={16} color={colors.mutedForeground} />
              <Text style={[styles.addActText, { color: colors.mutedForeground }]}>Add activity</Text>
            </Pressable>
          </>
        )}

        {totalCost > 0 && (
          <View style={[styles.costCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="dollar-sign" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.costLabel, { color: colors.mutedForeground }]}>
                ESTIMATED TOTAL (ALL DAYS)
              </Text>
              <Text style={[styles.costValue, { color: colors.foreground }]}>
                ~${totalCost} per person
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomInset, borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => router.push(`/packing/${id}`)}
          style={[styles.footerBtn, { borderColor: colors.border }]}
        >
          <Feather name="package" size={15} color={colors.foreground} />
          <Text style={[styles.footerBtnText, { color: colors.foreground }]}>Packing</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push(`/chat/${id}`)}
          style={[styles.footerBtn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
        >
          <Feather name="message-circle" size={15} color="#fff" />
          <Text style={[styles.footerBtnText, { color: "#fff" }]}>Pack chat</Text>
        </Pressable>
      </View>

      <Modal
        visible={editModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModal(null)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.modalOverlay} onPress={() => { Keyboard.dismiss(); setEditModal(null); }}>
            <Pressable
              style={[styles.editSheet, { backgroundColor: colors.card }]}
              onPress={() => {}}
            >
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                {editModal?.actIndex === null ? "Add activity" : "Edit activity"}
              </Text>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Activity name</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="e.g. Sunset hike"
                value={editModal?.name ?? ""}
                onChangeText={(t) => setEditModal((prev) => prev ? { ...prev, name: t } : prev)}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Time</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="e.g. 10:00 AM"
                value={editModal?.time ?? ""}
                onChangeText={(t) => setEditModal((prev) => prev ? { ...prev, time: t } : prev)}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Description</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldMultiline, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="Brief description..."
                value={editModal?.description ?? ""}
                multiline
                numberOfLines={3}
                onChangeText={(t) => setEditModal((prev) => prev ? { ...prev, description: t } : prev)}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Est. cost ($)</Text>
              <TextInput
                style={[styles.fieldInput, { backgroundColor: colors.muted, color: colors.foreground }]}
                placeholderTextColor={colors.mutedForeground}
                placeholder="0"
                keyboardType="numeric"
                value={editModal?.estimatedCost ?? ""}
                onChangeText={(t) => setEditModal((prev) => prev ? { ...prev, estimatedCost: t } : prev)}
              />

              <View style={styles.sheetBtns}>
                <Pressable
                  onPress={() => setEditModal(null)}
                  style={[styles.sheetCancelBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.sheetCancelText, { color: colors.foreground }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={handleSaveEdit}
                  disabled={saving}
                  style={[styles.sheetSaveBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.sheetSaveText}>{saving ? "Saving…" : "Save"}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  header: { paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  backBtn: { padding: 4, marginTop: 2 },
  headerTitles: { flex: 1, gap: 4 },
  headerLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 2 },
  headerDest: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 24, letterSpacing: -0.5 },
  shareBtn: { padding: 4, marginTop: 2 },
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 12,
    flexWrap: "wrap",
  },
  memberAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  memberInitial: { fontFamily: "DmSans_700Bold", fontSize: 11, color: "#fff" },
  membersLabel: { fontFamily: "DmSans_400Regular", fontSize: 12, flexShrink: 1 },
  dayScrollWrap: { maxHeight: 56, borderBottomWidth: 1 },
  dayScroll: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: "row" },
  dayChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  dayChipText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  dayHeader: { paddingVertical: 14 },
  dayCity: { fontFamily: "DmSans_600SemiBold", fontSize: 18, marginBottom: 2 },
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
  editBtn: { marginLeft: "auto", padding: 2 },
  actName: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  actSuggester: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  actDesc: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18 },
  actCost: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  actActions: { flexDirection: "row", gap: 8, marginTop: 6 },
  actActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  actActionText: { fontFamily: "DmSans_500Medium", fontSize: 12 },
  addActBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  addActText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  costCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  costLabel: { fontFamily: "DmSans_500Medium", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 },
  costValue: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
  },
  footerBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  editSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    gap: 8,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: "center", marginBottom: 12,
  },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20, marginBottom: 8 },
  fieldLabel: { fontFamily: "DmSans_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginTop: 4 },
  fieldInput: {
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    fontFamily: "DmSans_400Regular", fontSize: 15,
  },
  fieldMultiline: { minHeight: 80, paddingTop: 11, textAlignVertical: "top" },
  sheetBtns: { flexDirection: "row", gap: 10, marginTop: 12 },
  sheetCancelBtn: {
    flex: 1, alignItems: "center", borderWidth: 1, borderRadius: 12, paddingVertical: 13,
  },
  sheetCancelText: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  sheetSaveBtn: { flex: 1, alignItems: "center", borderRadius: 12, paddingVertical: 13 },
  sheetSaveText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
});
