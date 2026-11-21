-- INTENTRA Comunitate MVP extensions. Apply only to an isolated Supabase test project.
-- The app and all prior migrations are still development-only.
begin;

alter table public.profiles add column if not exists city text;
alter table public.posts add column if not exists city text;
alter table public.reports add column if not exists status text not null default 'open';
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists resolved_by uuid references auth.users(id);

do $m$
begin
  if not exists(select 1 from pg_constraint where conname='profiles_city_check' and conrelid='public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_city_check check(city is not null and char_length(btrim(city)) between 2 and 80) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='profiles_canton_code_check' and conrelid='public.profiles'::regclass) then
    alter table public.profiles add constraint profiles_canton_code_check check(canton in ('AG','AI','AR','BE','BL','BS','FR','GE','GL','GR','JU','LU','NE','NW','OW','SG','SH','SO','SZ','TG','TI','UR','VD','VS','ZG','ZH')) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='posts_city_check' and conrelid='public.posts'::regclass) then
    alter table public.posts add constraint posts_city_check check(city is not null and char_length(btrim(city)) between 2 and 80) not valid;
  end if;
  if not exists(select 1 from pg_constraint where conname='reports_status_check' and conrelid='public.reports'::regclass) then
    alter table public.reports add constraint reports_status_check check(status in ('open','resolved')) not valid;
  end if;
  alter table public.community_moderation_audit drop constraint if exists community_moderation_audit_entity_type_check;
  alter table public.community_moderation_audit add constraint community_moderation_audit_entity_type_check check(entity_type in ('post','comment','report'));
end
$m$;

-- Public projection remains deliberately narrow; phone and e-mail are never exposed.
drop view if exists public.community_public_profiles;
create view public.community_public_profiles with (security_barrier=true) as
  select username, canton, language, created_at, city from public.profiles;
revoke all on public.community_public_profiles from public;
grant select on public.community_public_profiles to anon,authenticated;

-- Feed views expose pseudonyms, never auth user UUIDs or private profile fields.
create or replace view public.community_feed with (security_barrier=true) as
  select p.id,p.category,p.title,p.body,p.city,p.canton,p.price_chf,p.status,p.created_at,
         pr.username as author_username,(p.author_id=(select auth.uid())) as is_mine
  from public.posts p join public.profiles pr on pr.user_id=p.author_id
  where p.status='published' or p.author_id=(select auth.uid());
revoke all on public.community_feed from public;
grant select on public.community_feed to anon,authenticated;

create or replace view public.community_public_comments with (security_barrier=true) as
  select c.id,c.post_id,c.body,c.created_at,pr.username as author_username
  from public.comments c join public.profiles pr on pr.user_id=c.author_id
  join public.posts p on p.id=c.post_id
  where c.status='published' and p.status='published';
revoke all on public.community_public_comments from public;
grant select on public.community_public_comments to anon,authenticated;

-- Fixed-window per-account limits. Auth endpoints also retain Supabase's IP/email rate limits.
create table if not exists public.community_rate_limits(
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check(action in ('post_create','post_edit','comment_create','report_create','image_create')),
  window_start timestamptz not null,
  request_count integer not null check(request_count > 0),
  primary key(user_id,action,window_start)
);
alter table public.community_rate_limits enable row level security;
revoke all on public.community_rate_limits from public, anon, authenticated;

create or replace function public.community_consume_limit(p_action text,p_max integer,p_window interval)
returns void language plpgsql security definer set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_start timestamptz;
  v_count integer;
begin
  if v_user is null then raise exception 'auth_required' using errcode='42501'; end if;
  if p_max < 1 or p_window <= interval '0' then raise exception 'invalid_limit' using errcode='22023'; end if;
  v_start := to_timestamp(floor(extract(epoch from now())/extract(epoch from p_window))*extract(epoch from p_window));
  delete from public.community_rate_limits where user_id=v_user and action=p_action and window_start < now()-p_window*2;
  insert into public.community_rate_limits(user_id,action,window_start,request_count)
  values(v_user,p_action,v_start,1)
  on conflict(user_id,action,window_start) do update set request_count=public.community_rate_limits.request_count+1
  returning request_count into v_count;
  if v_count > p_max then raise exception 'rate_limit_exceeded' using errcode='P0001'; end if;
end
$$;
revoke all on function public.community_consume_limit(text,integer,interval) from public,anon,authenticated;

create or replace function public.community_guard_post()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.category='job' then raise exception 'job_category_disabled' using errcode='42501'; end if;
  if tg_op='INSERT' then
    if new.status<>'pending' or new.author_id is distinct from (select auth.uid()) then raise exception 'pending_post_required' using errcode='42501'; end if;
    perform public.community_consume_limit('post_create',5,interval '1 day');
  else
    if old.author_id is distinct from (select auth.uid()) and not public.community_is_admin() then raise exception 'not_owner' using errcode='42501'; end if;
    if not public.community_is_admin() then
      if old.status in ('removed','rejected') then raise exception 'post_not_editable' using errcode='42501'; end if;
      new.author_id:=old.author_id;
      new.status:='pending';
      perform public.community_consume_limit('post_edit',10,interval '1 hour');
    end if;
  end if;
  new.title:=btrim(new.title); new.body:=btrim(new.body); new.city:=btrim(new.city);
  return new;
end
$$;
drop trigger if exists community_guard_post on public.posts;
create trigger community_guard_post before insert or update on public.posts for each row execute function public.community_guard_post();

create or replace function public.community_limit_comment()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.author_id is distinct from (select auth.uid()) or new.status<>'pending' then raise exception 'pending_comment_required' using errcode='42501'; end if;
  perform public.community_consume_limit('comment_create',20,interval '1 hour');
  new.body:=btrim(new.body);
  return new;
end
$$;
drop trigger if exists community_limit_comment on public.comments;
create trigger community_limit_comment before insert on public.comments for each row execute function public.community_limit_comment();

create or replace function public.community_limit_report()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
  if new.reporter_id is distinct from (select auth.uid()) then raise exception 'reporter_mismatch' using errcode='42501'; end if;
  perform public.community_consume_limit('report_create',10,interval '1 day');
  new.reason:=btrim(new.reason);
  return new;
end
$$;
drop trigger if exists community_limit_report on public.reports;
create trigger community_limit_report before insert on public.reports for each row execute function public.community_limit_report();

create or replace function public.community_guard_post_image()
returns trigger language plpgsql security definer set search_path=''
as $$
declare
  v_author uuid;
  v_status text;
  v_count integer;
begin
  select author_id,status into v_author,v_status from public.posts where id=new.post_id for update;
  if not found or v_author is distinct from (select auth.uid()) or v_status<>'pending' then raise exception 'post_image_not_allowed' using errcode='42501'; end if;
  if new.object_path !~ '^[0-9a-f-]{36}\.jpg$' then raise exception 'invalid_image_path' using errcode='42501'; end if;
  select count(*) into v_count from public.post_images where post_id=new.post_id;
  if v_count>=3 then raise exception 'image_limit_exceeded' using errcode='22023'; end if;
  perform public.community_consume_limit('image_create',15,interval '1 day');
  return new;
end
$$;
drop trigger if exists community_guard_post_image on public.post_images;
create trigger community_guard_post_image before insert on public.post_images for each row execute function public.community_guard_post_image();

-- Profile ownership can update only safe self-fields. E-mail remains in auth.users.
revoke all on public.profiles from public,anon,authenticated;
grant select,insert on public.profiles to authenticated;
grant update(username,canton,city,language,phone) on public.profiles to authenticated;
drop policy if exists profiles_self_read on public.profiles;
drop policy if exists profiles_self_insert on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_read on public.profiles for select to authenticated using(user_id=(select auth.uid()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

-- Members can revise only their own listing content; trigger forces edited items back to pending.
revoke all on public.posts from public,anon,authenticated;
grant select(id,category,title,body,city,canton,price_chf,status,created_at),insert,delete on public.posts to authenticated;
grant select(id,category,title,body,city,canton,price_chf,status,created_at) on public.posts to anon;
grant update(category,title,body,city,canton,price_chf) on public.posts to authenticated;
drop policy if exists posts_public_read on public.posts;
create policy posts_public_read on public.posts for select to anon,authenticated using(status='published');
drop policy if exists posts_author_read on public.posts;
create policy posts_author_read on public.posts for select to authenticated using(author_id=(select auth.uid()));
drop policy if exists posts_author_insert on public.posts;
create policy posts_author_insert on public.posts for insert to authenticated with check(author_id=(select auth.uid()) and status='pending');
drop policy if exists posts_author_update on public.posts;
create policy posts_author_update on public.posts for update to authenticated using(author_id=(select auth.uid())) with check(author_id=(select auth.uid()));
drop policy if exists posts_author_delete on public.posts;
create policy posts_author_delete on public.posts for delete to authenticated using(author_id=(select auth.uid()));

-- Comments and reports are submitted as pending/open. Members cannot change moderation state.
revoke all on public.comments from public,anon,authenticated;
grant select(id,post_id,body,status,created_at),insert on public.comments to authenticated;
grant select(id,post_id,body,status,created_at) on public.comments to anon;
drop policy if exists comments_public_read on public.comments;
create policy comments_public_read on public.comments for select to anon,authenticated using(status='published' and exists(select 1 from public.posts p where p.id=post_id and p.status='published'));
drop policy if exists comments_author_read on public.comments;
create policy comments_author_read on public.comments for select to authenticated using(author_id=(select auth.uid()));
drop policy if exists comments_author_insert on public.comments;
create policy comments_author_insert on public.comments for insert to authenticated with check(author_id=(select auth.uid()) and status='pending' and exists(select 1 from public.posts p where p.id=post_id and p.status='published'));
revoke all on public.reports from public,anon,authenticated;
grant insert on public.reports to authenticated;
grant select(id,post_id,reason,status,created_at,resolved_at) on public.reports to authenticated;
drop policy if exists reports_admin_read on public.reports;
create policy reports_admin_read on public.reports for select to authenticated using(public.community_is_admin());
drop policy if exists reports_author_read on public.reports;
create policy reports_author_read on public.reports for select to authenticated using(reporter_id=(select auth.uid()));
drop policy if exists reports_author_insert on public.reports;
create policy reports_author_insert on public.reports for insert to authenticated with check(reporter_id=(select auth.uid()) and status='open');

-- Narrow image table access. Uploads must go through the authenticated image Edge Function.
revoke all on public.post_images from public,anon,authenticated;
grant select,insert,delete on public.post_images to authenticated;
grant select on public.post_images to anon;
create or replace function public.community_can_access_post(p_post_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.posts p where p.id=p_post_id and (p.status='published' or p.author_id=(select auth.uid()) or public.community_is_admin())) $$;
revoke all on function public.community_can_access_post(uuid) from public,anon;
grant execute on function public.community_can_access_post(uuid) to authenticated;
create or replace function public.community_can_upload_post(p_post_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.posts p where p.id=p_post_id and p.status='pending' and p.author_id=(select auth.uid())) $$;
revoke all on function public.community_can_upload_post(uuid) from public,anon;
grant execute on function public.community_can_upload_post(uuid) to authenticated;
drop policy if exists post_images_visible_read on public.post_images;
drop policy if exists post_images_public_read on public.post_images;
drop policy if exists post_images_member_read on public.post_images;
create policy post_images_public_read on public.post_images for select to anon using(exists(select 1 from public.posts p where p.id=post_id and p.status='published'));
create policy post_images_member_read on public.post_images for select to authenticated using(public.community_can_access_post(post_id));
drop policy if exists post_images_owner_insert on public.post_images;
create policy post_images_owner_insert on public.post_images for insert to authenticated with check(public.community_can_upload_post(post_id));
drop policy if exists post_images_owner_delete on public.post_images;
create policy post_images_owner_delete on public.post_images for delete to authenticated using(public.community_can_access_post(post_id));

-- Private bucket. Upload policy is intentionally absent: only the server function uses service role after validation/re-encoding.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-images','community-images',false,5242880,array['image/jpeg'])
on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg'];
drop policy if exists community_images_read on storage.objects;
drop policy if exists community_images_public_read on storage.objects;
drop policy if exists community_images_member_read on storage.objects;
create policy community_images_public_read on storage.objects for select to anon using(
  bucket_id='community-images' and exists(
    select 1 from public.post_images i join public.posts p on p.id=i.post_id
    where i.object_path=name and p.status='published'
  )
);
create policy community_images_member_read on storage.objects for select to authenticated using(
  bucket_id='community-images' and exists(
    select 1 from public.post_images i
    where i.object_path=name and public.community_can_access_post(i.post_id)
  )
);
revoke insert,update,delete on storage.objects from public,anon,authenticated;
grant usage on schema storage to anon,authenticated;
grant select on storage.objects to anon,authenticated;

-- Public lookup reveals no private contact data. Admin identity lookup is not an authorization check.
create or replace function public.community_has_admin_role()
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from public.community_admins where user_id=(select auth.uid())) $$;
revoke all on function public.community_has_admin_role() from public,anon;
grant execute on function public.community_has_admin_role() to authenticated;

create or replace function public.community_resolve_report(p_report_id uuid,p_note text default null)
returns void language plpgsql security definer set search_path=''
as $$
declare old_value text;
begin
  if (select auth.uid()) is null or not public.community_is_admin() then raise exception 'admin_mfa_required' using errcode='42501'; end if;
  select status into old_value from public.reports where id=p_report_id for update;
  if not found then raise exception 'report_not_found' using errcode='P0002'; end if;
  update public.reports set status='resolved',resolved_at=now(),resolved_by=(select auth.uid()) where id=p_report_id;
  insert into public.community_moderation_audit(moderator_id,entity_type,entity_id,old_status,new_status,note)
  values((select auth.uid()),'report',p_report_id,old_value,'resolved',left(p_note,1000));
end
$$;
revoke all on function public.community_resolve_report(uuid,text) from public,anon;
grant execute on function public.community_resolve_report(uuid,text) to authenticated;

-- Private identifiers are available to the account holder only through this export RPC.
create or replace function public.community_export_my_data()
returns jsonb language sql stable security definer set search_path=''
as $$
  select jsonb_build_object(
    'exported_at',now(),
    'email',(select email from auth.users where id=(select auth.uid())),
    'profile',(select to_jsonb(p) from public.profiles p where p.user_id=(select auth.uid())),
    'posts',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at) from public.posts p where p.author_id=(select auth.uid())),'[]'::jsonb),
    'comments',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at) from public.comments c where c.author_id=(select auth.uid())),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(to_jsonb(r) order by r.created_at) from public.reports r where r.reporter_id=(select auth.uid())),'[]'::jsonb)
  ) where (select auth.uid()) is not null
$$;
revoke all on function public.community_export_my_data() from public,anon;
grant execute on function public.community_export_my_data() to authenticated;

commit;
