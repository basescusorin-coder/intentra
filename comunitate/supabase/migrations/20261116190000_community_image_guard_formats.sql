CREATE OR REPLACE FUNCTION public.community_guard_post_image()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_author uuid;
  v_status text;
  v_count integer;
BEGIN
  SELECT author_id, status
  INTO v_author, v_status
  FROM public.posts
  WHERE id = NEW.post_id
  FOR UPDATE;

  IF NOT FOUND
     OR v_author IS DISTINCT FROM (SELECT auth.uid())
     OR v_status NOT IN ('pending', 'published') THEN
    RAISE EXCEPTION 'post_image_not_allowed' USING errcode = '42501';
  END IF;

  IF NEW.object_path !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$' THEN
    RAISE EXCEPTION 'invalid_image_path' USING errcode = '42501';
  END IF;

  SELECT count(*) INTO v_count
  FROM public.post_images
  WHERE post_id = NEW.post_id;

  IF v_count >= 3 THEN
    RAISE EXCEPTION 'image_limit_exceeded' USING errcode = '22023';
  END IF;

  PERFORM public.community_consume_limit('image_create', 15, interval '1 day');
  RETURN NEW;
END
$function$;
