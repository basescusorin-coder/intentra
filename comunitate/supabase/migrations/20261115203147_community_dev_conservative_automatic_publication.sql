create or replace function community_private.community_auto_review_post()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  content text;
  confirmed boolean;
  is_moderator boolean := false;
begin
  if tg_op = 'UPDATE' then
    is_moderator := coalesce(public.community_is_admin(),false);
    if old.status in ('rejected','removed') and not is_moderator then
      new.status := old.status;
      return new;
    end if;
    if is_moderator and new.status is distinct from old.status then
      return new;
    end if;
  end if;
  if new.category = 'job' then
    new.status := 'pending';
    return new;
  end if;
  select exists(select 1 from auth.users u where u.id = new.author_id and u.email_confirmed_at is not null) into confirmed;
  if not confirmed then
    new.status := 'pending';
    return new;
  end if;
  content := lower(coalesce(new.title,'') || ' ' || coalesce(new.body,''));
  if content ~ '(https?://|www\\.|[[:alnum:]._%+-]+@[[:alnum:].-]+\\.[a-z]{2,}|\\+?[0-9][0-9 .()/-]{7,}[0-9])'
     or content ~ '(telegram|whatsapp|crypto|bitcoin|usdt|casino|pariuri|credit rapid|împrumut rapid|pasaport fals|pașaport fals|arme de foc|droguri)' then
    new.status := 'pending';
  else
    new.status := 'published';
  end if;
  return new;
end $$;
drop trigger if exists community_auto_review_posts on public.posts;
create trigger community_auto_review_posts before insert or update of title,body,category,city,canton,price_chf,status on public.posts
for each row execute function community_private.community_auto_review_post();

