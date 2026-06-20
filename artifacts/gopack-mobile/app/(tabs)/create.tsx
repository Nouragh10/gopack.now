import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { createTrip, joinTrip } from "@/hooks/useFirebase";

const VIBES = [
  "Adventure", "Culture", "Food", "Beach",
  "Nature", "City", "Nightlife", "Relaxation",
  "History", "Art", "Shopping", "Wellness",
];

const BUDGETS = ["Budget", "Midrange", "Luxury"] as const;

export default function CreateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(5);
  const [selectedVibes, setSelectedVibes] = useState<string[]>([]);
  const [budget, setBudget] = useState<"Budget" | "Midrange" | "Luxury">("Midrange");
  const [loading, setLoading] = useState(false);
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
    if (!destination.trim()) { setError("Enter a destination."); return; }
    if (selectedVibes.length === 0) { setError("Pick at least one vibe."); return; }
    if (!user) return;
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const tripId = await createTrip({
        destination: destination.trim(),
        days,
        vibes: selectedVibes,
        budget: budget.toLowerCase(),
        startDate: null,
        uid: user.uid,
        displayName: user.displayName ?? "Traveler",
      });
      router.push(`/trip/${tripId}`);
    } catch {
      setError("Could not create trip. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!joinCode.trim() || !user) return;
    setJoinLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const tripId = await joinTrip(joinCode.trim(), user.uid, user.displayName ?? "Traveler");
      router.push(`/trip/${tripId}`);
    } catch {
      setError("Invalid invite code.");
    } finally {
      setJoinLoading(false);
    }
  };

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

          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Days</Text>
            <View style={styles.daysRow}>
              <Pressable
                onPress={() => setDays((d) => Math.max(1, d - 1))}
                style={[styles.dayBtn, { borderColor: colors.border }]}
              >
                <Feather name="minus" size={18} color={colors.foreground} />
              </Pressable>
              <Text style={[styles.daysNum, { color: colors.foreground }]}>{days}</Text>
              <Pressable
                onPress={() => setDays((d) => Math.min(30, d + 1))}
                style={[styles.dayBtn, { borderColor: colors.border }]}
              >
                <Feather name="plus" size={18} color={colors.foreground} />
              </Pressable>
            </View>
          </View>

          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Vibe</Text>
            <View style={styles.vibeGrid}>
              {VIBES.map((v) => {
                const selected = selectedVibes.includes(v);
                return (
                  <Pressable
                    key={v}
                    onPress={() => toggleVibe(v)}
                    style={[
                      styles.vibeChip,
                      {
                        backgroundColor: selected ? colors.primary : colors.muted,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.vibeChipText,
                        { color: selected ? "#fff" : colors.foreground },
                      ]}
                    >
                      {v}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Budget</Text>
            <View style={styles.budgetRow}>
              {BUDGETS.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => setBudget(b)}
                  style={[
                    styles.budgetChip,
                    {
                      backgroundColor: budget === b ? colors.primary : colors.muted,
                      borderColor: budget === b ? colors.primary : colors.border,
                      flex: 1,
                    },
                  ]}
                >
                  <Text style={[styles.budgetText, { color: budget === b ? "#fff" : colors.foreground }]}>
                    {b}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {!!error && <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>}

          <Pressable
            onPress={handleCreate}
            style={[styles.createBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.6 }]}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.createBtnText}>Create trip</Text>
            )}
          </Pressable>

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
  headline: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  form: { paddingHorizontal: 20, gap: 20 },
  fieldLabel: {
    fontFamily: "DmSans_500Medium",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 15 },
  daysRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  dayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  daysNum: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, minWidth: 40, textAlign: "center" },
  vibeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vibeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  vibeChipText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  budgetRow: { flexDirection: "row", gap: 8 },
  budgetChip: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  budgetText: { fontFamily: "DmSans_500Medium", fontSize: 14 },
  errorText: { fontFamily: "DmSans_400Regular", fontSize: 13, textAlign: "center" },
  createBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 16, color: "#fff" },
  joinCard: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 16,
    gap: 10,
  },
  joinLabel: { fontFamily: "DmSans_500Medium", fontSize: 13 },
  joinRow: { flexDirection: "row", gap: 8 },
  joinInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DmSans_500Medium",
    fontSize: 15,
    letterSpacing: 2,
  },
  joinBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
