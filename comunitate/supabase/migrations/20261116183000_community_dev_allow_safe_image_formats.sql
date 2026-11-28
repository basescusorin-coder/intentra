-- Keep the private image bucket aligned with the server-side metadata sanitizer.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
WHERE id = 'community-images';
