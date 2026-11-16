-- Keep report resolution metadata under moderator control.
drop policy if exists reports_author_insert on public.reports;
create policy reports_author_insert
on public.reports for insert to authenticated
with check (
  reporter_id = (select auth.uid())
  and status = 'open'
  and resolved_at is null
  and resolved_by is null
);
