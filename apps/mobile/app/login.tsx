import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../lib/auth-context";
import { colors, gradients, radii, space } from "../lib/theme";

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/(tabs)/account");
  }, [loading, session, router]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      if (mode === "signIn") await signIn(email, password);
      else await signUp(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <LinearGradient colors={gradients.hero} style={styles.heroGradient} pointerEvents="none" />
      <Pressable
        onPress={() => router.navigate("/(tabs)")}
        hitSlop={16}
        style={[styles.close, { top: insets.top + 12 }]}
      >
        <Ionicons name="close" size={24} color={colors.textSecondary} />
      </Pressable>

      <View style={[styles.body, { paddingTop: insets.top + 60 }]}>
        <Text style={styles.brand}>AIRPORTIQ</Text>
        <Text style={styles.title}>
          {mode === "signIn" ? "Welcome\nback" : "Join us"}
        </Text>
        <Text style={styles.subtitle}>
          {mode === "signIn"
            ? "Sign in to track flights and get alerts."
            : "Create an account in 10 seconds."}
        </Text>

        <View style={{ marginTop: space[6] }}>
          <Text style={styles.fieldLabel}>EMAIL</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="mail-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@email.com"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>

          <Text style={[styles.fieldLabel, { marginTop: space[4] }]}>PASSWORD</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
            />
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={14} color={colors.canceled} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Pressable
          disabled={busy}
          onPress={submit}
          style={({ pressed }) => [
            styles.cta,
            (pressed || busy) && { opacity: 0.75 },
          ]}
        >
          <Text style={styles.ctaText}>
            {busy ? "…" : mode === "signIn" ? "SIGN IN" : "SIGN UP"}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
          style={{ marginTop: space[5], alignItems: "center" }}
        >
          <Text style={styles.toggle}>
            {mode === "signIn" ? "New here? " : "Have an account? "}
            <Text style={{ color: colors.amber }}>
              {mode === "signIn" ? "Create an account" : "Sign in"}
            </Text>
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  heroGradient: { position: "absolute", left: 0, right: 0, top: 0, height: 320 },
  close: { position: "absolute", right: 16, zIndex: 10 },
  body: { paddingHorizontal: space[6] },
  brand: { color: colors.amber, fontSize: 11, letterSpacing: 4, fontWeight: "700" },
  title: {
    color: colors.textPrimary,
    fontSize: 44,
    fontWeight: "800",
    letterSpacing: -1,
    marginTop: 8,
    lineHeight: 48,
  },
  subtitle: { color: colors.textSecondary, fontSize: 14, marginTop: 10, lineHeight: 20 },
  fieldLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 8,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: colors.textPrimary,
    fontSize: 15,
    paddingVertical: 0,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: colors.canceled + "55",
    borderRadius: radii.md,
    padding: 10,
    marginTop: space[4],
  },
  errorText: { color: colors.canceled, marginLeft: 8, fontSize: 12 },
  cta: {
    backgroundColor: colors.amber,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: space[5],
  },
  ctaText: { color: colors.bg, fontWeight: "800", letterSpacing: 2 },
  toggle: { color: colors.textSecondary, fontSize: 13 },
});
