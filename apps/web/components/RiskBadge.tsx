type Risk = "Low" | "Medium" | "High";

const STYLES: Record<Risk, { bg: string; text: string }> = {
  Low:    { bg: "bg-status-ontime/15",   text: "text-status-ontime" },
  Medium: { bg: "bg-status-delayed/15",  text: "text-status-delayed" },
  High:   { bg: "bg-status-canceled/15", text: "text-status-canceled" },
};

export function RiskBadge({ label, reason }: { label: Risk; reason?: string }) {
  const s = STYLES[label];
  return (
    <div className={`rounded-md px-3 py-2 ${s.bg}`}>
      <div className={`font-display text-xs uppercase tracking-widest ${s.text}`}>
        {label} risk
      </div>
      {reason && (
        <div className="text-sm text-text-primary mt-1 leading-snug">{reason}</div>
      )}
    </div>
  );
}
