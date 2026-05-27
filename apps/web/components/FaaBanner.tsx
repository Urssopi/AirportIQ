type Props = {
  iata: string;
  faa: { type?: string | null; reason?: string | null; avg_delay_minutes?: number | null } | null;
};

export function FaaBanner({ iata, faa }: Props) {
  if (!faa) {
    return (
      <div className="rounded-md border border-status-ontime/30 bg-status-ontime/5 px-4 py-2 text-sm">
        <span className="font-display text-status-ontime mr-2">●</span>
        {iata} — No FAA delay programs active.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-status-delayed/40 bg-status-delayed/10 px-4 py-2 text-sm">
      <span className="font-display text-status-delayed mr-2">●</span>
      <strong className="text-status-delayed mr-1">{faa.type ?? "FAA notice"}</strong>
      at {iata}
      {faa.avg_delay_minutes ? <span className="ml-2 text-text-secondary">avg {faa.avg_delay_minutes} min</span> : null}
      {faa.reason ? <span className="block text-text-secondary text-xs mt-1">{faa.reason}</span> : null}
    </div>
  );
}
