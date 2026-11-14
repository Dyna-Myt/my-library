export const ITEM_TYPES = ["book", "article", "pdf", "video", "note"] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  book: "Book",
  article: "Article",
  pdf: "PDF",
  video: "Video",
  note: "Note",
};

export interface LibraryItem {
  id: string;
  title: string;
  author: string;
  type: ItemType;
  category: string;
  tags: string[];
  coverColor: string | null;
  note: string | null;
  url: string | null;
  filePath: string | null;
  position: number;
  createdAt: string | null;
}

export type ItemInput = Omit<LibraryItem, "id" | "createdAt">;

export type DataSource = "supabase" | "demo";

export interface LibraryData {
  items: LibraryItem[];
  source: DataSource;
}

export interface AdminSession {
  email: string;
  demo: boolean;
}

/** Canonical shelf order. Categories not present in the data are skipped. */
export const CATEGORY_ORDER = [
  "Fiction",
  "Philosophy",
  "Science",
  "Psychology",
  "Self-Development",
  "Business & Economics",
  "Technology",
  "History",
  "Biography",
  "Spirituality",
  "Poetry",
  "Art & Culture",
  "Politics & Society",
  "Children",
  "Unsorted",
] as const;

export function categoryRank(category: string): number {
  const index = (CATEGORY_ORDER as readonly string[]).indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

export function sortItems(items: LibraryItem[]): LibraryItem[] {
  return [...items].sort((a, b) => {
    const category = categoryRank(a.category) - categoryRank(b.category);
    if (category !== 0) return category;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    if (a.position !== b.position) return a.position - b.position;
    return (a.title ?? "").localeCompare(b.title ?? "");
  });
}

export function initialsFor(author: string): string {
  const parts = author
    .replace(/&/g, " ")
    .replace(/[^\p{L}\p{N}\s.-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function splitTitle(title: string): { main: string; subtitle: string } {
  const index = title.indexOf(":");
  if (index === -1) return { main: title.trim(), subtitle: "" };
  return {
    main: title.slice(0, index).trim(),
    subtitle: title.slice(index + 1).trim(),
  };
}

export function isItemType(value: unknown): value is ItemType {
  return typeof value === "string" && (ITEM_TYPES as readonly string[]).includes(value);
}
