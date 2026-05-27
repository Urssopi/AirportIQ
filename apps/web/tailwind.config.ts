import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        surface: "#13131a",
        border: "#1e1e2e",
        "text-primary": "#f0f0f5",
        "text-secondary": "#8888aa",
        amber: "#f5a623",
        "status-ontime": "#22c55e",
        "status-delayed": "#eab308",
        "status-canceled": "#ef4444",
        "status-boarding": "#3b82f6",
      },
      fontFamily: {
        display: ["var(--font-display)", "'JetBrains Mono'", "monospace"],
        sans: ["var(--font-sans)", "'DM Sans'", "system-ui", "sans-serif"],
      },
      keyframes: {
        "flip-in": {
          "0%": { transform: "rotateX(-90deg)", opacity: "0" },
          "100%": { transform: "rotateX(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "flip-in": "flip-in 0.3s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
