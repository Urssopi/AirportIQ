/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0f",
        surface: "#13131a",
        border: "#1e1e2e",
        amber: "#f5a623",
        "text-primary": "#f0f0f5",
        "text-secondary": "#8888aa",
        "status-ontime":   "#22c55e",
        "status-delayed":  "#eab308",
        "status-canceled": "#ef4444",
        "status-boarding": "#3b82f6",
      },
    },
  },
  plugins: [],
};
