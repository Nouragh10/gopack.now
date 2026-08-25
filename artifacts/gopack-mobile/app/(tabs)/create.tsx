import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
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
import { createTrip } from "@/hooks/useFirebase";

const VIBES = [
  "Relaxing", "Adventure", "Foodie",
  "Nightlife", "Culture", "Beach",
];

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const { prefillDestination } = useLocalSearchParams<{ prefillDestination?: string }>();

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [datePicker, setDatePicker] = useState<"start" | "end" | null>(null);
  const [budget, setBudget] = useState("");
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (prefillDestination) {
      setDestination(prefillDestination);
    }
  }, [prefillDestination]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 84 : insets.bottom + 80;
  const minDate = startOfDay(new Date());

  const tripDays = startDate && endDate
    ? Math.floor((startOfDay(endDate).getTime() - startOfDay(startDate).getTime()) / 86400000) + 1
    : 0;

  const dateOptions = Array.from({ length: 366 }, (_, index) => {
    const date = new Date(minDate);
    date.setDate(date.getDate() + index);
    return date;
  }).filter((date) => datePicker !== "end" || !startDate || date >= startDate);

  const chooseDate = (date: Date) => {
    if (datePicker === "start") {
      setStartDate(date);
      if (endDate && endDate < date) setEndDate(date);
    } else {
      setEndDate(date);
    }
    setDatePicker(null);
  };

  const validateTripDates = () => {
    if (!startDate || !endDate) return "Select both a start date and an end date.";
    if (endDate < startDate) return "The end date must be on or after the start date.";
    return "";
  };

  const toggleVibe = (v: string) => {
    setSelectedVibes((prev) => {
      if (prev.includes(v)) return prev.filter((x) => x !== v);
      if (prev.length < 3) return [...prev, v];
      return prev;
    });
  };

  const handleNext = async () => {
    if (!destination.trim()) { setError("Enter a destination."); return; }
    const validationError = validateTripDates();
    if (validationError) { setError(validationError); return; }
    if (!user) { setError("You must be signed in to create a trip."); return; }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const tripId = await createTrip({
        destination: destination.trim(),
        days: tripDays,
        vibes: selectedVibes,
        budget: budget.toLowerCase() || "midrange",
        startDate: toISODate(startDate!),
        endDate: toISODate(endDate!),
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

  const handleHelpDecide = async () => {
    const validationError = validateTripDates();
    if (validationError) { setError(validationError); return; }
    if (!user) { setError("You must be signed in to create a trip."); return; }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const tripId = await createTrip({
        destination: "",
        days: tripDays,
        vibes: selectedVibes,
        budget: budget.toLowerCase() || "midrange",
        startDate: toISODate(startDate!),
        endDate: toISODate(endDate!),
        uid: user.uid,
        displayName: user.displayName ?? "Traveler",
      });
      router.push(`/destination-preferences/${tripId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Could not create trip: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottomInset }}
      >
        <View style={[styles.header, { paddingTop: topInset + 12 }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Let's create a trip</Text>
          <Text style={[styles.stepText, { color: colors.mutedForeground }]}>Step 1 of 4</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Where to?</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="Search destinations or anywhere"
                placeholderTextColor={colors.mutedForeground}
                value={destination}
                onChangeText={setDestination}
              />
            </View>
            <Pressable
              onPress={handleHelpDecide}
              disabled={loading}
              style={[styles.helpDecideBtn, { borderColor: "#E85D3A50", backgroundColor: "#E85D3A10" }]}
            >
              <Feather name="compass" size={15} color="#E85D3A" />
              <Text style={styles.helpDecideText}>Help us decide!</Text>
            </Pressable>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>
              Trip dates <Text style={{ color: colors.primary }}>*</Text>
            </Text>
            <View style={styles.dateRow}>
              <Pressable
                onPress={() => setDatePicker("start")}
                style={[styles.inputWrap, styles.dateInput, { backgroundColor: colors.card, borderColor: startDate ? colors.primary : colors.border }]}
              >
                <Feather name="calendar" size={17} color={colors.primary} />
                <Text style={[styles.dateValue, { color: startDate ? colors.foreground : colors.mutedForeground }]}>
                  {startDate ? formatDate(startDate) : "Start date"}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              </Pressable>
              <Pressable
                onPress={() => setDatePicker("end")}
                style={[styles.inputWrap, styles.dateInput, { backgroundColor: colors.card, borderColor: endDate ? colors.primary : colors.border }]}
              >
                <Feather name="calendar" size={17} color={colors.primary} />
                <Text style={[styles.dateValue, { color: endDate ? colors.foreground : colors.mutedForeground }]}>
                  {endDate ? formatDate(endDate) : "End date"}
                </Text>
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
            {tripDays > 0 && (
              <Text style={[styles.dateHint, { color: colors.mutedForeground }]}>
                {tripDays} day{tripDays === 1 ? "" : "s"} planned
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Total budget (per person)</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="e.g. $800"
                placeholderTextColor={colors.mutedForeground}
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.foreground }]}>Travel vibes (select up to 3)</Text>
            <View style={styles.vibesGrid}>
              {VIBES.map((v) => {
                const selected = selectedVibes.includes(v);
                return (
                  <Pressable
                    key={v}
                    onPress={() => toggleVibe(v)}
                    style={[
                      styles.vibePill,
                      {
                        backgroundColor: selected ? colors.secondary : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {selected && <View style={[styles.vibeDot, { backgroundColor: colors.primary }]} />}
                    <Text style={[styles.vibeText, { color: colors.foreground }]}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {!!error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}

          <Pressable
            onPress={handleNext}
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.nextBtnText}>Next</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={datePicker !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setDatePicker(null)}
      >
        <Pressable style={styles.dateModalOverlay} onPress={() => setDatePicker(null)}>
          <Pressable style={[styles.dateModalSheet, { backgroundColor: colors.card }]} onPress={() => {}}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.dateModalHeader}>
              <Text style={[styles.dateModalTitle, { color: colors.foreground }]}>
                {datePicker === "start" ? "Start date" : "End date"}
              </Text>
              <Pressable onPress={() => setDatePicker(null)}>
                <Text style={[styles.dateModalDone, { color: colors.primary }]}>Done</Text>
              </Pressable>
            </View>
            <Text style={[styles.dateModalSubtitle, { color: colors.mutedForeground }]}>
              Choose a date from the menu below
            </Text>
            <ScrollView style={styles.dateOptionsList} showsVerticalScrollIndicator={false}>
              {dateOptions.map((date, index) => {
                const previousDate = dateOptions[index - 1];
                const monthChanged = !previousDate || previousDate.getMonth() !== date.getMonth();
                const selected = (datePicker === "start" ? startDate : endDate)?.getTime() === date.getTime();
                return (
                  <React.Fragment key={toISODate(date)}>
                    {monthChanged && (
                      <Text style={[styles.dateMonthLabel, { color: colors.mutedForeground }]}>
                        {date.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </Text>
                    )}
                    <Pressable
                      onPress={() => chooseDate(date)}
                      style={[
                        styles.dateOption,
                        {
                          backgroundColor: selected ? colors.primary + "12" : colors.card,
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <View style={[styles.dateNumber, { backgroundColor: selected ? colors.primary : colors.muted }]}>
                        <Text style={[styles.dateNumberText, { color: selected ? "#fff" : colors.foreground }]}>
                          {date.getDate()}
                        </Text>
                      </View>
                      <View style={styles.dateOptionCopy}>
                        <Text style={[styles.dateOptionWeekday, { color: colors.foreground }]}>
                          {date.toLocaleDateString("en-US", { weekday: "long" })}
                        </Text>
                        <Text style={[styles.dateOptionFull, { color: colors.mutedForeground }]}>
                          {formatDate(date)}
                        </Text>
                      </View>
                      {selected && <Feather name="check" size={19} color={colors.primary} />}
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 24 },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    marginBottom: 8,
  },
  stepText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
  },
  form: { paddingHorizontal: 24, gap: 24 },
  inputGroup: { gap: 10 },
  label: {
    fontFamily: "DmSans_500Medium",
    fontSize: 15,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  input: {
    flex: 1,
    fontFamily: "DmSans_400Regular",
    fontSize: 16,
  },
  dateRow: { flexDirection: "row", gap: 10 },
  dateInput: { flex: 1, minWidth: 0, paddingHorizontal: 12 },
  dateValue: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 14 },
  dateHint: { fontFamily: "DmSans_400Regular", fontSize: 12, marginTop: -2 },
  dateModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  dateModalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 34, maxHeight: "82%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 12 },
  dateModalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  dateModalTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  dateModalDone: { fontFamily: "DmSans_600SemiBold", fontSize: 15 },
  dateModalSubtitle: { fontFamily: "DmSans_400Regular", fontSize: 13, marginBottom: 12 },
  dateOptionsList: { maxHeight: 430 },
  dateMonthLabel: { fontFamily: "DmSans_700Bold", fontSize: 13, marginTop: 12, marginBottom: 6 },
  dateOption: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 8 },
  dateNumber: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  dateNumberText: { fontFamily: "DmSans_700Bold", fontSize: 16 },
  dateOptionCopy: { flex: 1, marginLeft: 12, gap: 2 },
  dateOptionWeekday: { fontFamily: "DmSans_600SemiBold", fontSize: 14 },
  dateOptionFull: { fontFamily: "DmSans_400Regular", fontSize: 12 },
  vibesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  vibePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  vibeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vibeText: {
    fontFamily: "DmSans_500Medium",
    fontSize: 14,
  },
  helpDecideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  helpDecideText: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 14,
    color: "#E85D3A",
  },
  errorText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  nextBtn: {
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  nextBtnText: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
});
