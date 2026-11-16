"use client";

/**
 * Last-resort boundary: catches errors in the root layout itself, where the
 * normal error.tsx cannot render. Styles are inline because the global
 * stylesheet may not have loaded at this point.
 */
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
          margin: 0,
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#000000",
          color: "#F3EFE7",
          fontFamily: '"Segoe Print", "Bradley Hand", cursive',
        }}
      >
        <main style={{ maxWidth: 460 }}>
          <p
            style={{
              margin: "0 0 6px",
              color: "#FF6A4D",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            Something broke
          </p>
          <h1 style={{ margin: "0 0 10px", fontSize: 30, lineHeight: 1.1 }}>
            This shelf didn’t open
          </h1>
          <p style={{ margin: "0 0 16px", color: "#8F8A7F", fontSize: 14 }}>
            The page hit an error while loading. Nothing on your shelf was changed.
          </p>
          <pre
            style={{
              margin: "0 0 20px",
              padding: 12,
              border: "1px solid rgba(243,239,231,0.18)",
              borderRadius: 10,
              background: "#101010",
              color: "#F3EFE7",
              fontSize: 12,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
            }}
          >
            {error?.message || "Unknown error"}
            {error?.digest ? ` (${error.digest})` : ""}
          </pre>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 16px",
                border: "1px solid #FF6A4D",
                borderRadius: 999,
                background: "#FF6A4D",
                color: "#1C0F0B",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                padding: "10px 16px",
                border: "1px solid rgba(243,239,231,0.18)",
                borderRadius: 999,
                background: "transparent",
                color: "#F3EFE7",
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Reload the page
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
