import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  useFonts,
} from "@expo-google-fonts/dm-sans";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@/lib/api-client";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/context/AuthContext";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN ?? "localhost"}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const firstSegment = segments[0] as string;
    const inSignIn = firstSegment === "sign-in" || firstSegment === "index";
    const needsVerification = !!user && !user.isAnonymous && !user.emailVerified;

    if (!user && !inSignIn) {
      // Not logged in — send to sign-in
      router.replace("/sign-in");
    } else if (needsVerification && !inSignIn) {
      // Unverified email user somehow reached the app — send back to sign-in
      router.replace("/sign-in");
    } else if (user && !needsVerification && inSignIn) {
      // Verified (or guest/Google) user on sign-in screen — let them in
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFDF9" }}>
        <ActivityIndicator color="#E85D3A" size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="trip/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="building/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="itinerary/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="packing/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="join" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DmSans_400Regular: DMSans_400Regular,
    DmSans_500Medium: DMSans_500Medium,
    DmSans_600SemiBold: DMSans_600SemiBold,
    DmSans_700Bold: DMSans_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
  });
  const [startupReady, setStartupReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded || fontError) setStartupReady(true);

    // A native simulator can occasionally keep a font request pending.
    // Never leave the app behind the splash screen in that case.
    const timeout = setTimeout(() => setStartupReady(true), 4000);
    return () => clearTimeout(timeout);
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    if (startupReady) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [startupReady]);

  if (!startupReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFDF9" }}>
        <ActivityIndicator color="#E85D3A" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <QueryClientProvider client={queryClient}>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <RootLayoutNav />
                </KeyboardProvider>
              </GestureHandlerRootView>
          </QueryClientProvider>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
