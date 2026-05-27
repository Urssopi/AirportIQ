"use client";

import { useEffect, useState } from "react";

export function CountdownTimer({
  refreshIntervalMs,
  lastFetchedAt,
}: {
  refreshIntervalMs: number;
  lastFetchedAt: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(refreshIntervalMs / 1000);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - lastFetchedAt) / 1000;
      const left = Math.max(0, Math.round(refreshIntervalMs / 1000 - elapsed));
      setSecondsLeft(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [refreshIntervalMs, lastFetchedAt]);

  return (
    <span className="font-display text-xs text-text-secondary uppercase tracking-widest">
      Refresh in {secondsLeft}s
    </span>
  );
}
