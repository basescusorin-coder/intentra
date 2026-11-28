create or replace function community_private.community_auto_review_comment()
returns trigger language plpgsql security definer set search_path='' as $$
declare content text; confirmed boolean;
begin
 select exists(select 1 from auth.users u where u.id=new.author_id and u.email_confirmed_at is not null) into confirmed;
 content:=lower(coalesce(new.body,''));
 if confirmed and content !~ '(https?://|www[.]|[[:alnum:]._%+-]+@[[:alnum:].-]+[.][a-z]{2,}|telegram|whatsapp|crypto|bitcoin|usdt|casino|pariuri|credit rapid|împrumut rapid|pasaport fals|pașaport fals|arme de foc|droguri)'
 then new.status:='published';
 else new.status:='pending';
 end if;
 return new;
end $$;
create trigger zzz_community_auto_review_comment before insert on public.comments for each row execute function community_private.community_auto_review_comment();
alter policy comments_author_insert on public.comments with check (author_id=(select auth.uid()) and status in ('pending','published') and exists (select 1 from public.posts p where p.id=post_id and p.status='published'));
