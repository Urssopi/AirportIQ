import { StyleSheet, Text, View } from "react-native";

import { colors, radii, statusMeta } from "../lib/theme";

export function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const meta = statusMeta[status] ?? statusMeta.unknown;
  const pad = size === "sm" ? { paddingVertical: 2, paddingHorizontal: 6 } : { paddingVertical: 4, paddingHorizontal: 10 };
  const font = size === "sm" ? 9 : 11;
  return (
    <View style={[styles.badge, { backgroundColor: meta.soft, borderColor: meta.color + "55" }, pad]}>
      <View style={[styles.dot, { backgroundColor: meta.color }]} />
      <Text style={[styles.label, { color: meta.color, fontSize: font }]}>{meta.label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  label: { fontWeight: "700", letterSpacing: 1.4 },
});
