import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, shadow } from "../lib/theme";

export function AirportTile({
  iata,
  city,
  onPress,
}: {
  iata: string;
  city: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.bgRaised }}
      style={({ pressed }) => [styles.wrap, shadow.card, pressed && { opacity: 0.85 }]}
    >
      <LinearGradient
        colors={["rgba(245,166,35,0.18)", "rgba(245,166,35,0)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <View style={styles.topBar} />
      <View style={styles.content}>
        <Text style={styles.iata}>{iata}</Text>
        <Text style={styles.city} numberOfLines={1}>
          {city}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  gradient: { ...StyleSheet.absoluteFillObject },
  topBar: { height: 3, backgroundColor: colors.amber },
  content: { padding: 14 },
  iata: { color: colors.amber, fontSize: 26, fontWeight: "700", letterSpacing: 4 },
  city: { color: colors.textSecondary, fontSize: 11, marginTop: 4 },
});
