# My Library

A private, dark bookshelf for books, articles, PDFs, videos and notes. The public
shelf is read-only: a long horizontal wall of colourful spines, numbered category
dividers, filters, search, and a detail panel. Behind `/admin` is a librarian's
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
| `components/LibraryShell.tsx` | Shelf orchestration: filters, search, drag/inertia, wheel, keyboard, snap, scrubber, panel |
| `components/Spine.tsx` | A single spine + canvas-measured title fitting |
| `components/ShelfTier.tsx` | One tier: dividers, spines, plank, hover neighbours |
| `components/DetailPanel.tsx` | Side panel / bottom sheet |
| `lib/palette.ts` | Hash → stable colour, dimensions and wavy blobs; ink contrast |
| `lib/items.ts` | **The only data layer**: Supabase or demo, auth, uploads, public URLs |
| `lib/seed.ts` | Seed items (also the source of `supabase/seed.sql`) |
| `lib/types.ts` | Item model, types, category order, title splitting |
| `app/globals.css` | Design tokens + every visual style |
| `supabase/schema.sql` | Table, trigger, RLS, grants, storage bucket and policies |
| `supabase/seed.sql` | Seed rows with stable UUIDs |

---

## Adding an item

1. Go to `/admin` and sign in.
2. Paste a link and press **Fetch title** to auto-fill an article/video/PDF title
   (YouTube and Vimeo use oEmbed; other pages use Open Graph / `<title>`).
3. Fill in title, author, type, category, tags, optional note and optional cover
   colour. Leave the colour empty to derive it from the title hash.
4. Optionally attach a PDF/file (Supabase Storage, max 50 MB), then **Add to shelf**.

Uploaded files live in the public `library` storage bucket and are opened from the
detail panel in a new tab. Notes can have no link at all. Edits and deletes are in
the same list on the right.

Categories are ordered by `CATEGORY_ORDER` in `lib/types.ts`; categories that are
not listed appear after the known ones. Divider numbers (`#01`, `#02`, …) are
assigned from the categories actually present.

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
- Add the environment variables (Production + Preview + Development):

  | Name | Value |
  | --- | --- |
  | `NEXT_PUBLIC_SITE_URL` | `https://your-project.vercel.app` (or custom domain) |
  | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase project URL |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your Supabase anon/publishable key |

  `NEXT_PUBLIC_DEMO_PASSCODE` is optional and only used when Supabase is absent.
- Deploy.

Or from the CLI:

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
  and note; matches glow while the rest dim, and the open detail panel marks the
  matched words. `Esc` clears.
- **Snap:** "Snap on" settles the wall at the nearest category divider after a
  drag/scroll.
- **Rows:** the **Rows** control switches between **Auto**, **1**, **2** and **3**
  stacked tiers. Auto keeps one long, scrollable row while the wall fits in about
  two screens, then splits into two or three tiers as the library grows.
- **Open an item:** click a spine or press Enter. `Esc` or the backdrop closes it.
- **Keyboard:** all spines, filters, search, scrubber and panel controls are
  focusable with visible focus rings.
- **Reduced motion:** `prefers-reduced-motion` removes inertia, parallax, hover
  transforms and panel/slot animations.

---

## Security & privacy

- The public shelf exposes only what is in `items` (title, author, note, tags,
  links, file paths). That is intentional — it is a public read-only shelf.
- Keep private material out of the `library` bucket unless it is fine to share the
  public URL. Supabase public bucket URLs are unguessable but not access-controlled.
- `/admin` is protected by Supabase Auth; RLS enforces write access server-side.
- The link-preview endpoint blocks localhost/private hosts and times out, so it
  cannot be used to probe your internal network from the deployed app.
