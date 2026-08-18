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
} from "react-native";

import { useAuth } from "@/context/AuthContext";
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
  const { trip } = useTrip(id);
  const wishes = useWishes(id);

  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

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

        // Days: average of all member preferences, rounded. Fall back to trip.days if no prefs exist.
        const prefDays = memberPrefs.map(p => Number(p.days)).filter(d => d > 0);
        const resolvedDays = prefDays.length > 0
          ? Math.round(prefDays.reduce((s, d) => s + d, 0) / prefDays.length)
          : (trip.days ?? 5);

        // ── Wish selection: fairness-cap algorithm ──────────────────────
        // Step 0: exclude negatively-scored wishes (the group said no)
        const positiveWishes = [...wishes]
          .filter(w => w.score >= 0)
          .sort((a, b) => b.score - a.score);

        // Step 1: cap scales with trip length (~1.5 guaranteed slots/day)
        const guaranteedCap = Math.floor(resolvedDays * 1.5);

        // Step 2: fairness pass — each member who submitted ≥1 wish gets
        // their highest-scoring wish guaranteed (score ≥ 0 only)
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

        // Step 3: fill remaining guaranteed slots by net score (member-agnostic)
        for (const w of positiveWishes) {
          if (guaranteedSet.length >= guaranteedCap) break;
          if (!usedWishIds.has(w.id)) {
            usedWishIds.add(w.id);
            guaranteedSet.push(w);
          }
        }

        // Step 4: candidates — remaining score ≥ 0 wishes, up to 15
        const candidateWishes = positiveWishes
          .filter(w => !usedWishIds.has(w.id))
          .slice(0, 15);

        const toPayload = (w: typeof positiveWishes[0]) => ({
          text: w.text,
          author: w.authorName,
          votes: w.score,
        });

        // Vibes: union of all member vibe selections. Fall back to trip.vibes if no prefs exist.
        const prefVibes = memberPrefs.flatMap(p => (p.vibes as string[] | undefined) ?? []);
        const resolvedVibes = prefVibes.length > 0
          ? [...new Set(prefVibes)]
          : (trip.vibes?.length ? trip.vibes : ["culture", "food"]);

        // Pace: majority vote across member preferences.
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

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.root}>
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Feather name="send" size={56} color="#E85D3A" />
      </Animated.View>

      <Text style={styles.message}>{error ? "Something went wrong." : MESSAGES[msgIndex]}</Text>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
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
          <Text style={styles.errorHint}>{error}</Text>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Go back</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#2B2723",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    paddingHorizontal: 40,
  },
  message: {
    fontFamily: "PlayfairDisplay_400Regular",
    fontSize: 22,
    color: "#FFFDF9",
    textAlign: "center",
    lineHeight: 30,
  },
  progressTrack: {
    width: "100%",
    height: 4,
    backgroundColor: "#332E2B",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#E85D3A",
    borderRadius: 2,
  },
  errorHint: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    color: "#756C66",
    textAlign: "center",
  },
  backBtn: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#4A4440",
  },
  backBtnText: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 15,
    color: "#FFFDF9",
  },
});
