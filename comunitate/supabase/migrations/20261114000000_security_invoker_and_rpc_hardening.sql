-- Harden DEV community views, RPCs, and author identity projections.
-- Keep sensitive profile fields private while SECURITY INVOKER views honor RLS.
begin;

create schema if not exists community_private;
revoke all on schema community_private from public;
grant usage on schema community_private to anon, authenticated;

-- A separate, safe projection avoids granting access to private profile columns.
create table if not exists community_private.profile_public (
  user_id uuid primary key,
  username text not null,
  canton text not null,
  city text,
  language text not null,
  created_at timestamptz not null
);
alter table community_private.profile_public enable row level security;
drop policy if exists profile_public_read on community_private.profile_public;
create policy profile_public_read on community_private.profile_public
  for select to anon, authenticated using (true);
revoke all on community_private.profile_public from public, anon, authenticated;
grant select (username,canton,city,language,created_at)
  on community_private.profile_public to anon, authenticated;

create or replace function community_private.sync_profile_public()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  insert into community_private.profile_public(user_id,username,canton,city,language,created_at)
  values(new.user_id,new.username,new.canton,new.city,new.language,new.created_at)
  on conflict(user_id) do update set username=excluded.username,canton=excluded.canton,
    city=excluded.city,language=excluded.language,created_at=excluded.created_at;
  return new;
end
$$;
revoke all on function community_private.sync_profile_public() from public,anon,authenticated;
drop trigger if exists community_sync_profile_public on public.profiles;
create trigger community_sync_profile_public after insert or update on public.profiles
  for each row execute function community_private.sync_profile_public();

insert into community_private.profile_public(user_id,username,canton,city,language,created_at)
select user_id,username,canton,city,language,created_at from public.profiles
on conflict(user_id) do update set username=excluded.username,canton=excluded.canton,
  city=excluded.city,language=excluded.language,created_at=excluded.created_at;

alter table public.posts add column if not exists author_username text;
alter table public.comments add column if not exists author_username text;
update public.posts p set author_username=pr.username from public.profiles pr
  where pr.user_id=p.author_id and p.author_username is distinct from pr.username;
update public.comments c set author_username=pr.username from public.profiles pr
  where pr.user_id=c.author_id and c.author_username is distinct from pr.username;
alter table public.posts alter column author_username set not null;
alter table public.comments alter column author_username set not null;

create or replace function community_private.set_author_username()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  select p.username into new.author_username
    from public.profiles p where p.user_id=new.author_id;
  if new.author_username is null then
    raise exception 'community_profile_required' using errcode='23503';
  end if;
  return new;
end
$$;
revoke all on function community_private.set_author_username() from public,anon,authenticated;
drop trigger if exists community_set_post_author_username on public.posts;
create trigger community_set_post_author_username before insert or update of author_id
  on public.posts for each row execute function community_private.set_author_username();
drop trigger if exists community_set_comment_author_username on public.comments;
create trigger community_set_comment_author_username before insert or update of author_id
  on public.comments for each row execute function community_private.set_author_username();

-- SECURITY INVOKER means the caller's column grants and RLS policies apply.
drop view if exists public.community_public_profiles;
create view public.community_public_profiles with (security_invoker=true,security_barrier=true) as
  select username,canton,language,created_at,city from community_private.profile_public;
revoke all on public.community_public_profiles from public;
grant select on public.community_public_profiles to anon,authenticated;

drop view if exists public.community_feed;
create view public.community_feed with (security_invoker=true,security_barrier=true) as
  select p.id,p.category,p.title,p.body,p.city,p.canton,p.price_chf,p.status,p.created_at,
         p.author_username
  from public.posts p
  where p.status='published' or p.author_id=(select auth.uid());
revoke all on public.community_feed from public;
grant select on public.community_feed to anon,authenticated;

drop view if exists public.community_public_comments;
create view public.community_public_comments with (security_invoker=true,security_barrier=true) as
  select c.id,c.post_id,c.body,c.created_at,c.author_username
  from public.comments c join public.posts p on p.id=c.post_id
  where c.status='published' and p.status='published';
revoke all on public.community_public_comments from public;
grant select on public.community_public_comments to anon,authenticated;

-- Keep author UUIDs private while allowing invoker views to select safe fields.
grant select(id,category,title,body,city,canton,price_chf,status,created_at,author_username)
  on public.posts to anon,authenticated;
grant select(id,post_id,body,status,created_at,author_username)
  on public.comments to anon,authenticated;

-- Keep app RPC names stable, but put privileged implementations outside PostgREST's
-- exposed schemas. Existing policies/triggers keep their function OIDs.
alter function public.community_can_access_post(uuid) set schema community_private;
alter function public.community_can_upload_post(uuid) set schema community_private;
alter function public.community_export_my_data() set schema community_private;
alter function public.community_has_admin_role() set schema community_private;
alter function public.community_is_admin() set schema community_private;
alter function public.community_moderate_comment(uuid,text,text) set schema community_private;
alter function public.community_moderate_post(uuid,text,text) set schema community_private;
alter function public.community_resolve_report(uuid,text) set schema community_private;

revoke all on function community_private.community_can_access_post(uuid) from public,anon,authenticated;
revoke all on function community_private.community_can_upload_post(uuid) from public,anon,authenticated;
revoke all on function community_private.community_export_my_data() from public,anon,authenticated;
revoke all on function community_private.community_has_admin_role() from public,anon,authenticated;
revoke all on function community_private.community_is_admin() from public,anon,authenticated;
revoke all on function community_private.community_moderate_comment(uuid,text,text) from public,anon,authenticated;
revoke all on function community_private.community_moderate_post(uuid,text,text) from public,anon,authenticated;
revoke all on function community_private.community_resolve_report(uuid,text) from public,anon,authenticated;
grant execute on function community_private.community_can_access_post(uuid) to authenticated;
grant execute on function community_private.community_can_upload_post(uuid) to authenticated;
grant execute on function community_private.community_export_my_data() to authenticated;
grant execute on function community_private.community_has_admin_role() to authenticated;
grant execute on function community_private.community_is_admin() to authenticated;
grant execute on function community_private.community_moderate_comment(uuid,text,text) to authenticated;
grant execute on function community_private.community_moderate_post(uuid,text,text) to authenticated;
grant execute on function community_private.community_resolve_report(uuid,text) to authenticated;

create or replace function public.community_is_admin()
returns boolean language sql stable security invoker set search_path=''
as $$ select community_private.community_is_admin() $$;
create or replace function public.community_has_admin_role()
returns boolean language sql stable security invoker set search_path=''
as $$ select community_private.community_has_admin_role() $$;
create or replace function public.community_can_access_post(p_post_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select community_private.community_can_access_post(p_post_id) $$;
create or replace function public.community_can_upload_post(p_post_id uuid)
returns boolean language sql stable security invoker set search_path=''
as $$ select community_private.community_can_upload_post(p_post_id) $$;
create or replace function public.community_export_my_data()
returns jsonb language sql stable security invoker set search_path=''
as $$ select community_private.community_export_my_data() $$;
create or replace function public.community_moderate_comment(p_comment_id uuid,p_status text,p_note text default null)
returns void language sql security invoker set search_path=''
as $$ select community_private.community_moderate_comment(p_comment_id,p_status,p_note) $$;
create or replace function public.community_moderate_post(p_post_id uuid,p_status text,p_note text default null)
returns void language sql security invoker set search_path=''
as $$ select community_private.community_moderate_post(p_post_id,p_status,p_note) $$;
create or replace function public.community_resolve_report(p_report_id uuid,p_note text default null)
returns void language sql security invoker set search_path=''
as $$ select community_private.community_resolve_report(p_report_id,p_note) $$;

revoke all on function public.community_is_admin() from public,anon;
revoke all on function public.community_has_admin_role() from public,anon;
revoke all on function public.community_can_access_post(uuid) from public,anon;
revoke all on function public.community_can_upload_post(uuid) from public,anon;
revoke all on function public.community_export_my_data() from public,anon;
revoke all on function public.community_moderate_comment(uuid,text,text) from public,anon;
revoke all on function public.community_moderate_post(uuid,text,text) from public,anon;
revoke all on function public.community_resolve_report(uuid,text) from public,anon;
grant execute on function public.community_is_admin() to authenticated;
grant execute on function public.community_has_admin_role() to authenticated;
grant execute on function public.community_can_access_post(uuid) to authenticated;
grant execute on function public.community_can_upload_post(uuid) to authenticated;
grant execute on function public.community_export_my_data() to authenticated;
grant execute on function public.community_moderate_comment(uuid,text,text) to authenticated;
grant execute on function public.community_moderate_post(uuid,text,text) to authenticated;
grant execute on function public.community_resolve_report(uuid,text) to authenticated;

-- Trigger/event-trigger handlers are not RPC endpoints; trigger invocation is retained.
revoke all on function public.community_guard_post() from public,anon,authenticated;
revoke all on function public.community_guard_post_image() from public,anon,authenticated;
revoke all on function public.community_limit_comment() from public,anon,authenticated;
revoke all on function public.community_limit_report() from public,anon,authenticated;
do $ begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public,anon,authenticated';
  end if;
end $;

commit;
