import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";

interface Props {
  iconSize?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  wordmarkSize?: number;
}

export function GoPackIcon({ size = 36 }: { size?: number }) {
  return (
    <Image
      source={require("../assets/images/icon.png")}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityLabel="Packyo logo"
    />
  );
}

export function GoPackLogoFull({
  iconSize = 32,
  wordmarkColor = "#FCFBF8",
  wordmarkSize = 22,
}: Props) {
  return (
    <View style={styles.row}>
      <GoPackIcon size={iconSize} />
      <Text style={[styles.wordmark, { color: wordmarkColor, fontSize: wordmarkSize }]}>
        packyo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wordmark: {
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.3,
  },
});
