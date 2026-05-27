/**
 * Auth context backed by our backend's /api/auth/{signin,signup} endpoints.
 *
 * The mobile app no longer talks to supabase.co directly — Expo Go's RN fetch
 * has been flaky against Supabase's TLS endpoint, and supabase-js's RN error
 * paths produce confusing "storage undefined" errors. Routing through our
 * FastAPI server is reliable and lets us reuse one set of credentials.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { API_BASE } from "./supabase";

const SESSION_KEY = "airportiq:session:v1";

export type Session = {
  access_token: string;
  refresh_token: string | null;
  user_id: string;
  email: string | null;
};

type AuthState = {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

async function authRequest(
  path: "/api/auth/signin" | "/api/auth/signup",
  email: string,
  password: string,
): Promise<Session> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const detail =
      (body && (body.detail || body.message || body.error_description)) || text || "Auth failed";
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return body as Session;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        if (raw) setSession(JSON.parse(raw) as Session);
      } catch {
        // ignore — start signed out
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (s: Session | null) => {
    try {
      if (s) {
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(s));
      } else {
        await AsyncStorage.removeItem(SESSION_KEY);
      }
    } catch {}
    setSession(s);
  }, []);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const s = await authRequest("/api/auth/signin", email.trim(), password);
      await persist(s);
    },
    [persist],
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      const s = await authRequest("/api/auth/signup", email.trim(), password);
      await persist(s);
    },
    [persist],
  );

  const signOut = useCallback(async () => {
    await persist(null);
  }, [persist]);

  const value = useMemo<AuthState>(
    () => ({ session, loading, signIn, signUp, signOut }),
    [session, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
