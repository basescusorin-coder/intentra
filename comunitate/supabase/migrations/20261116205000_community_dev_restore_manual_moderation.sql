-- Restore explicit moderator review. These untracked DEV triggers overrode pending-only
-- insert guards and published some content before a moderator approved it.
drop trigger if exists zzz_community_auto_review_comment on public.comments;
drop trigger if exists zzz_community_auto_review_posts on public.posts;

drop function if exists community_private.community_auto_review_comment();
drop function if exists community_private.community_auto_review_post();
