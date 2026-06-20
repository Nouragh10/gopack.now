import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
  const { trip } = useTrip(id);
  const wishes = useWishes(id);

  const [msgIndex, setMsgIndex] = useState(0);
  const [error, setError] = useState(false);
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
        const sortedWishes = [...wishes]
          .sort((a, b) => b.votes - a.votes)
          .slice(0, 10)
          .map((w) => ({ text: w.text, author: w.authorName, votes: w.votes }));

        const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`;
        const res = await fetch(`${baseUrl}/api/itinerary`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            destination: trip.destination,
            days: trip.days,
            vibes: trip.vibes ?? [],
            budget: trip.budget ?? "midrange",
            startDate: trip.startDate ?? null,
            wishes: sortedWishes,
          }),
        });

        if (!res.ok) throw new Error("API error");
        const result = await res.json();

        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false,
        }).start();

        await saveItinerary(id!, result);
        setTimeout(() => router.replace(`/itinerary/${id}`), 800);
      } catch (err) {
        setError(true);
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
        <Text style={styles.errorHint}>
          Check your connection and try again.
        </Text>
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
});
