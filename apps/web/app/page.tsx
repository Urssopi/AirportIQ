"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AIRPORTS, searchAirports, TOP_10_IATA } from "@/lib/airports";
import { useAuth } from "@/lib/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();
  const [query, setQuery] = useState("");

  const results = useMemo(() => searchAirports(query, 8), [query]);
  const showResults = query.trim().length > 0;
  const top10 = useMemo(
    () => AIRPORTS.filter((a) => TOP_10_IATA.includes(a.iata)),
    []
  );

  function go(iata: string) {
    router.push(`/board/${iata.toUpperCase()}`);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (results[0]) go(results[0].iata);
  }

  return (
    <main className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-amber text-lg tracking-widest">
            AirportIQ
          </span>
          <span className="text-text-secondary text-xs uppercase tracking-wider">
            Real-time airport intelligence
          </span>
        </div>
        <Link
          href={session ? "/account" : "/login"}
          className="text-sm text-text-secondary hover:text-text-primary border border-border rounded px-3 py-1"
        >
          {session ? "Account" : "Sign in"}
        </Link>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <h1 className="font-display text-5xl md:text-6xl text-amber tracking-wider text-center">
          DEPARTURES
        </h1>
        <p className="mt-3 text-text-secondary text-sm md:text-base text-center max-w-xl">
          Search a US airport for live boards, security wait times, and smart arrival recommendations.
        </p>

        <form
          onSubmit={onSubmit}
          className="mt-10 w-full max-w-xl relative"
          role="search"
          aria-label="Search airports"
        >
          <label htmlFor="airport-search" className="sr-only">
            Search airport by name, city, or IATA code
          </label>
          <input
            id="airport-search"
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by airport, city, or IATA…"
            aria-autocomplete="list"
            aria-controls="airport-results"
            className="w-full bg-surface border border-border rounded-lg px-5 py-4 text-lg font-display tracking-wide focus:outline-none focus:border-amber"
          />
          {showResults && (
            <ul
              id="airport-results"
              role="listbox"
              aria-label="Matching airports"
              className="absolute left-0 right-0 mt-2 bg-surface border border-border rounded-lg overflow-hidden z-10 shadow-xl"
            >
              {results.length === 0 && (
                <li className="px-5 py-3 text-text-secondary text-sm">
                  No matching airports
                </li>
              )}
              {results.map((a) => (
                <li key={a.iata} role="option" aria-selected="false">
                  <button
                    type="button"
                    onClick={() => go(a.iata)}
                    aria-label={`Open departure board for ${a.iata} ${a.name}, ${a.city}`}
                    className="w-full flex items-center justify-between px-5 py-3 hover:bg-bg text-left"
                  >
                    <span>
                      <span className="font-display text-amber mr-3">{a.iata}</span>
                      <span className="text-text-primary">{a.name}</span>
                      <span className="text-text-secondary ml-2 text-sm">
                        {a.city}
                      </span>
                    </span>
                    <span className="text-text-secondary text-xs uppercase tracking-wider">
                      Open board →
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <section className="mt-16 w-full max-w-3xl">
          <h2 className="font-display text-xs uppercase tracking-widest text-text-secondary mb-4">
            Top airports
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {top10.map((a) => (
              <button
                key={a.iata}
                onClick={() => go(a.iata)}
                aria-label={`Open ${a.iata} ${a.name} departure board`}
                className="bg-surface border border-border rounded p-3 text-left hover:border-amber transition-colors"
              >
                <div className="font-display text-amber text-lg tracking-wider">
                  {a.iata}
                </div>
                <div className="text-text-secondary text-xs mt-1 truncate">{a.city}</div>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
