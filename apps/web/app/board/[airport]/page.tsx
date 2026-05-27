"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";

import { CountdownTimer } from "@/components/CountdownTimer";
import { FaaBanner } from "@/components/FaaBanner";
import { Skeleton } from "@/components/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { findAirport } from "@/lib/airports";
import { formatTime } from "@/lib/format";
import { swrFetcher } from "@/lib/swr-fetcher";

const REFRESH_MS = 60_000;

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
  faa_delay: { type?: string | null; reason?: string | null; avg_delay_minutes?: number | null } | null;
};

type StatusFilter = "all" | "delayed" | "canceled" | "boarding";
type WindowFilter = "2h" | "4h" | "all";

export default function BoardPage({ params }: { params: { airport: string } }) {
  const iata = params.airport.toUpperCase();
  const airport = findAirport(iata);

  const { data: board, isLoading } = useSWR<Board>(
    `/api/flights/${iata}/board?hours_window=12`,
    swrFetcher,
    { refreshInterval: REFRESH_MS, revalidateOnFocus: true }
  );

  const { data: status } = useSWR<AirportStatus>(
    `/api/airports/${iata}/status`,
    swrFetcher,
    { refreshInterval: 120_000 }
  );

  const [airlineFilter, setAirlineFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [windowFilter, setWindowFilter] = useState<WindowFilter>("4h");
  const [terminalFilter, setTerminalFilter] = useState<string>("all");

  const airlines = useMemo(() => {
    const set = new Set<string>();
    (board?.flights ?? []).forEach((f) => f.airline && set.add(f.airline));
    return Array.from(set).sort();
  }, [board]);

  const terminals = useMemo(() => {
    const set = new Set<string>();
    (board?.flights ?? []).forEach((f) => f.terminal && set.add(f.terminal));
    return Array.from(set).sort();
  }, [board]);

  const filtered = useMemo(() => {
    const cutoff =
      windowFilter === "all"
        ? Infinity
        : Date.now() + (windowFilter === "2h" ? 2 : 4) * 60 * 60 * 1000;
    return (board?.flights ?? [])
      .filter((f) => (airlineFilter === "all" ? true : f.airline === airlineFilter))
      .filter((f) => (terminalFilter === "all" ? true : f.terminal === terminalFilter))
      .filter((f) => new Date(f.scheduled_departure).getTime() <= cutoff)
      .filter((f) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "delayed") return f.status === "delayed";
        if (statusFilter === "canceled") return f.status === "canceled";
        if (statusFilter === "boarding") return f.status === "boarding";
        return true;
      })
      .sort(
        (a, b) =>
          new Date(a.estimated_departure ?? a.scheduled_departure).getTime() -
          new Date(b.estimated_departure ?? b.scheduled_departure).getTime()
      );
  }, [board, airlineFilter, terminalFilter, windowFilter, statusFilter]);

  const lastFetched = board ? new Date(board.fetched_at).getTime() : Date.now();

  return (
    <main className="min-h-screen px-4 md:px-8 py-6">
      <header className="flex items-center justify-between mb-4">
        <div>
          <Link href="/" className="text-text-secondary text-xs uppercase tracking-widest">
            ← All airports
          </Link>
          <h1 className="font-display text-3xl md:text-4xl text-amber tracking-widest mt-1">
            {iata} <span className="text-text-secondary text-base font-sans tracking-normal">{airport?.name ?? ""}</span>
          </h1>
        </div>
        <CountdownTimer refreshIntervalMs={REFRESH_MS} lastFetchedAt={lastFetched} />
      </header>

      <FaaBanner iata={iata} faa={status?.faa_delay ?? null} />

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <FilterSelect label="Airline" value={airlineFilter} onChange={setAirlineFilter} options={[{ value: "all", label: "All" }, ...airlines.map(a => ({ value: a, label: a }))]} />
        <FilterSelect label="Terminal" value={terminalFilter} onChange={setTerminalFilter} options={[{ value: "all", label: "All" }, ...terminals.map(t => ({ value: t, label: `Terminal ${t}` }))]} />
        <FilterSelect label="Window" value={windowFilter} onChange={(v) => setWindowFilter(v as WindowFilter)} options={[{ value: "2h", label: "Next 2h" }, { value: "4h", label: "Next 4h" }, { value: "all", label: "All day" }]} />
        <FilterSelect label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as StatusFilter)} options={[{ value: "all", label: "All" }, { value: "delayed", label: "Delayed" }, { value: "canceled", label: "Canceled" }, { value: "boarding", label: "Boarding" }]} />
        <span className="text-text-secondary text-xs ml-auto">
          {filtered.length} flights
        </span>
      </div>

      <div className="mt-4 rounded-lg border border-border overflow-hidden bg-surface">
        <div className="grid grid-cols-[90px_120px_1fr_1fr_70px_120px] gap-2 px-4 py-3 border-b border-border bg-bg/50 text-text-secondary text-xs uppercase tracking-widest font-display">
          <div>Time</div>
          <div>Flight</div>
          <div>Airline</div>
          <div>Destination</div>
          <div>Gate</div>
          <div className="text-right">Status</div>
        </div>

        {isLoading && (
          <div className="p-4 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="p-8 text-center text-text-secondary text-sm">
            No flights match the current filters.
          </div>
        )}

        <ul>
          {filtered.map((f) => (
            <li
              key={`${f.flight_iata}-${f.scheduled_departure}`}
              className="grid grid-cols-[90px_120px_1fr_1fr_70px_120px] gap-2 px-4 py-3 border-b border-border/50 last:border-b-0 items-center animate-fade-in hover:bg-bg/30"
            >
              <div className="font-display text-text-primary">
                {formatTime(f.estimated_departure ?? f.scheduled_departure)}
                {f.estimated_departure && f.estimated_departure !== f.scheduled_departure && (
                  <div className="text-text-secondary text-xs line-through">
                    {formatTime(f.scheduled_departure)}
                  </div>
                )}
              </div>
              <Link
                href={`/flight/${f.flight_iata}-${(f.scheduled_departure || "").slice(0, 10)}`}
                className="font-display text-amber hover:underline"
              >
                {f.flight_iata}
              </Link>
              <div className="text-text-primary truncate">{f.airline ?? "—"}</div>
              <div className="text-text-primary truncate">
                {f.destination_iata}
                {f.destination_city && <span className="text-text-secondary text-xs ml-2">{f.destination_city}</span>}
              </div>
              <div className="font-display">{f.gate ?? "—"}</div>
              <div className="text-right"><StatusBadge status={f.status} /></div>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary uppercase tracking-widest">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-surface border border-border rounded px-2 py-1 text-text-primary text-sm font-sans normal-case tracking-normal"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}
