"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type Profile = {
  id: string;
  email: string;
  has_tsa_precheck: boolean;
  preferred_notification: "email" | "push" | "both";
  home_airport: string | null;
};

type Trip = {
  id: string;
  flight_iata: string;
  flight_date: string;
  departure_airport: string;
  arrival_airport: string;
};

export default function AccountPage() {
  const router = useRouter();
  const { session, loading, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !session) router.replace("/login");
  }, [loading, session, router]);

  const load = useCallback(async () => {
    try {
      const [me, trip] = await Promise.all([
        apiFetch<Profile>("/api/users/me"),
        apiFetch<Trip[]>("/api/trips"),
      ]);
      setProfile(me);
      setTrips(trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  async function save(patch: Partial<Profile>) {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<Profile>("/api/users/me", {
        method: "PUT",
        body: JSON.stringify(patch),
      });
      setProfile(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function deleteTrip(id: string) {
    try {
      await apiFetch<void>(`/api/trips/${id}`, { method: "DELETE" });
      setTrips((t) => t.filter((x) => x.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading || !session) {
    return <main className="p-8 text-text-secondary">Loading…</main>;
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl text-amber">Account</h1>
        <button onClick={signOut} className="text-sm text-text-secondary underline">
          Sign out
        </button>
      </header>

      {error && (
        <div className="mb-6 rounded border border-status-canceled px-3 py-2 text-sm text-status-canceled">
          {error}
        </div>
      )}

      {profile && (
        <section className="rounded-lg border border-border bg-surface p-6 mb-8">
          <h2 className="font-display text-xl mb-4">Preferences</h2>

          <label className="flex items-center justify-between py-2">
            <span>TSA PreCheck</span>
            <input
              type="checkbox"
              checked={profile.has_tsa_precheck}
              disabled={saving}
              onChange={(e) => void save({ has_tsa_precheck: e.target.checked })}
            />
          </label>

          <label className="block py-2">
            <span className="block text-xs uppercase text-text-secondary mb-1">
              Home airport (IATA)
            </span>
            <input
              type="text"
              maxLength={4}
              value={profile.home_airport ?? ""}
              disabled={saving}
              onChange={(e) =>
                void save({ home_airport: e.target.value.toUpperCase() || null })
              }
              className="rounded bg-bg border border-border px-3 py-2 w-32 uppercase"
            />
          </label>

          <label className="block py-2">
            <span className="block text-xs uppercase text-text-secondary mb-1">
              Notifications
            </span>
            <select
              value={profile.preferred_notification}
              disabled={saving}
              onChange={(e) =>
                void save({
                  preferred_notification: e.target.value as Profile["preferred_notification"],
                })
              }
              className="rounded bg-bg border border-border px-3 py-2"
            >
              <option value="email">Email</option>
              <option value="push">Push</option>
              <option value="both">Both</option>
            </select>
          </label>
        </section>
      )}

      <section className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-xl mb-4">Saved trips</h2>
        {trips.length === 0 ? (
          <p className="text-text-secondary text-sm">No saved trips yet.</p>
        ) : (
          <ul className="space-y-2">
            {trips.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between border border-border rounded px-3 py-2"
              >
                <span>
                  <span className="font-display text-amber mr-3">{t.flight_iata}</span>
                  {t.departure_airport} → {t.arrival_airport} · {t.flight_date}
                </span>
                <button
                  onClick={() => void deleteTrip(t.id)}
                  className="text-xs text-status-canceled underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
