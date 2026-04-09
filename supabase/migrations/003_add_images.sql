-- Add image_url column
alter table public.activities add column if not exists image_url text;

-- Update activities with Unsplash images
update public.activities set image_url = 'https://images.unsplash.com/photo-1534567153574-2b12153a87f0?w=800&q=80'
where title = 'Woodland Park Zoo';

update public.activities set image_url = 'https://images.unsplash.com/photo-1566140967404-b8b3932483f5?w=800&q=80'
where title = 'Seattle Children''s Museum';

update public.activities set image_url = 'https://images.unsplash.com/photo-1657199371273-e8646af1a5c5?w=800&q=80'
where title = 'Golden Gardens Beach';

update public.activities set image_url = 'https://images.unsplash.com/photo-1596566113560-db94ab30f982?w=800&q=80'
where title = 'Discovery Park';

update public.activities set image_url = 'https://images.unsplash.com/photo-1511346378249-01906bcff537?w=800&q=80'
where title = 'Pike Place Market (Family Edition)';

update public.activities set image_url = 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80'
where title = 'Bellevue Downtown Park';

update public.activities set image_url = 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=800&q=80'
where title = 'Ballard Locks (Hiram M. Chittenden Locks)';

update public.activities set image_url = 'https://images.unsplash.com/photo-1540962351504-03099e0a754b?w=800&q=80'
where title = 'Museum of Flight';

update public.activities set image_url = 'https://images.unsplash.com/photo-1515586838455-8f8f940d6853?w=800&q=80'
where title = 'Green Lake';

update public.activities set image_url = 'https://images.unsplash.com/photo-1567025046685-af10f5e4d178?w=800&q=80'
where title = 'WA State Fair (Puyallup Fair)';

update public.activities set image_url = 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80'
where title = 'Seattle Aquarium';

update public.activities set image_url = 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=800&q=80'
where title = 'Kerry Park';
