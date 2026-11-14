-- My Library — seed data
-- Generated from lib/seed.ts. Re-run: node scripts/generate-seed-sql.mjs
--
-- Run supabase/schema.sql first. This is safe to run more than once:
-- existing ids are left untouched.

insert into public.items
  (id, title, author, type, category, tags, cover_color, note, url, file_path, position, created_at)
values
  ('29a08fc2-a9a2-43aa-b8b7-2a3115fd5b59', 'Days at the Morisaki Bookshop', 'Satoshi Yagisawa', 'book', 'Fiction', '{"japan","bookshops","gentle"}'::text[], null, 'A quiet book about second chances, set above a second-hand bookshop in Jimbocho.', null, null, 10, '2026-11-13T19:46:00.228Z'::timestamptz),
  ('0101f98d-b0cb-4318-a699-d615871bb3ba', 'More Days at the Morisaki Bookshop', 'Satoshi Yagisawa', 'book', 'Fiction', '{"japan","bookshops","sequel"}'::text[], null, null, null, null, 20, '2026-11-13T19:46:00.854Z'::timestamptz),
  ('fbb7ed8d-cc8b-449c-996d-a5d39d05e0b2', 'Message From The Middle Of Nowhere: Icelandic viking philosophy for conquering the challenges of business and life', 'Gunnar Andri Thorisson', 'book', 'Fiction', '{"iceland","philosophy","business"}'::text[], null, null, null, null, 30, '2026-11-13T19:46:00.737Z'::timestamptz),
  ('d328d470-b370-45c4-8eb4-5d3f199cee73', 'Hagakure: The Book of the Samurai', 'Yamamoto Tsunetomo', 'book', 'Philosophy', '{"samurai","japan","discipline"}'::text[], null, null, null, null, 10, '2026-11-13T19:46:00.481Z'::timestamptz),
  ('2ce59096-e630-4582-a27a-27117913b4ef', 'Meditations', 'Marcus Aurelius', 'book', 'Philosophy', '{"stoicism","journal","ethics"}'::text[], null, 'Read a page at random when the day gets loud.', null, null, 20, '2026-11-13T19:46:00.665Z'::timestamptz),
  ('fdf2d599-bcfd-495f-95a6-cc6581e059fc', 'The Book of Five Rings', 'Musashi Miyamoto', 'book', 'Philosophy', '{"strategy","martial arts","focus"}'::text[], null, null, null, null, 30, '2026-11-13T19:46:01.224Z'::timestamptz),
  ('b0c7f5ba-7b25-4ca0-bac2-a44340ce5da4', 'The Obstacle Is the Way: The Timeless Art of Turning Trials into Triumph', 'Ryan Holiday', 'book', 'Philosophy', '{"stoicism","resilience","perception"}'::text[], null, 'The discipline of perception is the whole game.', null, null, 40, '2026-11-13T19:46:01.267Z'::timestamptz),
  ('a1000000-0000-4000-8000-000000000001', 'Read Slower', 'My notes', 'note', 'Philosophy', '{"reading","attention"}'::text[], null, 'A reminder I keep on the shelf: fewer books, read slower, write in the margins. A finished book is worth more than ten started ones.', null, null, 50, '2026-11-14T00:30:00.000Z'::timestamptz),
  ('f41272b4-78aa-45d0-9bb8-57fc6469f583', 'Perfectly Reasonable Deviations From the Beaten Track', 'Richard P. Feynman', 'book', 'Science', '{"letters","curiosity","physics"}'::text[], null, null, null, null, 10, '2026-11-13T19:46:01.120Z'::timestamptz),
  ('a1000000-0000-4000-8000-000000000002', 'You and Your Research', 'Richard Hamming', 'pdf', 'Science', '{"research","career","science"}'::text[], null, 'The talk I re-read whenever I need to pick a harder problem.', 'https://www.cs.virginia.edu/~robins/YouAndYourResearch.pdf', null, 20, '2026-11-14T00:20:00.000Z'::timestamptz),
  ('b8030bcb-4879-46c1-be76-46d994e9da94', 'Can''t Hurt Me: Master Your Mind and Defy the Odds', 'David Goggins', 'book', 'Psychology', '{"discipline","endurance","mindset"}'::text[], null, null, null, null, 10, '2026-11-13T19:46:00.185Z'::timestamptz),
  ('ea3b723d-3e19-4c61-a140-36992958f483', 'Psycho-Cybernetics (Updated and Expanded)', 'Maxwell Maltz', 'book', 'Psychology', '{"self-image","psychology","change"}'::text[], null, null, null, null, 20, '2026-11-13T19:46:01.187Z'::timestamptz),
  ('a1000000-0000-4000-8000-000000000003', 'The Tail End', 'Tim Urban', 'article', 'Psychology', '{"time","family","perspective"}'::text[], null, 'A useful, uncomfortable way to count the time you have left with the people you love.', 'https://waitbutwhy.com/2015/12/the-tail-end.html', null, 30, '2026-11-14T00:10:00.000Z'::timestamptz),
  ('390e70d1-1f4e-4e50-ad50-4d7bf4c67ba1', 'Atomic Habits', 'James Clear', 'book', 'Self-Development', '{"habits","systems","focus"}'::text[], null, 'Make it obvious, attractive, easy, and satisfying.', null, null, 10, '2026-11-13T19:33:43.916Z'::timestamptz),
  ('b9ddfef4-88a1-4cfd-a91e-60422a592b32', '100 Deadly Skills', 'Clint Emerson', 'book', 'Self-Development', '{"survival","fieldcraft","preparedness"}'::text[], null, null, null, null, 20, '2026-11-13T19:46:00.046Z'::timestamptz),
  ('18c3b210-7ac3-4cce-a9a4-5ddb09dac8fa', 'Ikigai: The Japanese Secret to a Long and Happy Life', 'Héctor García & Francesc Miralles', 'book', 'Self-Development', '{"purpose","japan","longevity"}'::text[], null, null, null, null, 30, '2026-11-13T19:46:00.620Z'::timestamptz),
  ('0b24db5e-1a7e-4793-a99e-54647af2212d', 'Warrior''s Way: The Art of Preparedness', 'Andres Ricardo Viloria', 'book', 'Self-Development', '{"preparedness","resilience","craft"}'::text[], null, null, null, null, 40, '2026-11-13T19:46:01.347Z'::timestamptz),
  ('a1000000-0000-4000-8000-000000000004', 'How to Do Great Work', 'Paul Graham', 'article', 'Self-Development', '{"essays","work","ambition"}'::text[], null, 'Curiosity, obsession, and the courage to work on what genuinely interests you.', 'https://paulgraham.com/greatwork.html', null, 50, '2026-11-14T00:05:00.000Z'::timestamptz),
  ('0ada1454-fccd-4e4b-933f-3ec26619dc94', 'The Almanack of Naval Ravikant: A Guide to Wealth and Happiness', 'Eric Jorgenson', 'book', 'Business & Economics', '{"wealth","leverage","happiness"}'::text[], null, null, null, null, 10, '2026-11-13T19:46:01.315Z'::timestamptz),
  ('a1000000-0000-4000-8000-000000000005', 'Steve Jobs: Stanford Commencement, 2005', 'Steve Jobs', 'video', 'Biography', '{"commencement","career","life"}'::text[], null, 'Three stories. Stay hungry, stay foolish.', 'https://www.youtube.com/watch?v=UF8uR6Z6KLc', null, 10, '2026-11-14T00:40:00.000Z'::timestamptz)
on conflict (id) do nothing;
