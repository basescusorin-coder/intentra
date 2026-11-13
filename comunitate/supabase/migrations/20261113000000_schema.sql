-- INTENTRA Comunitate: schema MVP (draft, not deployed)
-- Run only after reviewing privacy, auth settings and storage policies.
create extension if not exists pgcrypto;
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9_]{3,30}$'),
  canton text not null check (length(canton) between 2 and 40),
  language text not null default 'ro' check (language in ('ro','de','en')),
  phone text check (phone is null or length(phone) between 7 and 25),
  created_at timestamptz not null default now()
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(user_id) on delete cascade,
  category text not null check (category in ('free','sale','question','job')),
  title text not null check (char_length(title) between 5 and 120),
  body text not null check (char_length(body) between 10 and 5000),
  canton text not null check (length(canton) between 2 and 40),
  price_chf numeric(12,2),
  status text not null default 'pending' check (status in ('pending','published','rejected','removed')),
  created_at timestamptz not null default now(),
  check ((category = 'sale' and price_chf is not null and price_chf >= 0)
      or (category <> 'sale' and price_chf is null))
);
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(user_id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  status text not null default 'pending' check (status in ('pending','published','removed')),
  created_at timestamptz not null default now()
);
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(user_id) on delete cascade,
  reason text not null check (char_length(reason) between 5 and 500),
  created_at timestamptz not null default now(),
  unique(post_id, reporter_id)
);
alter table public.profiles enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;
-- Private phone never exposed by public SELECT. Public profile display must use
-- a restricted view/API containing only username, canton, language.
create policy profiles_self_read on public.profiles for select to authenticated using (user_id = (select auth.uid()));
create policy profiles_self_insert on public.profiles for insert to authenticated with check (user_id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy posts_public_read on public.posts for select to anon, authenticated using (status = 'published');
create policy posts_author_read on public.posts for select to authenticated using (author_id = (select auth.uid()));
create policy posts_author_insert on public.posts for insert to authenticated with check (author_id = (select auth.uid()) and status = 'pending');
-- No direct author UPDATE/DELETE: use moderated, audited server functions.
create policy comments_public_read on public.comments for select to anon, authenticated using (
 status = 'published' and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
create policy comments_author_read on public.comments for select to authenticated using (author_id = (select auth.uid()));
create policy comments_author_insert on public.comments for insert to authenticated with check (
 author_id = (select auth.uid()) and status = 'pending'
 and exists (select 1 from public.posts p where p.id = post_id and p.status = 'published')
);
create policy reports_author_insert on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
-- No reports SELECT policy for members. Moderator access via audited backend only.
-- Before deployment: add authenticated account deletion, admin roles, audit logging,
-- abuse limits, moderation service, storage restrictions, and retention schedules.
