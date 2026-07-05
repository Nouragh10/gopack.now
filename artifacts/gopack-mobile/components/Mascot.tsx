import { Image } from "expo-image";
import { StyleSheet, View, type ViewStyle } from "react-native";

const MASCOTS = {
  "backpack-buddy": require("../assets/mascots/backpack-buddy.png"),
  "luggage-crew": require("../assets/mascots/luggage-crew.png"),
  "map-mate": require("../assets/mascots/map-mate.png"),
  "ticket-pal": require("../assets/mascots/ticket-pal.png"),
} as const;

export type MascotName = keyof typeof MASCOTS;

interface MascotProps {
  name: MascotName;
  size?: number;
  style?: ViewStyle;
}

export function Mascot({ name, size = 120, style }: MascotProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size }, style]}>
      <Image
        source={MASCOTS[name]}
        style={{ width: size, height: size }}
        contentFit="contain"
        transition={150}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
