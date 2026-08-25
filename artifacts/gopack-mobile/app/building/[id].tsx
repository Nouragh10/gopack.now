import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { saveItinerary, useTrip, useWishes } from "@/hooks/useFirebase";

const MESSAGES = [
  "Packing your adventure...",
  "Consulting the travel spirits...",
  "Arranging the perfect days...",
  "Almost ready for takeoff...",
];

export default function BuildingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const colors = useColors();
  const { trip } = useTrip(id);
  const wishes = useWishes(id);

  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 0.85,
      duration: 8000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();

    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!trip || hasStarted.current) return;
    hasStarted.current = true;

    const run = async () => {
      try {
        const memberPrefs = Object.values((trip as any).memberPreferences ?? {}) as Array<Record<string, unknown>>;

        const prefDays = memberPrefs.map(p => Number(p.days)).filter(d => d > 0);
        const resolvedDays = prefDays.length > 0
          ? Math.round(prefDays.reduce((s, d) => s + d, 0) / prefDays.length)
          : (trip.days ?? 5);

        const positiveWishes = [...wishes]
          .filter(w => w.score >= 0)
          .sort((a, b) => b.score - a.score);

        const guaranteedCap = Math.floor(resolvedDays * 1.5);
        const guaranteedSet: typeof positiveWishes = [];
        const usedWishIds = new Set<string>();
        const seenAuthors = new Set<string>();

        for (const w of positiveWishes) {
          if (guaranteedSet.length >= guaranteedCap) break;
          if (!seenAuthors.has(w.authorId)) {
            seenAuthors.add(w.authorId);
            usedWishIds.add(w.id);
            guaranteedSet.push(w);
          }
        }

        for (const w of positiveWishes) {
          if (guaranteedSet.length >= guaranteedCap) break;
          if (!usedWishIds.has(w.id)) {
            usedWishIds.add(w.id);
            guaranteedSet.push(w);
          }
        }

        const candidateWishes = positiveWishes
          .filter(w => !usedWishIds.has(w.id))
          .slice(0, 15);

        const toPayload = (w: typeof positiveWishes[0]) => ({
          text: w.text,
          author: w.authorName,
          votes: w.score,
        });

        const prefVibes = memberPrefs.flatMap(p => (p.vibes as string[] | undefined) ?? []);
        const resolvedVibes = prefVibes.length > 0
          ? [...new Set(prefVibes)]
          : (trip.vibes?.length ? trip.vibes : ["culture", "food"]);

        const paceVotes: Record<string, number> = {};
        for (const pref of memberPrefs) {
          const p = (pref.pace as string) ?? "balanced";
          paceVotes[p] = (paceVotes[p] ?? 0) + 1;
        }
        const resolvedPace = Object.entries(paceVotes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "balanced";

        const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`;
        const res = await fetch(`${baseUrl}/api/itinerary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: trip.destination,
            days: resolvedDays,
            vibes: resolvedVibes,
            budget: trip.budget ?? "midrange",
            startDate: trip.startDate ?? null,
            guaranteed: guaranteedSet.map(toPayload),
            candidates: candidateWishes.map(toPayload),
            pace: resolvedPace,
            userId: user?.uid,
            isPlusUser: false,
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          throw new Error(body.error ?? "Generation failed. Please try again.");
        }
        const result = await res.json();

        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }).start();

        await saveItinerary(id!, result);
        setTimeout(() => router.replace(`/itinerary/${id}`), 800);
      } catch (err) {
        setError((err as Error).message || "Something went wrong. Please try again.");
      }
    };

    run();
  }, [trip]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {!error && <ActivityIndicator size="large" color={colors.primary} style={{ transform: [{ scale: 1.2 }] }} />}
      
      <Text style={[styles.message, { color: colors.foreground }]}>{error ? "Something went wrong." : MESSAGES[msgIndex]}</Text>

      <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              backgroundColor: colors.primary,
              width: progressAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>

      {error && (
        <>
          <Text style={[styles.errorHint, { color: colors.mutedForeground }]}>{error}</Text>
          <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
            <Text style={[styles.backBtnText, { color: colors.foreground }]}>Go back</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
    paddingHorizontal: 40,
  },
  message: {
    fontFamily: "DmSans_500Medium",
    fontSize: 20,
    textAlign: "center",
    lineHeight: 28,
  },
  progressTrack: {
    width: "100%",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  errorHint: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  backBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 1,
  },
  backBtnText: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 15,
  },
});
