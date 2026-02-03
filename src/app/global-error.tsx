"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#05070b",
          color: "#e9eef5",
          fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "480px", textAlign: "center" }}>
          <h1 style={{ marginBottom: "12px" }}>Something went wrong</h1>
          <p style={{ marginBottom: "24px", color: "rgba(233, 238, 245, 0.7)" }}>
            The demo hit an unexpected error. You can try reloading the experience.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "rgba(12, 18, 30, 0.8)",
              color: "#e9eef5",
              borderRadius: "999px",
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
