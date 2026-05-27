import { Platform } from "react-native";

export const colors = {
  bg: "#07070d",
  bgElevated: "#13131e",
  bgRaised: "#1a1a28",
  border: "#262638",
  borderSubtle: "#1c1c2a",
  amber: "#f5a623",
  amberDim: "rgba(245,166,35,0.15)",
  amberGlow: "rgba(245,166,35,0.35)",
  textPrimary: "#f0f0f5",
  textSecondary: "#9090ac",
  textMuted: "#5e5e75",
  ontime: "#22c55e",
  delayed: "#eab308",
  canceled: "#ef4444",
  boarding: "#3b82f6",
} as const;

export const gradients = {
  hero: ["rgba(245,166,35,0.22)", "rgba(245,166,35,0.04)", "rgba(7,7,13,0)"] as const,
  card: ["rgba(38,38,56,0.4)", "rgba(19,19,30,0.0)"] as const,
  amberButton: ["#f5a623", "#e0931a"] as const,
  glowAmber: ["rgba(245,166,35,0.3)", "rgba(245,166,35,0)"] as const,
};

export const radii = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 };
export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 32, 8: 40 };

export const type = {
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
} as const;

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  glow: {
    shadowColor: colors.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 4,
  },
};

export const statusMeta: Record<
  string,
  { label: string; color: string; soft: string }
> = {
  on_time:   { label: "On Time",   color: colors.ontime,   soft: "rgba(34,197,94,0.15)" },
  scheduled: { label: "Scheduled", color: colors.textSecondary, soft: "rgba(144,144,172,0.12)" },
  delayed:   { label: "Delayed",   color: colors.delayed,  soft: "rgba(234,179,8,0.15)" },
  canceled:  { label: "Canceled",  color: colors.canceled, soft: "rgba(239,68,68,0.15)" },
  boarding:  { label: "Boarding",  color: colors.boarding, soft: "rgba(59,130,246,0.18)" },
  unknown:   { label: "—",         color: colors.textMuted, soft: "rgba(94,94,117,0.12)" },
};
