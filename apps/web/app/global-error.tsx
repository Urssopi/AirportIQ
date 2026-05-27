"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#0a0a0f",
          color: "#f0f0f5",
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <h1 style={{ color: "#f5a623", fontSize: 22, letterSpacing: 2 }}>
          AIRPORTIQ
        </h1>
        <p style={{ marginTop: 12, opacity: 0.7 }}>
          The app crashed. Try reloading.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: 16,
            background: "#f5a623",
            color: "#0a0a0f",
            border: "none",
            padding: "10px 20px",
            borderRadius: 6,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Reload
        </button>
      </body>
    </html>
  );
}
