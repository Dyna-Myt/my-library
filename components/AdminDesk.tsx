"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createItem,
  deleteItem,
  demoPasscodeHint,
  fetchItems,
  getAdminSession,
  isSupabaseConfigured,
  resetDemoItems,
  signInAdmin,
  signOutAdmin,
  updateItem,
  uploadLibraryFile,
} from "@/lib/items";
import { normalizeHex, spineProfile } from "@/lib/palette";
import {
  CATEGORY_ORDER,
  ITEM_TYPE_LABELS,
  ITEM_TYPES,
  type AdminSession,
  type DataSource,
  type ItemInput,
  type ItemType,
  type LibraryItem,
} from "@/lib/types";
import { ArrowLeftIcon, CloseIcon, PlusIcon, UploadIcon } from "./icons";

interface FormState {
  title: string;
  author: string;
  type: ItemType;
  category: string;
  tags: string;
  coverColor: string;
  note: string;
  url: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  author: "",
  type: "book",
  category: "Unsorted",
  tags: "",
  coverColor: "",
  note: "",
  url: "",
};

function fileTypeFor(file: File): ItemType {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return "pdf";
  return "pdf";
}

export function AdminDesk() {
  const [session, setSession] = useState<AdminSession | null | undefined>(undefined);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [items, setItems] = useState<LibraryItem[]>([]);
  const [source, setSource] = useState<DataSource>("demo");
  const [itemsLoading, setItemsLoading] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPosition, setEditingPosition] = useState(0);
  const [editingFilePath, setEditingFilePath] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [manageQuery, setManageQuery] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const configured = isSupabaseConfigured();

  const loadItems = useCallback(async () => {
    setItemsLoading(true);
    try {
      const data = await fetchItems();
      setItems(data.items);
      setSource(data.source);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not load the shelf.");
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    getAdminSession()
      .then((next) => {
        if (alive) setSession(next);
      })
      .catch(() => {
        if (alive) setSession(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (session) loadItems();
  }, [session, loadItems]);

  const categoryOptions = useMemo(() => {
    const present = new Set(items.map((item) => item.category));
    const extras = Array.from(present).filter(
      (category) => !(CATEGORY_ORDER as readonly string[]).includes(category),
    );
    return [...CATEGORY_ORDER, ...extras];
  }, [items]);

  const filteredItems = useMemo(() => {
    const needle = manageQuery.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) =>
      [item.title, item.author, item.category, item.type, item.tags.join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [items, manageQuery]);

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setEditingPosition(0);
    setEditingFilePath(null);
    setFile(null);
    setFormError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (formRef.current) formRef.current.reset();
  }, []);

  const startEdit = (item: LibraryItem) => {
    setEditingId(item.id);
    setEditingPosition(item.position);
    setEditingFilePath(item.filePath);
    setForm({
      title: item.title,
      author: item.author,
      type: item.type,
      category: item.category,
      tags: item.tags.join(", "),
      coverColor: item.coverColor ?? "",
      note: item.note ?? "",
      url: item.url ?? "",
    });
    setFile(null);
    setFormError("");
    setNotice("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoggingIn(true);
    setLoginError("");
    try {
      const next = await signInAdmin(loginEmail, loginPassword);
      setSession(next);
      setLoginPassword("");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutAdmin();
    setSession(null);
    setItems([]);
    resetForm();
  };

  const handleFetchLink = async () => {
    const url = form.url.trim();
    if (!url) return;
    setLinkLoading(true);
    setFormError("");
    try {
      const response = await fetch("/api/link-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = (await response.json()) as {
        title?: string;
        author?: string;
        siteName?: string;
        suggestedType?: ItemType;
        suggestedCategory?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || "Could not read that link.");
      setForm((previous) => ({
        ...previous,
        title: data.title?.trim() || previous.title,
        author: previous.author.trim() || data.author?.trim() || previous.author,
        type: data.suggestedType ?? previous.type,
        category:
          previous.category.trim() && previous.category !== "Unsorted"
            ? previous.category
            : data.suggestedCategory ?? previous.category,
      }));
      setNotice(
        data.title
          ? `Fetched “${data.title}”${data.siteName ? ` from ${data.siteName}` : ""}. Check the details, then save.`
          : "The link could not be read automatically. Add the details by hand.",
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not fetch that link.");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    setNotice("");

    const title = form.title.trim();
    if (!title) {
      setFormError("A title is required.");
      return;
    }
    if (form.url.trim() && !/^https?:\/\//i.test(form.url.trim())) {
      setFormError("Links need to start with http:// or https://.");
      return;
    }
    const coverColor = form.coverColor.trim() ? normalizeHex(form.coverColor) : null;
    if (form.coverColor.trim() && !coverColor) {
      setFormError("Cover colour must be a hex value like #3B4BC8, or left empty for auto.");
      return;
    }

    setSaving(true);
    try {
      let filePath = editingFilePath;
      if (file) {
        const uploaded = await uploadLibraryFile(file);
        filePath = uploaded.path;
      }

      const category = form.category.trim() || "Unsorted";
      const position = editingId
        ? editingPosition
        : Math.max(
            0,
            ...items.filter((item) => item.category === category).map((item) => item.position),
          ) + 10;

      const input: ItemInput = {
        title,
        author: form.author.trim(),
        type: form.type,
        category,
        tags: form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        coverColor,
        note: form.note.trim() || null,
        url: form.url.trim() || null,
        filePath,
        position,
      };

      if (editingId) {
        await updateItem(editingId, input);
        setNotice(`“${title}” updated.`);
      } else {
        await createItem(input);
        setNotice(`“${title}” added to the shelf.`);
      }

      await loadItems();
      resetForm();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save this item.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: LibraryItem) => {
    const okay = window.confirm(`Remove “${item.title}” from the shelf? This cannot be undone.`);
    if (!okay) return;
    setFormError("");
    try {
      await deleteItem(item.id);
      setNotice(`“${item.title}” removed.`);
      if (editingId === item.id) resetForm();
      await loadItems();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not delete this item.");
    }
  };

  const handleResetDemo = async () => {
    resetDemoItems();
    setNotice("Demo shelf reset to the original books.");
    await loadItems();
  };

  const previewProfile = spineProfile(form.title || "Untitled", form.type, form.coverColor);

  if (session === undefined) {
    return (
      <div className="login-wrap">
        <p style={{ color: "var(--muted)", fontSize: 13 }}>Opening the librarian&apos;s desk…</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <h1>The librarian&apos;s desk</h1>
          <p>
            {configured
              ? "Sign in with the Supabase account that owns this library. Only you can write to the shelf."
              : "This build is running without Supabase. Enter the demo passcode to edit a shelf that lives in this browser."}
          </p>
          <form onSubmit={handleLogin} className="admin-form">
            {configured && (
              <div className="field">
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={loginEmail}
                  onChange={(event) => setLoginEmail(event.target.value)}
                  required
                />
              </div>
            )}
            <div className="field">
              <label htmlFor="admin-password">{configured ? "Password" : "Demo passcode"}</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                required
              />
            </div>
            {loginError && <div className="admin-error">{loginError}</div>}
            <button type="submit" disabled={loggingIn}>
              {loggingIn ? "Opening…" : "Unlock the desk"}
            </button>
          </form>
          {!configured && (
            <p className="login-hint">
              Demo passcode: <code>{demoPasscodeHint()}</code> — local changes only.
            </p>
          )}
          <a className="admin-back" href="/" style={{ marginTop: 20 }}>
            <ArrowLeftIcon /> Back to the shelf
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap admin-page">
      <header className="admin-header">
        <a className="admin-back" href="/">
          <ArrowLeftIcon /> Back to the shelf
        </a>
        <div className="admin-signed-in">
          <span>
            Signed in as <strong>{session.email}</strong>
          </span>
          <button type="button" className="btn-ghost" style={{ padding: "6px 10px", fontSize: 11 }} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <h1 className="admin-heading">The librarian&apos;s desk</h1>
      <p className="admin-sub">
        Add a book, file an essay, upload a PDF, or pin a note to the shelf. Everything is private
        to you.
      </p>

      {!configured ? (
        <div className="admin-notice">
          <strong>Demo mode.</strong> Changes are saved in this browser only. Add
          <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to
          connect Postgres, Storage and Auth. File uploads need Supabase; paste a URL instead for
          now.
        </div>
      ) : source === "demo" ? (
        <div className="admin-notice">
          <strong>Supabase isn&apos;t answering.</strong> The public seed is being shown. Check your
          keys, the <code>items</code> table and the RLS policies, then reload.
        </div>
      ) : null}

      {(notice || formError) && (
        <div className={formError ? "admin-error" : "admin-success"} style={{ marginBottom: 18 }}>
          {formError || notice}
        </div>
      )}

      <div className="admin-grid">
        <section className="admin-card" aria-labelledby="form-title">
          <div className="admin-card-head">
            <h2 id="form-title">{editingId ? "Edit item" : "Add an item"}</h2>
            {editingId && (
              <button type="button" className="btn-ghost" style={{ padding: "5px 9px", fontSize: 10 }} onClick={resetForm}>
                <CloseIcon /> Cancel edit
              </button>
            )}
          </div>
          <div className="admin-card-body">
            <form ref={formRef} className="admin-form" onSubmit={handleSave}>
              <div className="field">
                <label htmlFor="item-url">Link</label>
                <div className="field-split">
                  <input
                    id="item-url"
                    type="url"
                    placeholder="https://…"
                    value={form.url}
                    onChange={(event) => setForm({ ...form, url: event.target.value })}
                  />
                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ padding: "8px 11px", fontSize: 11, whiteSpace: "nowrap" }}
                    onClick={handleFetchLink}
                    disabled={linkLoading || !form.url.trim()}
                  >
                    {linkLoading ? "Reading…" : "Fetch title"}
                  </button>
                </div>
                <span className="field-hint">
                  Paste an article, video or PDF link. Optional for notes.
                </span>
              </div>

              <div className="field">
                <label htmlFor="item-title">Title *</label>
                <input
                  id="item-title"
                  type="text"
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="The title as it will read on the spine"
                  required
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="item-author">Author</label>
                  <input
                    id="item-author"
                    type="text"
                    value={form.author}
                    onChange={(event) => setForm({ ...form, author: event.target.value })}
                    placeholder="Author or source"
                  />
                </div>
                <div className="field">
                  <label htmlFor="item-type">Type</label>
                  <select
                    id="item-type"
                    value={form.type}
                    onChange={(event) =>
                      setForm({ ...form, type: event.target.value as ItemType })
                    }
                  >
                    {ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ITEM_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label htmlFor="item-category">Category</label>
                  <input
                    id="item-category"
                    type="text"
                    list="category-options"
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                  />
                  <datalist id="category-options">
                    {categoryOptions.map((category) => (
                      <option key={category} value={category} />
                    ))}
                  </datalist>
                </div>
                <div className="field">
                  <label htmlFor="item-tags">Tags</label>
                  <input
                    id="item-tags"
                    type="text"
                    value={form.tags}
                    onChange={(event) => setForm({ ...form, tags: event.target.value })}
                    placeholder="stoicism, focus, japan"
                  />
                </div>
              </div>

              <div className="field">
                <span className="field-label">Cover colour</span>
                <div className="color-row">
                  <input
                    aria-label="Cover colour"
                    type="color"
                    value={normalizeHex(form.coverColor) ?? previewProfile.color}
                    onChange={(event) => setForm({ ...form, coverColor: event.target.value })}
                  />
                  <span className="field-hint">
                    {form.coverColor.trim()
                      ? normalizeHex(form.coverColor) ?? "That is not a hex colour"
                      : "Auto — generated from the title hash"}
                  </span>
                  <button
                    type="button"
                    className="mini-button"
                    onClick={() => setForm({ ...form, coverColor: "" })}
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="item-note">Note</label>
                <textarea
                  id="item-note"
                  value={form.note}
                  onChange={(event) => setForm({ ...form, note: event.target.value })}
                  placeholder="A line about why this is on the shelf…"
                />
              </div>

              <div className="field">
                <span className="field-label">File</span>
                <label className="file-drop">
                  <UploadIcon />
                  <span>
                    <strong>{file ? file.name : editingFilePath ? "Keep the existing file" : "Choose a PDF or file"}</strong>
                    <br />
                    PDF, EPUB, image — up to 50 MB. Optional when there&apos;s a link.
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(event) => {
                      const next = event.target.files?.[0] ?? null;
                      setFile(next);
                      if (next) {
                        setForm((previous) => ({ ...previous, type: fileTypeFor(next) }));
                      }
                    }}
                  />
                </label>
                {!configured && (
                  <span className="field-hint">
                    Uploads need Supabase Storage. Paste a URL instead, or connect Supabase first.
                  </span>
                )}
              </div>

              {formError && <div className="admin-error">{formError}</div>}

              <div className="admin-form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  <PlusIcon />
                  {saving ? "Saving…" : editingId ? "Save changes" : "Add to shelf"}
                </button>
                {editingId && (
                  <button type="button" className="btn-ghost" onClick={resetForm}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </section>

        <section className="admin-card" aria-labelledby="manage-title">
          <div className="admin-card-head">
            <h2 id="manage-title">
              On the shelf <span style={{ color: "var(--muted)", fontWeight: 400 }}>({items.length})</span>
            </h2>
            <span className="source-pill" data-source={source}>
              <span className="dot" />
              {source === "supabase" ? "Supabase" : "Demo"}
            </span>
          </div>
          <div className="manage-toolbar">
            <input
              className="manage-search"
              type="search"
              value={manageQuery}
              onChange={(event) => setManageQuery(event.target.value)}
              placeholder="Find an item to edit…"
              aria-label="Find an item to edit"
            />
            {!configured && (
              <button
                type="button"
                className="mini-button"
                onClick={handleResetDemo}
                title="Restore the original seed items"
              >
                Reset demo
              </button>
            )}
          </div>
          <div className="manage-list">
            {itemsLoading && items.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 12, padding: "18px" }}>Loading the shelf…</p>
            ) : filteredItems.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 12, padding: "18px" }}>
                {items.length === 0 ? "Nothing on the shelf yet. Add your first item." : "No items match that search."}
              </p>
            ) : (
              filteredItems.map((item) => {
                const profile = spineProfile(item.title, item.type, item.coverColor);
                return (
                  <div key={item.id} className="manage-item">
                    <span
                      className="manage-swatch"
                      style={{ background: profile.color }}
                      aria-hidden="true"
                    />
                    <div className="manage-main">
                      <div className="manage-title" title={item.title}>
                        {item.title}
                      </div>
                      <div className="manage-meta">
                        {item.author || "Unknown author"} · {ITEM_TYPE_LABELS[item.type]} ·{" "}
                        {item.category}
                      </div>
                    </div>
                    <div className="manage-actions">
                      <button type="button" onClick={() => startEdit(item)}>
                        Edit
                      </button>
                      <button type="button" data-danger="true" onClick={() => handleDelete(item)}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
