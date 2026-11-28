-- Keep the private image bucket aligned with the server-side sanitizer output.
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/jpeg']::text[]
WHERE id = 'community-images';
