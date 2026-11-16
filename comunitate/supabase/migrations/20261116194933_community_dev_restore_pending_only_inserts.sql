-- Ensure user-created posts and comments enter moderation as pending only.
alter policy posts_author_insert on public.posts
  with check (author_id = (select auth.uid()) and status = 'pending');
alter policy comments_author_insert on public.comments
  with check (
    author_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1 from public.posts p
      where p.id = post_id and p.status = 'published'
    )
  );
