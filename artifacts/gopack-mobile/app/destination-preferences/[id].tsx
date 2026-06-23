import DateTimePicker from "@react-native-community/datetimepicker";
import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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
import {
  MemberPreference,
  storeDestinationSuggestions,
  submitMemberPreference,
  useTrip,
} from "@/hooks/useFirebase";

const VIBES = [
  "Adventure", "Culture", "Food", "Beach",
  "Nature", "City", "Nightlife", "Relaxation",
  "History", "Art", "Shopping", "Wellness",
];
const BUDGETS = ["Budget", "Midrange", "Luxury"] as const;
const DISTANCES = ["Nearby (< 3h)", "Mid-haul (3–8h)", "Anywhere"] as const;
const PACES = [
  { value: "relaxed", label: "Relaxed", desc: "3–4 acts/day" },
  { value: "balanced", label: "Balanced", desc: "5 acts/day" },
  { value: "packed", label: "Packed", desc: "6–7 acts/day" },
];
const MEMBER_COLORS = ["#E85D3A", "#7E57C2", "#26A69A", "#4CAF50", "#FFA726", "#42A5F5"];

function toISODate(d: Date) {
  return d.toISOString().split("T")[0];
}
function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Avatar({ name, index, size = 28 }: { name: string; index: number; size?: number }) {
  const bg = MEMBER_COLORS[index % MEMBER_COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "#fff" }}>
      <Text style={{ color: "#fff", fontSize: size * 0.38, fontFamily: "DmSans_700Bold" }}>
        {(name ?? "?")[0].toUpperCase()}
      </Text>
    </View>
  );
}

export default function DestinationPreferencesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { trip, loading } = useTrip(id);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const myPref = trip?.memberPreferences?.[user?.uid ?? ""];
  const alreadySubmitted = !!myPref;

  const [vibes, setVibes] = useState<string[]>([]);
  const [distance, setDistance] = useState<typeof DISTANCES[number]>("Mid-haul (3–8h)");
  const [budget, setBudget] = useState<"Budget" | "Midrange" | "Luxury">("Midrange");
  const [days, setDays] = useState(5);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [pace, setPace] = useState<"relaxed" | "balanced" | "packed">("balanced");
  const [startLocation, setStartLocation] = useState("");

  const inviteLink = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "gopacknow.com"}/join/${id}`;

  const handleCopy = async () => {
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(id ?? "");
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  useEffect(() => {
    if (myPref) {
      setVibes(myPref.vibes ?? []);
      setDistance((myPref.distance as typeof DISTANCES[number]) ?? "Mid-haul (3–8h)");
      setBudget((myPref.budget.charAt(0).toUpperCase() + myPref.budget.slice(1)) as "Budget" | "Midrange" | "Luxury");
      setDays(myPref.days ?? 5);
      setStartDate(myPref.startDate ? new Date(myPref.startDate) : null);
      if (myPref.pace) setPace(myPref.pace as "relaxed" | "balanced" | "packed");
      if (myPref.startLocation) setStartLocation(myPref.startLocation);
    }
  }, [alreadySubmitted]);

  useEffect(() => {
    const isHost = trip?.hostMemberId === user?.uid;
    if (!isHost && trip?.destinationSuggestions?.length && id) {
      router.replace(`/destination-vote/${id}`);
    }
  }, [trip?.destinationSuggestions?.length, trip?.hostMemberId, user?.uid, id, router]);

  const members = Object.entries(trip?.members ?? {});
  const memberPrefs = trip?.memberPreferences ?? {};
  const submittedUids = Object.keys(memberPrefs);
  const totalMembers = members.length;
  const submittedCount = submittedUids.length;
  const isCreator = trip?.hostMemberId === user?.uid;

  const toggleVibe = (v: string) => {
    setVibes((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);
  };

  const handleSubmit = async () => {
    if (vibes.length === 0) { setError("Pick at least one vibe."); return; }
    if (!user || !id) return;
    setError("");
    setSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await submitMemberPreference(id, user.uid, {
        vibes,
        distance,
        budget: budget.toLowerCase(),
        days,
        startDate: startDate ? toISODate(startDate) : null,
        startLocation: startLocation.trim() || undefined,
        pace,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    setError("");
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const memberPrefsList = Object.entries(memberPrefs).map(([uid, pref]) => ({
        name: trip?.members[uid]?.name ?? "Member",
        vibes: pref.vibes,
        distance: pref.distance,
        budget: pref.budget,
        days: pref.days,
        startDate: pref.startDate,
        startLocation: pref.startLocation,
      }));

      const baseUrl = Platform.OS === "web"
        ? ""
        : `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`;

      const res = await fetch(`${baseUrl}/api/suggest-destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberPreferences: memberPrefsList }),
      });

      if (!res.ok) {
        const errData = await res.json() as { error?: string };
        throw new Error(errData.error ?? "AI couldn't generate suggestions. Try again.");
      }
      const data = await res.json() as { suggestions: any[] };
      if (!data.suggestions?.length) throw new Error("No suggestions returned.");

      await storeDestinationSuggestions(id, data.suggestions);
      router.replace(`/destination-vote/${id}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (trip && !trip.packConfirmed) {
    router.replace(`/trip/${id}`);
    return null;
  }

  const minDate = new Date();

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: "#7E57C2" }]}>STEP 1 OF 2</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Everyone's preferences</Text>
        </View>
        <Pressable onPress={() => setShowInvite(true)} style={[styles.inviteBtn, { borderColor: "#7E57C2" }]}>
          <Feather name="user-plus" size={14} color="#7E57C2" />
          <Text style={[styles.inviteBtnText, { color: "#7E57C2" }]}>Invite</Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: "#7E57C2",
              width: totalMembers > 0 ? `${(submittedCount / totalMembers) * 100}%` : "0%",
            },
          ]}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: bottomInset + 24 }}
      >
        {/* Who's submitted */}
        <View style={[styles.statusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.statusTitle, { color: colors.foreground }]}>
            {submittedCount} of {totalMembers} submitted
          </Text>
          <Text style={[styles.statusSub, { color: colors.mutedForeground }]}>
            Everyone fills in their own preferences — AI finds the best match for the whole pack.
          </Text>
          <View style={styles.membersRow}>
            {members.map(([uid, m], i) => {
              const submitted = !!memberPrefs[uid];
              return (
                <View key={uid} style={styles.memberChip}>
                  <View style={{ position: "relative" }}>
                    <Avatar name={m.name} index={i} size={34} />
                    {submitted && (
                      <View style={styles.checkBadge}>
                        <Feather name="check" size={9} color="#fff" />
                      </View>
                    )}
                  </View>
                  <Text style={[styles.memberName, { color: submitted ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                    {m.name.split(" ")[0]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Generate button — creator only, at least 1 submitted */}
        {isCreator && submittedCount >= 1 && (
          <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }}>
            <Pressable
              onPress={handleGenerate}
              disabled={generating}
              style={[styles.generateBtn, { backgroundColor: colors.primary, opacity: generating ? 0.7 : 1 }]}
            >
              {generating ? (
                <View style={styles.btnRow}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.generateBtnText}>AI is finding destinations…</Text>
                </View>
              ) : (
                <View style={styles.btnRow}>
                  <Feather name="zap" size={16} color="#fff" />
                  <Text style={styles.generateBtnText}>
                    Generate destinations{submittedCount < totalMembers ? ` (${totalMembers - submittedCount} still pending)` : ""}
                  </Text>
                </View>
              )}
            </Pressable>
            {submittedCount < totalMembers && (
              <Text style={[styles.generateHint, { color: colors.mutedForeground }]}>
                You can generate now or wait for everyone to submit first.
              </Text>
            )}
          </View>
        )}

        {!!error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        )}

        {/* Preference form */}
        <View style={styles.form}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {alreadySubmitted ? "Your preferences (edit anytime)" : "Your preferences"}
          </Text>

          {alreadySubmitted && (
            <View style={[styles.submittedBadge, { backgroundColor: "#4CAF5020", borderColor: "#4CAF5040" }]}>
              <Feather name="check-circle" size={14} color="#4CAF50" />
              <Text style={[styles.submittedText, { color: "#4CAF50" }]}>Submitted — you can still update</Text>
            </View>
          )}

          {/* Vibes */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Vibe</Text>
            <View style={styles.chipGrid}>
              {VIBES.map((v) => {
                const selected = vibes.includes(v);
                return (
                  <Pressable
                    key={v}
                    onPress={() => toggleVibe(v)}
                    style={[
                      styles.chip,
                      { backgroundColor: selected ? "#7E57C2" : colors.muted, borderColor: selected ? "#7E57C2" : colors.border },
                    ]}
                  >
                    <Text style={[styles.chipText, { color: selected ? "#fff" : colors.foreground }]}>{v}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Distance */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>How far are you willing to fly?</Text>
            <View style={styles.chipRow}>
              {DISTANCES.map((d) => (
                <Pressable
                  key={d}
                  onPress={() => setDistance(d)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: distance === d ? "#7E57C2" : colors.muted,
                      borderColor: distance === d ? "#7E57C2" : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: distance === d ? "#fff" : colors.foreground }]}>{d}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Budget */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Budget</Text>
            <View style={styles.chipRow}>
              {BUDGETS.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => setBudget(b)}
                  style={[
                    styles.chip,
                    { flex: 1, backgroundColor: budget === b ? "#7E57C2" : colors.muted, borderColor: budget === b ? "#7E57C2" : colors.border },
                  ]}
                >
                  <Text style={[styles.chipText, { color: budget === b ? "#fff" : colors.foreground }]}>{b}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Trip pace */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Trip pace</Text>
            <View style={styles.chipRow}>
              {PACES.map((p) => (
                <Pressable
                  key={p.value}
                  onPress={() => setPace(p.value as "relaxed" | "balanced" | "packed")}
                  style={[
                    styles.chip,
                    { flex: 1, alignItems: "center", backgroundColor: pace === p.value ? "#26A69A" : colors.muted, borderColor: pace === p.value ? "#26A69A" : colors.border },
                  ]}
                >
                  <Text style={[styles.chipText, { color: pace === p.value ? "#fff" : colors.foreground }]}>{p.label}</Text>
                  <Text style={{ fontFamily: "DmSans_400Regular", fontSize: 10, color: pace === p.value ? "#ffffffbb" : colors.mutedForeground }}>{p.desc}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Duration */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>How many days?</Text>
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

          {/* Start date */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Preferred start date (optional)</Text>
            {Platform.OS === "web" ? (
              <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="calendar" size={16} color="#7E57C2" />
                <TextInput
                  style={[styles.input, { color: colors.foreground }]}
                  placeholder="YYYY-MM-DD"
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
                  <Feather name="calendar" size={16} color="#7E57C2" />
                  <Text style={[styles.input, { color: startDate ? colors.foreground : colors.mutedForeground, paddingVertical: 0 }]}>
                    {startDate ? formatDate(startDate) : "No preference"}
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
                        <Text style={[styles.dateModalTitle, { color: colors.foreground }]}>Preferred start</Text>
                        <Pressable onPress={() => setShowDatePicker(false)}>
                          <Text style={[styles.dateModalDone, { color: "#7E57C2" }]}>Done</Text>
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

          {/* Flying from */}
          <View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Flying from (optional)</Text>
            <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="map-pin" size={16} color="#26A69A" />
              <TextInput
                style={[styles.input, { color: colors.foreground }]}
                placeholder="e.g. New York, London"
                placeholderTextColor={colors.mutedForeground}
                value={startLocation}
                onChangeText={setStartLocation}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={[styles.submitBtn, { backgroundColor: "#7E57C2", opacity: submitting ? 0.6 : 1 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.btnRow}>
                <Feather name={alreadySubmitted ? "refresh-cw" : "check"} size={16} color="#fff" />
                <Text style={styles.submitBtnText}>{alreadySubmitted ? "Update preferences" : "Submit preferences"}</Text>
              </View>
            )}
          </Pressable>
        </View>
      </ScrollView>
      {/* Invite modal */}
      <Modal visible={showInvite} transparent animationType="slide" onRequestClose={() => setShowInvite(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowInvite(false)}>
          <Pressable style={[styles.inviteSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Invite the pack</Text>
              <Pressable onPress={() => setShowInvite(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>
              Share this link so everyone can join and add their own preferences
            </Text>
            <View style={[styles.sheetLinkRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.sheetLinkText, { color: colors.foreground }]} numberOfLines={1}>
                {inviteLink}
              </Text>
              <Pressable onPress={handleCopy} style={[styles.copyBtn, { backgroundColor: "#7E57C2" }]}>
                <Feather name={copied ? "check" : "copy"} size={16} color="#fff" />
              </Pressable>
            </View>
            <Text style={[styles.sheetIdLabel, { color: colors.mutedForeground }]}>TRIP ID</Text>
            <View style={[styles.sheetLinkRow, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.inviteCode, { color: "#7E57C2" }]}>{id}</Text>
              <Pressable onPress={handleCopyId} style={[styles.copyBtn, { backgroundColor: "#7E57C2" }]}>
                <Feather name={copiedId ? "check" : "copy"} size={16} color="#fff" />
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12,
  },
  backBtn: { padding: 4 },
  headerLabel: { fontFamily: "DmSans_600SemiBold", fontSize: 11, letterSpacing: 2 },
  headerTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },

  progressBar: { height: 3 },
  progressFill: { height: 3 },

  statusCard: {
    margin: 16, marginBottom: 8, borderRadius: 16, borderWidth: 1, padding: 16, gap: 8,
  },
  statusTitle: { fontFamily: "DmSans_700Bold", fontSize: 16 },
  statusSub: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18 },
  membersRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 4 },
  memberChip: { alignItems: "center", gap: 4, width: 48 },
  memberName: { fontFamily: "DmSans_500Medium", fontSize: 11, textAlign: "center" },
  checkBadge: {
    position: "absolute", bottom: -2, right: -2,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: "#4CAF50", alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#fff",
  },

  generateBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  generateBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },
  generateHint: { fontFamily: "DmSans_400Regular", fontSize: 12, textAlign: "center", marginTop: 8 },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { fontFamily: "DmSans_400Regular", fontSize: 13, textAlign: "center", paddingHorizontal: 16 },

  form: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  sectionTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 20 },
  submittedBadge: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  submittedText: { fontFamily: "DmSans_500Medium", fontSize: 13 },

  fieldLabel: {
    fontFamily: "DmSans_500Medium", fontSize: 12,
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 8,
  },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, alignItems: "center" },
  chipText: { fontFamily: "DmSans_500Medium", fontSize: 13 },

  daysRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  dayBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  daysNum: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 28, minWidth: 36, textAlign: "center" },
  daysLabel: { fontFamily: "DmSans_400Regular", fontSize: 15 },

  inputWrap: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 14 },
  input: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 15 },

  submitBtn: { borderRadius: 14, paddingVertical: 15, alignItems: "center", justifyContent: "center" },
  submitBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 15, color: "#fff" },

  inviteBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  inviteBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  inviteSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 48, gap: 12 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 22 },
  sheetLabel: { fontFamily: "DmSans_400Regular", fontSize: 13, lineHeight: 18 },
  sheetIdLabel: { fontFamily: "DmSans_500Medium", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
  sheetLinkRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 10 },
  sheetLinkText: { flex: 1, fontFamily: "DmSans_400Regular", fontSize: 13 },
  copyBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  inviteCode: { fontFamily: "DmSans_700Bold", fontSize: 22, letterSpacing: 3, flex: 1, textAlign: "center", paddingVertical: 4 },

  dateModalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  dateModalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, paddingBottom: 40 },
  dateModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, paddingBottom: 8 },
  dateModalTitle: { fontFamily: "DmSans_600SemiBold", fontSize: 16 },
  dateModalDone: { fontFamily: "DmSans_600SemiBold", fontSize: 16 },
});
