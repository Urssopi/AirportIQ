import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, space } from "../lib/theme";

export function ErrorView({
  message,
  onRetry,
  title = "Couldn't load",
}: {
  message: string;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name="alert-circle" size={48} color={colors.canceled} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{message}</Text>
      {onRetry ? (
        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [styles.btn, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.btnText}>TRY AGAIN</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space[6],
  },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: "700", marginTop: 16 },
  body: { color: colors.textSecondary, fontSize: 13, marginTop: 8, textAlign: "center", lineHeight: 18 },
  btn: {
    marginTop: 20,
    backgroundColor: colors.amber,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  btnText: { color: colors.bg, fontWeight: "800", letterSpacing: 2 },
});
