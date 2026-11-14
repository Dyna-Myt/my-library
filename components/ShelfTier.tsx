import type { CSSProperties } from "react";

import type { LibraryItem } from "@/lib/types";
import { Spine } from "./Spine";

export type ShelfToken =
  | { kind: "divider"; category: string; number: string; key: string }
  | { kind: "book"; item: LibraryItem; key: string };

interface ShelfTierProps {
  tokens: ShelfToken[];
  tierIndex: number;
  hoveredId: string | null;
  searchActive: boolean;
  searchMatch: (item: LibraryItem) => boolean;
  readIds: Set<string>;
  onOpen: (item: LibraryItem) => void;
  onHoverStart: (item: LibraryItem, element: HTMLElement) => void;
  onHoverEnd: (item: LibraryItem) => void;
}

export function ShelfTier({
  tokens,
  tierIndex,
  hoveredId,
  searchActive,
  searchMatch,
  readIds,
  onOpen,
  onHoverStart,
  onHoverEnd,
}: ShelfTierProps) {
  const bookIds = tokens.flatMap((token) => (token.kind === "book" ? [token.item.id] : []));
  const hoveredIndex = hoveredId ? bookIds.indexOf(hoveredId) : -1;

  let bookIndex = -1;

  return (
    <div className="shelf-tier" data-tier={tierIndex}>
      <div
        className="tier-track"
        style={{ "--parallax": [0.035, 0.018, 0.006][tierIndex] ?? 0.01 } as CSSProperties}
      >
        {tokens.map((token) => {
          if (token.kind === "divider") {
            return (
              <div
                key={token.key}
                className="shelf-divider"
                data-divider="true"
                data-category={token.category}
                aria-hidden="true"
              >
                <span className="divider-number">
                  <span>#</span>
                  {token.number}
                </span>
                <span className="divider-rule" />
                <span className="divider-name">{token.category}</span>
              </div>
            );
          }

          bookIndex += 1;
          const currentBookIndex = bookIndex;
          const neighbor =
            hoveredIndex === -1
              ? null
              : currentBookIndex === hoveredIndex - 1
                ? "prev"
                : currentBookIndex === hoveredIndex + 1
                  ? "next"
                  : null;

          return (
            <SpineSlot
              key={token.key}
              item={token.item}
              index={currentBookIndex}
              neighbor={neighbor}
              isHovered={hoveredId === token.item.id}
              searchActive={searchActive}
              searchMatch={searchMatch(token.item)}
              isRead={readIds.has(token.item.id)}
              onOpen={onOpen}
              onHoverStart={onHoverStart}
              onHoverEnd={onHoverEnd}
            />
          );
        })}
      </div>
      <div className="shelf-plank" aria-hidden="true" />
    </div>
  );
}

/** Small wrapper so the tier can calculate neighbours before handing off to the spine. */
interface SpineSlotProps {
  item: LibraryItem;
  index: number;
  neighbor: "prev" | "next" | null;
  isHovered: boolean;
  searchActive: boolean;
  searchMatch: boolean;
  isRead: boolean;
  onOpen: (item: LibraryItem) => void;
  onHoverStart: (item: LibraryItem, element: HTMLElement) => void;
  onHoverEnd: (item: LibraryItem) => void;
}

function SpineSlot({
  item,
  index,
  neighbor,
  isHovered,
  searchActive,
  searchMatch,
  isRead,
  onOpen,
  onHoverStart,
  onHoverEnd,
}: SpineSlotProps) {
  return (
    <Spine
      item={item}
      index={index}
      neighbor={neighbor}
      isHovered={isHovered}
      searchActive={searchActive}
      searchMatch={searchMatch}
      isRead={isRead}
      onOpen={onOpen}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
    />
  );
}
