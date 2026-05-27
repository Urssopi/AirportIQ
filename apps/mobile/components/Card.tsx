import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii, shadow } from "../lib/theme";

export function Card({
  title,
  icon,
  children,
  style,
}: {
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
  style?: object;
}) {
  return (
    <View style={[styles.card, shadow.card, style]}>
      {title ? (
        <View style={styles.head}>
          {icon ? <Ionicons name={icon} size={14} color={colors.textSecondary} /> : null}
          <Text style={[styles.title, icon ? { marginLeft: 8 } : null]}>{title.toUpperCase()}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  head: { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  title: { color: colors.textSecondary, fontSize: 11, letterSpacing: 2, fontWeight: "700" },
});
