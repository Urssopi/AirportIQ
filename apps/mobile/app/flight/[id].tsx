import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card } from "../../components/Card";
import { ErrorView } from "../../components/ErrorView";
import { RiskBadge } from "../../components/RiskBadge";
import { Skeleton } from "../../components/Skeleton";
import { StatusBadge } from "../../components/StatusBadge";
import { apiFetch } from "../../lib/api";
import { useAuth } from "../../lib/auth-context";
import { findAirport } from "../../lib/airports";
import { formatTime, formatTimeAtAirport, minutesUntil, shiftAirportLocal } from "../../lib/format";
import { colors, gradients, radii, shadow, space } from "../../lib/theme";

type FlightDetail = {
  flight_iata: string;
  flight_date: string;
  airline: string | null;
  departure_iata: string;
  arrival_iata: string;
  scheduled_departure: string | null;
  estimated_departure: string | null;
  scheduled_arrival: string | null;
  estimated_arrival: string | null;
  terminal: string | null;
  gate: string | null;
  status: string;
  inbound: {
    origin_iata: string | null;
    scheduled_arrival: string | null;
    estimated_arrival: string | null;
    status: string;
  } | null;
};
type Risk = { score: number; label: "Low" | "Medium" | "High"; reason: string };
type AirportStatus = {
  faa_delay: { type?: string | null; reason?: string | null; avg_delay_minutes?: number | null } | null;
};
type TsaWait = { wait_minutes: number | null; confidence: string };
type ArrivalPlan = {
  recommended_arrival: string;
  breakdown: { total_lead_minutes: number };
  summary: string;
};

export default function FlightDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();

  const dashIdx = (id ?? "").search(/-\d{4}-\d{2}-\d{2}$/);
  const flightIata = dashIdx > 0 ? id!.slice(0, dashIdx) : id ?? "";
  const flightDate = dashIdx > 0 ? id!.slice(dashIdx + 1) : "";

  const [detail, setDetail] = useState<FlightDetail | null>(null);
  const [risk, setRisk] = useState<Risk | null>(null);
  const [faa, setFaa] = useState<AirportStatus | null>(null);
  const [tsa, setTsa] = useState<TsaWait | null>(null);
  const [plan, setPlan] = useState<ArrivalPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState(false);
  const [trackMsg, setTrackMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!flightIata || !flightDate) return;
    setError(null);
    try {
      const d = await apiFetch<FlightDetail>(`/api/flights/${flightIata}/${flightDate}`);
      setDetail(d);
      const dep = d.departure_iata;
      const [r, f, t] = await Promise.allSettled([
        apiFetch<Risk>(`/api/flights/${flightIata}/${flightDate}/risk`),
        apiFetch<AirportStatus>(`/api/airports/${dep}/status`),
        apiFetch<TsaWait>(`/api/tsa/${dep}`),
      ]);
      if (r.status === "fulfilled") setRisk(r.value);
      if (f.status === "fulfilled") setFaa(f.value);
      if (t.status === "fulfilled") setTsa(t.value);
      try {
        const arrival = await apiFetch<ArrivalPlan>("/api/plan/arrival", {
          method: "POST",
          body: JSON.stringify({
            departure_time: d.estimated_departure ?? d.scheduled_departure,
            tsa_wait_minutes: t.status === "fulfilled" ? t.value.wait_minutes ?? 15 : 15,
            has_tsa_precheck: false,
            is_international: false,
            gate_walk_minutes: 10,
            transport_buffer_minutes: 0,
          }),
        });
        setPlan(arrival);
      } catch {
        setPlan(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    }
  }, [flightIata, flightDate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function track() {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!detail) return;
    setTracking(true);
    setTrackMsg(null);
    try {
      await apiFetch("/api/trips", {
        method: "POST",
        body: JSON.stringify({
          flight_iata: detail.flight_iata,
          flight_date: detail.flight_date,
          departure_airport: detail.departure_iata,
          arrival_airport: detail.arrival_iata,
        }),
      });
      setTrackMsg("Saved to your trips.");
    } catch (e) {
      setTrackMsg(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setTracking(false);
    }
  }

  if (error) {
    return <ErrorView message={error} onRetry={() => void load()} />;
  }
  if (!detail) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, padding: space[4] }}>
        <Skeleton height={20} width={120} />
        <View style={{ marginTop: space[4] }}>
          <Skeleton height={220} rounded={20} />
        </View>
        {Array.from({ length: 3 }).map((_, i) => (
          <View key={i} style={{ marginTop: space[3] }}>
            <Skeleton height={120} rounded={20} />
          </View>
        ))}
      </View>
    );
  }

  const etd = detail.estimated_departure ?? detail.scheduled_departure;
  // Boarding "wall-clock" time at the airport (35 min before ETD, local to dep airport).
  const boardingAtAirport = etd ? shiftAirportLocal(etd, -35) : "—";
  // "in N min" relative to user's actual clock, since that's what matters for them.
  const boardingMinsAway = etd
    ? minutesUntil(new Date(new Date(etd).getTime() - 35 * 60_000))
    : null;
  const delayMinutes =
    detail.scheduled_departure && detail.estimated_departure
      ? Math.round(
          (new Date(detail.estimated_departure).getTime() -
            new Date(detail.scheduled_departure).getTime()) /
            60_000,
        )
      : 0;

  const goBack = () => {
    if (detail?.departure_iata) {
      router.navigate(`/board/${detail.departure_iata}`);
    } else {
      router.navigate("/(tabs)");
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable onPress={goBack} hitSlop={16} style={styles.headerBack}>
              <Ionicons name="chevron-back" size={24} color={colors.amber} />
              <Text style={styles.headerBackText}>Back</Text>
            </Pressable>
          ),
        }}
      />
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.scroll}>
      {/* Boarding pass hero */}
      <View style={[styles.pass, shadow.card]}>
        <LinearGradient
          colors={["rgba(245,166,35,0.25)", "rgba(245,166,35,0.05)", "rgba(7,7,13,0)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.passStripe} />
        <View style={{ padding: space[5] }}>
          <View style={styles.passTop}>
            <View>
              <Text style={styles.airline}>{detail.airline ?? "Flight"}</Text>
              <Text style={styles.flightNumber}>{detail.flight_iata}</Text>
              <Text style={styles.flightDate}>{detail.flight_date}</Text>
            </View>
            <StatusBadge status={detail.status} />
          </View>

          <View style={styles.route}>
            <View>
              <Text style={styles.routeIata}>{detail.departure_iata}</Text>
              <Text style={styles.routeCity} numberOfLines={1}>
                {findAirport(detail.departure_iata)?.city ?? ""}
              </Text>
              <Text style={styles.routeTime}>{formatTimeAtAirport(etd)}</Text>
              {delayMinutes > 0 ? (
                <Text style={styles.routeDelay}>+{delayMinutes} min late</Text>
              ) : null}
            </View>
            <View style={styles.routeMid}>
              <View style={styles.routeLineLeft} />
              <Ionicons name="airplane" size={20} color={colors.amber} />
              <View style={styles.routeLineRight} />
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.routeIata}>{detail.arrival_iata}</Text>
              <Text style={[styles.routeCity, { textAlign: "right" }]} numberOfLines={1}>
                {findAirport(detail.arrival_iata)?.city ?? ""}
              </Text>
              <Text style={styles.routeTime}>
                {formatTimeAtAirport(detail.estimated_arrival ?? detail.scheduled_arrival)}
              </Text>
            </View>
          </View>

          {/* Tear-off */}
          <View style={styles.tear}>
            <View style={styles.tearCircle} />
            <View style={styles.tearLine} />
            <View style={[styles.tearCircle, { marginLeft: -8 }]} />
          </View>

          <View style={styles.infoRow}>
            <Info label="Terminal" value={detail.terminal ?? "—"} />
            <Info label="Gate" value={detail.gate ?? "—"} highlight />
            <Info
              label="Boards"
              value={boardingAtAirport}
              sub={
                boardingMinsAway != null && boardingMinsAway > 0
                  ? `in ${boardingMinsAway} min`
                  : undefined
              }
            />
          </View>

          <Pressable
            onPress={track}
            disabled={tracking}
            style={({ pressed }) => [styles.trackBtn, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name={session ? "bookmark" : "log-in"} size={16} color={colors.bg} />
            <Text style={styles.trackBtnText}>
              {tracking ? "SAVING…" : session ? "TRACK THIS FLIGHT" : "SIGN IN TO TRACK"}
            </Text>
          </Pressable>
          {trackMsg ? <Text style={styles.trackMsg}>{trackMsg}</Text> : null}
        </View>
      </View>

      {risk ? (
        <View style={{ marginTop: space[3] }}>
          <RiskBadge label={risk.label} reason={risk.reason} />
        </View>
      ) : null}

      <View style={{ marginTop: space[3] }}>
        <Card title="Your arrival plan" icon="time-outline">
          {plan ? (
            <>
              <Text style={styles.bigAmber}>Arrive by {formatTimeAtAirport(plan.recommended_arrival)}</Text>
              <Text style={styles.summary}>{plan.summary}</Text>
              <View style={styles.statsRow}>
                <Stat
                  label="TSA wait"
                  value={tsa?.wait_minutes != null ? `${tsa.wait_minutes} min` : "—"}
                  sub={tsa?.confidence ? `${tsa.confidence} conf.` : undefined}
                />
                <Stat label="Total lead" value={`${plan.breakdown.total_lead_minutes} min`} />
              </View>
            </>
          ) : (
            <Text style={{ color: colors.textSecondary }}>Loading…</Text>
          )}
        </Card>
      </View>

      <View style={{ marginTop: space[3] }}>
        <Card title="Airport conditions" icon="cloud-outline">
          {faa?.faa_delay ? (
            <View style={{ flexDirection: "row" }}>
              <Ionicons name="warning" size={16} color={colors.delayed} />
              <View style={{ marginLeft: 8, flex: 1 }}>
                <Text style={{ color: colors.delayed, fontWeight: "700" }}>
                  {faa.faa_delay.type ?? "FAA notice"} at {detail.departure_iata}
                  {faa.faa_delay.avg_delay_minutes
                    ? ` · avg ${faa.faa_delay.avg_delay_minutes} min`
                    : ""}
                </Text>
                {faa.faa_delay.reason ? (
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                    {faa.faa_delay.reason}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[styles.statusDot, { backgroundColor: colors.ontime }]} />
              <Text style={{ color: colors.ontime, fontSize: 13, marginLeft: 8 }}>
                No FAA delay programs active.
              </Text>
            </View>
          )}
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 10 }}>
            Weather + crowd integration arrives in a later phase.
          </Text>
        </Card>
      </View>

      <View style={{ marginTop: space[3], marginBottom: space[6] }}>
        <Card title="Inbound aircraft" icon="swap-horizontal">
          {detail.inbound ? (
            <>
              <Text style={{ color: colors.textPrimary }}>
                From{" "}
                <Text style={{ color: colors.amber, fontWeight: "700" }}>
                  {detail.inbound.origin_iata ?? "—"}
                </Text>
              </Text>
              <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
                ETA{" "}
                {formatTimeAtAirport(detail.inbound.estimated_arrival ?? detail.inbound.scheduled_arrival)}
              </Text>
              <View style={{ marginTop: 10 }}>
                <StatusBadge status={detail.inbound.status} />
              </View>
            </>
          ) : (
            <Text style={{ color: colors.textSecondary }}>No inbound aircraft data.</Text>
          )}
        </Card>
      </View>
    </ScrollView>
    </>
  );
}

function Info({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.infoLabel}>{label.toUpperCase()}</Text>
      <Text style={[styles.infoValue, highlight && { color: colors.amber }]}>{value}</Text>
      {sub ? <Text style={styles.infoSub}>{sub}</Text> : null}
    </View>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" },
  scroll: { padding: space[4], paddingBottom: space[8] },
  headerBack: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4 },
  headerBackText: { color: colors.amber, fontSize: 16, fontWeight: "600", marginLeft: -2 },
  pass: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  passStripe: { height: 4, backgroundColor: colors.amber },
  passTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  airline: { color: colors.textSecondary, fontSize: 11, fontWeight: "700", letterSpacing: 2 },
  flightNumber: { color: colors.amber, fontSize: 36, fontWeight: "800", letterSpacing: 4, marginTop: 4 },
  flightDate: { color: colors.textMuted, fontSize: 12, marginTop: 4 },
  route: { flexDirection: "row", alignItems: "center", marginTop: space[5] },
  routeIata: { color: colors.textPrimary, fontSize: 30, fontWeight: "800", letterSpacing: 3 },
  routeCity: { color: colors.textSecondary, fontSize: 11, marginTop: 2 },
  routeTime: { color: colors.textPrimary, fontSize: 15, marginTop: 8, fontWeight: "600" },
  routeDelay: { color: colors.delayed, fontSize: 11, marginTop: 2 },
  routeMid: { flex: 1, flexDirection: "row", alignItems: "center", marginHorizontal: 12 },
  routeLineLeft: { flex: 1, height: 1, backgroundColor: colors.border, marginRight: 6 },
  routeLineRight: { flex: 1, height: 1, backgroundColor: colors.border, marginLeft: 6 },
  tear: { flexDirection: "row", alignItems: "center", marginTop: space[5], marginHorizontal: -space[5] },
  tearCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.bg,
    marginLeft: -8,
  },
  tearLine: {
    flex: 1,
    height: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  infoRow: { flexDirection: "row", marginTop: space[5], gap: 12 },
  infoLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  infoValue: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", marginTop: 4 },
  infoSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  trackBtn: {
    backgroundColor: colors.amber,
    borderRadius: radii.md,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: space[5],
  },
  trackBtnText: { color: colors.bg, fontWeight: "800", letterSpacing: 2, marginLeft: 6 },
  trackMsg: { color: colors.textSecondary, fontSize: 12, marginTop: 8, textAlign: "center" },
  bigAmber: { color: colors.amber, fontSize: 26, fontWeight: "800", letterSpacing: 1 },
  summary: { color: colors.textSecondary, fontSize: 13, marginTop: 6, lineHeight: 18 },
  statsRow: { flexDirection: "row", gap: 10, marginTop: space[3] },
  stat: {
    flex: 1,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radii.md,
    padding: 12,
  },
  statLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "700", letterSpacing: 2 },
  statValue: { color: colors.textPrimary, fontSize: 18, fontWeight: "800", marginTop: 6 },
  statSub: { color: colors.textMuted, fontSize: 10, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
});
