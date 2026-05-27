import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-xs uppercase tracking-[3px] text-amber">
        AirportIQ
      </p>
      <h1 className="font-display text-5xl mt-3 text-text-primary">404</h1>
      <p className="text-text-secondary mt-3 max-w-sm text-sm">
        This route isn't on the schedule.
      </p>
      <Link
        href="/"
        className="mt-8 rounded bg-amber px-5 py-2 font-semibold text-bg"
      >
        Back to departures
      </Link>
    </main>
  );
}
