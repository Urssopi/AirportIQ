import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { colors, gradients, radii, shadow, space } from "../../lib/theme";

type Trip = {
  id: string;
  flight_iata: string;
  flight_date: string;
  departure_airport: string;
  arrival_airport: string;
};

export default function Trips() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [trips, setTrips] = useState<Trip[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) {
      setTrips([]);
      return;
    }
    setError(null);
    try {
      const data = await apiFetch<Trip[]>("/api/trips");
      setTrips(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/api/trips/${id}`, { method: "DELETE" });
      setTrips((cur) => (cur ?? []).filter((t) => t.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  if (!session) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Ionicons name="bookmark-outline" size={56} color={colors.textMuted} />
        <Text style={styles.emptyTitle}>Sign in to track flights</Text>
        <Text style={styles.emptyBody}>
          Saved flights show up here with status and alerts.
        </Text>
        <Link href="/login" asChild>
          <Pressable style={styles.btn}>
            <Text style={styles.btnText}>SIGN IN</Text>
          </Pressable>
        </Link>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={gradients.hero} style={styles.heroGradient} pointerEvents="none" />
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.kicker}>MY TRIPS</Text>
        <Text style={styles.title}>Tracked flights</Text>
        <Text style={styles.subtitle}>
          We watch for delays, gate changes, and "leave now" times.
        </Text>
      </View>

      <FlatList
        contentContainerStyle={styles.listPad}
        data={trips ?? []}
        keyExtractor={(t) => t.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.amber} />
        }
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={colors.canceled} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Ionicons name="airplane-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>No tracked flights yet</Text>
            <Text style={styles.emptyBody}>
              Open a flight from a board and tap "Track this flight."
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/flight/[id]",
                params: { id: `${item.flight_iata}-${item.flight_date}` },
              })
            }
            style={({ pressed }) => [styles.card, shadow.card, pressed && { opacity: 0.85 }]}
          >
            <View style={styles.avatar}>
              <Ionicons name="airplane" size={20} color={colors.amber} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.flightIata}>{item.flight_iata}</Text>
              <Text style={styles.route}>
                {item.departure_airport} → {item.arrival_airport}
              </Text>
              <Text style={styles.date}>{item.flight_date}</Text>
            </View>
            <Pressable onPress={() => remove(item.id)} hitSlop={8} style={styles.trash}>
              <Ionicons name="trash-outline" size={18} color={colors.canceled} />
            </Pressable>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space[6],
  },
  heroGradient: { position: "absolute", left: 0, right: 0, top: 0, height: 220 },
  header: { paddingHorizontal: space[5], paddingBottom: space[4] },
  kicker: { color: colors.amber, fontSize: 11, fontWeight: "700", letterSpacing: 4 },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginTop: 6,
  },
  subtitle: { color: colors.textSecondary, fontSize: 13, marginTop: 6 },
  listPad: { paddingHorizontal: space[5], paddingTop: 12, paddingBottom: space[7] },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.canceled + "55",
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: radii.md,
    padding: 10,
    marginBottom: 12,
  },
  errorText: { color: colors.canceled, marginLeft: 8, fontSize: 12 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: "rgba(245,166,35,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  flightIata: { color: colors.amber, fontWeight: "800", letterSpacing: 2, fontSize: 16 },
  route: { color: colors.textPrimary, fontSize: 14, marginTop: 2 },
  date: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  trash: { padding: 8 },
  emptyTitle: { color: colors.textPrimary, fontSize: 17, fontWeight: "700", marginTop: 16 },
  emptyBody: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: space[6],
    lineHeight: 18,
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
