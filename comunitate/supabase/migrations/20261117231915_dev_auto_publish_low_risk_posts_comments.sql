-- DEV: automatic publication of low-risk member content; high-risk content remains pending.
-- Existing guard/rate-limit triggers run before zzz_* triggers.
CREATE OR REPLACE FUNCTION community_private.community_auto_publish_post()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  content text;
  verified boolean;
begin
  -- The guard trigger rejects direct published inserts and non-owner edits.
  -- Moderators retain the ability to remove/reject posts.
  if tg_op='UPDATE' then
    if public.community_is_admin() and new.status is distinct from old.status then
      return new;
    end if;
    if old.status in ('removed','rejected') then
      return new;
    end if;
  end if;
  select exists (
    select 1 from auth.users u
    where u.id=new.author_id and u.email_confirmed_at is not null
  ) into verified;
  content:=lower(coalesce(new.title,'')||' '||coalesce(new.body,'')||' '||coalesce(new.city,''));
  if verified
    and new.category in ('free','sale','question')
    and content !~ '(https?://|www[.]|[[:alnum:]._%+-]+@[[:alnum:].-]+[.][a-z]{2,}|\+?[0-9][0-9 .()/-]{7,}[0-9])'
    and content !~ '(telegram|whatsapp|crypto|bitcoin|usdt|casino|pariuri|credit rapid|împrumut rapid|pasaport fals|pașaport fals|arme de foc|droguri)'
  then
    new.status:='published';
  else
    new.status:='pending';
  end if;
  return new;
end $function$

CREATE OR REPLACE FUNCTION community_private.community_auto_publish_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  content text;
  verified boolean;
begin
  select exists (
    select 1 from auth.users u
    where u.id=new.author_id and u.email_confirmed_at is not null
  ) into verified;
  content:=lower(coalesce(new.body,''));
  if verified and content !~ '(https?://|www[.]|[[:alnum:]._%+-]+@[[:alnum:].-]+[.][a-z]{2,}|\+?[0-9][0-9 .()/-]{7,}[0-9])'
    and content !~ '(telegram|whatsapp|crypto|bitcoin|usdt|casino|pariuri|credit rapid|împrumut rapid|pasaport fals|pașaport fals|arme de foc|droguri)'
  then new.status:='published';
  else new.status:='pending';
  end if;
  return new;
end $function$

DROP TRIGGER IF EXISTS zzz_community_auto_publish_post ON public.posts;
CREATE TRIGGER zzz_community_auto_publish_post BEFORE INSERT OR UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION community_private.community_auto_publish_post();
DROP TRIGGER IF EXISTS zzz_community_auto_publish_comment ON public.comments;
CREATE TRIGGER zzz_community_auto_publish_comment BEFORE INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION community_private.community_auto_publish_comment();
ALTER POLICY posts_author_insert ON public.posts WITH CHECK (author_id = (SELECT auth.uid()) AND status IN ('pending','published'));
ALTER POLICY comments_author_insert ON public.comments WITH CHECK (author_id = (SELECT auth.uid()) AND status IN ('pending','published') AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id=post_id AND p.status='published'));
