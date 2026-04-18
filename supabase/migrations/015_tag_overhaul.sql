-- Migration 015: tag overhaul
-- • Remove "Quick Outing" vibe from all activities
-- • Add "Animals" and "Transportation" vibes where appropriate
-- • Update Kerry Park vibes (add Outdoor / Nature)
-- • Add pregnancy_friendly (text[]) and crowd_level (text) columns
-- • Populate both for all activities
-- • Delete Bellevue Downtown Park

-- New columns
alter table public.activities
  add column if not exists pregnancy_friendly text[] not null default '{}',
  add column if not exists crowd_level text;

-- ─── Delete Bellevue Downtown Park ───────────────────────────────────────────
delete from public.activities where title = 'Bellevue Downtown Park';

-- ─── Strip Quick Outing everywhere it appears ─────────────────────────────────
update public.activities
  set vibes = array_remove(vibes, 'Quick Outing');

-- ─── Vibe corrections ────────────────────────────────────────────────────────
-- Kerry Park: add Outdoor / Nature
update public.activities set vibes = array_append(vibes, 'Outdoor / Nature')
  where title = 'Kerry Park' and not ('Outdoor / Nature' = any(vibes));

-- Animals vibe
update public.activities set vibes = array_append(vibes, 'Animals')
  where title in ('Woodland Park Zoo', 'Seattle Aquarium', 'Washington State Fair')
    and not ('Animals' = any(vibes));

-- Transportation vibe
update public.activities set vibes = array_append(vibes, 'Transportation')
  where title in (
    'Museum of Flight',
    'Ballard Locks',
    'Puget Sound Navy Museum',
    'Great Northern & Cascade Railway',
    'Day Out with Thomas',
    'Kitsap Live Steamers'
  ) and not ('Transportation' = any(vibes));

-- ─── Pregnancy Friendly ──────────────────────────────────────────────────────
update public.activities set pregnancy_friendly = '{"1st trimester","2nd trimester"}'
  where title in ('Woodland Park Zoo', 'Discovery Park', 'Green Lake', 'Washington State Fair',
                  'Museum of Flight', 'Stump House Trail', 'IslandWood', 'Snoqualmie Falls',
                  'Mt. Rainier National Park');

update public.activities set pregnancy_friendly = '{"1st trimester","2nd trimester","3rd trimester"}'
  where title in ('Seattle Children''s Museum', 'Golden Gardens Beach', 'Pike Place Market',
                  'Ballard Locks', 'Seattle Aquarium', 'Kerry Park', 'UW Cherry Blossoms',
                  'Gene Coulon Memorial Beach Park', 'Skagit Valley Tulip Festival',
                  'Puget Sound Navy Museum', 'Great Northern & Cascade Railway',
                  'Day Out with Thomas', 'Kitsap Live Steamers');

update public.activities set pregnancy_friendly = '{"1st trimester"}'
  where title = 'Mt. Rainier National Park';

-- ─── Crowd Level ─────────────────────────────────────────────────────────────
update public.activities set crowd_level = 'Usually quiet'
  where title in ('Discovery Park', 'Gene Coulon Memorial Beach Park', 'Puget Sound Navy Museum',
                  'Great Northern & Cascade Railway', 'Stump House Trail', 'IslandWood',
                  'Kitsap Live Steamers');

update public.activities set crowd_level = 'Gets busy'
  where title in ('Woodland Park Zoo', 'Seattle Children''s Museum', 'Golden Gardens Beach',
                  'Ballard Locks', 'Museum of Flight', 'Green Lake', 'Seattle Aquarium',
                  'Kerry Park', 'Mt. Rainier National Park', 'Skagit Valley Tulip Festival',
                  'Day Out with Thomas');

update public.activities set crowd_level = 'Very busy'
  where title in ('Pike Place Market', 'Washington State Fair', 'UW Cherry Blossoms',
                  'Snoqualmie Falls');
