# My Library

A private, dark bookshelf for books, articles, PDFs, videos and notes. The public
shelf is read-only: a long horizontal wall of colourful spines, numbered category
dividers, filters, search, and a reading desk below the shelf where the selected
item lies open as a 3D cover beside its note-card. Behind `/admin` is a librarian's
desk for adding, editing, uploading and deleting items.

Built with **Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Supabase**.

---

## Quick start

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. No environment variables are required to look around:
the site starts in **demo mode** with the seed shelf (your 16 books plus a few
articles, a PDF, a video and a note) and keeps demo edits in `localStorage`.

The librarian's desk is at <http://localhost:3000/admin>. In demo mode the passcode
is **`library`** (override with `NEXT_PUBLIC_DEMO_PASSCODE`). Demo changes stay in
that browser; file uploads need Supabase.

Other scripts:

```bash
npm run build       # production build
npm run start       # serve the production build
npm run typecheck   # TypeScript
npm run seed:sql    # regenerate supabase/seed.sql from lib/seed.ts
```

---

## What's in the box

| Path | Purpose |
| --- | --- |
| `components/LibraryShell.tsx` | Shelf orchestration: filters, search, drag/inertia, wheel, keyboard, snap, scrubber, reading desk |
| `components/Spine.tsx` | A single spine + canvas-measured title fitting |
| `components/ShelfTier.tsx` | One tier: dividers, spines, plank, hover neighbours |
| `components/ReadingDesk.tsx` | Reading desk below the shelf: 3D cover + note-card, pager, read toggle |
| `lib/reading.ts` | Read/unread markers in `localStorage` (per browser) |
| `lib/palette.ts` | Hash → stable colour, dimensions and wavy blobs; ink contrast |
| `lib/items.ts` | **The only data layer**: Supabase or demo, auth, uploads, public URLs |
| `lib/seed.ts` | Seed items (also the source of `supabase/seed.sql`) |
| `lib/types.ts` | Item model, types, category order, title splitting |
| `app/globals.css` | Design tokens + every visual style |
| `supabase/schema.sql` | Table, trigger, RLS, grants, storage bucket and policies |
| `supabase/seed.sql` | Seed rows with stable UUIDs |
| `public/files/` | The 15 bundled book PDFs, served as `/files/<name>.pdf` |

---

## Adding an item

1. Go to `/admin` and sign in.
2. Paste a link and press **Fetch title** to auto-fill an article/video/PDF title
   (YouTube and Vimeo use oEmbed; other pages use Open Graph / `<title>`).
3. Fill in title, author, type, category, tags, optional note and optional cover
   colour. Leave the colour empty to derive it from the title hash.
4. Optionally attach a PDF/file (Supabase Storage, max 50 MB), paste a public URL,
   or paste a bundled path like `/files/atomic-habits.pdf`, then **Add to shelf**.

Uploaded files live in the public `library` storage bucket and are opened from the
reading desk in a new tab. Notes can have no link at all. Edits and deletes are in
the same list on the right.

### Bundled PDFs (`public/files/`)

The 15 book PDFs are committed under `public/files/` and linked from the seed with
relative URLs such as `/files/atomic-habits.pdf`. They need no storage service and
open from the reading desk in a new tab.

To add another PDF this way:

1. Copy it into `public/files/` with a lowercase, hyphenated name.
2. In `/admin`, edit the item and paste `/files/your-file.pdf` into the **URL**
   field — or add it to `lib/seed.ts` as `url` and re-run `npm run seed:sql`.
3. Commit and redeploy.

A relative URL works in both demo and Supabase mode, because the file is served by
Next.js itself. Because these files ship with every deployment, keep them modest in
size; move to Supabase Storage once the collection grows.

### Substack articles

Substack posts get their own **Substack** section on the shelf. Each one sits as an
article spine and opens the real post on Substack in a new tab.

1. Go to `/admin` and paste the post link (for example
   `https://joereis.substack.com/p/gartner-declares-2026-the-year-of`).
2. Press **Fetch title**. The title is read from the post's `og:title`, the author
   from its metadata, the type is set to **Article**, and the category is set to
   **Substack** automatically.
3. Adjust tags or note if you like, then **Add to shelf**.

Detection covers `*.substack.com` and Substack publications on custom domains
(their pages still load assets from `substackcdn.com`). If a link isn't recognised,
pick **Substack** from the category field's suggestions — the section is created by
the first article you save.

Categories are ordered by `CATEGORY_ORDER` in `lib/types.ts`; categories that are
not listed appear after the known ones. Divider numbers (`#01`, `#02`, …) are
assigned from the categories actually present.

---

## The reading desk

Below the shelf sits the **reading desk**: the selected item lies open as a 3D cover
on the left, with a note-card on the right showing its type, category, title, author,
note, tags and actions.

- **It is always there.** With nothing selected it shows the first item in the
  current view, so the page never has an empty section.
- **Click a spine** to bring that item to the desk; the page scrolls to it. There is
  no overlay panel.
- **Follows the shelf.** The desk is scoped to the active filter and, while
  searching, to the matching items. **Previous / Next** (or the counter) step
  through that same list.
- **Open / Read** opens a book, PDF, article or video in a new tab, labelled for its
  type.
- **Mark as read** toggles a per-browser marker saved in `localStorage`
  (`my-library:read:v1`). Read items show a small tick on their spine and say
  ", read" in the screen-reader label. It is personal to each browser and is not
  written to Supabase.
- **Search** highlights matched words on the desk too.

---

## Connect Supabase (real database, storage and login)

1. Create a project at <https://supabase.com>.
2. Open **SQL Editor** and run `supabase/schema.sql`, then `supabase/seed.sql`.
   That creates:
   - `public.items` with an `updated_at` trigger and indexes,
   - RLS: **public read**, **authenticated write**,
   - a public `library` storage bucket with authenticated upload/update/delete.
3. Go to **Authentication → Users → Add user** and create your own email + password.
4. Go to **Authentication → Sign In / Providers → Email** and **disable new user
   signups** so nobody else can create an account. Existing users can still sign in.
5. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API)
   - `NEXT_PUBLIC_SITE_URL`
6. Restart `npm run dev`. `/admin` now asks for email + password, and the public
   shelf reads from Postgres. The admin page shows `Supabase` instead of `Demo`.

The anon key is safe in the browser **because RLS is enabled**; only signed-in
users can write. Never put the service-role key in this app.

### Notes on the data

- Public reads use the anon client server-side with `force-dynamic`, so new items
  appear without a rebuild. If Supabase errors, the site falls back to the seed
  shelf and logs the reason.
- All persistence lives in `lib/items.ts`. To move to a different backend, replace
  the functions in that one file (`fetchItems`, `createItem`, `updateItem`,
  `deleteItem`, `uploadLibraryFile`, `signInAdmin`, `getAdminSession`,
  `signOutAdmin`, `hrefForItem`).
- `npm run seed:sql` regenerates `supabase/seed.sql` from `lib/seed.ts`. Seed
  inserts use `on conflict (id) do nothing`, so re-running is harmless.

---

## Change the palette

The palette is **Midnight Indigo + Ember**. There are two places, and both use the
same hex values:

1. **`app/globals.css`** — `:root` variables and the `@theme inline` Tailwind
   tokens. This drives the background, shelf, accent, text and the five spine
   colours:

   ```css
   --bg: #090b12;
   --shelf: #161b28;
   --shelf-top: #232b3f;
   --accent: #ff6a4d;
   --spine-indigo: #3b4bc8;
   --spine-teal: #14b8a6;
   --spine-violet: #8b5cf6;
   --spine-rose: #e5487a;
   --spine-sand: #e8d9b5;
   --text: #edeff7;
   --muted: #8a93ab;
   ```

2. **`lib/palette.ts`** — `SPINE_COLORS` (the same five spine colours) and
   `INK_LIGHT` / `INK_DARK`. The hash picks from this list and the luminance
   helper chooses the text colour automatically.

Change both lists, and the books recolor deterministically. Individual items can
override their colour with **Cover colour** in the admin form.

---

## Deploy to Vercel

### 1. Push the project

This repo is already pushed to
<https://github.com/Dyna-Myt/my-library> (private, `main`). If you fork or copy it:

```bash
git init
git add .
git commit -m "My Library"
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 2. Import on Vercel

- Go to <https://vercel.com/new> and import the repository.
- Framework preset: **Next.js** (auto-detected). Build: `npm run build`. No special
  output directory.
- **No environment variables are required to deploy in demo mode.** The site runs
  on the bundled 20-item seed with localStorage edits and the passcode `library`.
  Add these only when you connect Supabase or a custom domain (Production +
  Preview + Development):

  | Name | Value | Needed when |
  | --- | --- | --- |
  | `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` (or custom domain) | custom domain / canonical URLs |
  | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL | real database |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon/publishable key | real database |

  `NEXT_PUBLIC_DEMO_PASSCODE` is optional and only used when Supabase is absent.
- Deploy.

Or from the CLI (the `env add` lines are optional in demo mode):

```bash
npx vercel login
npx vercel link
npx vercel env add NEXT_PUBLIC_SITE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel --prod
```

After the first deploy, set `NEXT_PUBLIC_SITE_URL` to the final URL (and in
Supabase → Authentication → URL Configuration, add it as the Site URL) and
redeploy so canonical links, `robots.txt`, `sitemap.xml` and Open Graph tags point
at the right place. `/admin` is `noindex`.

---

## Interaction reference

- **Move the shelf:** drag with a mouse, swipe, two-finger trackpad scroll, mouse
  wheel, `←` / `→` keys, or the mini scrubber at the bottom.
- **Search:** press `/`, or type in the box. Matches title, author, category, tags
  and note; matches glow while the rest dim, and the reading desk marks the
  matched words. `Esc` clears.
- **Snap:** "Snap on" settles the wall at the nearest category divider after a
  drag/scroll.
- **Rows:** the **Rows** control switches between **Auto**, **1**, **2** and **3**
  stacked tiers. Auto keeps one long, scrollable row while the wall fits in about
  two screens, then splits into two or three tiers as the library grows.
- **Open an item:** click a spine or press Enter to show it on the reading desk
  below the shelf. The desk's **Previous / Next** buttons walk the current list.
- **Keyboard:** all spines, filters, search, scrubber and desk controls are
  focusable with visible focus rings. `←` / `→` move the shelf whenever you are
  not typing.
- **Reduced motion:** `prefers-reduced-motion` removes inertia, parallax, hover
  transforms and desk/slot animations.

---

## Security & privacy

- The public shelf exposes only what is in `items` (title, author, note, tags,
  links, file paths). That is intentional — it is a public read-only shelf.
- Keep private material out of the `library` bucket unless it is fine to share the
  public URL. Supabase public bucket URLs are unguessable but not access-controlled.
- `/admin` is protected by Supabase Auth; RLS enforces write access server-side.
- The link-preview endpoint blocks localhost/private hosts and times out, so it
  cannot be used to probe your internal network from the deployed app.
