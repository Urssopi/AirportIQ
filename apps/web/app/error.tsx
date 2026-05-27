"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[airportiq] page error", error);
  }, [error]);

  return (
    <main
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <p className="font-display text-xs uppercase tracking-[3px] text-amber">
        AirportIQ
      </p>
      <h1 className="font-display text-3xl mt-3 text-text-primary">
        Something went sideways.
      </h1>
      <p className="text-text-secondary mt-3 max-w-sm text-sm">
        We couldn't load this view. The backend may be down, an API may be rate-limiting us,
        or something on the page broke. The team has been notified.
      </p>
      {error?.message ? (
        <pre className="mt-6 max-w-lg overflow-auto rounded-md border border-border bg-surface px-4 py-3 text-xs text-text-secondary text-left">
          {error.message}
        </pre>
      ) : null}
      <button
        onClick={() => reset()}
        className="mt-8 rounded bg-amber px-5 py-2 font-semibold text-bg"
      >
        Try again
      </button>
    </main>
  );
}
