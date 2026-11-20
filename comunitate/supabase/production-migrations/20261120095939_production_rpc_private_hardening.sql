-- Move privileged Community RPC implementations out of the exposed public schema.
-- This is code-only hardening: it does not copy or modify user records.
begin;

create schema if not exists community_private;
revoke all on schema community_private from public;
grant usage on schema community_private to anon, authenticated;

do $guard$
declare
  expected integer := 8;
  found_count integer;
begin
  select count(*) into found_count
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname in (
    'community_can_access_post','community_can_upload_post','community_export_my_data',
    'community_has_admin_role','community_is_admin','community_moderate_comment',
    'community_moderate_post','community_resolve_report'
  );
  if found_count <> expected then
    raise exception 'Expected eight Community RPCs before hardening; found %', found_count;
  end if;
end;
$guard$;

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

-- Trigger functions are invoked by their triggers, not through PostgREST RPC.
revoke all on function public.community_guard_post() from public,anon,authenticated;
revoke all on function public.community_guard_post_image() from public,anon,authenticated;
revoke all on function public.community_limit_comment() from public,anon,authenticated;
revoke all on function public.community_limit_report() from public,anon,authenticated;

commit;
