import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Rect, Circle } from "react-native-svg";

interface Props {
  iconSize?: number;
  showWordmark?: boolean;
  wordmarkColor?: string;
  wordmarkSize?: number;
}

export function GoPackIcon({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        d="M19 13V10.5A2.5 2.5 0 0 1 21.5 8h5A2.5 2.5 0 0 1 29 10.5V13"
        stroke="#FAF8F5"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Rect x={9} y={13} width={30} height={27} rx={5} fill="#E85D3A" />
      <Circle cx={24} cy={22.5} r={4.4} fill="#FAF8F5" />
      <Circle cx={18.2} cy={30} r={4.4} fill="#FAF8F5" />
      <Circle cx={29.8} cy={30} r={4.4} fill="#FAF8F5" />
    </Svg>
  );
}

export function GoPackLogoFull({
  iconSize = 32,
  wordmarkColor = "#FAF8F5",
  wordmarkSize = 22,
}: Props) {
  return (
    <View style={styles.row}>
      <GoPackIcon size={iconSize} />
      <Text style={[styles.wordmark, { color: wordmarkColor, fontSize: wordmarkSize }]}>
        GoPackNow
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
