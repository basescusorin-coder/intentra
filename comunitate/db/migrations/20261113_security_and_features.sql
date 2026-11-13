-- INTENTRA Comunitate: security hardening and MVP fields.
-- Draft migration for a dedicated Supabase project. Review and run only in a
-- disposable development project after taking a backup. Never run on production.
begin;

-- Keep usernames unique regardless of case and add the listing location.
create unique index if not exists profiles_username_lower_uidx
  on public.profiles (lower(username));
alter table public.posts add column if not exists city text;
do $migration$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'posts_city_length_check'
      and conrelid = 'public.posts'::regclass
  ) then
    alter table public.posts add constraint posts_city_length_check
      check (city is null or char_length(city) between 2 and 80) not valid;
  end if;
end;
$migration$;

-- Do not use an admin flag in user-editable profile metadata. Membership changes
-- must be made by a trusted operator using the SQL console or a protected job.
create table if not exists public.community_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('moderator','administrator')),
  created_at timestamptz not null default now()
);
alter table public.community_admins enable row level security;
revoke all on public.community_admins from anon, authenticated;

create or replace function public.community_is_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.community_admins a
    where a.user_id = (select auth.uid())
      and (select auth.jwt() ->> 'aal') = 'aal2'
  );
$$;
revoke all on function public.community_is_admin() from public;
grant execute on function public.community_is_admin() to authenticated;

-- A narrowly scoped public projection; email and phone remain private.
create or replace view public.community_public_profiles
  with (security_barrier = true)
as
  select user_id, username, canton, language, created_at
  from public.profiles;
revoke all on public.community_public_profiles from public;
grant select on public.community_public_profiles to anon, authenticated;

-- Images are references only. Uploads remain disabled until a private storage
-- bucket, content inspection, size limits, re-encoding and EXIF removal exist.
create table if not exists public.post_images (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  object_path text not null check (char_length(object_path) between 1 and 500),
  display_order smallint not null default 0 check (display_order between 0 and 9),
  created_at timestamptz not null default now(),
  unique (post_id, object_path)
);
alter table public.post_images enable row level security;
revoke all on public.post_images from anon, authenticated;

create table if not exists public.community_moderation_audit (
  id bigint generated always as identity primary key,
  moderator_id uuid not null references auth.users(id),
  entity_type text not null check (entity_type in ('post','comment')),
  entity_id uuid not null,
  old_status text not null,
  new_status text not null,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
alter table public.community_moderation_audit enable row level security;
revoke all on public.community_moderation_audit from public, anon, authenticated;
create policy community_audit_admin_read on public.community_moderation_audit
  for select to authenticated using (public.community_is_admin());
grant select on public.community_moderation_audit to authenticated;

-- Moderators need a review queue, but members must never see pending items or
-- report contents. These policies are MFA-gated through the admin helper.
create policy posts_admin_review_read on public.posts
  for select to authenticated using (public.community_is_admin());
create policy comments_admin_review_read on public.comments
  for select to authenticated using (public.community_is_admin());
create policy reports_admin_read on public.reports
  for select to authenticated using (public.community_is_admin());

-- Job publication remains closed until AVG/AVV applicability is reviewed.
create table if not exists public.community_settings (
  key text primary key,
  value boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.community_settings enable row level security;
revoke all on public.community_settings from public, anon, authenticated;
insert into public.community_settings(key, value)
values ('job_publication_enabled', false)
on conflict (key) do nothing;

-- Admin operations require a logged-in MFA session (AAL2). Each state change is
-- audited. Writes are not granted directly to member clients.
create or replace function public.community_moderate_post(
  p_post_id uuid, p_status text, p_note text default null
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  old_value text;
  post_category text;
begin
  if (select auth.uid()) is null or not public.community_is_admin() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;
  if p_status not in ('published','rejected','removed') then
    raise exception 'invalid_post_status' using errcode = '22023';
  end if;
  select status, category into old_value, post_category
    from public.posts where id = p_post_id for update;
  if not found then raise exception 'post_not_found' using errcode = 'P0002'; end if;
  if post_category = 'job' and p_status = 'published'
     and not exists (select 1 from public.community_settings
       where key = 'job_publication_enabled' and value = true) then
    raise exception 'job_publication_disabled_pending_avg_avv_review' using errcode = '42501';
  end if;
  update public.posts set status = p_status where id = p_post_id;
  insert into public.community_moderation_audit
    (moderator_id, entity_type, entity_id, old_status, new_status, note)
  values ((select auth.uid()), 'post', p_post_id, old_value, p_status, p_note);
end;
$$;

create or replace function public.community_moderate_comment(
  p_comment_id uuid, p_status text, p_note text default null
) returns void
language plpgsql security definer
set search_path = ''
as $$
declare old_value text;
begin
  if (select auth.uid()) is null or not public.community_is_admin() then
    raise exception 'admin_mfa_required' using errcode = '42501';
  end if;
  if p_status not in ('published','removed') then
    raise exception 'invalid_comment_status' using errcode = '22023';
  end if;
  select status into old_value from public.comments where id = p_comment_id for update;
  if not found then raise exception 'comment_not_found' using errcode = 'P0002'; end if;
  update public.comments set status = p_status where id = p_comment_id;
  insert into public.community_moderation_audit
    (moderator_id, entity_type, entity_id, old_status, new_status, note)
  values ((select auth.uid()), 'comment', p_comment_id, old_value, p_status, p_note);
end;
$$;
revoke all on function public.community_moderate_post(uuid,text,text) from public, anon;
revoke all on function public.community_moderate_comment(uuid,text,text) from public, anon;
grant execute on function public.community_moderate_post(uuid,text,text) to authenticated;
grant execute on function public.community_moderate_comment(uuid,text,text) to authenticated;

-- Explicitly remove any direct client write route for status changes and reports.
revoke all on public.posts from public, anon, authenticated;
revoke all on public.comments from public, anon, authenticated;
revoke all on public.reports from public, anon, authenticated;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert on public.posts to authenticated;
grant select on public.posts to anon;
grant select, insert on public.comments to authenticated;
grant select on public.comments to anon;
grant select, insert on public.reports to authenticated;
grant select, insert, update on public.profiles to authenticated;
revoke all on public.profiles from anon;

commit;

-- Follow-up, outside this migration: create a private image bucket with policies;
-- configure Supabase email OTP, expiry/attempt limits, SMTP, MFA enrollment and
-- recovery; add server-side rate limiting/CAPTCHA; test account export/deletion;
-- set backups/retention/alerts and verify restoration before a pilot.
