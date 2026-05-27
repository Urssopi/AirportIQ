"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import useSWR from "swr";

import { RiskBadge } from "@/components/RiskBadge";
import { Skeleton } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { findAirport } from "@/lib/airports";
import { formatTime, minutesUntil } from "@/lib/format";
import { swrFetcher } from "@/lib/swr-fetcher";

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
  iata: string;
  faa_delay: { type?: string | null; reason?: string | null; avg_delay_minutes?: number | null } | null;
};
type TsaWait = {
  wait_minutes: number | null;
  confidence: string;
  trend: string;
};
type ArrivalPlan = {
  recommended_arrival: string;
  leave_home_by: string | null;
  breakdown: { total_lead_minutes: number };
  summary: string;
};

export default function FlightDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { session } = useAuth();

  // id = "{IATA}-{YYYY-MM-DD}" e.g. UA245-2026-05-12
  const decoded = decodeURIComponent(params.id);
  const dashIdx = decoded.search(/-\d{4}-\d{2}-\d{2}$/);
  const flightIata = dashIdx > 0 ? decoded.slice(0, dashIdx) : decoded;
  const flightDate = dashIdx > 0 ? decoded.slice(dashIdx + 1) : "";

  const { data: detail, error: detailErr } = useSWR<FlightDetail>(
    flightIata && flightDate ? `/api/flights/${flightIata}/${flightDate}` : null,
    swrFetcher,
    { refreshInterval: 60_000 }
  );

  const { data: risk } = useSWR<Risk>(
    flightIata && flightDate ? `/api/flights/${flightIata}/${flightDate}/risk` : null,
    swrFetcher
  );

  const { data: faaStatus } = useSWR<AirportStatus>(
    detail?.departure_iata ? `/api/airports/${detail.departure_iata}/status` : null,
    swrFetcher
  );

  const { data: tsa } = useSWR<TsaWait>(
    detail?.departure_iata ? `/api/tsa/${detail.departure_iata}` : null,
    swrFetcher
  );

  const [plan, setPlan] = useState<ArrivalPlan | null>(null);
  useEffect(() => {
    if (!detail || !(detail.estimated_departure || detail.scheduled_departure)) return;
    apiFetch<ArrivalPlan>("/api/plan/arrival", {
      method: "POST",
      body: JSON.stringify({
        departure_time: detail.estimated_departure ?? detail.scheduled_departure,
        tsa_wait_minutes: tsa?.wait_minutes ?? 15,
        has_tsa_precheck: false,
        is_international: false,
        gate_walk_minutes: 10,
        transport_buffer_minutes: 0,
      }),
    })
      .then(setPlan)
      .catch(() => setPlan(null));
  }, [detail, tsa]);

  const [tracking, setTracking] = useState(false);
  const [trackMsg, setTrackMsg] = useState<string | null>(null);
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

  if (detailErr) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-10">
        <h1 className="font-display text-2xl text-amber mb-4">{flightIata}</h1>
        <p className="text-status-canceled">{String(detailErr.message ?? "Failed to load")}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 md:px-6 py-6">
      <Link href={`/board/${detail?.departure_iata ?? ""}`} className="text-text-secondary text-xs uppercase tracking-widest">
        ← Back to board
      </Link>

      {/* 1. Status header */}
      <section className="mt-3 rounded-lg border border-border bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="font-display text-4xl text-amber tracking-widest">
              {flightIata}
            </div>
            <div className="text-text-secondary text-sm mt-1">
              {detail?.airline ?? "—"} · {flightDate}
            </div>
            <div className="font-display text-2xl mt-3">
              {detail ? (
                <>
                  {detail.departure_iata}
                  <span className="text-text-secondary mx-2">→</span>
                  {detail.arrival_iata}
                </>
              ) : (
                <Skeleton className="h-8 w-48" />
              )}
            </div>
            <div className="text-text-secondary text-xs mt-1">
              {findAirport(detail?.departure_iata ?? "")?.city}
              {detail?.arrival_iata && " · "}
              {findAirport(detail?.arrival_iata ?? "")?.city}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            {detail ? <StatusBadge status={detail.status} /> : <Skeleton className="h-6 w-20" />}
            {risk && <RiskBadge label={risk.label} reason={risk.reason} />}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={track}
            disabled={tracking || !detail}
            className="rounded bg-amber text-bg font-semibold px-4 py-2 text-sm disabled:opacity-50"
          >
            {tracking ? "Saving…" : session ? "Track this flight" : "Sign in to track"}
          </button>
          {trackMsg && <span className="text-sm text-text-secondary">{trackMsg}</span>}
        </div>
      </section>

      {/* 2. Timeline */}
      <section className="mt-4 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xs uppercase tracking-widest text-text-secondary mb-3">
          Timeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <TimelineRow
            label="Scheduled departure"
            value={formatTime(detail?.scheduled_departure)}
          />
          <TimelineRow
            label="Estimated departure"
            value={formatTime(detail?.estimated_departure ?? detail?.scheduled_departure)}
            highlight={!!detail?.estimated_departure && detail.estimated_departure !== detail.scheduled_departure}
          />
          <TimelineRow label="Boarding (est.)" value={boardingTime(detail)} />
          <TimelineRow label="Terminal / Gate" value={`${detail?.terminal ?? "—"} / ${detail?.gate ?? "—"}`} />
          <TimelineRow label="Scheduled arrival" value={formatTime(detail?.scheduled_arrival)} />
          <TimelineRow label="Estimated arrival" value={formatTime(detail?.estimated_arrival ?? detail?.scheduled_arrival)} />
        </div>
      </section>

      {/* 3. Arrival plan */}
      <section className="mt-4 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xs uppercase tracking-widest text-text-secondary mb-3">
          Your arrival plan
        </h2>
        {plan ? (
          <>
            <div className="font-display text-3xl text-amber">
              Arrive by {formatTime(plan.recommended_arrival)}
            </div>
            <p className="text-text-secondary text-sm mt-1">{plan.summary}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 text-sm">
              <Stat label="TSA wait" value={tsa?.wait_minutes != null ? `${tsa.wait_minutes} min` : "—"} hint={tsa?.confidence ? `${tsa.confidence} confidence` : undefined} />
              <Stat label="Total lead" value={`${plan.breakdown.total_lead_minutes} min`} />
              <Stat label="Walk to gate" value="~10 min" />
              <Stat label="Security" value="Standard" hint="Sign in for PreCheck" />
            </div>
          </>
        ) : (
          <Skeleton className="h-16 w-full" />
        )}
      </section>

      {/* 4. Airport conditions */}
      <section className="mt-4 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xs uppercase tracking-widest text-text-secondary mb-3">
          Airport conditions
        </h2>
        <div className="space-y-3 text-sm">
          {faaStatus?.faa_delay ? (
            <div className="text-status-delayed">
              {faaStatus.faa_delay.type ?? "FAA notice"} at {detail?.departure_iata}
              {faaStatus.faa_delay.avg_delay_minutes ? ` — avg ${faaStatus.faa_delay.avg_delay_minutes} min` : ""}
              {faaStatus.faa_delay.reason && (
                <span className="block text-text-secondary text-xs mt-1">{faaStatus.faa_delay.reason}</span>
              )}
            </div>
          ) : (
            <div className="text-status-ontime">No FAA delay programs active at {detail?.departure_iata}.</div>
          )}
          <div className="text-text-secondary text-xs">Weather + crowd integration arrives in a later phase.</div>
        </div>
      </section>

      {/* 5. Inbound aircraft */}
      <section className="mt-4 rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xs uppercase tracking-widest text-text-secondary mb-3">
          Inbound aircraft
        </h2>
        {detail?.inbound ? (
          <div className="text-sm">
            <div>
              Arriving from <span className="font-display text-amber">{detail.inbound.origin_iata ?? "—"}</span>
            </div>
            <div className="text-text-secondary mt-1">
              ETA {formatTime(detail.inbound.estimated_arrival ?? detail.inbound.scheduled_arrival)}
              {detail.inbound.scheduled_arrival && detail.inbound.estimated_arrival && detail.inbound.estimated_arrival !== detail.inbound.scheduled_arrival && (
                <span className="ml-2 line-through">{formatTime(detail.inbound.scheduled_arrival)}</span>
              )}
            </div>
            <div className="mt-2"><StatusBadge status={detail.inbound.status} /></div>
          </div>
        ) : (
          <p className="text-text-secondary text-sm">No inbound aircraft data available.</p>
        )}
      </section>
    </main>
  );
}

function TimelineRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between border-b border-border/30 pb-2">
      <span className="text-text-secondary text-xs uppercase tracking-widest">{label}</span>
      <span className={`font-display ${highlight ? "text-amber" : "text-text-primary"}`}>{value}</span>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-bg/40 rounded p-3">
      <div className="text-text-secondary text-xs uppercase tracking-widest">{label}</div>
      <div className="font-display text-lg mt-1">{value}</div>
      {hint && <div className="text-text-secondary text-xs mt-1">{hint}</div>}
    </div>
  );
}

function boardingTime(detail: FlightDetail | undefined): string {
  if (!detail) return "—";
  const etd = detail.estimated_departure ?? detail.scheduled_departure;
  if (!etd) return "—";
  const d = new Date(etd);
  d.setMinutes(d.getMinutes() - 35);
  const mins = minutesUntil(d);
  const time = formatTime(d);
  return mins != null && mins > 0 ? `${time} (in ${mins} min)` : time;
}
