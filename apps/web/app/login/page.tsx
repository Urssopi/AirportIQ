"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type Mode = "signIn" | "signUp";

export default function LoginPage() {
  const router = useRouter();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) router.replace("/account");
  }, [loading, session, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/account` },
    });
    if (error) setError(error.message);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface p-8">
        <h1 className="font-display text-3xl text-amber mb-1">AirportIQ</h1>
        <p className="text-text-secondary text-sm mb-6">
          {mode === "signIn" ? "Sign in" : "Create your account"}
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase text-text-secondary mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded bg-bg border border-border px-3 py-2 text-text-primary"
            />
          </div>
          <div>
            <label className="block text-xs uppercase text-text-secondary mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded bg-bg border border-border px-3 py-2 text-text-primary"
            />
          </div>
          {error && <p className="text-status-canceled text-sm">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded bg-amber text-bg font-semibold py-2 disabled:opacity-50"
          >
            {busy ? "..." : mode === "signIn" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          type="button"
          onClick={google}
          className="w-full mt-3 rounded border border-border py-2 text-sm"
        >
          Continue with Google
        </button>

        <button
          type="button"
          className="block w-full text-center text-xs text-text-secondary mt-4 underline"
          onClick={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
        >
          {mode === "signIn" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
