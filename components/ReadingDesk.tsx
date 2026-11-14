"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";

import { hrefForItem } from "@/lib/items";
import { spineProfile } from "@/lib/palette";
import { initialsFor, ITEM_TYPE_LABELS, splitTitle, type LibraryItem } from "@/lib/types";
import { SpineArt } from "./SpineArt";
import { CheckIcon, ExternalIcon } from "./icons";

interface ReadingDeskProps {
  item: LibraryItem;
  items: LibraryItem[];
  index: number;
  categoryNumber: string;
  query?: string;
  isRead: boolean;
  onToggleRead: (item: LibraryItem) => void;
  onPrevious: () => void;
  onNext: () => void;
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

function sourceLabel(item: LibraryItem): string {
  if (item.filePath) return "Uploaded file";
  if (item.url?.startsWith("/")) return "Bundled file";
  if (item.url) return "External link";
  return "Shelf note";
}

function formatDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * The reading desk: the selected item lies open below the shelf, with the same
 * cover artwork as its spine. It replaces the old overlay panel, so the shelf
 * stays visible and the whole library can be browsed with Previous / Next.
 */
export function ReadingDesk({
  item,
  items,
  index,
  categoryNumber,
  query,
  isRead,
  onToggleRead,
  onPrevious,
  onNext,
}: ReadingDeskProps) {
  const profile = useMemo(
    () => spineProfile(item.title, item.type, item.coverColor),
    [item.title, item.type, item.coverColor],
  );
  const { main, subtitle } = useMemo(() => splitTitle(item.title), [item.title]);
  const href = hrefForItem(item);
  const initials = initialsFor(item.author);
  const added = formatDate(item.createdAt);

  return (
    <section className="reading-desk" id="reading-desk" aria-labelledby="desk-title">
      <div className="desk-head">
        <p className="desk-eyebrow">
          <span className="desk-rule" aria-hidden="true" />
          On the reading desk
        </p>
        <p className="desk-counter" aria-live="polite">
          {index + 1} / {items.length}
        </p>
      </div>

      <div className="desk-grid" key={item.id}>
        <div className="desk-cover-wrap">
          <div
            className="desk-cover"
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
              <span className="cover-title">
                {main}
                {subtitle && <span className="cover-sub"> · {subtitle}</span>}
              </span>
              <span className="cover-author">{item.author || "Unknown author"}</span>
            </div>
            <span className="cover-badge">{initials}</span>
          </div>
          <span className="desk-cover-shadow" aria-hidden="true" />
        </div>

        <article className="desk-card">
          <div className="desk-kicker">
            <span className="type-badge">
              <span className="type-dot" />
              {ITEM_TYPE_LABELS[item.type]}
            </span>
            <span className="category-tag">
              #{categoryNumber} {item.category}
            </span>
            {isRead && (
              <span className="desk-read-flag">
                <CheckIcon />
                Read
              </span>
            )}
          </div>

          <h2 id="desk-title" className="desk-title">
            {highlight(item.title, query)}
          </h2>
          <p className="desk-author">{highlight(item.author || "Unknown author", query)}</p>

          {item.note && (
            <blockquote className="desk-note">{highlight(item.note, query)}</blockquote>
          )}

          {item.tags.length > 0 && (
            <div className="desk-tags" aria-label="Tags">
              {item.tags.map((tag) => (
                <span key={tag} className="tag-chip">
                  {highlight(tag, query)}
                </span>
              ))}
            </div>
          )}

          <div className="desk-actions">
            {href ? (
              <a className="btn-primary desk-open" href={href} target="_blank" rel="noopener noreferrer">
                {actionLabel(item)}
                <ExternalIcon />
              </a>
            ) : (
              <span className="btn-disabled" aria-disabled="true">
                {item.type === "note" ? "A shelf note" : "No file attached"}
              </span>
            )}

            <button
              type="button"
              className="desk-read-toggle"
              data-read={isRead ? "true" : "false"}
              aria-pressed={isRead}
              onClick={() => onToggleRead(item)}
            >
              <span className="desk-check" aria-hidden="true">
                <CheckIcon />
              </span>
              {isRead ? "Read" : "Mark as read"}
            </button>

            <div className="desk-pager" role="group" aria-label="Browse the shelf">
              <button type="button" onClick={onPrevious} aria-label="Previous item" title="Previous item">
                <span aria-hidden="true">←</span>
              </button>
              <span className="desk-pager-label">
                <span aria-hidden="true">
                  {index + 1} / {items.length}
                </span>
                <span className="sr-only">
                  Item {index + 1} of {items.length}
                </span>
              </span>
              <button type="button" onClick={onNext} aria-label="Next item" title="Next item">
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <p className="desk-hint">
            {sourceLabel(item)}
            {added ? ` · added ${added}` : ""}
            {href ? " · opens in a new tab" : ""}
          </p>
        </article>
      </div>
    </section>
  );
}
