type Status = "on_time" | "delayed" | "canceled" | "boarding" | "scheduled" | "unknown" | string;

const STYLES: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  on_time:   { label: "On Time",   bg: "bg-status-ontime/15",   text: "text-status-ontime",   ring: "ring-status-ontime/40" },
  scheduled: { label: "Scheduled", bg: "bg-text-secondary/15",  text: "text-text-secondary",  ring: "ring-text-secondary/30" },
  delayed:   { label: "Delayed",   bg: "bg-status-delayed/15",  text: "text-status-delayed",  ring: "ring-status-delayed/40" },
  canceled:  { label: "Canceled",  bg: "bg-status-canceled/15", text: "text-status-canceled", ring: "ring-status-canceled/40" },
  boarding:  { label: "Boarding",  bg: "bg-status-boarding/15", text: "text-status-boarding", ring: "ring-status-boarding/40" },
  unknown:   { label: "—",         bg: "bg-text-secondary/10",  text: "text-text-secondary",  ring: "ring-text-secondary/20" },
};

export function StatusBadge({ status }: { status: Status }) {
  const s = STYLES[status] ?? STYLES.unknown;
  return (
    <span
      className={`inline-flex items-center font-display text-xs uppercase tracking-wider px-2 py-1 rounded ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      {s.label}
    </span>
  );
}
