"use client";

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";

import { hrefForItem } from "@/lib/items";
import { spineProfile } from "@/lib/palette";
import { initialsFor, ITEM_TYPE_LABELS, splitTitle, type LibraryItem } from "@/lib/types";
import { SpineArt } from "./SpineArt";
import { CloseIcon, ExternalIcon } from "./icons";

interface DetailPanelProps {
  item: LibraryItem;
  categoryNumber: string;
  onClose: () => void;
  query?: string;
}

/** Wraps every case-insensitive occurrence of the search query in a <mark>. */
function highlight(text: string, query?: string): ReactNode {
  const needle = query?.trim();
  if (!needle) return text;
  const haystack = text.toLowerCase();
  const target = needle.toLowerCase();
  if (!haystack.includes(target)) return text;
  const parts: ReactNode[] = [];
  let index = 0;
  let found = haystack.indexOf(target);
  while (found !== -1) {
    if (found > index) parts.push(text.slice(index, found));
    parts.push(
      <mark key={`${found}-${parts.length}`} className="match-mark">
        {text.slice(found, found + target.length)}
      </mark>,
    );
    index = found + target.length;
    found = haystack.indexOf(target, index);
  }
  if (index < text.length) parts.push(text.slice(index));
  return parts;
}

function actionLabel(item: LibraryItem): string {
  switch (item.type) {
    case "pdf":
      return "Open PDF";
    case "video":
      return "Watch video";
    case "article":
      return "Read article";
    case "note":
      return "Open note";
    default:
      return "Open book";
  }
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

export function DetailPanel({ item, categoryNumber, onClose, query }: DetailPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const profile = useMemo(
    () => spineProfile(item.title, item.type, item.coverColor),
    [item.title, item.type, item.coverColor],
  );
  const { main, subtitle } = useMemo(() => splitTitle(item.title), [item.title]);
  const href = hrefForItem(item);
  const initials = initialsFor(item.author);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = originalOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return (
    <>
      <button className="panel-backdrop" type="button" aria-label="Close details" onClick={onClose} />
      <aside
        ref={panelRef}
        className="detail-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        aria-describedby={item.note ? "detail-note" : undefined}
      >
        <div className="panel-topbar">
          <span className="panel-eyebrow">From the shelf</span>
          <button ref={closeRef} type="button" className="panel-close" onClick={onClose}>
            <CloseIcon />
            <span className="sr-only">Close details</span>
          </button>
        </div>

        <div className="detail-scroll">
          <div className="detail-cover-wrap">
            <div
              className="detail-cover"
              style={
                {
                  "--cover-bg": profile.color,
                  "--cover-ink": profile.ink,
                } as CSSProperties
              }
              aria-hidden="true"
            >
              <span className="cover-pages" />
              <SpineArt profile={profile} className="cover-art" />
              <div className="cover-inner">
                <span className="cover-type">{ITEM_TYPE_LABELS[item.type]}</span>
                <span className="cover-title">{item.title}</span>
                <span className="cover-author">{item.author || "Unknown author"}</span>
              </div>
              <span className="cover-badge">{initials}</span>
            </div>
            <div className="detail-stamp">
              Shelf
              <strong>{categoryNumber}</strong>
              {item.category}
            </div>
          </div>

          <div className="detail-kicker">
            <span className="type-badge">
              <span className="type-dot" />
              {ITEM_TYPE_LABELS[item.type]}
            </span>
            <span className="category-tag">{item.category}</span>
          </div>

          <h2 id="detail-title" className="detail-title">
            {highlight(item.title, query)}
          </h2>
          <p className="detail-author">{highlight(item.author || "Unknown author", query)}</p>

          {item.note && (
            <blockquote id="detail-note" className="detail-note">
              {highlight(item.note, query)}
            </blockquote>
          )}

          <div className="detail-meta">
            <div className="meta-block">
              <span className="meta-label">Format</span>
              <span className="meta-value">{ITEM_TYPE_LABELS[item.type]}</span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Shelf</span>
              <span className="meta-value">
                #{categoryNumber} {item.category}
              </span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Added</span>
              <span className="meta-value">{formatDate(item.createdAt)}</span>
            </div>
            <div className="meta-block">
              <span className="meta-label">Source</span>
              <span className="meta-value">
                {item.filePath ? "Uploaded file" : item.url ? "External link" : "Shelf note"}
              </span>
            </div>
          </div>

          {item.tags.length > 0 && (
            <div className="tag-row" aria-label="Tags">
              {item.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {highlight(tag, query)}
                </span>
              ))}
            </div>
          )}

          <div className="detail-actions">
            {href ? (
              <a className="btn-primary" href={href} target="_blank" rel="noopener noreferrer">
                {actionLabel(item)}
                <ExternalIcon />
              </a>
            ) : (
              <span className="btn-disabled" aria-disabled="true">
                {item.type === "note" ? "A shelf note" : "No file attached"}
              </span>
            )}
            <button type="button" className="btn-ghost" onClick={onClose}>
              Back to shelf
            </button>
          </div>

          {href && (
            <p className="detail-note-hint">
              {item.type === "pdf"
                ? "PDFs and files open in a new tab."
                : "External links open in a new tab."}
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
