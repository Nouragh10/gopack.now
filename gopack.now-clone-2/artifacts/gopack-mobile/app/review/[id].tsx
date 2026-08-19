import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useTrip, submitTripReview } from "@/hooks/useFirebase";

const VIBES = [
  { key: "beach", label: "Beach" },
  { key: "nature", label: "Nature" },
  { key: "culture", label: "Culture" },
  { key: "food", label: "Foodie" },
  { key: "adventure", label: "Adventure" },
  { key: "relaxation", label: "Relaxation" },
  { key: "nightlife", label: "Nightlife" },
  { key: "shopping", label: "Shopping" },
  { key: "city", label: "City" },
  { key: "history", label: "History" },
  { key: "art", label: "Art" },
  { key: "wellness", label: "Wellness" },
];

const RATING_LABELS = [
  "",
  "Disappointing",
  "It was OK",
  "Pretty good",
  "Really good",
  "Incredible!",
];

export default function ReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { trip, loading } = useTrip(id);

  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [highlight, setHighlight] = useState("");
  const [vibes, setVibes] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [photoUris, setPhotoUris] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  // Guard: if already reviewed, go back
  useEffect(() => {
    if (!loading && trip?.review) {
      router.replace(`/trip/${id}` as any);
    }
    if (!loading && trip && !trip.review && trip.vibes?.length) {
      setVibes(trip.vibes.map((v: string) => v.toLowerCase()));
    }
  }, [loading, trip?.id, (trip as any)?.review]);

  const pickPhotos = async () => {
    const remaining = 6 - photoUris.length;
    if (remaining <= 0) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo library access to add trip photos.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remaining,
    });

    if (!result.canceled) {
      setPhotoUris(prev => [
        ...prev,
        ...result.assets.slice(0, remaining).map(a => a.uri),
      ]);
    }
  };

  const removePhoto = (i: number) => {
    setPhotoUris(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleVibe = (key: string) => {
    setVibes(prev =>
      prev.includes(key) ? prev.filter(v => v !== key) : [...prev, key],
    );
  };

  const handleSubmit = async () => {
    if (!rating || !text.trim() || !user || !id || !trip) return;
    setError("");
    setSubmitting(true);
    try {
      await submitTripReview(id, trip, user.uid, {
        rating,
        text: text.trim(),
        vibes,
        highlight: highlight.trim(),
        isPublic,
        photoUris,
      });
      router.replace(`/trip/${id}` as any);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.mutedForeground, fontFamily: "DmSans_400Regular" }}>
          Trip not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: topInset + 12, borderBottomColor: colors.border },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerLabel, { color: colors.primary }]}>
            REVIEW
          </Text>
          <Text
            style={[styles.headerDest, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {trip.destination}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>

          {/* Star rating */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              OVERALL RATING
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(n => (
                <Pressable key={n} onPress={() => setRating(n)} style={styles.starBtn}>
                  <Feather
                    name="star"
                    size={34}
                    color={n <= rating ? "#FBBF24" : colors.border}
                  />
                </Pressable>
              ))}
            </View>
            {rating > 0 && (
              <Text style={[styles.ratingLabel, { color: colors.mutedForeground }]}>
                {RATING_LABELS[rating]}
              </Text>
            )}
          </View>

          {/* Review text */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              YOUR REVIEW (REQUIRED)
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="How did it go? What worked, what surprised you, what would you tell another group?"
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={5}
              style={[
                styles.textArea,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                },
              ]}
            />
          </View>

          {/* Highlight */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              TOP HIGHLIGHT (OPTIONAL)
            </Text>
            <TextInput
              value={highlight}
              onChangeText={setHighlight}
              placeholder="e.g. Sunset hike, rooftop dinner, that hidden beach"
              placeholderTextColor={colors.mutedForeground}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.muted,
                  color: colors.foreground,
                },
              ]}
            />
          </View>

          {/* Vibes */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              TRIP VIBES
            </Text>
            <View style={styles.vibeRow}>
              {VIBES.map(({ key, label }) => {
                const active = vibes.includes(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => toggleVibe(key)}
                    style={[
                      styles.vibePill,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primary : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.vibePillText,
                        { color: active ? "#fff" : colors.mutedForeground },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Photos */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              TRIP PHOTOS (OPTIONAL, UP TO 6)
            </Text>
            <View style={styles.photoGrid}>
              {photoUris.map((uri, i) => (
                <View key={i} style={styles.photoWrap}>
                  <Image source={{ uri }} style={styles.photo} contentFit="cover" />
                  <Pressable
                    onPress={() => removePhoto(i)}
                    style={styles.removePhotoBtn}
                  >
                    <Feather name="x" size={12} color="#fff" />
                  </Pressable>
                </View>
              ))}
              {photoUris.length < 6 && (
                <Pressable
                  onPress={pickPhotos}
                  style={[
                    styles.addPhotoBtn,
                    { borderColor: colors.border, backgroundColor: colors.muted },
                  ]}
                >
                  <Feather name="camera" size={22} color={colors.mutedForeground} />
                  <Text
                    style={[
                      styles.addPhotoText,
                      { color: colors.mutedForeground },
                    ]}
                  >
                    Add photo
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Visibility */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
              VISIBILITY
            </Text>
            <View style={styles.visibilityRow}>
              <Pressable
                onPress={() => setIsPublic(true)}
                style={[
                  styles.visibilityCard,
                  {
                    borderColor: isPublic ? colors.primary : colors.border,
                    backgroundColor: isPublic
                      ? colors.primary + "10"
                      : "transparent",
                  },
                ]}
              >
                <Feather
                  name="globe"
                  size={18}
                  color={isPublic ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.visibilityTitle,
                    {
                      color: isPublic ? colors.foreground : colors.mutedForeground,
                    },
                  ]}
                >
                  Public
                </Text>
                <Text
                  style={[
                    styles.visibilitySub,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Appears on Discover
                </Text>
                {isPublic && (
                  <Feather name="check-circle" size={14} color={colors.primary} />
                )}
              </Pressable>
              <Pressable
                onPress={() => setIsPublic(false)}
                style={[
                  styles.visibilityCard,
                  {
                    borderColor: !isPublic ? colors.foreground : colors.border,
                    backgroundColor: !isPublic ? colors.muted : "transparent",
                  },
                ]}
              >
                <Feather
                  name="lock"
                  size={18}
                  color={!isPublic ? colors.foreground : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.visibilityTitle,
                    {
                      color: !isPublic
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                >
                  Private
                </Text>
                <Text
                  style={[
                    styles.visibilitySub,
                    { color: colors.mutedForeground },
                  ]}
                >
                  Trip history only
                </Text>
                {!isPublic && (
                  <Feather
                    name="check-circle"
                    size={14}
                    color={colors.foreground}
                  />
                )}
              </Pressable>
            </View>
          </View>

          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null}

          {/* Submit */}
          <Pressable
            onPress={handleSubmit}
            disabled={!rating || !text.trim() || submitting}
            style={[
              styles.submitBtn,
              {
                backgroundColor: colors.primary,
                opacity: !rating || !text.trim() || submitting ? 0.5 : 1,
              },
            ]}
          >
            {submitting && (
              <ActivityIndicator
                size="small"
                color="#fff"
                style={{ marginRight: 8 }}
              />
            )}
            <Text style={styles.submitBtnText}>
              {submitting ? "Submitting…" : "Submit review"}
            </Text>
          </Pressable>

          <Text style={[styles.submitNote, { color: colors.mutedForeground }]}>
            {isPublic
              ? "This review will appear on the Discover page."
              : "This review is private and won't be shared."}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerLabel: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 2,
  },
  headerDest: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 18,
    letterSpacing: -0.3,
  },
  content: { padding: 24, gap: 28 },
  section: { gap: 10 },
  sectionLabel: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.5,
  },
  starsRow: { flexDirection: "row", gap: 4 },
  starBtn: { padding: 2 },
  ratingLabel: {
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
    marginTop: 2,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    minHeight: 120,
    textAlignVertical: "top",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
  },
  vibeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  vibePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  vibePillText: { fontFamily: "DmSans_600SemiBold", fontSize: 13 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photoWrap: {
    width: 90,
    height: 90,
    borderRadius: 10,
    overflow: "hidden",
  },
  photo: { width: "100%", height: "100%" } as any,
  removePhotoBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  addPhotoText: { fontFamily: "DmSans_400Regular", fontSize: 11 },
  visibilityRow: { flexDirection: "row", gap: 10 },
  visibilityCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  visibilityTitle: { fontFamily: "DmSans_700Bold", fontSize: 14 },
  visibilitySub: {
    fontFamily: "DmSans_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  errorText: {
    color: "#ef4444",
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
  },
  submitBtn: {
    borderRadius: 100,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnText: {
    fontFamily: "DmSans_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  submitNote: {
    fontFamily: "DmSans_400Regular",
    fontSize: 12,
    textAlign: "center",
    marginTop: -10,
  },
});
