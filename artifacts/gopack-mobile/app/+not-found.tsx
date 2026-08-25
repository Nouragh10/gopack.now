import { Link, Stack } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Mascot } from "@/components/Mascot";
import colors from "@/constants/colors";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerShown: false }} />
      <View style={styles.container}>
        <Mascot name="backpack-buddy" size={120} />
        <Text style={styles.title}>Oops!</Text>
        <Text style={styles.subtitle}>We can't find this page.</Text>
        <Text style={styles.body}>The link may be invalid or the page may have moved.</Text>
        
        <Link href="/" asChild>
          <View style={styles.button}>
            <Text style={styles.buttonText}>Go to Home</Text>
          </View>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: colors.light.background,
  },
  title: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 32,
    color: colors.light.foreground,
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 18,
    color: colors.light.foreground,
    marginBottom: 8,
  },
  body: {
    fontFamily: "DmSans_400Regular",
    fontSize: 15,
    color: colors.light.mutedForeground,
    textAlign: "center",
    marginBottom: 32,
  },
  button: {
    backgroundColor: colors.light.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "DmSans_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
});
