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
import { auth, signOut } from "@/lib/firebase";
import { GoPackIcon } from "@/components/GoPackLogo";
import { sendEmailVerification } from "firebase/auth";

const DARK = "#1A1412";
const CARD = "#2A221D";
const PRIMARY = "#E85D3A";
const MUTED = "#756C66";
const INPUT_BG = "#332820";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resent, setResent] = useState(false);

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
        setMode("verify");
      } else {
        const cred = await signInWithEmail(email.trim(), password);
        if (!cred.user.emailVerified) {
          setMode("verify");
        } else {
          router.replace("/(tabs)");
        }
      }
    } catch (e: any) {
      const msg =
        e?.code === "auth/invalid-credential"
          ? "Incorrect email or password."
          : e?.code === "auth/email-already-in-use"
          ? "That email is already in use."
          : e?.code === "auth/weak-password"
          ? "Password must be at least 6 characters."
          : "Something went wrong. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResent(false);
    setError("");
    try {
      // Sign in temporarily to get a user object, send email, then sign out again
      const cred = await signInWithEmail(email.trim(), password);
      await sendEmailVerification(cred.user);
      await signOut();
      setResent(true);
    } catch {
      setError("Could not resend email. Try again.");
    }
  };

  const handleCheckVerified = async () => {
    setLoading(true);
    setError("");
    try {
      // Sign in and check emailVerified — this is the source of truth
      const cred = await signInWithEmail(email.trim(), password);
      if (cred.user.emailVerified) {
        // Verified — routing guard in _layout.tsx will allow entry to tabs
        router.replace("/(tabs)");
      } else {
        // Not yet verified — sign back out and wait
        await signOut();
        setError("Email not verified yet. Check your inbox and click the link.");
      }
    } catch {
      setError("Could not sign in. Try again.");
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

  if (mode === "verify") {
    return (
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.verifyContainer}>
          <View style={styles.verifyIconWrap}>
            <Feather name="mail" size={36} color={PRIMARY} />
          </View>
          <Text style={styles.verifyTitle}>Verify your email</Text>
          <Text style={styles.verifyBody}>
            We sent a verification link to{"\n"}
            <Text style={styles.verifyEmail}>{email.trim()}</Text>
          </Text>
          <Text style={styles.verifyHint}>
            Open the link in your inbox, then come back and tap Continue.
          </Text>

          {!!error && <Text style={[styles.errorText, { marginBottom: 4 }]}>{error}</Text>}
          {resent && !error && (
            <Text style={styles.resentText}>Verification email resent!</Text>
          )}

          <Pressable
            style={[styles.primaryBtn, loading && styles.disabledBtn, { marginTop: 8 }]}
            onPress={handleCheckVerified}
            disabled={loading}
          >
            <Text style={styles.primaryBtnText}>
              {loading ? "Checking..." : "I've verified — Continue"}
            </Text>
          </Pressable>

          <Pressable onPress={handleResend} style={styles.toggleBtn}>
            <Text style={styles.toggleText}>Resend verification email</Text>
          </Pressable>

          <Pressable
            onPress={() => { setMode("signin"); setError(""); setResent(false); }}
            style={styles.toggleBtn}
          >
            <Text style={[styles.toggleText, { color: MUTED }]}>Back to sign in</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
            <GoPackIcon size={72} />
            <Text style={styles.wordmark}>GoPackNow</Text>
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
  resentText: {
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
    color: "#4CAF50",
    textAlign: "center",
    marginBottom: 4,
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
  verifyContainer: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  verifyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: CARD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  verifyTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: "#FFFDF9",
    textAlign: "center",
  },
  verifyBody: {
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
    color: MUTED,
    textAlign: "center",
    lineHeight: 22,
  },
  verifyEmail: {
    fontFamily: "DmSans_600SemiBold",
    color: "#FFFDF9",
  },
  verifyHint: {
    fontFamily: "DmSans_400Regular",
    fontSize: 13,
    color: MUTED,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
