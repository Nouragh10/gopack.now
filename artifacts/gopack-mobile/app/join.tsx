import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";
import { joinTrip } from "@/hooks/useFirebase";

export default function JoinScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleJoin = async () => {
    const trimmed = code.trim();
    if (!trimmed || !user) return;
    setLoading(true);
    setError(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const tripId = await joinTrip(
        trimmed,
        user.uid,
        user.displayName ?? "Traveler",
      );
      router.replace(`/trip/${tripId}`);
    } catch (e) {
      setError((e as Error).message ?? "Trip not found.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Join the pack</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Paste the Trip ID shared by your group to join their trip.
        </Text>

        <TextInput
          style={[
            styles.codeInput,
            {
              backgroundColor: colors.card,
              borderColor: error ? colors.destructive : colors.border,
              color: colors.foreground,
            },
          ]}
          placeholder="Paste trip ID here"
          placeholderTextColor={colors.mutedForeground}
          value={code}
          onChangeText={(t) => {
            setCode(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleJoin}
          autoFocus
        />

        {error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        )}

        <Pressable
          onPress={handleJoin}
          disabled={loading || code.trim().length < 4}
          style={[
            styles.joinBtn,
            { backgroundColor: code.trim().length >= 4 ? colors.primary : colors.muted },
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Feather name="users" size={18} color="#fff" />
              <Text style={styles.joinBtnText}>Join trip</Text>
            </>
          )}
        </Pressable>

        <View style={[styles.hint, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="info" size={14} color={colors.mutedForeground} />
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Ask the trip host to open the Invite sheet and share their Trip ID with you.
          </Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    gap: 16,
    marginTop: -60,
  },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 30 },
  subtitle: { fontFamily: "DmSans_400Regular", fontSize: 15, lineHeight: 22 },
  codeInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
    marginTop: 8,
  },
  errorText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 4,
  },
  joinBtnText: { fontFamily: "DmSans_600SemiBold", fontSize: 16, color: "#fff" },
  hint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  hintText: {
    flex: 1,
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
});
