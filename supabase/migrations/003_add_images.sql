-- Add image_url column
alter table public.activities add column if not exists image_url text;

-- Update activities with location-specific Unsplash photos
-- Pike Place Market sign (photo by Erin Hervey, taken at Pike Place Market)
update public.activities set image_url = 'https://images.unsplash.com/photo-1540321553803-f9c048dd5f9a?w=800&q=80'
where title = 'Pike Place Market (Family Edition)';

-- Golden Gardens Beach sunset (photo by Srivatsan Balaji, taken at Golden Gardens Park)
update public.activities set image_url = 'https://images.unsplash.com/photo-1657127939747-7281daf5691f?w=800&q=80'
where title = 'Golden Gardens Beach';

-- Kerry Park / Seattle skyline with Space Needle (photo by Andrea Leopardi)
update public.activities set image_url = 'https://images.unsplash.com/photo-1542223616-740d5dff7f56?w=800&q=80'
where title = 'Kerry Park';

-- Discovery Park lighthouse (photo taken at Discovery Park)
update public.activities set image_url = 'https://images.unsplash.com/photo-1630381962358-a17a4cb47b4d?w=800&q=80'
where title = 'Discovery Park';

-- Seattle Aquarium jellyfish (photo by Rakshith Acharya, taken at Seattle Aquarium)
update public.activities set image_url = 'https://images.unsplash.com/photo-1711911486034-906abc0d1d94?w=800&q=80'
where title = 'Seattle Aquarium';

-- State fair carnival at night (photo by benjamin lehman, county fair)
update public.activities set image_url = 'https://images.unsplash.com/photo-1694271643834-4aaaef614add?w=800&q=80'
where title = 'WA State Fair (Puyallup Fair)';

-- Woodland Park Zoo (photo by Bryan Hanson, taken at Woodland Park Zoo)
update public.activities set image_url = 'https://images.unsplash.com/photo-1517524392322-311409f24e4a?w=800&q=80'
where title = 'Woodland Park Zoo';

-- Children playing in colorful indoor space
update public.activities set image_url = 'https://images.unsplash.com/photo-1521327023263-d1e2ca16ca6b?w=800&q=80'
where title = 'Seattle Children''s Museum';

-- Green Lake Seattle (photo taken at Green Lake)
update public.activities set image_url = 'https://images.unsplash.com/photo-1652029181656-83716e5089bc?w=800&q=80'
where title = 'Green Lake';

-- Ballard Locks / boats
update public.activities set image_url = 'https://images.unsplash.com/photo-1566492238579-73920a74378a?w=800&q=80'
where title = 'Ballard Locks (Hiram M. Chittenden Locks)';

-- Museum of Flight / airplane in hangar
update public.activities set image_url = 'https://images.unsplash.com/photo-1662905213757-dc996db42049?w=800&q=80'
where title = 'Museum of Flight';

-- Bellevue Downtown Park / Seattle skyline view
update public.activities set image_url = 'https://images.unsplash.com/photo-1696605837476-ba5143a12701?w=800&q=80'
where title = 'Bellevue Downtown Park';
