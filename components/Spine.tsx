"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { initialsFor, splitTitle, type LibraryItem } from "@/lib/types";
import { spineProfile } from "@/lib/palette";
import { SpineArt } from "./SpineArt";
import { CheckIcon, PlayIcon } from "./icons";

const FONT_MAX = 20;
const FONT_MIN = 11;

interface Fit {
  size: number;
  main: string;
  sub: string;
}

function estimateFit(main: string, sub: string, available: number): Fit {
  const chars = main.length + (sub ? sub.length * 0.6 : 0);
  const projected = Math.floor(available / Math.max(chars, 1) / 0.62);
  const size = Math.max(FONT_MIN, Math.min(FONT_MAX, projected || FONT_MIN));
  const fittedMain =
    main.length * 0.62 * size > available
      ? `${main.slice(0, Math.max(3, Math.floor(available / (0.62 * size)) - 1)).trimEnd()}…`
      : main;
  return { size, main: fittedMain, sub: "" };
}

function measureFit(main: string, sub: string, available: number, family: string): Fit {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || available <= 0) return estimateFit(main, sub, available || 168);

  const mainText = main.toUpperCase();
  const reference = 100;
  ctx.font = `800 ${reference}px ${family}`;
  const mainRatio = ctx.measureText(mainText).width / reference;
  ctx.font = `500 ${reference}px ${family}`;
  const dotRatio = ctx.measureText("·").width / reference;

  const widthAt = (text: string, weight: number, size: number) => {
    ctx.font = `${weight} ${size}px ${family}`;
    return ctx.measureText(text).width;
  };

  const trimToWidth = (text: string, budget: number, weight: number, size: number) => {
    if (budget <= 0) return "";
    if (widthAt(text, weight, size) <= budget) return text;
    let low = 0;
    let high = text.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const candidate = `${text.slice(0, mid).trimEnd()}…`;
      if (widthAt(candidate, weight, size) <= budget) low = mid;
      else high = mid - 1;
    }
    return low > 0 ? `${text.slice(0, low).trimEnd()}…` : "";
  };

  let size = FONT_MAX;
  while (size > FONT_MIN && mainRatio * size > available) size -= 1;

  let fittedMain = mainText;
  if (mainRatio * size > available) {
    fittedMain = trimToWidth(mainText, available, 800, FONT_MIN);
    size = FONT_MIN;
  }

  let fittedSub = "";
  if (sub) {
    const mainWidth = widthAt(fittedMain, 800, size);
    const subSize = size * 0.64;
    const remaining = available - mainWidth - size * 0.7;
    if (remaining > 26) {
      fittedSub = trimToWidth(sub, remaining - dotRatio * subSize, 500, subSize);
    }
  }

  return { size, main: fittedMain, sub: fittedSub };
}

interface SpineProps {
  item: LibraryItem;
  index: number;
  searchActive: boolean;
  searchMatch: boolean;
  isRead: boolean;
  neighbor: "prev" | "next" | null;
  isHovered: boolean;
  onOpen: (item: LibraryItem) => void;
  onHoverStart: (item: LibraryItem, element: HTMLElement) => void;
  onHoverEnd: (item: LibraryItem) => void;
}

export function Spine({
  item,
  index,
  searchActive,
  searchMatch,
  isRead,
  neighbor,
  isHovered,
  onOpen,
  onHoverStart,
  onHoverEnd,
}: SpineProps) {
  const spineRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [available, setAvailable] = useState(168);

  const profile = useMemo(
    () => spineProfile(item.title, item.type, item.coverColor),
    [item.title, item.type, item.coverColor],
  );
  const { main, subtitle } = useMemo(() => splitTitle(item.title), [item.title]);
  const [fit, setFit] = useState<Fit>(() => estimateFit(main, subtitle, 168));

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const nextAvailable = wrap.clientHeight - 2;
      if (nextAvailable > 0) setAvailable(nextAvailable);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const compute = () => {
      if (cancelled) return;
      const element = titleRef.current ?? spineRef.current;
      if (!element) return;
      const family = getComputedStyle(element).fontFamily;
      setFit(measureFit(main, subtitle, available, family));
    };

    compute();
    if (document.fonts?.ready) {
      document.fonts.ready.then(compute).catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [main, subtitle, available]);

  const slotClasses = [
    "book-slot",
    neighbor === "prev" ? "is-neighbor-prev" : "",
    neighbor === "next" ? "is-neighbor-next" : "",
    searchActive && !searchMatch ? "is-search-dim" : "",
    searchActive && searchMatch ? "is-search-match" : "",
    isHovered ? "is-hovered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const initials = initialsFor(item.author);
  const titleLabel = item.author ? `${item.title} by ${item.author}` : item.title;

  return (
    <span className={slotClasses} style={{ "--w": `${profile.width}px`, "--i": index } as CSSProperties}>
      <button
        ref={spineRef}
        type="button"
        className="spine"
        data-type={item.type}
        data-read={isRead ? "true" : "false"}
        style={
          {
            "--h": profile.heightPct,
            "--spine-bg": profile.color,
            "--spine-ink": profile.ink,
            "--title-size": `${fit.size}px`,
          } as CSSProperties
        }
        aria-label={`${titleLabel}${isRead ? ", read" : ""} — open on the reading desk`}
        onClick={() => onOpen(item)}
        onPointerEnter={(event) => onHoverStart(item, event.currentTarget)}
        onPointerLeave={() => onHoverEnd(item)}
        onFocus={(event) => onHoverStart(item, event.currentTarget)}
        onBlur={() => onHoverEnd(item)}
      >
        <SpineArt profile={profile} />
        <span className="spine-pages" aria-hidden="true" />

        {isRead && (
          <span className="spine-read" aria-hidden="true">
            <CheckIcon />
          </span>
        )}

        {item.type === "pdf" && <span className="spine-ribbon" aria-hidden="true" />}
        {item.type === "video" && (
          <span className="spine-mark" aria-hidden="true">
            <span className="spine-play">
              <PlayIcon />
            </span>
          </span>
        )}
        {item.type === "article" && (
          <span className="spine-mark" aria-hidden="true">
            <span className="spine-staple">
              <span />
              <span />
            </span>
          </span>
        )}
        {item.type === "note" && (
          <span className="spine-mark" aria-hidden="true">
            <span className="spine-quote">“</span>
          </span>
        )}

        <span className="spine-title-wrap" ref={wrapRef}>
          <span ref={titleRef} className="spine-title" aria-hidden="true">
            <span className="spine-title-main">{fit.main}</span>
            {fit.sub && (
              <>
                <span className="spine-title-dot">·</span>
                <span className="spine-title-sub">{fit.sub}</span>
              </>
            )}
          </span>
        </span>

        {initials && (
          <span className="spine-badge" aria-hidden="true">
            {initials}
          </span>
        )}
      </button>
    </span>
  );
}
