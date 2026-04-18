-- Migration 015: tag overhaul
-- Activity titles in the DB all have hook suffixes
-- (e.g. "Woodland Park Zoo — Feed the Giraffes"), so this migration
-- matches by title prefix via ilike. Idempotent — safe to re-run.
--
-- • Remove "Quick Outing" vibe from all activities
-- • Add "Animals" and "Transportation" vibes where appropriate
-- • Add Outdoor / Nature to Kerry Park
-- • Add pregnancy_friendly (text[]) and crowd_level (text) columns
-- • Populate both for listed activities
-- • Delete Bellevue Downtown Park

-- ─── New columns ─────────────────────────────────────────────────────────────
alter table public.activities
  add column if not exists pregnancy_friendly text[] not null default '{}',
  add column if not exists crowd_level text;

-- ─── Delete Bellevue Downtown Park ───────────────────────────────────────────
delete from public.activities where title ilike 'Bellevue Downtown Park%';

-- ─── Strip Quick Outing everywhere it appears ────────────────────────────────
update public.activities
  set vibes = array_remove(vibes, 'Quick Outing');

-- ─── Vibe corrections ────────────────────────────────────────────────────────
-- Kerry Park: add Outdoor / Nature
update public.activities set vibes = array_append(vibes, 'Outdoor / Nature')
  where title ilike 'Kerry Park%' and not ('Outdoor / Nature' = any(vibes));

-- Animals vibe
update public.activities set vibes = array_append(vibes, 'Animals')
  where (title ilike 'Woodland Park Zoo%'
      or title ilike 'Seattle Aquarium%'
      or title ilike 'Puyallup Fair%'
      or title ilike 'Beacon Hill Children%Farm%'
      or title ilike 'Bremerton Bug Museum%')
    and not ('Animals' = any(vibes));

-- Transportation vibe
update public.activities set vibes = array_append(vibes, 'Transportation')
  where (title ilike 'Museum of Flight%'
      or title ilike 'Ballard Locks%'
      or title ilike 'Puget Sound Navy Museum%'
      or title ilike 'Great Northern%Cascade Railway%'
      or title ilike 'Day Out with Thomas%'
      or title ilike 'Kitsap Live Steamers%')
    and not ('Transportation' = any(vibes));

-- ─── Pregnancy Friendly ──────────────────────────────────────────────────────
-- 1st + 2nd trimester
update public.activities set pregnancy_friendly = '{"1st trimester","2nd trimester"}'
  where title ilike 'Woodland Park Zoo%'
     or title ilike 'Discovery Park%'
     or title ilike 'Green Lake%'
     or title ilike 'Puyallup Fair%'
     or title ilike 'Museum of Flight%'
     or title ilike 'Stump House%'
     or title ilike 'IslandWood%'
     or title ilike 'Snoqualmie Falls%';

-- All three trimesters
update public.activities set pregnancy_friendly = '{"1st trimester","2nd trimester","3rd trimester"}'
  where title ilike 'Seattle Children%Museum%'
     or title ilike 'Golden Gardens%'
     or title ilike 'Pike Place Market%'
     or title ilike 'Ballard Locks%'
     or title ilike 'Seattle Aquarium%'
     or title ilike 'Kerry Park%'
     or title ilike 'UW Quad%'
     or title ilike 'Gene Coulon%'
     or title ilike 'Skagit Valley%'
     or title ilike 'Puget Sound Navy Museum%'
     or title ilike 'Great Northern%Cascade Railway%'
     or title ilike 'Day Out with Thomas%'
     or title ilike 'Kitsap Live Steamers%';

-- 1st trimester only (elevation)
update public.activities set pregnancy_friendly = '{"1st trimester"}'
  where title ilike 'Mt. Rainier%';

-- ─── Crowd Level ─────────────────────────────────────────────────────────────
update public.activities set crowd_level = 'Usually quiet'
  where title ilike 'Discovery Park%'
     or title ilike 'Gene Coulon%'
     or title ilike 'Puget Sound Navy Museum%'
     or title ilike 'Great Northern%Cascade Railway%'
     or title ilike 'Stump House%'
     or title ilike 'IslandWood%'
     or title ilike 'Kitsap Live Steamers%';

update public.activities set crowd_level = 'Gets busy'
  where title ilike 'Woodland Park Zoo%'
     or title ilike 'Seattle Children%Museum%'
     or title ilike 'Golden Gardens%'
     or title ilike 'Ballard Locks%'
     or title ilike 'Museum of Flight%'
     or title ilike 'Green Lake%'
     or title ilike 'Seattle Aquarium%'
     or title ilike 'Kerry Park%'
     or title ilike 'Mt. Rainier%'
     or title ilike 'Skagit Valley%'
     or title ilike 'Day Out with Thomas%';

update public.activities set crowd_level = 'Very busy'
  where title ilike 'Pike Place Market%'
     or title ilike 'Puyallup Fair%'
     or title ilike 'UW Quad%'
     or title ilike 'Snoqualmie Falls%';
