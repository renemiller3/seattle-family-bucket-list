-- Migration 016: populate start_date / end_date / recurrence / seasons
-- Comprehensive seasonality review. Activities whose experience is tied
-- to a specific window get an annual date range. Evergreen activities
-- get a `seasons` array for the seasonal-row sort.
-- Uses ilike prefix matching to handle hook-suffixed titles.
-- Idempotent — safe to re-run.

-- ─── Events (specific annual dates) ──────────────────────────────────────────
-- UW Cherry Blossoms (in case prior value was overwritten)
update public.activities
  set type = 'event', start_date = '2026-03-10', end_date = '2026-04-05', recurrence = 'annual'
  where title ilike 'UW Quad%';

-- Skagit Valley Tulips
update public.activities
  set type = 'event', start_date = '2026-04-01', end_date = '2026-04-30', recurrence = 'annual'
  where title ilike 'Skagit Valley%';

-- Puyallup Fair
update public.activities
  set type = 'event', start_date = '2026-08-28', end_date = '2026-09-21', recurrence = 'annual'
  where title ilike 'Puyallup Fair%';

-- Day Out with Thomas
update public.activities
  set type = 'event', start_date = '2026-07-10', end_date = '2026-07-26', recurrence = 'annual'
  where title ilike 'Day Out with Thomas%';

-- Alki / West Seattle 5K — Sunday May 17, 2026
update public.activities
  set type = 'event', start_date = '2026-05-17', end_date = '2026-05-17', recurrence = 'annual'
  where title ilike 'Alki Beach 5K%';

-- Hama Hama Oyster Rama — April 18–19, 2026
update public.activities
  set type = 'event', start_date = '2026-04-18', end_date = '2026-04-19', recurrence = 'annual'
  where title ilike 'Hama Hama%';

-- Fremont Solstice Parade — Saturday June 20, 2026
update public.activities
  set type = 'event', start_date = '2026-06-20', end_date = '2026-06-20', recurrence = 'annual'
  where title ilike 'Fremont Solstice Parade%';

-- ─── Seasonal activities (recurring annual window) ───────────────────────────
-- Ballard Locks Salmon Run: June–September
update public.activities
  set start_date = '2026-06-15', end_date = '2026-09-30', recurrence = 'seasonal'
  where title ilike 'Ballard Locks%';

-- Gene Coulon Fall Leaves: October–mid-November
update public.activities
  set start_date = '2026-10-01', end_date = '2026-11-15', recurrence = 'seasonal'
  where title ilike 'Gene Coulon%';

-- Mt. Rainier Paradise Meadow: July–September (snow-free window)
update public.activities
  set start_date = '2026-07-01', end_date = '2026-09-30', recurrence = 'seasonal'
  where title ilike 'Mt. Rainier%';

-- Great Northern & Cascade Railway: Saturdays May–October
update public.activities
  set start_date = '2026-05-01', end_date = '2026-10-31', recurrence = 'seasonal'
  where title ilike 'Great Northern%Cascade Railway%';

-- Kitsap Live Steamers: 2nd Saturdays May–October
update public.activities
  set start_date = '2026-05-01', end_date = '2026-10-31', recurrence = 'seasonal'
  where title ilike 'Kitsap Live Steamers%';

-- Golden Gardens Bonfire: summer
update public.activities
  set start_date = '2026-06-01', end_date = '2026-09-30', recurrence = 'seasonal'
  where title ilike 'Golden Gardens%';

-- Stump House Trail: meadow soggy Oct–May
update public.activities
  set start_date = '2026-04-15', end_date = '2026-11-01', recurrence = 'seasonal'
  where title ilike 'Stump House%';

-- T-Mobile Park Mariners Game: 2026 MLB home schedule
update public.activities
  set start_date = '2026-03-26', end_date = '2026-09-27', recurrence = 'seasonal'
  where title ilike 'T-Mobile Park%';

-- Kenmore Air Seaplane to Nanaimo: scheduled May–September
update public.activities
  set start_date = '2026-05-01', end_date = '2026-09-30', recurrence = 'seasonal'
  where title ilike 'Kenmore Air%';

-- Wenatchee River Float: outfitter season
update public.activities
  set start_date = '2026-07-01', end_date = '2026-09-07', recurrence = 'seasonal'
  where title ilike 'Wenatchee River%';

-- Lake Kachess Swim: warm-water window
update public.activities
  set start_date = '2026-06-15', end_date = '2026-09-15', recurrence = 'seasonal'
  where title ilike 'Lake Kachess%';

-- Beacon Hill Children's Farm: operating season (reopens mid-March, runs through mid-October)
update public.activities
  set start_date = '2026-03-12', end_date = '2026-10-12', recurrence = 'seasonal'
  where title ilike 'Beacon Hill Children%Farm%';

-- Sitting Lady Falls: falls flow Oct–April
update public.activities
  set start_date = '2026-10-15', end_date = '2027-04-30', recurrence = 'seasonal'
  where title ilike 'Sitting Lady Falls%';

-- ─── Clear dates on activities that are year-round ───────────────────────────
-- Ensures nothing stale is populated from prior edits.
update public.activities set start_date = null, end_date = null, recurrence = null
  where (title ilike 'Woodland Park Zoo%'
      or title ilike 'Seattle Aquarium%'
      or title ilike 'Seattle Children%Museum%'
      or title ilike 'Kerry Park%'
      or title ilike 'Discovery Park%'
      or title ilike 'Museum of Flight%'
      or title ilike 'Puget Sound Navy Museum%'
      or title ilike 'Pike Place Market%'
      or title ilike 'Snoqualmie Falls%'
      or title ilike 'IslandWood%'
      or title ilike 'Bremerton Bug Museum%'
      or title ilike 'Witty%Lagoon%'
      or title ilike 'Victoria Chinatown%'
      or title ilike 'Malahat SkyWalk%'
      or title ilike 'Hobbit House%Brothers Greenhouses%'
      or title ilike 'Crazy Cookie House%'
      or title ilike 'Little Norway%'
      or title ilike 'Green Lake%'
      or title ilike 'Butchart Gardens%');

-- ─── Seasons array for the seasonal row sort ─────────────────────────────────
-- Evergreen / all-season
update public.activities set seasons = '{spring,summer,fall,winter}'
  where title ilike 'Woodland Park Zoo%'
     or title ilike 'Seattle Aquarium%'
     or title ilike 'Kerry Park%'
     or title ilike 'Pike Place Market%'
     or title ilike 'Snoqualmie Falls%'
     or title ilike 'IslandWood%'
     or title ilike 'Victoria Chinatown%'
     or title ilike 'Malahat SkyWalk%'
     or title ilike 'Hobbit House%Brothers Greenhouses%'
     or title ilike 'Little Norway%'
     or title ilike 'Butchart Gardens%';

-- Rainy-day indoor destinations: skip summer
update public.activities set seasons = '{winter,spring,fall}'
  where title ilike 'Seattle Children%Museum%'
     or title ilike 'Museum of Flight%'
     or title ilike 'Puget Sound Navy Museum%'
     or title ilike 'Bremerton Bug Museum%';

-- Warm-weather outdoor: skip winter
update public.activities set seasons = '{spring,summer,fall}'
  where title ilike 'Discovery Park%'
     or title ilike 'Green Lake%'
     or title ilike 'Witty%Lagoon%'
     or title ilike 'Crazy Cookie House%'
     or title ilike 'Stump House%'
     or title ilike 'Great Northern%Cascade Railway%'
     or title ilike 'Kitsap Live Steamers%'
     or title ilike 'T-Mobile Park%'
     or title ilike 'Beacon Hill Children%Farm%';

-- Spring-only events
update public.activities set seasons = '{spring}'
  where title ilike 'UW Quad%'
     or title ilike 'Skagit Valley%'
     or title ilike 'Alki Beach 5K%'
     or title ilike 'Hama Hama%';

-- Summer-only
update public.activities set seasons = '{summer}'
  where title ilike 'Ballard Locks%'
     or title ilike 'Mt. Rainier%'
     or title ilike 'Golden Gardens%'
     or title ilike 'Day Out with Thomas%'
     or title ilike 'Fremont Solstice Parade%'
     or title ilike 'Wenatchee River%'
     or title ilike 'Lake Kachess%';

-- Summer + fall (extend into early fall)
update public.activities set seasons = '{summer,fall}'
  where title ilike 'Puyallup Fair%'
     or title ilike 'Kenmore Air%';

-- Fall-only
update public.activities set seasons = '{fall}'
  where title ilike 'Gene Coulon%';

-- Wet-season (fall, winter, spring)
update public.activities set seasons = '{fall,winter,spring}'
  where title ilike 'Sitting Lady Falls%';
