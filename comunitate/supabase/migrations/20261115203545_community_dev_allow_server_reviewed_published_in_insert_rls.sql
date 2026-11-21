alter policy posts_author_insert on public.posts with check (author_id = (select auth.uid()) and status in ('pending','published'));
