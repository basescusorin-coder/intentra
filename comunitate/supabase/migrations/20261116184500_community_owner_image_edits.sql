CREATE OR REPLACE FUNCTION community_private.community_can_upload_post(p_post_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = p_post_id
      AND p.status = ANY (ARRAY['pending'::text, 'published'::text])
      AND p.author_id = (SELECT auth.uid())
  )
$function$;
