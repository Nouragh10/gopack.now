import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { signInGuest, signInWithEmail, signUpWithEmail } from "@/lib/firebase";

const DARK = "#1C1713";
const CARD = "#2A221D";
const PRIMARY = "#E85D3A";
const MUTED = "#756C66";
const INPUT_BG = "#332820";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (mode === "signup") {
        await signUpWithEmail(email.trim(), password, name.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      router.replace("/(tabs)");
    } catch (e: any) {
      const msg = e?.code === "auth/invalid-credential"
        ? "Incorrect email or password."
        : e?.code === "auth/email-already-in-use"
        ? "That email is already in use."
        : "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await signInGuest();
      router.replace("/(tabs)");
    } catch {
      setError("Could not sign in as guest.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoSection}>
            <View style={styles.iconCircle}>
              <Feather name="package" size={28} color={PRIMARY} />
            </View>
            <Text style={styles.wordmark}>gopack</Text>
            <Text style={styles.tagline}>Plan trips together</Text>
          </View>

          <View style={styles.form}>
            {mode === "signup" && (
              <TextInput
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={MUTED}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                returnKeyType="next"
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={MUTED}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              returnKeyType="next"
            />
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Password"
                placeholderTextColor={MUTED}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                style={styles.eyeBtn}
              >
                <Feather
                  name={showPassword ? "eye-off" : "eye"}
                  size={18}
                  color={MUTED}
                />
              </Pressable>
            </View>

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <Pressable
              style={[styles.primaryBtn, loading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.primaryBtnText}>
                {loading ? "Please wait..." : mode === "signin" ? "Sign In" : "Create Account"}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setMode((m) => (m === "signin" ? "signup" : "signin"));
                setError("");
              }}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleText}>
                {mode === "signin"
                  ? "New here? Create an account"
                  : "Already have an account? Sign in"}
              </Text>
            </Pressable>
          </View>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            style={styles.guestBtn}
            onPress={handleGuest}
            disabled={loading}
          >
            <Text style={styles.guestText}>Continue as guest</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: DARK,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: "center",
    minHeight: "100%",
  },
  logoSection: {
    alignItems: "center",
    marginBottom: 48,
    marginTop: 20,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  wordmark: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 36,
    color: PRIMARY,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
    color: MUTED,
    letterSpacing: 0.2,
  },
  form: {
    gap: 12,
    marginBottom: 24,
  },
  input: {
    backgroundColor: INPUT_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "DmSans_400Regular",
    color: "#FFFDF9",
    borderWidth: 1,
    borderColor: "#3D3028",
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
  },
  eyeBtn: {
    position: "absolute",
    right: 16,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  toggleBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  toggleText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 14,
    color: MUTED,
  },
  errorText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
    color: "#E85D3A",
    textAlign: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#332820",
  },
  dividerText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
    color: MUTED,
  },
  guestBtn: {
    borderWidth: 1,
    borderColor: "#332820",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  guestText: {
    fontFamily: "DmSans_500Medium",
    fontSize: 15,
    color: MUTED,
  },
});
