/**
 * Format an ISO datetime in the *device's* local timezone.
 * Use this for "in 35 min" style relative things or boarding-pass UI where
 * the user's phone time is what matters.
 */
export function formatTime(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

/**
 * Format an ISO datetime in the *airport's* local timezone — i.e. literally
 * the HH:MM that appears in the ISO string. Ignores the device's clock.
 *
 * AeroDataBox returns strings like "2026-05-12T07:55:00-06:00"; we just pluck
 * the HH:MM out of the literal string so the time displayed always matches
 * what's shown on the airport's own departure boards.
 */
export function formatTimeAtAirport(iso: string | null | undefined): string {
  if (!iso || typeof iso !== "string") return "—";
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return "—";
  let h = parseInt(m[1], 10);
  const mins = m[2];
  if (Number.isNaN(h)) return "—";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mins} ${ampm}`;
}

/**
 * Return the wall-clock time at the airport, shifted by `deltaMinutes`.
 * Handles 24h wraparound. Used for "boarding starts at X" which is
 * computed relative to the airport-local ETD.
 */
export function shiftAirportLocal(
  iso: string | null | undefined,
  deltaMinutes: number,
): string {
  if (!iso || typeof iso !== "string") return "—";
  const m = iso.match(/T(\d{2}):(\d{2})/);
  if (!m) return "—";
  let total = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + deltaMinutes;
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  let h = Math.floor(total / 60);
  const mm = total % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${mm.toString().padStart(2, "0")} ${ampm}`;
}

/** Absolute-time "in N minutes" from now — uses real UTC moment. */
export function minutesUntil(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.round((d.getTime() - Date.now()) / 60000);
}
