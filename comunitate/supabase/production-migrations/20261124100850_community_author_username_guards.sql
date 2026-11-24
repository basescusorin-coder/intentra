-- Align production post/comment attribution with the reviewed DEV invariant.
-- No existing records are rewritten: fail closed if pre-existing rows are missing
-- an author name, then enforce the trigger and NOT NULL constraints.
begin;

do $guard$
begin
  if exists (select 1 from public.posts where author_username is null)
     or exists (select 1 from public.comments where author_username is null) then
    raise exception 'Cannot enforce Community author username guard: null rows exist';
  end if;
end
$guard$;

create or replace function community_private.set_author_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.username into new.author_username
    from public.profiles p
    where p.user_id = new.author_id;
  if new.author_username is null then
    raise exception 'community_profile_required' using errcode = '23503';
  end if;
  return new;
end
$$;

revoke all on function community_private.set_author_username() from public, anon, authenticated;

drop trigger if exists community_set_post_author_username on public.posts;
create trigger community_set_post_author_username
  before insert or update of author_id on public.posts
  for each row execute function community_private.set_author_username();

drop trigger if exists community_set_comment_author_username on public.comments;
create trigger community_set_comment_author_username
  before insert or update of author_id on public.comments
  for each row execute function community_private.set_author_username();

alter table public.posts alter column author_username set not null;
alter table public.comments alter column author_username set not null;

commit;
