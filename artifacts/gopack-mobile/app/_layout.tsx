import {
  DmSans_400Regular,
  DmSans_500Medium,
  DmSans_600SemiBold,
  DmSans_700Bold,
  useFonts,
} from "@expo-google-fonts/dm-sans";
import {
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setBaseUrl } from "@workspace/api-client-react";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
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
    const inSignIn = segments[0] === "sign-in";
    if (!user && !inSignIn) {
      router.replace("/sign-in");
    } else if (user && inSignIn) {
      router.replace("/(tabs)");
    }
  }, [user, loading]);

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
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DmSans_400Regular,
    DmSans_500Medium,
    DmSans_600SemiBold,
    DmSans_700Bold,
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

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
