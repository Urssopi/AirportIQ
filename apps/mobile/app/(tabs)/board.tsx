import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { colors, radii, space } from "../../lib/theme";
import BoardView from "../board/[airport]";

type Profile = { home_airport: string | null };

export default function BoardTab() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setProfile(null);
      return;
    }
    try {
      const me = await apiFetch<Profile>("/api/users/me");
      setProfile(me);
    } catch {
      setProfile(null);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!session) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Ionicons name="airplane-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Pick a home airport</Text>
        <Text style={styles.emptyBody}>
          Sign in and set a home airport in Account to see your board here automatically.
        </Text>
        <Link href="/login" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>SIGN IN</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  if (!profile?.home_airport) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <Ionicons name="compass-outline" size={64} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>No home airport set</Text>
        <Text style={styles.emptyBody}>
          Set one on the Account tab — or open any airport from Home.
        </Text>
      </View>
    );
  }

  return <BoardView paramsOverride={{ airport: profile.home_airport }} />;
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space[6],
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 18,
  },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  btn: {
    backgroundColor: colors.amber,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: radii.md,
    marginTop: 20,
  },
  btnText: { color: colors.bg, fontWeight: "800", letterSpacing: 2 },
});
