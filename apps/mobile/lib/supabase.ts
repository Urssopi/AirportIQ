/**
 * On mobile we route Supabase auth through our own backend (see lib/auth-context).
 * This file just exposes API_BASE so the rest of the app can build URLs.
 */
import Constants from "expo-constants";

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string>;

export const API_BASE =
  process.env.EXPO_PUBLIC_API_URL ?? extra.API_URL ?? "http://localhost:8000";
