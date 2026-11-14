/**
 * Read / unread state for the shelf.
 *
 * This is a purely personal, per-browser marker, so localStorage is the right
 * home for it: it works in demo mode and alongside Supabase without touching
 * the items table.
 */

const READ_KEY = "my-library:read:v1";

export function loadReadIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(READ_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((value): value is string => typeof value === "string"));
  } catch {
    return new Set();
  }
}

export function saveReadIds(ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(READ_KEY, JSON.stringify([...ids]));
  } catch {
    // A full or blocked storage should never break browsing.
  }
}
