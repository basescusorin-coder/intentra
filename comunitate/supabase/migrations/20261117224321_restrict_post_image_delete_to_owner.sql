-- Only the author of a pending/published post may remove its image records.
-- Previously community_can_access_post also returned true for any published post,
-- inadvertently permitting other authenticated members to delete image records.
DROP POLICY IF EXISTS post_images_owner_delete ON public.post_images;
CREATE POLICY post_images_owner_delete ON public.post_images
FOR DELETE TO authenticated
USING (community_private.community_can_upload_post(post_id));
