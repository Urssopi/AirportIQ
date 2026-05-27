import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { registerForPushNotifications } from "../../lib/push";
import { colors, gradients, radii, shadow, space } from "../../lib/theme";

type Profile = {
  id: string;
  email: string;
  has_tsa_precheck: boolean;
  preferred_notification: "email" | "push" | "both";
  home_airport: string | null;
  push_token: string | null;
};

export default function Account() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  const load = useCallback(async () => {
    try {
      const me = await apiFetch<Profile>("/api/users/me");
      setProfile(me);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    }
  }, []);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  async function save(patch: Partial<Profile>) {
    try {
      const updated = await apiFetch<Profile>("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      setProfile(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function enablePush() {
    setPushStatus("Requesting…");
    const result = await registerForPushNotifications();
    if (result.token) {
      try {
        await save({ push_token: result.token });
        setPushStatus("Push enabled.");
      } catch {
        setPushStatus("Saved locally but server update failed.");
      }
    } else {
      setPushStatus(result.error ?? "Push unavailable.");
    }
  }

  if (!session || !profile) {
    return (
      <View style={[styles.loading, { paddingTop: insets.top }]}>
        <Text style={{ color: colors.textSecondary }}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      <LinearGradient colors={gradients.hero} style={styles.heroGradient} pointerEvents="none" />

      {/* Identity */}
      <View style={[styles.identityCard, shadow.card, { marginTop: insets.top + 12 }]}>
        <View style={styles.identityStripe} />
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color={colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.email} numberOfLines={1}>
              {profile.email}
            </Text>
            <Text style={styles.signedIn}>Signed in</Text>
          </View>
          <Pressable onPress={signOut} hitSlop={12} style={styles.signOutBtn}>
            <Text style={styles.signOutText}>SIGN OUT</Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={14} color={colors.canceled} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Preferences */}
      <View style={[styles.card, shadow.card]}>
        <View style={styles.cardHead}>
          <Ionicons name="settings-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.cardTitle}>PREFERENCES</Text>
        </View>

        <View style={styles.row}>
          <View style={styles.rowLabel}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.rowText}>TSA PreCheck</Text>
          </View>
          <Switch
            value={profile.has_tsa_precheck}
            onValueChange={(v) => void save({ has_tsa_precheck: v })}
            trackColor={{ false: colors.bgRaised, true: colors.amber + "88" }}
            thumbColor={profile.has_tsa_precheck ? colors.amber : colors.textSecondary}
            ios_backgroundColor={colors.bgRaised}
          />
        </View>

        <View style={styles.divider} />

        <View style={{ paddingHorizontal: 14, paddingVertical: 14 }}>
          <Text style={styles.fieldLabel}>HOME AIRPORT (IATA)</Text>
          <TextInput
            value={profile.home_airport ?? ""}
            onChangeText={(v) =>
              setProfile({ ...profile, home_airport: v.toUpperCase() })
            }
            onEndEditing={(e) =>
              void save({ home_airport: e.nativeEvent.text.toUpperCase() || null })
            }
            maxLength={4}
            autoCapitalize="characters"
            placeholder="DEN"
            placeholderTextColor={colors.textMuted}
            style={styles.iataInput}
          />
        </View>
      </View>

      {/* Push */}
      <View style={[styles.card, shadow.card, { marginTop: space[3] }]}>
        <View style={styles.cardHead}>
          <Ionicons name="notifications-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.cardTitle}>PUSH NOTIFICATIONS</Text>
        </View>
        {profile.push_token ? (
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 14 }}>
            <Ionicons name="checkmark-circle" size={20} color={colors.ontime} />
            <Text style={{ color: colors.ontime, marginLeft: 8, fontWeight: "600" }}>
              Push token registered
            </Text>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
            <Pressable
              onPress={enablePush}
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="notifications" size={16} color={colors.bg} />
              <Text style={styles.ctaText}>ENABLE PUSH</Text>
            </Pressable>
          </View>
        )}
        {pushStatus ? (
          <Text style={styles.pushStatus}>{pushStatus}</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, padding: space[5] },
  scroll: { padding: space[4], paddingBottom: space[7] },
  heroGradient: { position: "absolute", left: 0, right: 0, top: 0, height: 220 },
  identityCard: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  identityStripe: { height: 4, backgroundColor: colors.amber },
  identityRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(245,166,35,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  email: { color: colors.textPrimary, fontSize: 15, fontWeight: "700" },
  signedIn: { color: colors.textMuted, fontSize: 11, marginTop: 2, letterSpacing: 1 },
  signOutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signOutText: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1.5 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: colors.canceled + "55",
    padding: 10,
    borderRadius: radii.md,
  },
  errorText: { color: colors.canceled, marginLeft: 8, fontSize: 12 },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: space[3],
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    paddingBottom: 6,
  },
  cardTitle: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2,
    marginLeft: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowLabel: { flexDirection: "row", alignItems: "center" },
  rowText: { color: colors.textPrimary, fontSize: 14, marginLeft: 10 },
  divider: { height: 1, backgroundColor: colors.borderSubtle, marginHorizontal: 14 },
  fieldLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  iataInput: {
    marginTop: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.textPrimary,
    width: 130,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 4,
  },
  cta: {
    backgroundColor: colors.amber,
    paddingVertical: 12,
    borderRadius: radii.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: { color: colors.bg, fontWeight: "800", letterSpacing: 2, marginLeft: 6 },
  pushStatus: { color: colors.textSecondary, fontSize: 12, paddingHorizontal: 14, paddingBottom: 14 },
});
