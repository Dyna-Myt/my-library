"use client";

import { useEffect } from "react";

/**
 * Route-level error screen. Without this, any uncaught render/effect error
 * unmounts the React tree and leaves a blank page on some browsers.
 */
export default function ErrorScreen({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[my-library] page error:", error);
  }, [error]);

  return (
    <main className="crash-screen">
      <div className="crash-card">
        <p className="crash-kicker">Something broke</p>
        <h1 className="crash-title">This shelf didn’t open</h1>
        <p className="crash-copy">
          The page hit an error while loading. Nothing on your shelf was changed.
        </p>
        <pre className="crash-detail">
          {error?.message || "Unknown error"}
          {error?.digest ? ` (${error.digest})` : ""}
        </pre>
        <div className="crash-actions">
          <button type="button" className="crash-primary" onClick={() => reset()}>
            Try again
          </button>
          <button
            type="button"
            className="crash-secondary"
            onClick={() => window.location.reload()}
          >
            Reload the page
          </button>
        </div>
      </div>
    </main>
  );
}
