import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { createTrip, joinTrip, setCollectingPreferences } from "@/hooks/useFirebase";

const VIBES = [
  "Adventure", "Culture", "Food", "Beach",
  "Nature", "City", "Nightlife", "Relaxation",
  "History", "Art", "Shopping", "Wellness",
];

const BUDGETS = ["Budget", "Midrange", "Luxury"] as const;

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [knowDestination, setKnowDestination] = useState(true);
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(5);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [budget, setBudget] = useState<"Budget" | "Midrange" | "Luxury">("Midrange");
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;

  const toggleVibe = (v: string) => {
    setSelectedVibes((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
    );
  };

  const handleCreate = async () => {
    if (knowDestination && !destination.trim()) { setError("Enter a destination."); return; }
    if (selectedVibes.length === 0) { setError("Pick at least one vibe."); return; }
    if (!user) { setError("You must be signed in to create a trip."); return; }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const tripId = await createTrip({
        destination: destination.trim(),
        days,
        vibes: selectedVibes,
        budget: budget.toLowerCase(),
        startDate: startDate ? toISODate(startDate) : null,
        uid: user.uid,
        displayName: user.displayName ?? "Traveler",
      });
      router.push(`/trip/${tripId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Could not create trip: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggest = async () => {
    if (!user) { setError("You must be signed in."); return; }
    setError("");
    setSuggesting(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const tripId = await createTrip({
        destination: "",
        days: 5,
        vibes: [],
        budget: "midrange",
        startDate: null,
        uid: user.uid,
        displayName: user.displayName ?? "Traveler",
      });
      await setCollectingPreferences(tripId, true);
      router.push(`/destination-preferences/${tripId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSuggesting(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !user) return;
    setJoinLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const tripId = await joinTrip(joinCode.trim(), user.uid, user.displayName ?? "Traveler");
      router.push(`/trip/${tripId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Invalid invite code: ${msg}`);
    } finally {
      setJoinLoading(false);
    }
  };

  const minDate = new Date();
  const isLoading = loading || suggesting;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottomInset }}
      >
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.headline, { color: colors.foreground }]}>
            Your group.{"\n"}One trip.
          </Text>
        </View>

        <View style={styles.form}>
          {/* Destination mode toggle */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Do you know where you're going?</Text>
            <View style={[styles.toggle, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Pressable
                onPress={() => { setKnowDestination(true); Haptics.selectionAsync(); }}
                style={[styles.toggleBtn, knowDestination && { backgroundColor: colors.primary }]}
              >
                <Feather name="map-pin" size={14} color={knowDestination ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.toggleText, { color: knowDestination ? "#fff" : colors.mutedForeground }]}>
                  Yes, we've decided
                </Text>
              </Pressable>
              <Pressable
                onPress={() => { setKnowDestination(false); Haptics.selectionAsync(); }}
                style={[styles.toggleBtn, !knowDestination && { backgroundColor: colors.primary }]}
              >
                <Feather name="zap" size={14} color={!knowDestination ? "#fff" : colors.mutedForeground} />
                <Text style={[styles.toggleText, { color: !knowDestination ? "#fff" : colors.mutedForeground }]}>
                  Help us pick
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Destination input OR distance picker */}
          {knowDestination ? (
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Destination</Text>
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="map-pin" size={16} color={colors.primary} />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="Tokyo, Paris, Bali..."
                  placeholderTextColor={colors.mutedForeground}
                  value={destination}
                  onChangeText={setDestination}
                  returnKeyType="done"
                />
              </View>
            </View>
          ) : (
            <View style={styles.suggestBlock}>
              <View style={[styles.suggestBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                <Feather name="zap" size={14} color={colors.primary} />
                <Text style={[styles.suggestBadgeText, { color: colors.primary }]}>
                  AI will suggest 3 destinations for your group to vote on
                </Text>
              </View>

            </View>
          )}

          {knowDestination && <>
            {/* Start Date */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Start Date</Text>
              {Platform.OS === "web" ? (
                <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="calendar" size={16} color={colors.primary} />
                  <TextInput
                    style={[styles.input, { color: colors.foreground }]}
                    placeholder="YYYY-MM-DD (optional)"
                    placeholderTextColor={colors.mutedForeground}
                    value={startDate ? toISODate(startDate) : ""}
                    onChangeText={(t) => {
                      if (!t) { setStartDate(null); return; }
                      const d = new Date(t);
                      if (!isNaN(d.getTime())) setStartDate(d);
                    }}
                    returnKeyType="done"
                  />
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Feather name="calendar" size={16} color={colors.primary} />
                    <Text style={[styles.input, { color: startDate ? colors.foreground : colors.mutedForeground, paddingVertical: 0 }]}>
                      {startDate ? formatDate(startDate) : "Optional — pick a start date"}
                    </Text>
                    {startDate && (
                      <Pressable onPress={() => setStartDate(null)}>
                        <Feather name="x" size={16} color={colors.mutedForeground} />
                      </Pressable>
                    )}
                  </Pressable>
                  <Modal visible={showDatePicker} transparent animationType="slide" onRequestClose={() => setShowDatePicker(false)}>
                    <Pressable style={styles.dateModalOverlay} onPress={() => setShowDatePicker(false)}>
                      <View style={[styles.dateModalSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={styles.dateModalHeader}>
                          <Text style={[styles.dateModalTitle, { color: colors.foreground }]}>Select start date</Text>
                          <Pressable onPress={() => setShowDatePicker(false)}>
                            <Text style={[styles.dateModalDone, { color: colors.primary }]}>Done</Text>
                          </Pressable>
                        </View>
                        <DateTimePicker
                          value={startDate ?? minDate}
                          mode="date"
                          display="spinner"
                          minimumDate={minDate}
                          onChange={(_e, d) => { if (d) setStartDate(d); }}
                          style={{ width: "100%" }}
                          textColor={colors.foreground}
                        />
                      </View>
                    </Pressable>
                  </Modal>
                </>
              )}
            </View>

            {/* Days */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Duration</Text>
              <View style={styles.daysRow}>
                <Pressable onPress={() => setDays((d) => Math.max(1, d - 1))} style={[styles.dayBtn, { borderColor: colors.border }]}>
                  <Feather name="minus" size={18} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.daysNum, { color: colors.foreground }]}>{days}</Text>
                <Text style={[styles.daysLabel, { color: colors.mutedForeground }]}>days</Text>
                <Pressable onPress={() => setDays((d) => Math.min(30, d + 1))} style={[styles.dayBtn, { borderColor: colors.border }]}>
                  <Feather name="plus" size={18} color={colors.foreground} />
                </Pressable>
              </View>
            </View>

            {/* Vibe */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Vibe</Text>
              <View style={styles.vibeGrid}>
                {VIBES.map((v) => {
                  const selected = selectedVibes.includes(v);
                  return (
                    <Pressable
                      key={v}
                      onPress={() => toggleVibe(v)}
                      style={[styles.vibeChip, { backgroundColor: selected ? colors.primary : colors.muted, borderColor: selected ? colors.primary : colors.border }]}
                    >
                      <Text style={[styles.vibeChipText, { color: selected ? "#fff" : colors.foreground }]}>{v}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Budget */}
            <View>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Budget</Text>
              <View style={styles.budgetRow}>
                {BUDGETS.map((b) => (
                  <Pressable
                    key={b}
                    onPress={() => setBudget(b)}
                    style={[styles.budgetChip, { backgroundColor: budget === b ? colors.primary : colors.muted, borderColor: budget === b ? colors.primary : colors.border, flex: 1 }]}
                  >
                    <Text style={[styles.budgetText, { color: budget === b ? "#fff" : colors.foreground }]}>{b}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </>}

          {!!error && (
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          )}

          {knowDestination ? (
            <Pressable
              onPress={handleCreate}
              style={[styles.createBtn, { backgroundColor: colors.primary }, isLoading && { opacity: 0.6 }]}
              disabled={isLoading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.createBtnText}>Create trip</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={handleSuggest}
              style={[styles.createBtn, { backgroundColor: colors.primary }, isLoading && { opacity: 0.6 }]}
              disabled={isLoading}
            >
              {suggesting ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.createBtnText}>AI is thinking…</Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Feather name="zap" size={16} color="#fff" />
                  <Text style={styles.createBtnText}>Suggest destinations</Text>
                </View>
              )}
            </Pressable>
          )}

          <View style={[styles.joinCard, { borderColor: colors.border }]}>
            <Text style={[styles.joinLabel, { color: colors.mutedForeground }]}>Join an existing trip</Text>
            <View style={styles.joinRow}>
              <TextInput
                style={[styles.joinInput, { backgroundColor: colors.muted, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Invite code"
                placeholderTextColor={colors.mutedForeground}
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="characters"
                returnKeyType="done"
              />
              <Pressable
                onPress={handleJoin}
                style={[styles.joinBtn, { backgroundColor: colors.secondary }]}
                disabled={joinLoading || !joinCode.trim()}
              >
                {joinLoading ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Feather name="arrow-right" size={20} color={colors.primary} />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headline: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 32, lineHeight: 40, letterSpacing: -0.5 },
  form: { paddingHorizontal: 20, gap: 20 },
  fieldLabel: { fontFamily: "DmSans_500Medium", fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  toggle: { flexDirection: "row", borderRadius: 12, borderWidth: 1, padding: 3, gap: 3 },
  toggleBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 9 },
  toggleText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  suggestBlock: { gap: 0 },
  suggestBadge: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  suggestBadgeText: { fontFamily: "DmSans_500Medium", fontSize: 13, flex: 1, lineHeight: 18 },
  distanceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  distanceChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  distanceText: { fontFamily: "DmSans_500Medium", fontSize: 13 },
  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14 },
  input: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 15 },
  daysRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  dayBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  daysNum: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, minWidth: 36, textAlign: "center" },
  daysLabel: { fontFamily: "DmSans_400Regular", fontSize: 15 },
  vibeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vibeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  vibeChipText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  budgetRow: { flexDirection: "row", gap: 8 },
  budgetChip: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: "center" },
  budgetText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  errorText: { fontFamily: "DmSans_400Regular", fontSize: 13, textAlign: "center" },
  createBtn: { borderRadius: 14, paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  createBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 16, color: "#fff" },
  loadingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  joinCard: { borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, padding: 16, gap: 10 },
  joinLabel: { fontFamily: "DmSans_500Medium", fontSize: 13 },
  joinRow: { flexDirection: "row", gap: 8 },
  joinInput: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "DmSans_500Medium", fontSize: 15, letterSpacing: 2 },
  joinBtn: { width: 48, height: 48, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  dateModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  dateModalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingBottom: 40 },
  dateModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  dateModalTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 16 },
  dateModalDone: { fontFamily: "DmSans_600SemiBold", fontSize: 16 },
});
