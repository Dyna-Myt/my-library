import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { SEED_ITEMS } from "./seed";
import { isItemType, sortItems, type AdminSession, type ItemInput, type LibraryData, type LibraryItem } from "./types";

/**
 * The single data layer. Everything the app knows about persistence, auth and
 * file storage lives here so the source can be swapped without touching the UI.
 *
 * With Supabase env vars present it talks to Postgres + Storage + Auth.
 * Without them it runs as a local demo backed by localStorage.
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
const STORAGE_BUCKET = "library";
const DEMO_ITEMS_KEY = "my-library:items:v2";
const DEMO_SESSION_KEY = "my-library:demo-session";
const DEMO_PASSCODE = process.env.NEXT_PUBLIC_DEMO_PASSCODE ?? "library";
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL.startsWith("http") &&
      SUPABASE_ANON_KEY.length > 20 &&
      !SUPABASE_URL.includes("your-project"),
  );
}

export function getBrowserSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  if (typeof window === "undefined") {
    throw new Error("The browser Supabase client is only available in the browser.");
  }
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: "my-library-auth",
      },
    });
  }
  return browserClient;
}

function createServerSupabase(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

interface ItemRow {
  id: string;
  title: string;
  author: string | null;
  type: string | null;
  category: string | null;
  tags: string[] | null;
  cover_color: string | null;
  note: string | null;
  url: string | null;
  file_path: string | null;
  position: number | null;
  created_at: string | null;
}

function rowToItem(row: ItemRow): LibraryItem {
  return {
    id: row.id,
    title: row.title,
    author: row.author ?? "",
    type: isItemType(row.type) ? row.type : "book",
    category: row.category?.trim() || "Unsorted",
    tags: Array.isArray(row.tags) ? row.tags.filter(Boolean) : [],
    coverColor: row.cover_color,
    note: row.note,
    url: row.url,
    filePath: row.file_path,
    position: row.position ?? 0,
    createdAt: row.created_at,
  };
}

function itemToRow(input: ItemInput) {
  return {
    title: input.title.trim(),
    author: input.author.trim(),
    type: input.type,
    category: input.category.trim() || "Unsorted",
    tags: input.tags.map((tag) => tag.trim()).filter(Boolean),
    cover_color: input.coverColor || null,
    note: input.note?.trim() || null,
    url: input.url?.trim() || null,
    file_path: input.filePath || null,
    position: Number.isFinite(input.position) ? input.position : 0,
  };
}

export function publicFileUrl(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) return filePath;
  if (!isSupabaseConfigured()) return null;
  const encodedPath = filePath
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  return `${SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/${STORAGE_BUCKET}/${encodedPath}`;
}

/** The best link to open for an item: uploaded file first, then external URL. */
export function hrefForItem(item: LibraryItem): string | null {
  return publicFileUrl(item.filePath) ?? item.url ?? null;
}

function safeReadDemoItems(): LibraryItem[] {
  if (typeof window === "undefined") return sortItems(SEED_ITEMS);
  try {
    const raw = window.localStorage.getItem(DEMO_ITEMS_KEY);
    if (raw === null) return sortItems(SEED_ITEMS);
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return sortItems(SEED_ITEMS);
    const items = parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
      .map((entry): LibraryItem => ({
        id: String(entry.id ?? crypto.randomUUID()),
        title: String(entry.title ?? "Untitled"),
        author: String(entry.author ?? ""),
        type: isItemType(entry.type) ? entry.type : "book",
        category: String(entry.category ?? "Unsorted"),
        tags: Array.isArray(entry.tags) ? entry.tags.map(String) : [],
        coverColor: typeof entry.coverColor === "string" ? entry.coverColor : null,
        note: typeof entry.note === "string" ? entry.note : null,
        url: typeof entry.url === "string" ? entry.url : null,
        filePath: typeof entry.filePath === "string" ? entry.filePath : null,
        position: Number.isFinite(entry.position) ? Number(entry.position) : 0,
        createdAt: typeof entry.createdAt === "string" ? entry.createdAt : null,
      }));
    return sortItems(items);
  } catch {
    return sortItems(SEED_ITEMS);
  }
}

function writeDemoItems(items: LibraryItem[]): void {
  if (typeof window === "undefined") {
    throw new Error("Demo items can only be changed in the browser.");
  }
  window.localStorage.setItem(DEMO_ITEMS_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("my-library:changed"));
}

export function resetDemoItems(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(DEMO_ITEMS_KEY);
    window.dispatchEvent(new Event("my-library:changed"));
  }
}

export async function fetchItems(): Promise<LibraryData> {
  if (!isSupabaseConfigured()) {
    return { items: safeReadDemoItems(), source: "demo" };
  }

  try {
    const client = typeof window === "undefined" ? createServerSupabase() : getBrowserSupabase();
    const { data, error } = await client
      .from("items")
      .select("id,title,author,type,category,tags,cover_color,note,url,file_path,position,created_at")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return { items: sortItems((data ?? []).map((row) => rowToItem(row as ItemRow))), source: "supabase" };
  } catch (error) {
    console.error("[my-library] Could not load Supabase items, showing the local seed.", error);
    return { items: sortItems(SEED_ITEMS), source: "demo" };
  }
}

export async function createItem(input: ItemInput): Promise<LibraryItem> {
  if (!isSupabaseConfigured()) {
    const items = safeReadDemoItems();
    const item: LibraryItem = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    writeDemoItems([...items, item]);
    return item;
  }

  const client = getBrowserSupabase();
  const { data, error } = await client.from("items").insert(itemToRow(input)).select("*").single();
  if (error) throw new Error(error.message);
  return rowToItem(data as ItemRow);
}

export async function updateItem(id: string, input: ItemInput): Promise<LibraryItem> {
  if (!isSupabaseConfigured()) {
    const items = safeReadDemoItems();
    const next = items.map((item) => (item.id === id ? { ...item, ...input } : item));
    writeDemoItems(next);
    const updated = next.find((item) => item.id === id);
    if (!updated) throw new Error("Item not found.");
    return updated;
  }

  const client = getBrowserSupabase();
  const { data, error } = await client
    .from("items")
    .update(itemToRow(input))
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return rowToItem(data as ItemRow);
}

export async function deleteItem(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    writeDemoItems(safeReadDemoItems().filter((item) => item.id !== id));
    return;
  }

  const client = getBrowserSupabase();
  const { error } = await client.from("items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

function sanitizeFilename(name: string): string {
  const dot = name.lastIndexOf(".");
  const extension = dot > 0 ? name.slice(dot).toLowerCase().replace(/[^.a-z0-9]/g, "") : "";
  const base =
    (dot > 0 ? name.slice(0, dot) : name)
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "file";
  return `${base}${extension}`;
}

export interface UploadedFile {
  path: string;
  publicUrl: string;
  name: string;
  type: string;
  size: number;
}

export async function uploadLibraryFile(file: File): Promise<UploadedFile> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "File uploads need Supabase Storage. Add your Supabase keys, or paste a URL instead.",
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("That file is larger than 50 MB.");
  }

  const client = getBrowserSupabase();
  const id = crypto.randomUUID();
  const path = `${new Date().getFullYear()}/${id}-${sanitizeFilename(file.name)}`;
  const { error } = await client.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || "application/octet-stream",
  });
  if (error) throw new Error(error.message);

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return {
    path,
    publicUrl: data.publicUrl,
    name: file.name,
    type: file.type,
    size: file.size,
  };
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  if (!isSupabaseConfigured()) {
    if (password !== DEMO_PASSCODE) {
      throw new Error("That passcode does not match.");
    }
    const session: AdminSession = { email: email.trim() || "local@demo", demo: true };
    window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(session));
    return session;
  }

  const client = getBrowserSupabase();
  const { data, error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw new Error(error.message);
  if (!data.user?.email) throw new Error("Signed in, but the account has no email.");
  return { email: data.user.email, demo: false };
}

export async function getAdminSession(): Promise<AdminSession | null> {
  if (!isSupabaseConfigured()) {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<AdminSession>;
      return { email: parsed.email || "local@demo", demo: true };
    } catch {
      return null;
    }
  }

  const client = getBrowserSupabase();
  const { data } = await client.auth.getSession();
  if (!data.session?.user.email) return null;
  return { email: data.session.user.email, demo: false };
}

export async function signOutAdmin(): Promise<void> {
  if (!isSupabaseConfigured()) {
    if (typeof window !== "undefined") window.localStorage.removeItem(DEMO_SESSION_KEY);
    return;
  }
  await getBrowserSupabase().auth.signOut();
}

export function demoPasscodeHint(): string {
  return DEMO_PASSCODE;
}
