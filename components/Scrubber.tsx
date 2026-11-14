"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";

export interface ScrubberHandle {
  setProgress: (percent: number) => void;
}

interface ScrubberProps {
  ticks: number[];
  onSeek: (ratio: number) => void;
  onStep: (delta: number) => void;
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export const Scrubber = forwardRef<ScrubberHandle, ScrubberProps>(function Scrubber(
  { ticks, onSeek, onStep },
  ref,
) {
  const trackRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLSpanElement>(null);
  const [dragging, setDragging] = useState(false);

  useImperativeHandle(ref, () => ({
    setProgress(percent: number) {
      const track = trackRef.current;
      if (!track) return;
      const safe = Math.min(100, Math.max(0, percent));
      track.style.setProperty("--progress", `${safe.toFixed(2)}%`);
      track.setAttribute("aria-valuenow", String(Math.round(safe)));
      if (hintRef.current) hintRef.current.textContent = `${Math.round(safe)}%`;
    },
  }));

  const ratioFromClientX = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return 0;
    const rect = track.getBoundingClientRect();
    return clamp01((clientX - rect.left) / Math.max(rect.width, 1));
  };

  return (
    <div className="shelf-scrubber">
      <span className="scrub-label" aria-hidden="true">
        Shelf
      </span>
      <div
        ref={trackRef}
        className="scrub-track"
        role="slider"
        tabIndex={0}
        aria-label="Shelf position"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={0}
        aria-valuetext="Start of shelf"
        data-dragging={dragging}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse" && event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          event.currentTarget.setPointerCapture(event.pointerId);
          setDragging(true);
          onSeek(ratioFromClientX(event.clientX));
        }}
        onPointerMove={(event) => {
          if (!dragging) return;
          onSeek(ratioFromClientX(event.clientX));
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          setDragging(false);
        }}
        onPointerCancel={() => setDragging(false)}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
            event.preventDefault();
            onStep(-0.04);
          } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
            event.preventDefault();
            onStep(0.04);
          } else if (event.key === "PageDown") {
            event.preventDefault();
            onStep(0.2);
          } else if (event.key === "PageUp") {
            event.preventDefault();
            onStep(-0.2);
          } else if (event.key === "Home") {
            event.preventDefault();
            onSeek(0);
          } else if (event.key === "End") {
            event.preventDefault();
            onSeek(1);
          }
        }}
      >
        <div className="scrub-rail">
          <div className="scrub-fill" />
          {ticks.map((tick, index) => (
            <span
              key={`${tick}-${index}`}
              className="scrub-tick"
              style={{ left: `${Math.min(100, Math.max(0, tick))}%` }}
            />
          ))}
          <span className="scrub-thumb" />
        </div>
      </div>
      <span ref={hintRef} className="scrub-hint" aria-hidden="true">
        0%
      </span>
    </div>
  );
});
