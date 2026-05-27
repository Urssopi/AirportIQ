import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, radii } from "../lib/theme";

const COLORS: Record<"Low" | "Medium" | "High", { color: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  Low:    { color: colors.ontime,   bg: "rgba(34,197,94,0.12)",  icon: "shield-checkmark" },
  Medium: { color: colors.delayed,  bg: "rgba(234,179,8,0.12)",  icon: "warning" },
  High:   { color: colors.canceled, bg: "rgba(239,68,68,0.14)",  icon: "alert-circle" },
};

export function RiskBadge({ label, reason }: { label: "Low" | "Medium" | "High"; reason?: string }) {
  const meta = COLORS[label];
  return (
    <View style={[styles.wrap, { backgroundColor: meta.bg, borderColor: meta.color + "55" }]}>
      <View style={styles.head}>
        <Ionicons name={meta.icon} size={16} color={meta.color} />
        <Text style={[styles.label, { color: meta.color }]}>{label.toUpperCase()} RISK</Text>
      </View>
      {reason ? <Text style={styles.reason}>{reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radii.lg, borderWidth: 1, padding: 14 },
  head: { flexDirection: "row", alignItems: "center" },
  label: { marginLeft: 8, fontWeight: "700", letterSpacing: 1.6, fontSize: 11 },
  reason: { color: colors.textPrimary, fontSize: 13, marginTop: 6, lineHeight: 18 },
});
