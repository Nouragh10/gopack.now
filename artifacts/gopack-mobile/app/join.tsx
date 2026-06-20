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
    if (!code.trim() || !user) return;
    setLoading(true);
    setError(null);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const tripId = await joinTrip(
        code.trim().toUpperCase(),
        user.uid,
        user.displayName ?? "Traveler",
      );
      router.replace(`/trip/${tripId}`);
    } catch (e) {
      setError((e as Error).message ?? "Invalid invite code.");
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
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Join the pack</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Enter the 6-character invite code to join a trip.
        </Text>

        <TextInput
          style={[styles.codeInput, { backgroundColor: colors.card, borderColor: error ? colors.destructive : colors.border, color: colors.foreground }]}
          placeholder="e.g. ABC123"
          placeholderTextColor={colors.mutedForeground}
          value={code}
          onChangeText={(t) => { setCode(t.toUpperCase()); setError(null); }}
          autoCapitalize="characters"
          maxLength={6}
          returnKeyType="done"
          onSubmitEditing={handleJoin}
          autoFocus
        />

        {error && (
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        )}

        <Pressable
          onPress={handleJoin}
          disabled={loading || code.length < 4}
          style={[
            styles.joinBtn,
            { backgroundColor: code.length >= 4 ? colors.primary : colors.muted },
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { padding: 4 },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: "center", gap: 16, marginTop: -60 },
  title: { fontFamily: "PlayfairDisplay_700Bold", fontSize: 30 },
  subtitle: { fontFamily: "DmSans_400Regular", fontSize: 15, lineHeight: 22 },
  codeInput: {
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontFamily: "DmSans_700Bold",
    fontSize: 28,
    letterSpacing: 6,
    textAlign: "center",
    marginTop: 8,
  },
  errorText: { fontFamily: "DmSans_400Regular", fontSize: 14, textAlign: "center" },
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
});
