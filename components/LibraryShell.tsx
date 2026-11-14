"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { fetchItems } from "@/lib/items";
import { numberCategories, spineProfile } from "@/lib/palette";
import {
  categoryRank,
  type DataSource,
  type LibraryItem,
} from "@/lib/types";
import { DetailPanel } from "./DetailPanel";
import { Scrubber, type ScrubberHandle } from "./Scrubber";
import { ShelfTier, type ShelfToken } from "./ShelfTier";
import { CloseIcon, LockIcon, SearchIcon } from "./icons";

interface LibraryShellProps {
  initialItems: LibraryItem[];
  source: DataSource;
}

interface TooltipState {
  item: LibraryItem;
  x: number;
  y: number;
  placement: "above" | "below";
}

interface DragState {
  startX: number;
  startLeft: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  moved: boolean;
  captured: boolean;
  pointerId: number;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const TOKEN_GAP = 7;
const DIVIDER_WIDTH = 58;

/** Estimated rendered width of a shelf token, including its flex gap. */
function tokenWidth(token: ShelfToken): number {
  return token.kind === "divider"
    ? DIVIDER_WIDTH + TOKEN_GAP
    : spineProfile(token.item.title, token.item.type, token.item.coverColor).width + TOKEN_GAP;
}

function buildTiers(
  groups: { category: string; items: LibraryItem[] }[],
  numbers: Map<string, string>,
  tierCount: number,
  epoch: number,
): { tiers: ShelfToken[][]; totalWidth: number } {
  const tokens: ShelfToken[] = [];
  groups.forEach((group) => {
    tokens.push({
      kind: "divider",
      category: group.category,
      number: numbers.get(group.category) ?? "00",
      key: `divider-${group.category}-${epoch}`,
    });
    group.items.forEach((item) => {
      tokens.push({ kind: "book", item, key: `${item.id}-${epoch}` });
    });
  });

  if (tokens.length === 0) return { tiers: [], totalWidth: 0 };

  const total = tokens.reduce((sum, token) => sum + tokenWidth(token), 0);
  const perTier = total / tierCount;
  const tiers: ShelfToken[][] = [[]];

  for (const token of tokens) {
    const current = tiers[tiers.length - 1];
    const currentWidth = current.reduce((sum, entry) => sum + tokenWidth(entry), 0);
    const hasBook = current.some((entry) => entry.kind === "book");
    if (
      tiers.length < tierCount &&
      hasBook &&
      currentWidth >= perTier &&
      token.kind === "book"
    ) {
      tiers.push([token]);
    } else {
      current.push(token);
    }
  }

  // Never leave a divider stranded at the end of a tier.
  for (let index = 0; index < tiers.length - 1; index += 1) {
    while (tiers[index].length > 0 && tiers[index][tiers[index].length - 1].kind === "divider") {
      const divider = tiers[index].pop();
      if (divider) tiers[index + 1].unshift(divider);
    }
  }

  return { tiers: tiers.filter((tier) => tier.length > 0), totalWidth: total };
}

export function LibraryShell({ initialItems, source }: LibraryShellProps) {
  const [items, setItems] = useState<LibraryItem[]>(initialItems);
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [rowMode, setRowMode] = useState<"auto" | "1" | "2" | "3">("auto");
  const [stageWidth, setStageWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);
  const [epoch, setEpoch] = useState(0);
  const [ticks, setTicks] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrubberRef = useRef<ScrubberHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const inertiaRef = useRef<number | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const manualUntilRef = useRef(0);

  /* ---------------------------------------------------------------- */
  /*  Data                                                             */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (source !== "demo") return;
    let alive = true;
    const load = () => {
      fetchItems().then((data) => {
        if (alive) setItems(data.items);
      });
    };
    load();
    window.addEventListener("my-library:changed", load);
    window.addEventListener("storage", load);
    return () => {
      alive = false;
      window.removeEventListener("my-library:changed", load);
      window.removeEventListener("storage", load);
    };
  }, [source]);

  const orderedCategories = useMemo(() => {
    const seen = new Set<string>();
    items.forEach((item) => seen.add(item.category));
    return Array.from(seen).sort(
      (a, b) => categoryRank(a) - categoryRank(b) || a.localeCompare(b),
    );
  }, [items]);

  const categoryNumbers = useMemo(
    () => numberCategories(orderedCategories),
    [orderedCategories],
  );

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => map.set(item.category, (map.get(item.category) ?? 0) + 1));
    return map;
  }, [items]);

  const groups = useMemo(() => {
    const scoped = activeCategory === "All" ? items : items.filter((item) => item.category === activeCategory);
    const map = new Map<string, LibraryItem[]>();
    scoped.forEach((item) => {
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    });
    return Array.from(map.entries())
      .map(([category, categoryItems]) => ({ category, items: categoryItems }))
      .sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.category.localeCompare(b.category));
  }, [items, activeCategory]);

  const normalizedQuery = query.trim().toLowerCase();
  const searchActive = normalizedQuery.length > 0;

  const itemMatches = useCallback(
    (item: LibraryItem) => {
      if (!searchActive) return true;
      const haystack = [item.title, item.author, item.category, item.tags.join(" "), item.note ?? ""]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    },
    [normalizedQuery, searchActive],
  );

  const visibleItems = useMemo(() => groups.flatMap((group) => group.items), [groups]);
  const matchCount = useMemo(
    () => (searchActive ? visibleItems.filter(itemMatches).length : visibleItems.length),
    [searchActive, visibleItems, itemMatches],
  );

  const wall = useMemo(
    () => buildTiers(groups, categoryNumbers, 1, epoch),
    [groups, categoryNumbers, epoch],
  );

  /**
   * Keep the wall long enough to actually move: one long row while the library
   * fits within ~2 screens, then split into two or three stacked tiers as it
   * grows. The Rows control lets you force a layout.
   */
  const autoRows = useMemo(() => {
    if (!stageWidth || wall.totalWidth === 0) return 1;
    const ratio = wall.totalWidth / stageWidth;
    if (ratio <= 2.15) return 1;
    if (ratio <= 3.35) return 2;
    return 3;
  }, [stageWidth, wall.totalWidth]);

  const tierCount = rowMode === "auto" ? autoRows : Number(rowMode);

  const tiers = useMemo(
    () => (tierCount === 1 ? wall.tiers : buildTiers(groups, categoryNumbers, tierCount, epoch).tiers),
    [wall, groups, categoryNumbers, tierCount, epoch],
  );

  const selectedItem = selectedId ? items.find((item) => item.id === selectedId) ?? null : null;

  /* ---------------------------------------------------------------- */
  /*  Scroll position, ticks and snapping                              */
  /* ---------------------------------------------------------------- */

  const updatePosition = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const ratio = max > 0 ? scroller.scrollLeft / max : 0;
    contentRef.current?.style.setProperty("--scroll", `${scroller.scrollLeft}px`);
    scrubberRef.current?.setProgress(ratio * 100);
  }, []);

  const refreshMetrics = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const rect = scroller.getBoundingClientRect();
    const values: number[] = [];
    scroller.querySelectorAll<HTMLElement>('[data-divider="true"]').forEach((divider) => {
      const dividerRect = divider.getBoundingClientRect();
      const offset = dividerRect.left - rect.left + scroller.scrollLeft;
      if (max > 1) {
        const value = Math.round((offset / max) * 100);
        if (value > 0 && value < 100) values.push(value);
      }
    });
    const unique = Array.from(new Set(values)).sort((a, b) => a - b);
    setTicks((previous) =>
      previous.length === unique.length && previous.every((value, index) => value === unique[index])
        ? previous
        : unique,
    );
    updatePosition();
  }, [updatePosition]);

  const snapToNearestDivider = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    if (max < 8) return;
    const rect = scroller.getBoundingClientRect();
    const points = [0];
    scroller.querySelectorAll<HTMLElement>('[data-divider="true"]').forEach((divider) => {
      const dividerRect = divider.getBoundingClientRect();
      const offset = dividerRect.left - rect.left + scroller.scrollLeft - 28;
      points.push(Math.min(max, Math.max(0, offset)));
    });

    const current = scroller.scrollLeft;
    let nearest = points[0];
    let distance = Math.abs(nearest - current);
    points.forEach((point) => {
      const nextDistance = Math.abs(point - current);
      if (nextDistance < distance) {
        nearest = point;
        distance = nextDistance;
      }
    });

    if (distance > 8) {
      scroller.scrollTo({ left: nearest, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, []);

  const scheduleSnap = useCallback(
    (delay = 260) => {
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
      snapTimerRef.current = window.setTimeout(() => {
        if (!snapEnabled || dragRef.current || Date.now() < manualUntilRef.current) return;
        snapToNearestDivider();
      }, delay);
    },
    [snapEnabled, snapToNearestDivider],
  );

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const handleScroll = () => {
      updatePosition();
      setTooltip(null);
      if (!dragRef.current && !inertiaRef.current) scheduleSnap(240);
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("input, textarea, select")) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight : 1;
      scroller.scrollLeft += event.deltaY * multiplier;
      scheduleSnap(220);
    };

    scroller.addEventListener("scroll", handleScroll, { passive: true });
    scroller.addEventListener("wheel", handleWheel, { passive: false });

    const measureWidth = () => setStageWidth(scroller.clientWidth);
    measureWidth();
    const observer = new ResizeObserver(() => {
      measureWidth();
      refreshMetrics();
    });
    observer.observe(scroller);
    if (contentRef.current) observer.observe(contentRef.current);
    window.addEventListener("resize", refreshMetrics);
    const frame = requestAnimationFrame(() => refreshMetrics());

    return () => {
      scroller.removeEventListener("scroll", handleScroll);
      scroller.removeEventListener("wheel", handleWheel);
      observer.disconnect();
      window.removeEventListener("resize", refreshMetrics);
      cancelAnimationFrame(frame);
      if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current);
    };
  }, [refreshMetrics, scheduleSnap, updatePosition]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollLeft = 0;
    updatePosition();
    const frame = requestAnimationFrame(refreshMetrics);
    return () => cancelAnimationFrame(frame);
  }, [activeCategory, tierCount, epoch, updatePosition, refreshMetrics]);

  useEffect(() => {
    const load = () => refreshMetrics();
    if (document.fonts?.ready) document.fonts.ready.then(load).catch(() => undefined);
    const timer = window.setTimeout(load, 350);
    return () => window.clearTimeout(timer);
  }, [refreshMetrics, items]);

  /* ---------------------------------------------------------------- */
  /*  Keyboard                                                         */
  /* ---------------------------------------------------------------- */

  const scrollByAmount = useCallback((amount: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    manualUntilRef.current = Date.now() + 400;
    scroller.scrollBy({ left: amount, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const typing =
        Boolean(target?.closest("input, textarea, select")) ||
        Boolean((target as HTMLElement | null)?.isContentEditable);
      const onSlider = Boolean(target?.closest('[role="slider"]'));

      if (event.key === "/" && !typing && !selectedId && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (typing || selectedId || onSlider || event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        scrollByAmount(-360);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        scrollByAmount(360);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [scrollByAmount, selectedId]);

  /* ---------------------------------------------------------------- */
  /*  Drag + inertia                                                   */
  /* ---------------------------------------------------------------- */

  const startInertia = useCallback(
    (velocity: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      if (prefersReducedMotion()) {
        scheduleSnap(0);
        return;
      }
      let speed = Math.max(-64, Math.min(64, velocity));
      const step = () => {
        scroller.scrollLeft += speed;
        speed *= 0.93;
        if (Math.abs(speed) > 0.6) {
          inertiaRef.current = requestAnimationFrame(step);
        } else {
          inertiaRef.current = null;
          scheduleSnap(40);
        }
      };
      inertiaRef.current = requestAnimationFrame(step);
    },
    [scheduleSnap],
  );

  const stopInertia = () => {
    if (inertiaRef.current) {
      cancelAnimationFrame(inertiaRef.current);
      inertiaRef.current = null;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest("input, textarea, select")) return;
    stopInertia();
    setTooltip(null);
    dragRef.current = {
      startX: event.clientX,
      startLeft: event.currentTarget.scrollLeft,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      moved: false,
      captured: false,
      pointerId: event.pointerId,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const deltaX = event.clientX - drag.startX;
    if (!drag.captured && Math.abs(deltaX) > 5) {
      drag.captured = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
    }
    if (Math.abs(deltaX) > 6) drag.moved = true;
    if (!drag.captured) return;

    event.currentTarget.scrollLeft = drag.startLeft - deltaX;
    const now = performance.now();
    const elapsed = now - drag.lastTime;
    if (elapsed > 0) {
      drag.velocity = (-(event.clientX - drag.lastX) / elapsed) * 16;
      drag.lastX = event.clientX;
      drag.lastTime = now;
    }
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    setIsDragging(false);
    if (!drag) return;
    if (event.currentTarget.hasPointerCapture(drag.pointerId)) {
      event.currentTarget.releasePointerCapture(drag.pointerId);
    }
    if (drag.captured) {
      suppressClickRef.current = drag.moved;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
      startInertia(drag.velocity);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Hover + tooltip                                                  */
  /* ---------------------------------------------------------------- */

  const showTooltip = useCallback((item: LibraryItem, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const placement: "above" | "below" = rect.top < 104 ? "below" : "above";
    setHoveredId(item.id);
    setTooltip({
      item,
      x: Math.min(window.innerWidth - 18, Math.max(18, rect.left + rect.width / 2)),
      y: placement === "above" ? rect.top : rect.bottom,
      placement,
    });
  }, []);

  const hideTooltip = useCallback((item: LibraryItem) => {
    setHoveredId((current) => (current === item.id ? null : current));
    setTooltip((current) => (current?.item.id === item.id ? null : current));
  }, []);

  // Keep the centred tooltip fully inside the viewport on narrow screens.
  // Applied imperatively: measuring + setState in a layout effect can loop.
  useLayoutEffect(() => {
    const node = tooltipRef.current;
    if (!node) return;
    node.style.marginLeft = "0px";
    const rect = node.getBoundingClientRect();
    const margin = 8;
    let delta = 0;
    if (rect.left < margin) delta = margin - rect.left;
    else if (rect.right > window.innerWidth - margin) delta = window.innerWidth - margin - rect.right;
    if (delta) node.style.marginLeft = `${delta}px`;
  }, [tooltip]);

  const openItem = useCallback((item: LibraryItem) => {
    setSelectedId(item.id);
    setHoveredId(null);
    setTooltip(null);
  }, []);

  const chooseCategory = (category: string) => {
    setActiveCategory(category);
    setEpoch((value) => value + 1);
    setHoveredId(null);
    setTooltip(null);
  };

  const seek = (ratio: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    manualUntilRef.current = Date.now() + 1200;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollLeft = ratio * max;
    updatePosition();
  };

  const step = (delta: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    manualUntilRef.current = Date.now() + 800;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    scroller.scrollTo({ left: (scroller.scrollLeft + delta * max), behavior: "smooth" });
  };

  const categoryLabel = activeCategory === "All" ? "The whole wall" : `Shelf ${categoryNumbers.get(activeCategory) ?? ""} · ${activeCategory}`;

  return (
    <>
      <div className="page-wrap">
        <header className="site-header">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div>
              <p className="brand-eyebrow">A private shelf</p>
              <h1 className="brand-title">
                My <em>Library</em>
              </h1>
              <p className="brand-sub">
                Books, essays, PDFs, videos and notes — kept in one quiet place, arranged by hand.
              </p>
            </div>
          </div>

          <div className="header-tools">
            <div className="search-shell">
              <SearchIcon />
              <label htmlFor="library-search" className="sr-only">
                Search the shelf
              </label>
              <input
                id="library-search"
                ref={searchRef}
                type="search"
                value={query}
                placeholder="Search title, author, tag or note…"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setQuery("");
                    event.currentTarget.blur();
                  }
                }}
              />
              {query ? (
                <button
                  type="button"
                  className="search-clear"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                  aria-label="Clear search"
                >
                  <CloseIcon />
                </button>
              ) : (
                <kbd aria-hidden="true">/</kbd>
              )}
            </div>
            <a className="admin-peek" href="/admin" aria-label="Open the librarian's desk">
              <LockIcon />
            </a>
          </div>
        </header>

        <main id="shelf">
          <div className="library-toolbar">
            <div className="pill-row" role="group" aria-label="Filter by category">
              <button
                type="button"
                className="filter-pill"
                data-active={activeCategory === "All"}
                aria-pressed={activeCategory === "All"}
                onClick={() => chooseCategory("All")}
              >
                All
                <span className="pill-count">{items.length}</span>
              </button>
              {orderedCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  className="filter-pill"
                  data-active={activeCategory === category}
                  aria-pressed={activeCategory === category}
                  onClick={() => chooseCategory(category)}
                >
                  {category}
                  <span className="pill-count">{counts.get(category) ?? 0}</span>
                </button>
              ))}
            </div>

            <div className="toolbar-meta">
              <span className="toolbar-copy">
                {searchActive ? (
                  <>
                    <strong>{matchCount}</strong> {matchCount === 1 ? "match" : "matches"} for “{query.trim()}”
                  </>
                ) : (
                  <>
                    <strong>{visibleItems.length}</strong> volumes on{" "}
                    <strong>{groups.length}</strong> {groups.length === 1 ? "shelf" : "shelves"}
                  </>
                )}
              </span>
              <label className="row-control" title="How many stacked shelf rows to show">
                <span>Rows</span>
                <select
                  value={rowMode}
                  onChange={(event) => setRowMode(event.target.value as "auto" | "1" | "2" | "3")}
                  aria-label="Shelf rows"
                >
                  <option value="auto">Auto</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>
              <button
                type="button"
                className="snap-toggle"
                aria-pressed={snapEnabled}
                onClick={() => {
                  setSnapEnabled((value) => !value);
                }}
                title="Snap to the nearest category divider when the shelf stops"
              >
                <span className="snap-dot" aria-hidden="true" />
                Snap {snapEnabled ? "on" : "off"}
              </button>
            </div>
          </div>

          <section className="shelf-stage" aria-label="My bookshelf">
            <div className="stage-bar">
              <span className="stage-label">{categoryLabel}</span>
              <span className="stage-hints" aria-hidden="true">
                <span>Drag / swipe</span>
                <span>
                  <kbd>←</kbd>
                  <kbd>→</kbd> to travel
                </span>
                <span>
                  <kbd>/</kbd> to search
                </span>
              </span>
            </div>

            {visibleItems.length === 0 ? (
              <div className="empty-shelf">
                <div className="empty-mark" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <h2>{items.length === 0 ? "The shelf is empty" : "Nothing on this shelf yet"}</h2>
                <p>
                  {items.length === 0
                    ? "Add your first book, article, PDF, video or note from the librarian's desk."
                    : `There are no items filed under ${activeCategory}. Try another category.`}
                </p>
                <button type="button" onClick={() => chooseCategory("All")}>
                  Show the whole library
                </button>
              </div>
            ) : (
              <div className="shelf-viewport">
                <div
                  ref={scrollerRef}
                  className={`shelf-scroller${isDragging ? " is-dragging" : ""}`}
                  role="region"
                  aria-label="Horizontal shelf. Drag, scroll, or use the left and right arrow keys to move."
                  tabIndex={0}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  onClickCapture={(event) => {
                    if (suppressClickRef.current) {
                      event.preventDefault();
                      event.stopPropagation();
                    }
                  }}
                >
                  <div
                    ref={contentRef}
                    className="shelf-content"
                    data-hovering={hoveredId ? "true" : "false"}
                  >
                    {tiers.map((tokens, tierIndex) => (
                      <ShelfTier
                        key={`tier-${tierIndex}-${epoch}`}
                        tokens={tokens}
                        tierIndex={tierIndex}
                        hoveredId={hoveredId}
                        searchActive={searchActive}
                        searchMatch={itemMatches}
                        onOpen={openItem}
                        onHoverStart={showTooltip}
                        onHoverEnd={hideTooltip}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Scrubber
              ref={scrubberRef}
              ticks={ticks}
              onSeek={seek}
              onStep={step}
            />

            <p className="sr-only" aria-live="polite">
              {searchActive
                ? `${matchCount} matching ${matchCount === 1 ? "item" : "items"} highlighted on the shelf.`
                : `${visibleItems.length} ${visibleItems.length === 1 ? "item" : "items"} on ${
                    groups.length === 1 ? "1 shelf" : `${groups.length} shelves`
                  }.`}
            </p>
          </section>
        </main>

        <footer className="site-footer">
          <p className="footer-mark">My Library · selected by hand</p>
          <div className="footer-links">
            <span>Midnight Indigo + Ember</span>
            <a href="/admin">Librarian&apos;s desk</a>
          </div>
        </footer>
      </div>

      {tooltip && (
        <div
          ref={tooltipRef}
          className={`book-tooltip${tooltip.placement === "below" ? " is-below" : ""}`}
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          <span className="tt-title">{tooltip.item.title}</span>
          <span className="tt-meta">
            {tooltip.item.author || "Unknown author"} · {tooltip.item.category}
          </span>
          <span className="tt-hint">Click to open</span>
        </div>
      )}

      {selectedItem && (
        <DetailPanel
          item={selectedItem}
          categoryNumber={categoryNumbers.get(selectedItem.category) ?? "00"}
          onClose={() => setSelectedId(null)}
          query={query}
        />
      )}
    </>
  );
}
