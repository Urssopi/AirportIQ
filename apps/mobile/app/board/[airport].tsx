import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Link, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ErrorView } from "../../components/ErrorView";
import { Skeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { apiFetch } from "../../lib/api";
import { findAirport } from "../../lib/airports";
import { formatTimeAtAirport } from "../../lib/format";
import { colors, gradients, radii, shadow, space } from "../../lib/theme";

type Flight = {
  flight_iata: string;
  airline: string | null;
  destination_iata: string;
  destination_city: string | null;
  scheduled_departure: string;
  estimated_departure: string | null;
  terminal: string | null;
  gate: string | null;
  status: string;
};

type Board = { airport_iata: string; fetched_at: string; flights: Flight[] };
type AirportStatus = {
  iata: string;
  faa_delay: {
    type?: string | null;
    reason?: string | null;
    avg_delay_minutes?: number | null;
  } | null;
};

const REFRESH_MS = 60_000;

export default function BoardView({
  paramsOverride,
}: {
  paramsOverride?: { airport: string };
}) {
  const local = useLocalSearchParams<{ airport: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const iata = (paramsOverride?.airport ?? local.airport ?? "").toUpperCase();
  const meta = findAirport(iata);

  const [board, setBoard] = useState<Board | null>(null);
  const [status, setStatus] = useState<AirportStatus | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsToRefresh, setSecondsToRefresh] = useState(60);
  const [airlineFilter, setAirlineFilter] = useState<string>("all");
  const [destFilter, setDestFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [b, s] = await Promise.all([
        apiFetch<Board>(`/api/flights/${iata}/board?hours_window=12`),
        apiFetch<AirportStatus>(`/api/airports/${iata}/status`),
      ]);
      setBoard(b);
      setStatus(s);
      setSecondsToRefresh(60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [iata]);

  useEffect(() => {
    void load();
    const id = setInterval(load, REFRESH_MS);
    const tick = setInterval(
      () => setSecondsToRefresh((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => {
      clearInterval(id);
      clearInterval(tick);
    };
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Drop flights that already departed more than 15 min ago, then sort by ETD.
  const cutoff = Date.now() - 15 * 60_000;
  const upcoming = useMemo(
    () =>
      [...(board?.flights ?? [])]
        .filter((f) => {
          const t = new Date(f.estimated_departure ?? f.scheduled_departure).getTime();
          return Number.isFinite(t) && t >= cutoff;
        })
        .sort(
          (a, b) =>
            new Date(a.estimated_departure ?? a.scheduled_departure).getTime() -
            new Date(b.estimated_departure ?? b.scheduled_departure).getTime(),
        ),
    [board, cutoff],
  );

  // Unique airlines + destinations, sorted by frequency desc (most common first).
  const airlines = useMemo(() => {
    const counts = new Map<string, number>();
    upcoming.forEach((f) => {
      if (f.airline) counts.set(f.airline, (counts.get(f.airline) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [upcoming]);

  const destinations = useMemo(() => {
    const counts = new Map<string, number>();
    upcoming.forEach((f) => {
      if (f.destination_iata)
        counts.set(f.destination_iata, (counts.get(f.destination_iata) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([iata]) => iata);
  }, [upcoming]);

  const flights = useMemo(
    () =>
      upcoming.filter(
        (f) =>
          (airlineFilter === "all" || f.airline === airlineFilter) &&
          (destFilter === "all" || f.destination_iata === destFilter),
      ),
    [upcoming, airlineFilter, destFilter],
  );

  return (
    <View style={styles.screen}>
      <LinearGradient colors={gradients.hero} style={styles.heroGradient} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        {paramsOverride ? null : (
          <Pressable
            onPress={() => router.navigate("/(tabs)")}
            hitSlop={16}
            style={styles.back}
          >
            <Ionicons name="chevron-back" size={22} color={colors.amber} />
            <Text style={styles.backLabel}>Back</Text>
          </Pressable>
        )}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>DEPARTURES</Text>
            <Text style={styles.iata}>{iata}</Text>
            <Text style={styles.airportName} numberOfLines={1}>
              {meta?.name ?? ""}
            </Text>
          </View>
          <View style={styles.liveBox}>
            <View style={styles.liveRow}>
              <View style={styles.liveDot} />
              <Text style={styles.liveLabel}>LIVE</Text>
            </View>
            <Text style={styles.refresh}>refresh {secondsToRefresh}s</Text>
          </View>
        </View>

        {status?.faa_delay ? (
          <View style={[styles.banner, { borderColor: colors.delayed + "55", backgroundColor: "rgba(234,179,8,0.12)" }]}>
            <Ionicons name="warning" size={14} color={colors.delayed} />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={[styles.bannerTitle, { color: colors.delayed }]}>
                {status.faa_delay.type ?? "FAA notice"}
                {status.faa_delay.avg_delay_minutes
                  ? ` · avg ${status.faa_delay.avg_delay_minutes} min`
                  : ""}
              </Text>
              {status.faa_delay.reason ? (
                <Text style={styles.bannerReason}>{status.faa_delay.reason}</Text>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.banner, { borderColor: colors.ontime + "44", backgroundColor: "rgba(34,197,94,0.08)" }]}>
            <View style={[styles.dot, { backgroundColor: colors.ontime }]} />
            <Text style={[styles.bannerTitle, { color: colors.ontime, marginLeft: 8 }]}>
              No FAA delay programs active.
            </Text>
          </View>
        )}
      </View>

      {!board && !error ? (
        <View style={{ paddingTop: 4, paddingHorizontal: space[5] }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton
              key={i}
              height={86}
              style={{ marginBottom: 10 }}
              rounded={radii.lg}
            />
          ))}
        </View>
      ) : !board && error ? (
        <ErrorView message={error} onRetry={() => void load()} />
      ) : (
        <FlatList
          data={flights}
          keyExtractor={(f) => `${f.flight_iata}-${f.scheduled_departure}`}
          contentContainerStyle={styles.listPad}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.amber}
            />
          }
          ListHeaderComponent={
            <>
              {error ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle" size={14} color={colors.canceled} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              {airlines.length > 0 ? (
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>AIRLINE</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    <FilterChip
                      label="All"
                      active={airlineFilter === "all"}
                      onPress={() => setAirlineFilter("all")}
                    />
                    {airlines.map((a) => (
                      <FilterChip
                        key={a}
                        label={a}
                        active={airlineFilter === a}
                        onPress={() => setAirlineFilter(a)}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {destinations.length > 0 ? (
                <View style={styles.filterGroup}>
                  <Text style={styles.filterLabel}>DESTINATION</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.chipRow}
                  >
                    <FilterChip
                      label="All"
                      active={destFilter === "all"}
                      onPress={() => setDestFilter("all")}
                    />
                    {destinations.map((d) => (
                      <FilterChip
                        key={d}
                        label={d}
                        active={destFilter === d}
                        onPress={() => setDestFilter(d)}
                      />
                    ))}
                  </ScrollView>
                </View>
              ) : null}

              {airlineFilter !== "all" || destFilter !== "all" ? (
                <Pressable
                  onPress={() => {
                    setAirlineFilter("all");
                    setDestFilter("all");
                  }}
                  hitSlop={8}
                  style={styles.clearBtn}
                >
                  <Ionicons name="close" size={12} color={colors.amber} />
                  <Text style={styles.clearBtnText}>
                    Clear filters · {flights.length} of {upcoming.length}
                  </Text>
                </Pressable>
              ) : null}

              <View style={styles.columnHead}>
                <Text style={[styles.columnLabel, { width: 78 }]}>TIME</Text>
                <Text style={[styles.columnLabel, { flex: 1 }]}>FLIGHT · DESTINATION</Text>
                <Text style={styles.columnLabel}>GATE</Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <Text style={styles.empty}>No upcoming flights.</Text>
          }
          renderItem={({ item }) => {
            const wasShifted =
              item.estimated_departure &&
              item.estimated_departure !== item.scheduled_departure;
            return (
              <Link
                href={{
                  pathname: "/flight/[id]",
                  params: {
                    id: `${item.flight_iata}-${(item.scheduled_departure || "").slice(0, 10)}`,
                  },
                }}
                asChild
              >
                <Pressable
                  android_ripple={{ color: colors.bgRaised }}
                  style={({ pressed }) => [styles.flightCard, shadow.card, pressed && { opacity: 0.85 }]}
                >
                  <View style={styles.flightRow}>
                    <View style={{ width: 78 }}>
                      <Text style={styles.timeMain}>
                        {formatTimeAtAirport(item.estimated_departure ?? item.scheduled_departure)}
                      </Text>
                      {wasShifted ? (
                        <Text style={styles.timeStrike}>
                          {formatTimeAtAirport(item.scheduled_departure)}
                        </Text>
                      ) : null}
                    </View>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={styles.flightLine}>
                        <Text style={styles.flightIata}>{item.flight_iata}</Text>
                        <Text style={styles.arrow}> → </Text>
                        <Text style={styles.destIata}>{item.destination_iata}</Text>
                      </View>
                      <Text style={styles.subtle} numberOfLines={1}>
                        {item.airline ?? "—"}
                        {item.destination_city ? ` · ${item.destination_city}` : ""}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.gate}>{item.gate ?? "—"}</Text>
                      {item.terminal ? (
                        <Text style={styles.term}>T{item.terminal}</Text>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.flightFoot}>
                    <StatusBadge status={item.status} size="sm" />
                    <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                  </View>
                </Pressable>
              </Link>
            );
          }}
        />
      )}
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      android_ripple={{ color: colors.bgRaised }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  heroGradient: { position: "absolute", left: 0, right: 0, top: 0, height: 280 },
  header: { paddingHorizontal: space[5], paddingBottom: space[4] },
  back: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  backLabel: { color: colors.amber, fontSize: 13, fontWeight: "600", marginLeft: 2 },
  headerRow: { flexDirection: "row", alignItems: "flex-end" },
  kicker: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 3 },
  iata: { color: colors.amber, fontSize: 42, fontWeight: "800", letterSpacing: 6, marginTop: 4 },
  airportName: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  liveBox: { alignItems: "flex-end" },
  liveRow: { flexDirection: "row", alignItems: "center" },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.ontime,
    marginRight: 6,
  },
  liveLabel: { color: colors.ontime, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  refresh: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: space[4],
  },
  bannerTitle: { fontSize: 13, fontWeight: "700" },
  bannerReason: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingLabel: { color: colors.textSecondary, fontSize: 12, marginTop: 10, letterSpacing: 2 },
  listPad: { paddingHorizontal: space[5], paddingBottom: space[7] },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.canceled + "55",
    backgroundColor: "rgba(239,68,68,0.1)",
    borderRadius: radii.md,
    padding: 10,
    marginTop: 12,
  },
  errorText: { color: colors.canceled, marginLeft: 8, fontSize: 12 },
  filterGroup: { marginTop: space[4] },
  filterLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  chipRow: { paddingRight: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  chipActive: {
    backgroundColor: colors.amber,
    borderColor: colors.amber,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  chipTextActive: { color: colors.bg, fontWeight: "800" },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  clearBtnText: { color: colors.amber, fontSize: 12, fontWeight: "600", marginLeft: 4 },
  columnHead: {
    flexDirection: "row",
    marginTop: space[5],
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  columnLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  empty: { color: colors.textSecondary, textAlign: "center", marginTop: 32 },
  flightCard: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: 14,
    marginBottom: 10,
  },
  flightRow: { flexDirection: "row", alignItems: "center" },
  timeMain: { color: colors.textPrimary, fontSize: 20, fontWeight: "800", letterSpacing: 1 },
  timeStrike: {
    color: colors.textMuted,
    fontSize: 11,
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  flightLine: { flexDirection: "row", alignItems: "baseline" },
  flightIata: { color: colors.amber, fontSize: 16, fontWeight: "800", letterSpacing: 2 },
  arrow: { color: colors.textMuted, fontSize: 13 },
  destIata: { color: colors.textPrimary, fontSize: 14, fontWeight: "700", letterSpacing: 1 },
  subtle: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  gate: { color: colors.textPrimary, fontSize: 17, fontWeight: "800" },
  term: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  flightFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
  },
});
