/**
 * Generates supabase/seed.sql from lib/seed.ts so the demo shelf and the
 * database seed can never drift apart.
 *
 *   node scripts/generate-seed-sql.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { SEED_ITEMS } from "../lib/seed.ts";

const here = dirname(fileURLToPath(import.meta.url));

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlTextArray(values) {
  if (!Array.isArray(values) || values.length === 0) return "'{}'::text[]";
  const body = values.map((value) => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",");
  return `'{${body}}'::text[]`;
}

const rows = SEED_ITEMS.map((item) => {
  const columns = [
    sqlString(item.id),
    sqlString(item.title),
    sqlString(item.author),
    sqlString(item.type),
    sqlString(item.category),
    sqlTextArray(item.tags),
    sqlString(item.coverColor),
    sqlString(item.note),
    sqlString(item.url),
    sqlString(item.filePath),
    String(item.position ?? 0),
    item.createdAt ? `${sqlString(item.createdAt)}::timestamptz` : "now()",
  ];
  return `  (${columns.join(", ")})`;
}).join(",\n");

const sql = `-- My Library — seed data
-- Generated from lib/seed.ts. Re-run: node scripts/generate-seed-sql.mjs
--
-- Run supabase/schema.sql first. This is safe to run more than once:
-- existing ids are left untouched.

insert into public.items
  (id, title, author, type, category, tags, cover_color, note, url, file_path, position, created_at)
values
${rows}
on conflict (id) do nothing;
`;

await mkdir(resolve(here, "../supabase"), { recursive: true });
await writeFile(resolve(here, "../supabase/seed.sql"), sql, "utf8");
console.log(`Wrote supabase/seed.sql with ${SEED_ITEMS.length} items.`);
